FROM debian:bookworm-slim

# Asterisk 20 LTS — Strategaize Business System V5.1
# DEC-070: Asterisk 20 LTS als Docker-Container
# DEC-076: Statische Konfiguration, kein ARI

ENV DEBIAN_FRONTEND=noninteractive

# Install Asterisk 20 from Debian Bookworm repos + required codecs/modules
RUN apt-get update && apt-get install -y --no-install-recommends \
    asterisk \
    asterisk-modules \
    asterisk-core-sounds-en \
    asterisk-core-sounds-en-wav \
    asterisk-moh-opsound-wav \
    asterisk-opus \
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
