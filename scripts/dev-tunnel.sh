#!/bin/bash
# Development tunnel script for Colima
# This script sets up SSH port forwarding from Colima VM to host
# Run this if Docker port forwarding isn't working on your machine

set -e

echo "Setting up SSH tunnel to Colima VM..."

# Kill any existing tunnels
pkill -f "ssh.*-L.*5433" 2>/dev/null || true

# Get Colima SSH port
COLIMA_PORT=$(colima ssh-config 2>/dev/null | grep "Port " | awk '{print $2}')

if [ -z "$COLIMA_PORT" ]; then
  echo "Error: Could not get Colima SSH port. Is Colima running?"
  exit 1
fi

echo "Colima SSH port: $COLIMA_PORT"

# Set up tunnel
ssh -fNL 5433:localhost:5433 -L 6379:localhost:6379 \
  -o StrictHostKeyChecking=no \
  -o UserKnownHostsFile=/dev/null \
  -o IdentityFile="$HOME/.colima/_lima/_config/user" \
  -p "$COLIMA_PORT" \
  lima@127.0.0.1

echo "SSH tunnel established!"
echo "PostgreSQL: localhost:5433"
echo "Redis: localhost:6379"
echo ""
echo "To stop the tunnel: pkill -f 'ssh.*-L.*5433'"


