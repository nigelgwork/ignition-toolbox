#!/bin/bash
# designer-desktop/scripts/launch-designer.sh

GATEWAY_URL="${1:-$IGNITION_GATEWAY_URL}"
PROJECT="${2:-}"
DESIGNER_MEMORY="${DESIGNER_MEMORY:-2048}"
DESIGNER_DIR="/home/designer/.ignition/designer-launcher"
LAUNCHER_JAR="$DESIGNER_DIR/designer-launcher.jar"

# Check if launcher exists
if [ ! -f "$LAUNCHER_JAR" ]; then
    echo "Designer launcher not found. Downloading..."
    /usr/local/bin/download-designer.sh "$GATEWAY_URL"
fi

# Build Java options
JAVA_OPTS="$DESIGNER_JAVA_OPTS"
JAVA_OPTS="$JAVA_OPTS -Xmx${DESIGNER_MEMORY}m"
JAVA_OPTS="$JAVA_OPTS -Xms512m"

# Ignition 8.3 specific options
JAVA_OPTS="$JAVA_OPTS -Dignition.script.project.library.enabled=true"

echo "Starting Ignition Designer..."
echo "Gateway: $GATEWAY_URL"
echo "Memory: ${DESIGNER_MEMORY}MB"
echo "Java Options: $JAVA_OPTS"

cd "$DESIGNER_DIR"
exec java $JAVA_OPTS -jar designer-launcher.jar "$@"
