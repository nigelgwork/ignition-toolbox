#!/bin/bash
# designer-desktop/scripts/start-desktop.sh

set -e

echo "=========================================="
echo "CloudDesigner Desktop Environment"
echo "=========================================="

# Create log directory
mkdir -p /var/log/supervisor

# Configure VNC password
/usr/local/bin/configure-vnc.sh

# Initialize Designer Launcher in user home (for persistence and updates)
LAUNCHER_DIR="/home/designer/.local/share/designerlauncher"
if [ ! -f "$LAUNCHER_DIR/designerlauncher.sh" ]; then
    echo "Initializing Designer Launcher..."
    mkdir -p "$LAUNCHER_DIR"
    cp -r /opt/designerlauncher-package/* "$LAUNCHER_DIR/"
    chown -R designer:designer "$LAUNCHER_DIR"
    chown -R designer:designer /home/designer/.local
    echo "Designer Launcher initialized at $LAUNCHER_DIR"
fi

# Ensure .ignition directory exists with correct permissions
mkdir -p /home/designer/.ignition/clientlauncher-data
chown -R designer:designer /home/designer/.ignition

# Start supervisor (manages VNC + desktop)
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
