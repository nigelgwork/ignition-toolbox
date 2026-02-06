#!/usr/bin/env python3
"""
Backend entry point for the Ignition Toolkit server.

This script starts the FastAPI server with configuration from environment variables.
It supports multiple deployment modes:
- Electron subprocess (spawned by the Electron main process)
- Docker container (configured via environment variables)
- Standalone (run directly with Python)
"""

import os
import sys
import logging
import traceback

# Force UTF-8 encoding for stdout/stderr on Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)

logger = logging.getLogger(__name__)


def global_exception_handler(exc_type, exc_value, exc_tb):
    """Global exception handler to log unhandled exceptions before crash."""
    logger.error("=" * 60)
    logger.error("UNHANDLED EXCEPTION - Backend is crashing!")
    logger.error("=" * 60)
    logger.error(f"Type: {exc_type.__name__}")
    logger.error(f"Value: {exc_value}")
    logger.error("Traceback:")
    for line in traceback.format_tb(exc_tb):
        for subline in line.strip().split('\n'):
            logger.error(f"  {subline}")
    logger.error("=" * 60)
    sys.stdout.flush()
    sys.stderr.flush()


# Install global exception handler
sys.excepthook = global_exception_handler


def main():
    """Start the FastAPI backend server."""
    import uvicorn

    # Get configuration from environment variables (set by Electron or Docker)
    host = os.environ.get("IGNITION_TOOLKIT_HOST", "127.0.0.1")
    port = int(os.environ.get("IGNITION_TOOLKIT_PORT", "5000"))

    # Data directory is set by Electron to app userData path
    data_dir = os.environ.get("IGNITION_TOOLKIT_DATA")
    if data_dir:
        logger.info(f"Using data directory: {data_dir}")

    logger.info(f"Starting Ignition Toolkit backend on {host}:{port}")

    # Configure CORS to allow the Electron app
    # The frontend will connect via the dynamic port
    allowed_origins = f"http://localhost:{port},http://127.0.0.1:{port},http://localhost:3000,http://127.0.0.1:3000"
    os.environ["ALLOWED_ORIGINS"] = allowed_origins

    try:
        # Import app directly for PyInstaller compatibility
        # (string imports don't work well with frozen executables)
        from ignition_toolkit.api.app import app

        uvicorn.run(
            app,
            host=host,
            port=port,
            log_level="info",
            reload=False,  # No reload in production
            workers=1,     # Single worker for subprocess
            access_log=True,
        )
    except KeyboardInterrupt:
        logger.info("Backend shutdown requested")
    except Exception as e:
        logger.error(f"Failed to start backend: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
