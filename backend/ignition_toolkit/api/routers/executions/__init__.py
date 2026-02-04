"""
Execution management router package

Split from executions.py for better maintainability:
- models.py: Pydantic request/response models
- helpers.py: ExecutionContext, helper functions, background tasks
- main.py: FastAPI router endpoints
"""

from ignition_toolkit.api.routers.executions.main import router

__all__ = ["router"]
