FROM ubuntu:22.04

# Asterisk 18 (Ubuntu 22.04) — Strategaize Business System V5.1
# DEC-070: Asterisk als Docker-Container
# DEC-076: Statische Konfiguration, kein ARI
# Ubuntu 22.04 ships Asterisk 18.10. PJSIP, WebSocket, MixMonitor, Opus all included.
# Debian Bookworm does not ship the asterisk package — Ubuntu is the pragmatic choice.

ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=Europe/Berlin

# Set timezone non-interactively (avoids interactive tzdata prompt)
RUN ln -snf /usr/share/zoneinfo/Europe/Berlin /etc/localtime && \
    echo "Europe/Berlin" > /etc/timezone

# Install Asterisk from Ubuntu repos + required codecs/modules
RUN apt-get update && apt-get install -y --no-install-recommends \
    asterisk \
    asterisk-modules \
    asterisk-core-sounds-en \
    asterisk-core-sounds-en-wav \
    asterisk-moh-opsound-wav \
    gettext-base \
    && rm -rf /var/lib/apt/lists/*

# Create recording directory
RUN mkdir -p /var/spool/asterisk/monitor && \
    chown -R asterisk:asterisk /var/spool/asterisk/monitor

# Copy config templates (ENV placeholders will be rendered by entrypoint.sh)
COPY config/ /etc/asterisk-templates/

# Copy entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Ports:
# 8089 — HTTP/WebSocket (SIP.js via Traefik)
# 5060/udp — SIP (trunk, future)
# 16384-16484/udp — RTP media (DEC-077)
EXPOSE 8089 5060/udp

# Recording volume
VOLUME /var/spool/asterisk/monitor

ENTRYPOINT ["/entrypoint.sh"]
