#!/bin/bash
# designer-desktop/scripts/launch-designer.sh
#
# Launches the Ignition Designer Launcher and automates gateway setup/login.
# The Designer Launcher doesn't support command-line args for gateway/credentials,
# so we use xdotool to automate the UI interaction.
#
# NOTE: Do NOT use set -e here. GUI automation is inherently fragile and
# individual command failures should not abort the entire script.

LAUNCHER_DIR="/home/designer/.local/share/designerlauncher"
LOG_FILE="/tmp/launch-designer.log"
CREDENTIALS_FILE="/tmp/designer-credentials.env"
AUTOMATION_SCRIPT="/usr/local/bin/automate-designer-login.sh"

# Source credentials file if it exists (written by start-desktop.sh)
if [ -f "$CREDENTIALS_FILE" ]; then
    source "$CREDENTIALS_FILE"
fi

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log "=========================================="
log "CloudDesigner Auto-Launch"
log "=========================================="
log "Script PID: $$"
log "DISPLAY=$DISPLAY"

# Wait for the X session to be fully ready
# XFCE autostart fires early, but the X server and window manager may not be
# fully initialized yet. We wait for xdotool to successfully query the desktop.
log "Waiting for X session to be ready..."
X_READY=false
for i in $(seq 1 30); do
    if xdotool getactivewindow >/dev/null 2>&1; then
        X_READY=true
        log "X session ready after ${i}s"
        break
    fi
    sleep 1
done

if [ "$X_READY" = false ]; then
    log "WARNING: X session may not be fully ready after 30s, proceeding anyway"
fi

# Extra delay for XFCE panel and desktop to finish initializing
sleep 3

# Check if launcher exists
if [ ! -f "$LAUNCHER_DIR/designerlauncher.sh" ]; then
    log "ERROR: Designer launcher not found at $LAUNCHER_DIR"
    log "The launcher should have been initialized by start-desktop.sh"
    log "Contents of $LAUNCHER_DIR:"
    ls -la "$LAUNCHER_DIR" >> "$LOG_FILE" 2>&1 || true
    exit 1
fi

# Log credentials status
if [ -n "$IGNITION_GATEWAY_URL" ]; then
    log "Gateway URL: $IGNITION_GATEWAY_URL"
else
    log "WARNING: No gateway URL provided"
fi

if [ -n "$IGNITION_USERNAME" ] && [ -n "$IGNITION_PASSWORD" ]; then
    log "Auto-login enabled for user: $IGNITION_USERNAME"
else
    log "No credentials provided - manual login required"
fi

# Check if xdotool is available for automation
if command -v xdotool &> /dev/null && [ -n "$IGNITION_GATEWAY_URL" ]; then
    log "xdotool available - will automate gateway setup and login"

    # Start the automation script in the background
    # It will wait for the launcher window and then automate the UI
    if [ -x "$AUTOMATION_SCRIPT" ]; then
        log "Starting automation script in background..."
        nohup "$AUTOMATION_SCRIPT" >> /tmp/automate-designer.log 2>&1 &
        AUTOMATION_PID=$!
        log "Automation script started with PID: $AUTOMATION_PID"
    else
        log "WARNING: Automation script not found or not executable: $AUTOMATION_SCRIPT"
    fi
else
    log "xdotool not available or no gateway URL - manual setup required"
fi

log "Launching Designer Launcher..."
log "Launcher script: $LAUNCHER_DIR/designerlauncher.sh"

# Launch the Designer Launcher (without args - they don't work)
# The automation script will handle gateway setup and login
cd "$LAUNCHER_DIR"
exec ./designerlauncher.sh "$@"
