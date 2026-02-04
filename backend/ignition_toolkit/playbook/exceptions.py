"""
Playbook execution exceptions

Provides a consistent exception structure for playbook-related errors
with clear error messages, recovery hints, and context information.
"""

from typing import Any


class PlaybookError(Exception):
    """
    Base exception for playbook errors

    Attributes:
        message: Error message
        recovery_hint: Optional hint for recovery
        context: Additional context information
    """

    def __init__(
        self,
        message: str,
        recovery_hint: str = "",
        context: dict[str, Any] | None = None,
    ):
        self.recovery_hint = recovery_hint
        self.context = context or {}
        super().__init__(message)

    def __str__(self) -> str:
        msg = super().__str__()
        if self.recovery_hint:
            msg += f"\n💡 Recovery: {self.recovery_hint}"
        return msg


class PlaybookLoadError(PlaybookError):
    """
    Error loading playbook from file

    Attributes:
        file_path: Path to the playbook file
        line_number: Optional line number where error occurred
    """

    def __init__(
        self,
        message: str,
        file_path: str = "",
        line_number: int | None = None,
        recovery_hint: str = "",
    ):
        self.file_path = file_path
        self.line_number = line_number

        # Build contextual message
        location = ""
        if file_path:
            location = f" in '{file_path}'"
            if line_number:
                location += f" at line {line_number}"

        full_message = f"Failed to load playbook{location}: {message}"

        default_hint = "Check YAML syntax and file encoding"
        super().__init__(
            full_message,
            recovery_hint=recovery_hint or default_hint,
            context={"file_path": file_path, "line_number": line_number},
        )


class PlaybookValidationError(PlaybookError):
    """
    Error validating playbook structure

    Attributes:
        field: The field that failed validation
        value: The invalid value
    """

    def __init__(
        self,
        message: str,
        field: str = "",
        value: Any = None,
        recovery_hint: str = "",
    ):
        self.field = field
        self.value = value

        default_hint = "Check the playbook structure matches the expected schema"
        super().__init__(
            message,
            recovery_hint=recovery_hint or default_hint,
            context={"field": field, "value": value},
        )


class PlaybookExecutionError(PlaybookError):
    """
    Error during playbook execution

    Attributes:
        playbook_name: Name of the playbook that failed
        step_index: Index of the step where error occurred
    """

    def __init__(
        self,
        message: str,
        playbook_name: str = "",
        step_index: int | None = None,
        recovery_hint: str = "",
    ):
        self.playbook_name = playbook_name
        self.step_index = step_index

        # Build contextual message
        location = ""
        if playbook_name:
            location = f" in '{playbook_name}'"
            if step_index is not None:
                location += f" at step {step_index + 1}"

        full_message = f"Execution failed{location}: {message}"

        default_hint = "Check the playbook configuration and target system state"
        super().__init__(
            full_message,
            recovery_hint=recovery_hint or default_hint,
            context={"playbook_name": playbook_name, "step_index": step_index},
        )


class StepExecutionError(PlaybookError):
    """
    Error executing individual step

    Attributes:
        step_id: Identifier of the step that failed
        step_type: Type of the step (e.g., 'browser.navigate')
        original_error: The underlying exception if any
    """

    def __init__(
        self,
        step_id: str,
        message: str,
        step_type: str = "",
        original_error: Exception | None = None,
        recovery_hint: str = "",
    ):
        self.step_id = step_id
        self.step_type = step_type
        self.original_error = original_error

        full_message = f"Step '{step_id}' failed: {message}"
        if step_type:
            full_message = f"Step '{step_id}' ({step_type}) failed: {message}"

        super().__init__(
            full_message,
            recovery_hint=recovery_hint,
            context={
                "step_id": step_id,
                "step_type": step_type,
                "original_error": str(original_error) if original_error else None,
            },
        )


class ParameterResolutionError(PlaybookError):
    """
    Error resolving parameter value

    Attributes:
        parameter_name: Name of the parameter that couldn't be resolved
        expression: The expression that failed to resolve
    """

    def __init__(
        self,
        parameter_name: str,
        message: str = "",
        expression: str = "",
        recovery_hint: str = "",
    ):
        self.parameter_name = parameter_name
        self.expression = expression

        full_message = f"Failed to resolve parameter '{parameter_name}'"
        if message:
            full_message += f": {message}"
        if expression:
            full_message += f" (expression: {expression})"

        default_hint = "Check that the parameter is defined and the expression syntax is correct"
        super().__init__(
            full_message,
            recovery_hint=recovery_hint or default_hint,
            context={"parameter_name": parameter_name, "expression": expression},
        )


class YAMLParseError(PlaybookLoadError):
    """
    YAML parsing error with line number information

    Attributes:
        line_number: Line where the error occurred
        column: Column where the error occurred
        yaml_snippet: Snippet of YAML around the error
    """

    def __init__(
        self,
        message: str,
        file_path: str = "",
        line_number: int | None = None,
        column: int | None = None,
        yaml_snippet: str = "",
    ):
        self.column = column
        self.yaml_snippet = yaml_snippet

        # Build helpful recovery hint based on common YAML issues
        recovery_hints = [
            "Check indentation (use spaces, not tabs)",
            "Ensure colons are followed by a space",
            "Quote strings containing special characters",
        ]

        super().__init__(
            message,
            file_path=file_path,
            line_number=line_number,
            recovery_hint=". ".join(recovery_hints),
        )
        self.context["column"] = column
        self.context["yaml_snippet"] = yaml_snippet


class BrowserNotAvailableError(PlaybookExecutionError):
    """Browser is not available for browser-type steps"""

    def __init__(self, step_id: str = "", message: str = ""):
        super().__init__(
            message or "Browser is not available",
            recovery_hint="Ensure the playbook includes a browser.launch step before browser operations",
            step_index=None,
        )
        self.context["step_id"] = step_id


class GatewayNotConfiguredError(PlaybookExecutionError):
    """Gateway is not configured for gateway-type steps"""

    def __init__(self, step_id: str = "", message: str = ""):
        super().__init__(
            message or "Gateway is not configured",
            recovery_hint="Provide gateway_url and credential_name when starting the execution",
            step_index=None,
        )
        self.context["step_id"] = step_id
