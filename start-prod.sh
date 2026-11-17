#!/usr/bin/env bash
# ==============================================================================
# PSX Signal Intelligence - Production Startup Script
# ==============================================================================
set -euo pipefail

echo "Starting PSX Signal Intelligence in Production Mode..."

# Run database migrations first
python -m backend.app.db.migrate

# Check if Docker compose should be used
if command -v docker &> /dev/null && [ -f "docker-compose.yml" ]; then
    echo "Running with Docker Compose..."
    docker compose up -d --build
    echo "Containers started. Checking health..."
    docker compose ps
else
    echo "Starting services locally with PM2..."
    pm2 start deploy/pm2/ecosystem.config.js
    pm2 status
fi
