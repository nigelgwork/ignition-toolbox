"""
Visual Testing Baselines API

REST endpoints for managing screenshot baselines and comparisons.
"""

import logging
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel

from ignition_toolkit.storage.database import get_session
from ignition_toolkit.visual_testing import BaselineManager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/baselines", tags=["baselines"])

# Directory configuration
BASELINES_DIR = Path.home() / ".ignition-toolbox" / "baselines"
COMPARISONS_DIR = BASELINES_DIR / "comparisons"


def get_baseline_manager() -> BaselineManager:
    """Get baseline manager instance with database session."""
    session = get_session()
    return BaselineManager(
        session=session,
        baselines_dir=BASELINES_DIR,
        comparisons_dir=COMPARISONS_DIR,
    )


# Request/Response models
class CreateBaselineRequest(BaseModel):
    """Request to create a baseline from a screenshot path."""
    name: str
    screenshot_path: str
    playbook_path: str | None = None
    step_id: str | None = None
    description: str | None = None
    auto_approve: bool = False


class UpdateIgnoreRegionsRequest(BaseModel):
    """Request to update ignore regions."""
    regions: list[dict[str, int]]


class CompareScreenshotRequest(BaseModel):
    """Request to compare a screenshot against a baseline."""
    baseline_name: str
    screenshot_path: str
    threshold: float = 99.9
    execution_id: int | None = None


class BaselineResponse(BaseModel):
    """Baseline information response."""
    id: int
    name: str
    playbook_path: str | None
    step_id: str | None
    version: int
    screenshot_path: str
    width: int | None
    height: int | None
    status: str
    ignore_regions: list[dict[str, int]] | None
    created_at: str | None
    approved_at: str | None
    approved_by: str | None
    description: str | None


class ComparisonResponse(BaseModel):
    """Comparison result response."""
    comparison_id: int
    baseline_name: str
    baseline_id: int
    passed: bool
    similarity_score: float
    threshold: float
    diff_pixel_count: int
    total_pixels: int
    diff_image_path: str | None


# Endpoints
@router.get("", response_model=list[BaselineResponse])
async def list_baselines(
    status: str | None = None,
    playbook_path: str | None = None,
):
    """
    List all baselines.

    Args:
        status: Filter by status (pending, approved, rejected)
        playbook_path: Filter by associated playbook
    """
    manager = get_baseline_manager()
    baselines = manager.list_baselines(status=status, playbook_path=playbook_path)
    return baselines


@router.get("/{baseline_id}", response_model=BaselineResponse)
async def get_baseline(baseline_id: int):
    """Get a baseline by ID."""
    manager = get_baseline_manager()
    baseline = manager.get_baseline(baseline_id)

    if not baseline:
        raise HTTPException(status_code=404, detail=f"Baseline not found: {baseline_id}")

    return baseline


@router.post("", response_model=BaselineResponse)
async def create_baseline(request: CreateBaselineRequest):
    """
    Create a new baseline from a screenshot.

    The screenshot must exist at the specified path.
    """
    manager = get_baseline_manager()

    try:
        baseline = manager.create_baseline(
            name=request.name,
            screenshot_path=Path(request.screenshot_path),
            playbook_path=request.playbook_path,
            step_id=request.step_id,
            description=request.description,
            auto_approve=request.auto_approve,
        )
        return baseline
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/upload", response_model=BaselineResponse)
async def upload_baseline(
    file: UploadFile = File(...),
    name: str = Form(...),
    playbook_path: str | None = Form(None),
    step_id: str | None = Form(None),
    description: str | None = Form(None),
    auto_approve: bool = Form(False),
):
    """
    Create a baseline by uploading a screenshot file.
    """
    manager = get_baseline_manager()

    # Save uploaded file temporarily
    temp_path = BASELINES_DIR / f"temp_{file.filename}"
    try:
        with open(temp_path, "wb") as f:
            content = await file.read()
            f.write(content)

        baseline = manager.create_baseline(
            name=name,
            screenshot_path=temp_path,
            playbook_path=playbook_path,
            step_id=step_id,
            description=description,
            auto_approve=auto_approve,
        )
        return baseline
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        # Clean up temp file
        if temp_path.exists():
            temp_path.unlink()


@router.post("/{baseline_id}/approve", response_model=BaselineResponse)
async def approve_baseline(
    baseline_id: int,
    approved_by: str | None = None,
):
    """Approve a baseline for use in comparisons."""
    manager = get_baseline_manager()

    try:
        baseline = manager.approve_baseline(baseline_id, approved_by=approved_by)
        return baseline
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{baseline_id}/reject", response_model=BaselineResponse)
async def reject_baseline(baseline_id: int):
    """Reject a baseline."""
    manager = get_baseline_manager()

    try:
        baseline = manager.reject_baseline(baseline_id)
        return baseline
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/{baseline_id}", response_model=BaselineResponse)
async def update_baseline(baseline_id: int, screenshot_path: str):
    """
    Update a baseline with a new screenshot.

    Increments version and marks as pending approval.
    """
    manager = get_baseline_manager()

    try:
        baseline = manager.update_baseline(baseline_id, Path(screenshot_path))
        return baseline
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{baseline_id}/ignore-regions", response_model=BaselineResponse)
async def update_ignore_regions(
    baseline_id: int,
    request: UpdateIgnoreRegionsRequest,
):
    """Set ignore regions for a baseline."""
    manager = get_baseline_manager()

    try:
        baseline = manager.set_ignore_regions(baseline_id, request.regions)
        return baseline
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/{baseline_id}")
async def delete_baseline(baseline_id: int):
    """Delete a baseline and its associated files."""
    manager = get_baseline_manager()

    try:
        manager.delete_baseline(baseline_id)
        return {"status": "deleted", "baseline_id": baseline_id}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/compare", response_model=ComparisonResponse)
async def compare_screenshot(request: CompareScreenshotRequest):
    """
    Compare a screenshot against a baseline.

    Returns comparison result with similarity score and pass/fail status.
    """
    manager = get_baseline_manager()

    try:
        result = await manager.compare_screenshot(
            baseline_name=request.baseline_name,
            screenshot_path=Path(request.screenshot_path),
            threshold=request.threshold,
            execution_id=request.execution_id,
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/comparisons/history")
async def get_comparison_history(
    baseline_id: int | None = None,
    execution_id: int | None = None,
    limit: int = 50,
):
    """Get comparison history with optional filtering."""
    manager = get_baseline_manager()
    comparisons = manager.get_comparison_history(
        baseline_id=baseline_id,
        execution_id=execution_id,
        limit=limit,
    )
    return comparisons
