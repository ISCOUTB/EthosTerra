#!/bin/bash
set -e

# Start Java simulator in background
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
