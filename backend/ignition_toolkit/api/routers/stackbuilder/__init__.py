"""
Stack Builder API Routes Package

This package contains the Stack Builder API endpoints split into logical modules:
- models: Pydantic request/response models
- installer_scripts: Docker installer shell scripts
- main: The router with all endpoints
"""

from ignition_toolkit.api.routers.stackbuilder.main import router
from ignition_toolkit.api.routers.stackbuilder.models import (
    DeploymentResult,
    DeploymentStatus,
    DeployStackRequest,
    GlobalSettingsRequest,
    InstanceConfig,
    IntegrationSettingsRequest,
    RESERVED_NAMES,
    SavedStackCreate,
    SavedStackInfo,
    StackConfig,
    VALID_NAME_PATTERN,
)

__all__ = [
    "DeploymentResult",
    "DeploymentStatus",
    "DeployStackRequest",
    "GlobalSettingsRequest",
    "InstanceConfig",
    "IntegrationSettingsRequest",
    "RESERVED_NAMES",
    "router",
    "SavedStackCreate",
    "SavedStackInfo",
    "StackConfig",
    "VALID_NAME_PATTERN",
]
