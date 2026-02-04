"""
Pydantic models for execution endpoints

Request/response models used by the execution router.
"""

from pydantic import BaseModel


class PlaybookCodeUpdateRequest(BaseModel):
    """Request to update playbook code during execution"""

    code: str


class BrowserClickRequest(BaseModel):
    """Request to click at coordinates in browser"""

    x: int
    y: int
