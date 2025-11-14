#!/bin/bash
set -e

echo "🔍 Detecting host IP..."

HOST_IP=$(ip route | awk '/default/ {print $3}' 2>/dev/null || true)

if [ -z "$HOST_IP" ]; then
  HOST_IP=$(ip route get 1 | awk '{print $7; exit}' 2>/dev/null || true)
fi

if [ -z "$HOST_IP" ]; then
  echo "⚠️ Could not detect host IP, defaulting to localhost"
  HOST_IP="127.0.0.1"
fi

export HOST_IP
export SERVER_URL="http://${HOST_IP}:${APP_PORT:-3000}"

echo "🌐 SERVER_URL set to: $SERVER_URL"

exec node server.js
