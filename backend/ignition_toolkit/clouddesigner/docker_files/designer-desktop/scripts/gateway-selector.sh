#!/bin/bash
# Gateway Selector for Ignition Designer
# Allows user to select from saved gateways or add new ones

GATEWAY_FILE="/home/designer/.ignition/gateways.conf"
DESIGNER_DIR="/home/designer/.ignition/designer-launcher"

# Ensure config directory exists
mkdir -p /home/designer/.ignition

# Create default gateway file if it doesn't exist
if [ ! -f "$GATEWAY_FILE" ]; then
    cat > "$GATEWAY_FILE" << 'EOF'
# Ignition Gateway Configuration
# Format: NAME|URL
#
# For gateways in other Docker containers, use: host.docker.internal
# Example: Local Docker|http://host.docker.internal:8088
#
# For remote gateways, use IP or hostname:
# Example: Production|https://192.168.1.100:8043

# Add your gateways below:
EOF
fi

# Function to read gateways from config
read_gateways() {
    grep -v "^#" "$GATEWAY_FILE" | grep -v "^$" | while IFS='|' read -r name url; do
        echo "$name|$url"
    done
}

# Function to add a new gateway
add_gateway() {
    local name="$1"
    local url="$2"
    echo "${name}|${url}" >> "$GATEWAY_FILE"
    echo "Gateway added: $name -> $url"
}

# Function to launch designer using the installed designer launcher
launch_designer() {
    local url="$1"

    echo "Starting Ignition Designer Launcher..."
    echo "Gateway: $url"

    # Launch the designer launcher
    # It will open and allow connecting to the gateway
    /opt/designerlauncher/designerlauncher &
}

# Main menu using zenity if available, otherwise use terminal
if command -v zenity &> /dev/null; then
    while true; do
        # Build gateway list
        GATEWAYS=$(read_gateways)

        if [ -z "$GATEWAYS" ]; then
            zenity --info --title="No Gateways" --text="No gateways configured.\nPlease add a gateway first."

            # Add gateway dialog
            NEW_NAME=$(zenity --entry --title="Add Gateway" --text="Enter gateway name:")
            if [ -n "$NEW_NAME" ]; then
                NEW_URL=$(zenity --entry --title="Add Gateway" --text="Enter gateway URL (e.g., https://192.168.1.100:8043):")
                if [ -n "$NEW_URL" ]; then
                    add_gateway "$NEW_NAME" "$NEW_URL"
                fi
            fi
            continue
        fi

        # Create selection list using array to handle spaces in names
        OPTIONS=()
        while IFS='|' read -r name url; do
            OPTIONS+=("$name" "$url")
        done <<< "$GATEWAYS"

        SELECTION=$(zenity --list \
            --title="Ignition Designer - Gateway Selector" \
            --text="Select a gateway or launch Designer Launcher directly:" \
            --column="Gateway Name" --column="URL" \
            --width=600 --height=400 \
            --extra-button="Add New Gateway" \
            --extra-button="Open Designer Launcher" \
            "${OPTIONS[@]}")

        EXIT_CODE=$?

        if [ $EXIT_CODE -eq 1 ]; then
            # User clicked Cancel or extra button
            if [ "$SELECTION" = "Add New Gateway" ]; then
                NEW_NAME=$(zenity --entry --title="Add Gateway" --text="Enter gateway name:")
                if [ -n "$NEW_NAME" ]; then
                    NEW_URL=$(zenity --entry --title="Add Gateway" --text="Enter gateway URL (e.g., http://host.docker.internal:8088):")
                    if [ -n "$NEW_URL" ]; then
                        add_gateway "$NEW_NAME" "$NEW_URL"
                    fi
                fi
                continue
            elif [ "$SELECTION" = "Open Designer Launcher" ]; then
                # Just open the designer launcher directly
                launch_designer ""
                exit 0
            else
                exit 0
            fi
        fi

        if [ -n "$SELECTION" ]; then
            # Find URL for selected gateway
            SELECTED_URL=$(echo "$GATEWAYS" | grep "^${SELECTION}|" | cut -d'|' -f2)

            if [ -n "$SELECTED_URL" ]; then
                # Launch designer launcher
                launch_designer "$SELECTED_URL"
                exit 0
            fi
        fi
    done
else
    # Terminal-based menu
    while true; do
        echo ""
        echo "=================================="
        echo "  Ignition Designer Gateway Selector"
        echo "=================================="
        echo ""

        # Read and display gateways
        GATEWAYS=$(read_gateways)

        if [ -z "$GATEWAYS" ]; then
            echo "No gateways configured."
            echo ""
            echo "1) Add new gateway"
            echo "q) Quit"
            echo ""
            read -p "Selection: " choice

            if [ "$choice" = "1" ]; then
                read -p "Gateway name: " NEW_NAME
                read -p "Gateway URL (e.g., https://192.168.1.100:8043): " NEW_URL
                add_gateway "$NEW_NAME" "$NEW_URL"
            elif [ "$choice" = "q" ]; then
                exit 0
            fi
            continue
        fi

        # Display gateways with numbers
        i=1
        echo "$GATEWAYS" | while IFS='|' read -r name url; do
            echo "  $i) $name"
            echo "     $url"
            i=$((i + 1))
        done

        echo ""
        echo "  a) Add new gateway"
        echo "  l) Open Designer Launcher"
        echo "  q) Quit"
        echo ""
        read -p "Selection: " choice

        if [ "$choice" = "a" ]; then
            read -p "Gateway name: " NEW_NAME
            read -p "Gateway URL (e.g., http://host.docker.internal:8088): " NEW_URL
            add_gateway "$NEW_NAME" "$NEW_URL"
        elif [ "$choice" = "l" ]; then
            launch_designer ""
            exit 0
        elif [ "$choice" = "q" ]; then
            exit 0
        elif [[ "$choice" =~ ^[0-9]+$ ]]; then
            # Get selected gateway
            SELECTED=$(echo "$GATEWAYS" | sed -n "${choice}p")
            if [ -n "$SELECTED" ]; then
                SELECTED_URL=$(echo "$SELECTED" | cut -d'|' -f2)
                launch_designer "$SELECTED_URL"
                exit 0
            fi
        fi
    done
fi
