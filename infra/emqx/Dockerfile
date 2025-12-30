# ============================================
# ThingBase EMQX MQTT Broker - Railway Deployment
# ============================================
# EMQX broker for IoT device communication
#
# HTTP Authentication is configured via EMQX Dashboard after deployment:
# 1. Access Dashboard at port 18083
# 2. Go to Access Control -> Authentication
# 3. Add HTTP authenticator pointing to your API
#
# Required Environment Variables:
#   EMQX_DASHBOARD__DEFAULT_PASSWORD - Dashboard admin password
#
# Optional:
#   EMQX_NODE__COOKIE - Cluster security cookie

FROM emqx/emqx:5.8

# Copy base configuration (paths relative to repo root for Railway build)
COPY infra/emqx/emqx.conf /opt/emqx/etc/emqx.conf
COPY infra/emqx/acl.conf /opt/emqx/etc/acl.conf

# Environment variables - these can be overridden at runtime
ENV EMQX_NODE__NAME="emqx@127.0.0.1"
ENV EMQX_CLUSTER__DISCOVERY_STRATEGY="static"
ENV EMQX_LOG__CONSOLE__LEVEL="info"

# Default dashboard password (OVERRIDE THIS IN PRODUCTION!)
ENV EMQX_DASHBOARD__DEFAULT_PASSWORD="public"

# Allow anonymous connections initially (configure auth via Dashboard)
ENV EMQX_ALLOW_ANONYMOUS="true"

# Expose ports:
# 1883  - MQTT TCP
# 8083  - MQTT WebSocket
# 18083 - Dashboard
EXPOSE 1883 8083 18083

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD emqx_ctl status || exit 1
