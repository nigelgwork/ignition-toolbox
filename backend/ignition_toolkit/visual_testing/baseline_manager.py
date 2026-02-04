"""
Baseline Manager

CRUD operations for screenshot baselines with database persistence.
"""

import logging
import shutil
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from PIL import Image
from sqlalchemy import select
from sqlalchemy.orm import Session

from ignition_toolkit.storage.models import (
    ScreenshotBaselineModel,
    ComparisonResultModel,
)
from ignition_toolkit.visual_testing.comparison import ScreenshotComparator, ComparisonResult

logger = logging.getLogger(__name__)


class BaselineManager:
    """
    Manages screenshot baselines for visual regression testing.

    Features:
    - Create baselines from screenshots
    - Approve/reject baselines
    - Update baselines with new versions
    - Compare screenshots against baselines
    - Manage ignore regions
    """

    def __init__(
        self,
        session: Session,
        baselines_dir: Path,
        comparisons_dir: Path | None = None,
    ):
        """
        Initialize baseline manager.

        Args:
            session: SQLAlchemy database session
            baselines_dir: Directory to store baseline images
            comparisons_dir: Directory to store comparison results (default: baselines_dir/comparisons)
        """
        self.session = session
        self.baselines_dir = baselines_dir
        self.comparisons_dir = comparisons_dir or baselines_dir / "comparisons"

        # Ensure directories exist
        self.baselines_dir.mkdir(parents=True, exist_ok=True)
        self.comparisons_dir.mkdir(parents=True, exist_ok=True)

        self.comparator = ScreenshotComparator(output_dir=self.comparisons_dir)

    def list_baselines(
        self,
        status: str | None = None,
        playbook_path: str | None = None,
    ) -> list[dict[str, Any]]:
        """
        List all baselines with optional filtering.

        Args:
            status: Filter by status (pending, approved, rejected)
            playbook_path: Filter by associated playbook

        Returns:
            List of baseline dictionaries
        """
        query = select(ScreenshotBaselineModel)

        if status:
            query = query.where(ScreenshotBaselineModel.status == status)

        if playbook_path:
            query = query.where(ScreenshotBaselineModel.playbook_path == playbook_path)

        query = query.order_by(ScreenshotBaselineModel.created_at.desc())

        result = self.session.execute(query)
        baselines = result.scalars().all()

        return [b.to_dict() for b in baselines]

    def get_baseline(self, baseline_id: int) -> dict[str, Any] | None:
        """
        Get a baseline by ID.

        Args:
            baseline_id: Baseline ID

        Returns:
            Baseline dictionary or None if not found
        """
        baseline = self.session.get(ScreenshotBaselineModel, baseline_id)
        return baseline.to_dict() if baseline else None

    def get_baseline_by_name(self, name: str) -> dict[str, Any] | None:
        """
        Get a baseline by unique name.

        Args:
            name: Baseline name

        Returns:
            Baseline dictionary or None if not found
        """
        result = self.session.execute(
            select(ScreenshotBaselineModel).where(ScreenshotBaselineModel.name == name)
        )
        baseline = result.scalar_one_or_none()
        return baseline.to_dict() if baseline else None

    def create_baseline(
        self,
        name: str,
        screenshot_path: Path,
        playbook_path: str | None = None,
        step_id: str | None = None,
        description: str | None = None,
        auto_approve: bool = False,
    ) -> dict[str, Any]:
        """
        Create a new baseline from a screenshot.

        Args:
            name: Unique name for the baseline
            screenshot_path: Path to the screenshot to use as baseline
            playbook_path: Associated playbook path
            step_id: Associated step ID within playbook
            description: Optional description
            auto_approve: Automatically approve the baseline

        Returns:
            Created baseline dictionary

        Raises:
            ValueError: If name already exists or screenshot not found
        """
        # Check for existing baseline with same name
        existing = self.get_baseline_by_name(name)
        if existing:
            raise ValueError(f"Baseline with name '{name}' already exists")

        # Verify screenshot exists
        screenshot_path = Path(screenshot_path)
        if not screenshot_path.exists():
            raise ValueError(f"Screenshot not found: {screenshot_path}")

        # Get image dimensions
        with Image.open(screenshot_path) as img:
            width, height = img.size

        # Copy screenshot to baselines directory
        baseline_filename = f"{name.replace(' ', '_').lower()}_{datetime.now(UTC).strftime('%Y%m%d_%H%M%S')}.png"
        baseline_path = self.baselines_dir / baseline_filename
        shutil.copy2(screenshot_path, baseline_path)

        # Create database record
        baseline = ScreenshotBaselineModel(
            name=name,
            playbook_path=playbook_path,
            step_id=step_id,
            version=1,
            screenshot_path=str(baseline_path),
            width=width,
            height=height,
            status="approved" if auto_approve else "pending",
            approved_at=datetime.now(UTC) if auto_approve else None,
            description=description,
        )

        self.session.add(baseline)
        self.session.commit()

        logger.info(f"Created baseline: {name} (id={baseline.id}, status={baseline.status})")

        return baseline.to_dict()

    def approve_baseline(
        self,
        baseline_id: int,
        approved_by: str | None = None,
    ) -> dict[str, Any]:
        """
        Approve a baseline for use in comparisons.

        Args:
            baseline_id: Baseline ID
            approved_by: User who approved

        Returns:
            Updated baseline dictionary

        Raises:
            ValueError: If baseline not found
        """
        baseline = self.session.get(ScreenshotBaselineModel, baseline_id)
        if not baseline:
            raise ValueError(f"Baseline not found: {baseline_id}")

        baseline.status = "approved"
        baseline.approved_at = datetime.now(UTC)
        baseline.approved_by = approved_by

        self.session.commit()

        logger.info(f"Approved baseline: {baseline.name} (id={baseline_id})")

        return baseline.to_dict()

    def reject_baseline(self, baseline_id: int) -> dict[str, Any]:
        """
        Reject a baseline.

        Args:
            baseline_id: Baseline ID

        Returns:
            Updated baseline dictionary

        Raises:
            ValueError: If baseline not found
        """
        baseline = self.session.get(ScreenshotBaselineModel, baseline_id)
        if not baseline:
            raise ValueError(f"Baseline not found: {baseline_id}")

        baseline.status = "rejected"

        self.session.commit()

        logger.info(f"Rejected baseline: {baseline.name} (id={baseline_id})")

        return baseline.to_dict()

    def update_baseline(
        self,
        baseline_id: int,
        screenshot_path: Path,
    ) -> dict[str, Any]:
        """
        Update a baseline with a new screenshot.

        Increments the version number and marks as pending approval.

        Args:
            baseline_id: Baseline ID
            screenshot_path: Path to new screenshot

        Returns:
            Updated baseline dictionary

        Raises:
            ValueError: If baseline not found or screenshot not found
        """
        baseline = self.session.get(ScreenshotBaselineModel, baseline_id)
        if not baseline:
            raise ValueError(f"Baseline not found: {baseline_id}")

        screenshot_path = Path(screenshot_path)
        if not screenshot_path.exists():
            raise ValueError(f"Screenshot not found: {screenshot_path}")

        # Get new image dimensions
        with Image.open(screenshot_path) as img:
            width, height = img.size

        # Copy new screenshot
        new_filename = f"{baseline.name.replace(' ', '_').lower()}_v{baseline.version + 1}_{datetime.now(UTC).strftime('%Y%m%d_%H%M%S')}.png"
        new_path = self.baselines_dir / new_filename
        shutil.copy2(screenshot_path, new_path)

        # Update record
        baseline.version += 1
        baseline.screenshot_path = str(new_path)
        baseline.width = width
        baseline.height = height
        baseline.status = "pending"
        baseline.approved_at = None
        baseline.approved_by = None

        self.session.commit()

        logger.info(f"Updated baseline: {baseline.name} to version {baseline.version}")

        return baseline.to_dict()

    def set_ignore_regions(
        self,
        baseline_id: int,
        regions: list[dict[str, int]],
    ) -> dict[str, Any]:
        """
        Set ignore regions for a baseline.

        Args:
            baseline_id: Baseline ID
            regions: List of regions [{x, y, width, height}, ...]

        Returns:
            Updated baseline dictionary

        Raises:
            ValueError: If baseline not found
        """
        baseline = self.session.get(ScreenshotBaselineModel, baseline_id)
        if not baseline:
            raise ValueError(f"Baseline not found: {baseline_id}")

        baseline.ignore_regions = regions

        self.session.commit()

        logger.info(f"Set {len(regions)} ignore regions for baseline: {baseline.name}")

        return baseline.to_dict()

    def delete_baseline(self, baseline_id: int) -> bool:
        """
        Delete a baseline and its associated files.

        Args:
            baseline_id: Baseline ID

        Returns:
            True if deleted

        Raises:
            ValueError: If baseline not found
        """
        baseline = self.session.get(ScreenshotBaselineModel, baseline_id)
        if not baseline:
            raise ValueError(f"Baseline not found: {baseline_id}")

        # Delete screenshot file
        try:
            screenshot_path = Path(baseline.screenshot_path)
            if screenshot_path.exists():
                screenshot_path.unlink()
        except Exception as e:
            logger.warning(f"Failed to delete baseline screenshot: {e}")

        # Delete database record (cascade will delete comparison results)
        self.session.delete(baseline)
        self.session.commit()

        logger.info(f"Deleted baseline: {baseline.name}")

        return True

    async def compare_screenshot(
        self,
        baseline_name: str,
        screenshot_path: Path,
        threshold: float = 99.9,
        execution_id: int | None = None,
    ) -> dict[str, Any]:
        """
        Compare a screenshot against a baseline.

        Args:
            baseline_name: Name of the baseline to compare against
            screenshot_path: Path to screenshot to compare
            threshold: Minimum similarity percentage to pass (default 99.9)
            execution_id: Optional execution ID to associate with comparison

        Returns:
            Comparison result dictionary

        Raises:
            ValueError: If baseline not found or not approved
        """
        # Get baseline
        baseline = self.get_baseline_by_name(baseline_name)
        if not baseline:
            raise ValueError(f"Baseline not found: {baseline_name}")

        if baseline["status"] != "approved":
            raise ValueError(f"Baseline is not approved: {baseline_name} (status={baseline['status']})")

        # Perform comparison
        result = await self.comparator.compare(
            baseline_path=Path(baseline["screenshot_path"]),
            current_path=Path(screenshot_path),
            threshold=threshold,
            ignore_regions=baseline.get("ignore_regions"),
            save_diff=True,
        )

        # Store comparison result
        comparison = ComparisonResultModel(
            execution_id=execution_id,
            baseline_id=baseline["id"],
            current_screenshot_path=str(screenshot_path),
            diff_image_path=str(result.diff_image_path) if result.diff_image_path else None,
            similarity_score=int(result.similarity_score * 100),  # Store as int (0-10000)
            threshold=int(threshold * 100),  # Store as int (0-10000)
            passed=result.passed,
            diff_pixel_count=result.diff_pixel_count,
            total_pixels=result.total_pixels,
        )

        self.session.add(comparison)
        self.session.commit()

        logger.info(
            f"Comparison result: baseline={baseline_name}, similarity={result.similarity_score:.2f}%, "
            f"passed={result.passed}"
        )

        return {
            "comparison_id": comparison.id,
            "baseline_name": baseline_name,
            "baseline_id": baseline["id"],
            "passed": result.passed,
            "similarity_score": result.similarity_score,
            "threshold": threshold,
            "diff_pixel_count": result.diff_pixel_count,
            "total_pixels": result.total_pixels,
            "diff_image_path": str(result.diff_image_path) if result.diff_image_path else None,
        }

    def get_comparison_history(
        self,
        baseline_id: int | None = None,
        execution_id: int | None = None,
        limit: int = 50,
    ) -> list[dict[str, Any]]:
        """
        Get comparison history with optional filtering.

        Args:
            baseline_id: Filter by baseline
            execution_id: Filter by execution
            limit: Maximum results to return

        Returns:
            List of comparison result dictionaries
        """
        query = select(ComparisonResultModel)

        if baseline_id:
            query = query.where(ComparisonResultModel.baseline_id == baseline_id)

        if execution_id:
            query = query.where(ComparisonResultModel.execution_id == execution_id)

        query = query.order_by(ComparisonResultModel.created_at.desc()).limit(limit)

        result = self.session.execute(query)
        comparisons = result.scalars().all()

        return [c.to_dict() for c in comparisons]
