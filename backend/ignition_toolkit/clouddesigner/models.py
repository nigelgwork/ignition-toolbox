"""
CloudDesigner data models.

Contains dataclasses for Docker and container status.
"""

from dataclasses import dataclass
from typing import Literal

ContainerStatus = Literal["running", "exited", "paused", "not_created", "unknown"]


@dataclass
class DockerStatus:
    """Docker daemon status."""

    installed: bool
    running: bool
    version: str | None = None
    docker_path: str | None = None


@dataclass
class CloudDesignerStatus:
    """CloudDesigner container status."""

    status: ContainerStatus
    port: int | None = None
    error: str | None = None
