#!/bin/bash
# designer-desktop/scripts/download-designer.sh

GATEWAY_URL="${1:-$IGNITION_GATEWAY_URL}"
DESIGNER_DIR="/home/designer/.ignition/designer-launcher"

if [ -z "$GATEWAY_URL" ]; then
    echo "Usage: download-designer.sh <gateway-url>"
    echo "Example: download-designer.sh https://192.168.1.100:8043"
    exit 1
fi

echo "Downloading Designer launcher from: $GATEWAY_URL"

# Create directory
mkdir -p "$DESIGNER_DIR"

# Download the launcher JAR
# Ignition 8.3 uses a native launcher, but we can use the JAR directly
LAUNCHER_URL="${GATEWAY_URL}/main/system/designer-launcher/designer-launcher.jar"

echo "Fetching: $LAUNCHER_URL"
wget --no-check-certificate -O "$DESIGNER_DIR/designer-launcher.jar" "$LAUNCHER_URL"

if [ $? -eq 0 ]; then
    echo "Designer launcher downloaded successfully"

    # Create launch script for this gateway
    cat > /home/designer/Desktop/launch-designer.sh << EOF
#!/bin/bash
cd $DESIGNER_DIR
java \$DESIGNER_JAVA_OPTS -jar designer-launcher.jar
EOF
    chmod +x /home/designer/Desktop/launch-designer.sh
    chown designer:designer /home/designer/Desktop/launch-designer.sh

    echo "Desktop launcher created: ~/Desktop/launch-designer.sh"
else
    echo "Failed to download Designer launcher"
    exit 1
fi
