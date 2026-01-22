#!/bin/bash
# designer-desktop/scripts/configure-vnc.sh

VNC_PASSWORD="${VNC_PASSWORD:-designer}"
VNC_RESOLUTION="${VNC_RESOLUTION:-1920x1080}"
VNC_DEPTH="${VNC_DEPTH:-24}"

# Ensure .vnc directory exists
mkdir -p /home/designer/.vnc
chown designer:designer /home/designer/.vnc

# Set VNC password
echo "$VNC_PASSWORD" | vncpasswd -f > /home/designer/.vnc/passwd
chmod 600 /home/designer/.vnc/passwd
chown designer:designer /home/designer/.vnc/passwd

# Copy xstartup from system location
cp /usr/local/share/xstartup /home/designer/.vnc/xstartup
chmod +x /home/designer/.vnc/xstartup
chown designer:designer /home/designer/.vnc/xstartup

# Create VNC config
cat > /home/designer/.vnc/config << EOF
session=xfce4-session
geometry=${VNC_RESOLUTION}
depth=${VNC_DEPTH}
localhost=no
alwaysshared
EOF

chown designer:designer /home/designer/.vnc/config

echo "VNC configured: ${VNC_RESOLUTION} @ ${VNC_DEPTH}-bit depth"
