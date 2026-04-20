#!/bin/bash
set -e

# Fix permissions (must be root to do this)
echo "Fixing permissions..."
mkdir -p /app/src/wps/logs
chmod -R u+rw /app/src

# Ensure symlink exists
if [ ! -L /app/logs ]; then
  if [ -d /app/logs ]; then
    rm -rf /app/logs
  fi
  ln -s /app/src/wps/logs /app/logs
fi

# Start Java simulator in background
# Note: Running as root in Docker is acceptable for containers
echo "Starting WPS Simulator (Java)..."
java -jar /app/wps-simulator.jar \
  -mode web \
  -agents 20 \
  -env local \
  -world mediumworld \
  -land 2 \
  -money 2000000 \
  -emotions 1 \
  -years 1 &

JAVA_PID=$!

# Wait a bit for Java to start
sleep 3

# Start Next.js frontend
echo "Starting Next.js frontend..."
exec node /app/.next/standalone/server.js
