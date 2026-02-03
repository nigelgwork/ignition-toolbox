"""
Pydantic models for Stack Builder API.
"""

from typing import Any

from pydantic import BaseModel, Field, field_validator

# Validation patterns for Docker-compatible names
VALID_NAME_PATTERN = r"^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,63}$"
RESERVED_NAMES = {"docker", "host", "none", "bridge", "null", "default"}


class InstanceConfig(BaseModel):
    """Configuration for a single service instance"""

    app_id: str = Field(..., min_length=1, max_length=64)
    instance_name: str = Field(
        ...,
        min_length=1,
        max_length=64,
        pattern=VALID_NAME_PATTERN,
        description="Docker-compatible instance name",
    )
    config: dict[str, Any] = Field(default_factory=dict)

    @field_validator("instance_name")
    @classmethod
    def validate_instance_name(cls, v: str) -> str:
        """Validate instance name is not reserved"""
        if v.lower() in RESERVED_NAMES:
            raise ValueError(f"Instance name '{v}' is reserved")
        return v


class GlobalSettingsRequest(BaseModel):
    """Global settings for the entire stack"""

    stack_name: str = Field(
        default="iiot-stack",
        min_length=1,
        max_length=64,
        pattern=VALID_NAME_PATTERN,
        description="Docker-compatible stack name",
    )
    timezone: str = "UTC"
    restart_policy: str = "unless-stopped"

    @field_validator("stack_name")
    @classmethod
    def validate_stack_name(cls, v: str) -> str:
        """Validate stack name is not reserved"""
        if v.lower() in RESERVED_NAMES:
            raise ValueError(f"Stack name '{v}' is reserved")
        return v


class IntegrationSettingsRequest(BaseModel):
    """Settings for automatic integrations"""

    reverse_proxy: dict[str, Any] | None = None
    mqtt: dict[str, Any] | None = None
    oauth: dict[str, Any] | None = None
    database: dict[str, Any] | None = None
    email: dict[str, Any] | None = None


class StackConfig(BaseModel):
    """Complete stack configuration"""

    instances: list[InstanceConfig]
    global_settings: GlobalSettingsRequest | None = None
    integration_settings: IntegrationSettingsRequest | None = None


class SavedStackCreate(BaseModel):
    """Request to save a stack configuration"""

    stack_name: str = Field(
        ...,
        min_length=1,
        max_length=64,
        pattern=VALID_NAME_PATTERN,
        description="Docker-compatible stack name",
    )
    description: str | None = None
    config_json: dict[str, Any]
    global_settings: dict[str, Any] | None = None

    @field_validator("stack_name")
    @classmethod
    def validate_stack_name(cls, v: str) -> str:
        """Validate stack name is not reserved"""
        if v.lower() in RESERVED_NAMES:
            raise ValueError(f"Stack name '{v}' is reserved")
        return v


class SavedStackInfo(BaseModel):
    """Saved stack information"""

    id: int
    stack_name: str
    description: str | None
    config_json: dict[str, Any]
    global_settings: dict[str, Any] | None
    created_at: str | None
    updated_at: str | None


class DeployStackRequest(BaseModel):
    """Request to deploy a stack to local Docker"""

    stack_name: str = Field(
        ...,
        min_length=1,
        max_length=64,
        pattern=VALID_NAME_PATTERN,
        description="Docker-compatible stack name",
    )
    stack_config: StackConfig

    @field_validator("stack_name")
    @classmethod
    def validate_stack_name(cls, v: str) -> str:
        """Validate stack name is not reserved"""
        if v.lower() in RESERVED_NAMES:
            raise ValueError(f"Stack name '{v}' is reserved")
        return v


class DeploymentStatus(BaseModel):
    """Status of a deployed stack"""

    status: str  # running, partial, stopped, not_deployed, unknown
    services: dict[str, str]  # service_name -> status
    error: str | None = None


class DeploymentResult(BaseModel):
    """Result of a deployment operation"""

    success: bool
    output: str | None = None
    error: str | None = None
