"""
CloudDesigner module - Docker-based browser-accessible Ignition Designer

Manages the ignition-designer-browser Docker stack that provides:
- VNC-accessible Ubuntu desktop with Ignition Designer
- Guacamole web interface for browser access
- Auto-connection to configured Ignition gateways
"""

from ignition_toolkit.clouddesigner.manager import (
    CloudDesignerManager,
    get_clouddesigner_manager,
)
from ignition_toolkit.clouddesigner.models import (
    CloudDesignerStatus,
    ContainerStatus,
    DockerStatus,
)

__all__ = [
    "CloudDesignerManager",
    "CloudDesignerStatus",
    "ContainerStatus",
    "DockerStatus",
    "get_clouddesigner_manager",
]
