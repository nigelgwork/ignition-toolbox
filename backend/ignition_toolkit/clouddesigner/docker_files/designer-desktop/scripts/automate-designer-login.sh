#!/bin/bash
# designer-desktop/scripts/automate-designer-login.sh
#
# Automates the Designer Launcher gateway setup and login using xdotool.
#
# Automation steps:
# 1. Wait for Designer Launcher window to appear
# 2. Click "Add Designer" button to open the dialog
# 3. Click on "On Your Network" tab, then use Right arrow to switch to "Manual" tab
# 4. Tab to the Gateway URL input field and type the URL
# 5. Press Enter to submit and add the gateway
# 6. Optionally handle login dialog if credentials are provided
#
# Screenshots are saved to /tmp/automation-screenshots/ for debugging.

set -e

LOG_FILE="/tmp/automate-designer.log"
CREDENTIALS_FILE="/tmp/designer-credentials.env"
SCREENSHOT_DIR="/tmp/automation-screenshots"

mkdir -p "$SCREENSHOT_DIR"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_FILE"
}

screenshot() {
    local name="$1"
    local filename="${SCREENSHOT_DIR}/$(date +%Y%m%d_%H%M%S)_${name}.png"
    if command -v scrot &> /dev/null; then
        DISPLAY=:1 scrot "$filename" 2>/dev/null || true
        log "Screenshot saved: $filename"
    fi
}

click_at() {
    local x="$1"
    local y="$2"
    local desc="$3"
    log "Clicking at ($x, $y): $desc"
    xdotool mousemove --sync $x $y
    sleep 0.3
    xdotool click 1
    sleep 0.5
}

log "=========================================="
log "Designer Launcher Automation Starting"
log "=========================================="

if [ -f "$CREDENTIALS_FILE" ]; then
    source "$CREDENTIALS_FILE"
    log "Loaded credentials from $CREDENTIALS_FILE"
else
    log "ERROR: Credentials file not found: $CREDENTIALS_FILE"
    exit 1
fi

if [ -z "$IGNITION_GATEWAY_URL" ]; then
    log "No gateway URL provided - skipping automation"
    exit 0
fi

# Keep the full URL with protocol for Manual tab entry (e.g., http://192.168.48.1:8088)
# Just remove trailing slash if present
GATEWAY_ADDRESS=$(echo "$IGNITION_GATEWAY_URL" | sed 's|/$||')
log "Gateway URL: $GATEWAY_ADDRESS"
log "Username: ${IGNITION_USERNAME:-not set}"

export DISPLAY=:1

log "Waiting for Designer Launcher window..."
LAUNCHER_WINDOW=""
MAX_WAIT=90
WAITED=0

while [ -z "$LAUNCHER_WINDOW" ] && [ $WAITED -lt $MAX_WAIT ]; do
    sleep 2
    WAITED=$((WAITED + 2))
    LAUNCHER_WINDOW=$(xdotool search --name "Designer Launcher" 2>/dev/null | head -1) || true
    if [ -z "$LAUNCHER_WINDOW" ]; then
        LAUNCHER_WINDOW=$(xdotool search --name "Ignition" 2>/dev/null | head -1) || true
    fi
    log "Waiting... ($WAITED/$MAX_WAIT seconds)"
done

if [ -z "$LAUNCHER_WINDOW" ]; then
    log "ERROR: Designer Launcher window not found after ${MAX_WAIT}s"
    screenshot "timeout_no_window"
    exit 1
fi

log "Found Designer Launcher window: $LAUNCHER_WINDOW"
xdotool windowactivate --sync "$LAUNCHER_WINDOW"
sleep 3

eval $(xdotool getwindowgeometry --shell "$LAUNCHER_WINDOW")
log "Window geometry: X=$X, Y=$Y, WIDTH=$WIDTH, HEIGHT=$HEIGHT"

screenshot "01_launcher_ready"

# ============================================
# AUTOMATION STEPS
# ============================================
# 1. Click "Add Designer" button to open dialog
# 2. Click directly on the "Manual" tab (Alt+M doesn't work reliably)
# 3. Click on the gateway URL input field
# 4. Type the gateway address
# 5. Press Enter to submit
# ============================================

# Step 1: Click "Add Designer" button in main view
ADD_BTN_X=$((X + WIDTH / 2))
ADD_BTN_Y=$((Y + 90 + (HEIGHT - 90) * 55 / 100))
log "Step 1: Click 'Add Designer' button at ($ADD_BTN_X, $ADD_BTN_Y)"
click_at $ADD_BTN_X $ADD_BTN_Y "Add Designer button"
sleep 3  # Wait longer for dialog to fully render

screenshot "02_after_add_designer_click"

# Step 2: Switch to Manual tab using Right arrow key
# In Java Swing, when a tabbed pane has focus, Left/Right arrows switch tabs
# First click on the On Your Network tab to ensure tab bar has focus
# Then press Right arrow to move to Manual tab
log "Step 2: Navigate to Manual tab using arrow keys"

# Click on the "On Your Network" tab text to give it focus
# This tab is at approximately dialog_left + 70 (for the tab text center)
ON_YOUR_NETWORK_X=$((X + WIDTH * 22 / 100))
ON_YOUR_NETWORK_Y=$((Y + 35))
log "Clicking On Your Network tab at ($ON_YOUR_NETWORK_X, $ON_YOUR_NETWORK_Y) to focus tab bar"
click_at $ON_YOUR_NETWORK_X $ON_YOUR_NETWORK_Y "On Your Network tab"
sleep 0.5
screenshot "03a_on_your_network_clicked"

# Now press Right arrow to switch to Manual tab
log "Pressing Right arrow to switch to Manual tab"
xdotool key Right
sleep 0.5
screenshot "03b_after_right_arrow"

# Press Enter or Space to activate the Manual tab
xdotool key space
sleep 1

screenshot "03_manual_tab_activated"

# Step 3: The Manual tab content should be visible now
# The URL input field should be focused or we need to Tab to it
xdotool key Tab
sleep 0.3

screenshot "03c_input_field_focused"

# Step 4: Type the gateway address
log "Step 4: Enter gateway address"
xdotool type --clearmodifiers --delay 50 "$GATEWAY_ADDRESS"
log "Typed gateway address: $GATEWAY_ADDRESS"
sleep 1

screenshot "04_address_entered"

# Step 5: Press Enter to submit
log "Step 5: Submit gateway"
xdotool key Return
sleep 3

screenshot "05_after_submit"

# Wait for connection
log "Waiting for gateway connection..."
sleep 5

screenshot "06_after_wait"

# Check if we need to handle login
if [ -z "$IGNITION_USERNAME" ] || [ -z "$IGNITION_PASSWORD" ]; then
    log "No credentials provided - stopping automation"
    screenshot "07_no_credentials"
    exit 0
fi

log "Checking for login prompt..."
sleep 2

# Look for login dialog
LOGIN_WINDOW=""
for pattern in "Login" "Sign In" "Authentication" "Credentials"; do
    LOGIN_WINDOW=$(xdotool search --name "$pattern" 2>/dev/null | head -1) || true
    if [ -n "$LOGIN_WINDOW" ]; then
        log "Found $pattern window: $LOGIN_WINDOW"
        break
    fi
done

screenshot "07_login_check"

if [ -n "$LOGIN_WINDOW" ]; then
    xdotool windowactivate --sync "$LOGIN_WINDOW"
    sleep 1

    log "Entering credentials"
    xdotool type --clearmodifiers --delay 30 "$IGNITION_USERNAME"
    log "Entered username: $IGNITION_USERNAME"
    sleep 0.5

    screenshot "08_username_entered"

    xdotool key Tab
    sleep 0.3
    xdotool type --clearmodifiers --delay 30 "$IGNITION_PASSWORD"
    log "Entered password"
    sleep 0.5

    screenshot "09_password_entered"

    xdotool key Return
    log "Submitted login"
    sleep 5

    screenshot "10_login_submitted"
else
    log "No login dialog found"
    screenshot "07b_no_login"
fi

log "Checking final state..."
sleep 3
screenshot "11_final_state"

log "=========================================="
log "Automation complete"
log "=========================================="
log "Screenshots saved to: $SCREENSHOT_DIR"
