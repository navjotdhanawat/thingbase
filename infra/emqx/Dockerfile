# ============================================
# ThingBase EMQX MQTT Broker - Railway Deployment
# ============================================
# This Dockerfile builds EMQX with HTTP authentication
# configured to validate credentials against the API.

FROM emqx/emqx:5.8

# Copy custom configuration (paths relative to repo root for Railway build)
COPY infra/emqx/emqx.conf /opt/emqx/etc/emqx.conf
COPY infra/emqx/acl.conf /opt/emqx/etc/acl.conf

# Environment variables (will be set by Railway)
ENV EMQX_NODE__NAME="emqx@127.0.0.1"
ENV EMQX_CLUSTER__DISCOVERY_STRATEGY="static"
ENV EMQX_LOG__CONSOLE__LEVEL="info"

# Expose ports:
# 1883  - MQTT TCP
# 8083  - MQTT WebSocket
# 8084  - MQTT WebSocket Secure
# 8883  - MQTT SSL/TLS
# 18083 - Dashboard
EXPOSE 1883 8083 8084 8883 18083

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD emqx_ctl status || exit 1
