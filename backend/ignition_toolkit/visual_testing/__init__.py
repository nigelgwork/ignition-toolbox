"""
Visual Testing Module

Provides screenshot baseline management and visual comparison functionality
for regression testing.
"""

from ignition_toolkit.visual_testing.baseline_manager import BaselineManager
from ignition_toolkit.visual_testing.comparison import ScreenshotComparator, ComparisonResult

__all__ = [
    "BaselineManager",
    "ScreenshotComparator",
    "ComparisonResult",
]
