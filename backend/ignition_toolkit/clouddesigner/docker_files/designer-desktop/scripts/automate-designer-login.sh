#!/bin/bash
# designer-desktop/scripts/automate-designer-login.sh
#
# Automates the Designer Launcher gateway setup and login using xdotool.
#
# Automation steps:
# 1. Wait for Designer Launcher window to appear
# 2. Click "Add Designer" button to open the dialog
# 3. Navigate to "Manual" tab using arrow keys
# 4. Tab to the Gateway URL input field and type the URL
# 5. Press Enter to submit and add the gateway
# 6. Click "Open Designer" to launch the designer
# 7. Wait for login dialog (Designer downloads on first launch, 30-120s)
# 8. Enter credentials and submit login
#
# Screenshots are saved to /tmp/automation-screenshots/ for debugging.
#
# NOTE: Do NOT use set -e here. xdotool commands fail frequently in GUI
# automation (windows not found, focus issues, etc.) and individual failures
# should not abort the entire automation flow.

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

# ============================================
# Step 6: Click "Open Designer" to launch
# ============================================
# After adding the gateway, we return to the main launcher view.
# The "Open Designer" button appears at the bottom-right.
log "Step 6: Preparing to click 'Open Designer'"

# Wait for the dialog to fully close and main view to settle
sleep 5
screenshot "06_main_view_with_gateway"

# Re-focus the launcher window and get updated geometry
xdotool windowactivate --sync "$LAUNCHER_WINDOW"
sleep 1
eval $(xdotool getwindowgeometry --shell "$LAUNCHER_WINDOW")
log "Launcher geometry: X=$X, Y=$Y, WIDTH=$WIDTH, HEIGHT=$HEIGHT"

# Move the launcher window to a known position (0,0) so we can calculate
# absolute button coordinates precisely. XFCE window manager decorations
# cause xdotool geometry to differ from actual screen position.
log "Moving launcher to position (0,0) for reliable click targeting"
xdotool windowmove --sync "$LAUNCHER_WINDOW" 0 0
sleep 1

# Re-measure geometry after move
eval $(xdotool getwindowgeometry --shell "$LAUNCHER_WINDOW")
log "New geometry after move: X=$X, Y=$Y, WIDTH=$WIDTH, HEIGHT=$HEIGHT"
screenshot "06b_window_moved"

# The "Open Designer" button is in the bottom-right of the client area.
# After moving to (0,0), the window frame starts at the screen origin.
# In the main launcher view with a gateway card, the bottom button row
# contains: [Edit] ............. [Add Designer] [Open Designer]
# "Open Designer" is the rightmost button. We click at:
#   X: about 90% of the way across (right-aligned button group)
#   Y: about 93% of the way down (bottom button row, above window border)
OPEN_BTN_X=$((WIDTH * 90 / 100))
OPEN_BTN_Y=$((HEIGHT * 93 / 100))
log "Clicking 'Open Designer' at ($OPEN_BTN_X, $OPEN_BTN_Y)"
click_at $OPEN_BTN_X $OPEN_BTN_Y "Open Designer button"
sleep 3

screenshot "06c_after_open_click"

# Verify: if a progress/download dialog appeared or the view changed, good.
# If not, try a second click slightly offset (button edges vary by theme)
OPEN_BTN_X2=$((WIDTH * 88 / 100))
OPEN_BTN_Y2=$((HEIGHT * 91 / 100))
log "Second attempt at ($OPEN_BTN_X2, $OPEN_BTN_Y2)"
click_at $OPEN_BTN_X2 $OPEN_BTN_Y2 "Open Designer button (retry)"
sleep 3

screenshot "07_after_open_designer_click"

# Check if we need to handle login
if [ -z "$IGNITION_USERNAME" ] || [ -z "$IGNITION_PASSWORD" ]; then
    log "No credentials provided - stopping automation after opening Designer"
    screenshot "08_no_credentials"
    exit 0
fi

# ============================================
# Step 7: Wait for login dialog
# ============================================
# The Designer downloads from the gateway on first launch, which can take
# 30-120 seconds depending on network speed. Poll for the login dialog.
log "Step 7: Waiting for login dialog (Designer may be downloading)..."

LOGIN_WINDOW=""
LOGIN_MAX_WAIT=120
LOGIN_WAITED=0

while [ -z "$LOGIN_WINDOW" ] && [ $LOGIN_WAITED -lt $LOGIN_MAX_WAIT ]; do
    sleep 3
    LOGIN_WAITED=$((LOGIN_WAITED + 3))

    for pattern in "Login" "Sign In" "Authentication" "Credentials"; do
        LOGIN_WINDOW=$(xdotool search --name "$pattern" 2>/dev/null | head -1) || true
        if [ -n "$LOGIN_WINDOW" ]; then
            log "Found login dialog ($pattern): $LOGIN_WINDOW after ${LOGIN_WAITED}s"
            break 2
        fi
    done

    # Check if Designer opened directly (no login needed — e.g. trial mode)
    # Exclude the launcher window (its title "Ignition Designer Launcher" also matches)
    DESIGNER_WINDOW=$(xdotool search --name "Ignition Designer" 2>/dev/null | grep -v "^${LAUNCHER_WINDOW}$" | head -1) || true
    if [ -n "$DESIGNER_WINDOW" ]; then
        log "Designer opened without login after ${LOGIN_WAITED}s"
        screenshot "08_designer_no_login"
        log "Automation complete - Designer is open"
        exit 0
    fi

    if [ $((LOGIN_WAITED % 15)) -eq 0 ]; then
        log "Still waiting for login dialog... ($LOGIN_WAITED/${LOGIN_MAX_WAIT}s)"
        screenshot "07_waiting_${LOGIN_WAITED}s"
    fi
done

if [ -z "$LOGIN_WINDOW" ]; then
    log "WARNING: Login dialog not found after ${LOGIN_MAX_WAIT}s"
    screenshot "08_no_login_dialog"
    log "Automation stopping - manual login may be required"
    exit 0
fi

# ============================================
# Step 8: Enter credentials and login
# ============================================
log "Step 8: Entering credentials"
screenshot "08_login_dialog_found"

xdotool windowactivate --sync "$LOGIN_WINDOW"
sleep 1

# Type username
xdotool type --clearmodifiers --delay 30 "$IGNITION_USERNAME"
log "Entered username: $IGNITION_USERNAME"
sleep 0.5
screenshot "09_username_entered"

# Tab to password field and type password
xdotool key Tab
sleep 0.3
xdotool type --clearmodifiers --delay 30 "$IGNITION_PASSWORD"
log "Entered password"
sleep 0.5
screenshot "10_password_entered"

# Submit login
xdotool key Return
log "Submitted login"
sleep 5
screenshot "11_login_submitted"

# Wait for Designer to fully open
log "Waiting for Designer to open..."
DESIGNER_WINDOW=""
DESIGNER_MAX_WAIT=60
DESIGNER_WAITED=0

while [ -z "$DESIGNER_WINDOW" ] && [ $DESIGNER_WAITED -lt $DESIGNER_MAX_WAIT ]; do
    sleep 3
    DESIGNER_WAITED=$((DESIGNER_WAITED + 3))
    DESIGNER_WINDOW=$(xdotool search --name "Ignition Designer" 2>/dev/null | grep -v "^${LAUNCHER_WINDOW}$" | head -1) || true
done

if [ -n "$DESIGNER_WINDOW" ]; then
    log "Designer opened successfully after login"
else
    log "Designer window not detected (may still be loading)"
fi

screenshot "12_final_state"

log "=========================================="
log "Automation complete"
log "=========================================="
log "Screenshots saved to: $SCREENSHOT_DIR"
