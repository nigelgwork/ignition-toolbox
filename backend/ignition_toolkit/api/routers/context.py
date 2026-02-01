"""
Context API Router

Provides project context for AI assistants (Clawdbot).
Returns summary information about playbooks, executions, credentials, and system status.
"""

import logging
from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ignition_toolkit.credentials import CredentialVault
from ignition_toolkit.storage import get_database

logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/context", tags=["context"])


# ============================================================================
# Pydantic Models
# ============================================================================


class PlaybookSummary(BaseModel):
    """Summary of a playbook for AI context"""

    name: str
    description: str | None = None
    domain: str | None = None
    step_count: int = 0
    path: str


class ExecutionSummary(BaseModel):
    """Summary of an execution for AI context"""

    execution_id: str
    playbook_name: str
    status: str
    started_at: datetime | None = None
    completed_at: datetime | None = None
    error: str | None = None


class CredentialSummary(BaseModel):
    """Summary of a credential (names only, no secrets)"""

    name: str
    has_gateway_url: bool = False


class CloudDesignerSummary(BaseModel):
    """CloudDesigner status summary"""

    status: str  # running, stopped, not_created, unknown
    port: int | None = None


class SystemSummary(BaseModel):
    """System status summary"""

    browser_available: bool = False
    active_executions: int = 0


class ContextSummaryResponse(BaseModel):
    """Complete context summary for AI assistant"""

    playbooks: list[PlaybookSummary]
    recent_executions: list[ExecutionSummary]
    credentials: list[CredentialSummary]
    clouddesigner: CloudDesignerSummary
    system: SystemSummary


# ============================================================================
# Routes
# ============================================================================


@router.get("/summary", response_model=ContextSummaryResponse)
async def get_context_summary():
    """
    Get project context summary for AI assistant.

    Returns:
        ContextSummaryResponse with playbooks, executions, credentials, and system info
    """
    try:
        # Get playbooks
        playbooks = await _get_playbooks_summary()

        # Get recent executions
        executions = await _get_executions_summary()

        # Get credential names
        credentials = await _get_credentials_summary()

        # Get CloudDesigner status
        clouddesigner = await _get_clouddesigner_summary()

        # Get system status
        system = await _get_system_summary()

        return ContextSummaryResponse(
            playbooks=playbooks,
            recent_executions=executions,
            credentials=credentials,
            clouddesigner=clouddesigner,
            system=system,
        )
    except Exception as e:
        logger.exception("Error getting context summary")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Helper Functions
# ============================================================================


async def _get_playbooks_summary() -> list[PlaybookSummary]:
    """Get summary of all playbooks"""
    from ignition_toolkit.core.paths import get_playbooks_dir
    from ignition_toolkit.playbook.loader import PlaybookLoader

    playbooks = []
    playbooks_dir = get_playbooks_dir()

    if not playbooks_dir.exists():
        return playbooks

    # Find all YAML files in playbooks directory
    for yaml_file in playbooks_dir.rglob("*.yaml"):
        try:
            playbook = PlaybookLoader.load_from_file(yaml_file)
            relative_path = yaml_file.relative_to(playbooks_dir)

            playbooks.append(
                PlaybookSummary(
                    name=playbook.name,
                    description=playbook.description,
                    domain=playbook.domain,
                    step_count=len(playbook.steps) if playbook.steps else 0,
                    path=str(relative_path),
                )
            )
        except Exception as e:
            logger.warning(f"Failed to load playbook {yaml_file}: {e}")
            continue

    return playbooks


async def _get_executions_summary(limit: int = 10) -> list[ExecutionSummary]:
    """Get summary of recent executions"""
    db = get_database()
    executions = []

    if not db:
        return executions

    try:
        with db.session_scope() as session:
            from ignition_toolkit.storage.models import ExecutionModel

            db_executions = (
                session.query(ExecutionModel)
                .order_by(ExecutionModel.started_at.desc())
                .limit(limit)
                .all()
            )

            for db_exec in db_executions:
                executions.append(
                    ExecutionSummary(
                        execution_id=db_exec.execution_id,
                        playbook_name=db_exec.playbook_name,
                        status=db_exec.status,
                        started_at=db_exec.started_at,
                        completed_at=db_exec.completed_at,
                        error=db_exec.error_message,
                    )
                )
    except Exception as e:
        logger.exception(f"Error loading executions summary: {e}")

    return executions


async def _get_credentials_summary() -> list[CredentialSummary]:
    """Get summary of credentials (names only)"""
    credentials = []

    try:
        vault = CredentialVault()
        stored_credentials = vault.list_credentials()

        for cred in stored_credentials:
            credentials.append(
                CredentialSummary(
                    name=cred.name,
                    has_gateway_url=bool(cred.gateway_url),
                )
            )
    except Exception as e:
        logger.warning(f"Error loading credentials summary: {e}")

    return credentials


async def _get_clouddesigner_summary() -> CloudDesignerSummary:
    """Get CloudDesigner status summary"""
    import asyncio

    try:
        from ignition_toolkit.clouddesigner.manager import get_clouddesigner_manager

        manager = get_clouddesigner_manager()
        status = await asyncio.to_thread(manager.get_container_status)

        return CloudDesignerSummary(
            status=status.status,
            port=status.port,
        )
    except Exception as e:
        logger.warning(f"Error getting CloudDesigner status: {e}")
        return CloudDesignerSummary(status="unknown")


async def _get_system_summary() -> SystemSummary:
    """Get system status summary"""
    try:
        from ignition_toolkit.api.app import active_engines

        return SystemSummary(
            browser_available=True,  # Playwright is always available if backend is running
            active_executions=len(active_engines),
        )
    except Exception as e:
        logger.warning(f"Error getting system summary: {e}")
        return SystemSummary()
