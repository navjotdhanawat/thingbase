# ============================================
# ThingBase HiveMQ MQTT Broker - Railway Deployment
# ============================================
# HiveMQ Community Edition
# 
# Note: HiveMQ CE has limited auth options. For production,
# consider HiveMQ Cloud (free tier available) which supports
# HTTP-based authentication.
#
# This setup allows anonymous connections but relies on
# topic-level security through proper topic naming.

FROM hivemq/hivemq-ce:latest

# Copy configuration
COPY infra/hivemq/config.xml /opt/hivemq/conf/config.xml

# Expose MQTT port
EXPOSE 1883

# Default environment variables
ENV HIVEMQ_BIND_ADDRESS=0.0.0.0
