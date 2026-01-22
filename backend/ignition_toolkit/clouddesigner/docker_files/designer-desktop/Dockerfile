# designer-desktop/Dockerfile
# Ignition Designer 8.3 Remote Desktop Environment

ARG UBUNTU_VERSION=24.04
FROM ubuntu:${UBUNTU_VERSION}

LABEL maintainer="SAFEgroup Automation"
LABEL description="Ignition Designer 8.3 Remote Desktop Environment"
LABEL version="1.0"

ARG JAVA_VERSION=17
ARG DEBIAN_FRONTEND=noninteractive

# ============================================
# System Dependencies
# ============================================
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Desktop environment
    xfce4 \
    xfce4-terminal \
    xfce4-settings \
    dbus-x11 \
    at-spi2-core \
    # VNC server
    tigervnc-standalone-server \
    tigervnc-common \
    tigervnc-tools \
    # Java (Ignition 8.3 requires Java 17)
    openjdk-${JAVA_VERSION}-jdk \
    # GUI dependencies for Java Swing
    libxtst6 \
    libxrender1 \
    libxi6 \
    libxrandr2 \
    libxcursor1 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2t64 \
    # Fonts for readability
    fonts-dejavu \
    fonts-liberation \
    fonts-noto \
    fontconfig \
    # Utilities
    wget \
    curl \
    unzip \
    jq \
    netcat-openbsd \
    supervisor \
    procps \
    nano \
    less \
    # Network tools (for gateway connectivity)
    iputils-ping \
    dnsutils \
    ca-certificates \
    # GUI dialogs for gateway selector
    zenity \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ============================================
# Create Designer User
# ============================================
RUN useradd -m -s /bin/bash -G sudo designer \
    && echo "designer:designer" | chpasswd \
    && mkdir -p /home/designer/.vnc \
    && mkdir -p /home/designer/.ignition \
    && mkdir -p /home/designer/Desktop \
    && mkdir -p /workspace

# ============================================
# Configure VNC
# ============================================
COPY scripts/configure-vnc.sh /usr/local/bin/
COPY scripts/xstartup /usr/local/share/xstartup
RUN chmod 755 /usr/local/bin/configure-vnc.sh \
    && chmod 755 /usr/local/share/xstartup

# ============================================
# XFCE Configuration for Optimal Viewing
# ============================================
RUN mkdir -p /home/designer/.config/xfce4/xfconf/xfce-perchannel-xml

# XFCE settings optimized for remote viewing
COPY config/xfce4/ /home/designer/.config/xfce4/

# ============================================
# Designer Download and Launch Scripts
# ============================================
COPY scripts/download-designer.sh /usr/local/bin/
COPY scripts/launch-designer.sh /usr/local/bin/
COPY scripts/start-desktop.sh /usr/local/bin/
COPY scripts/gateway-selector.sh /usr/local/bin/
RUN chmod 755 /usr/local/bin/*.sh

# ============================================
# Install Designer Launcher (template for copying to user home)
# ============================================
COPY designerlauncher.tar.gz /tmp/
RUN cd /tmp && tar -xzf designerlauncher.tar.gz && \
    mkdir -p /opt/designerlauncher-package && \
    cp -r designerlauncher/* /opt/designerlauncher-package/ && \
    chmod -R 755 /opt/designerlauncher-package && \
    rm -rf /tmp/designerlauncher /tmp/designerlauncher.tar.gz

# ============================================
# Supervisor Configuration
# ============================================
COPY config/supervisor/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# ============================================
# Desktop Shortcuts
# ============================================
COPY config/desktop/ /home/designer/Desktop/
RUN chmod 755 /home/designer/Desktop/*.desktop 2>/dev/null || true

# ============================================
# Set Permissions
# ============================================
RUN chown -R designer:designer /home/designer \
    && chown -R designer:designer /workspace

# ============================================
# Environment Variables
# ============================================
ENV HOME=/home/designer
ENV USER=designer
ENV DISPLAY=:1
ENV VNC_PORT=5901
ENV JAVA_HOME=/usr/lib/jvm/java-${JAVA_VERSION}-openjdk-amd64
ENV PATH="${JAVA_HOME}/bin:${PATH}"

# Ignition Designer JVM options for better remote performance
ENV DESIGNER_JAVA_OPTS="-Dsun.java2d.xrender=false -Dawt.useSystemAAFontSettings=on -Dswing.aatext=true"

EXPOSE 5901

WORKDIR /home/designer

ENTRYPOINT ["/usr/local/bin/start-desktop.sh"]
