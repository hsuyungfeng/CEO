#!/bin/bash

# Phase 4 Docker Staging Deployment Script
# Usage: ./DOCKER_STAGING_DEPLOY.sh

set -e

echo "🚀 Phase 4 Docker Staging Deployment"
echo "===================================="

# Configuration
APP_NAME="ceo-platform-web"
STAGING_TAG="phase4-latest"
STAGING_CONTAINER="ceo-platform-staging"
STAGING_PORT="3000"

# Local configuration (Development/Staging)
DATABASE_URL="postgresql://ceo_admin:SecureDevPass_2026!@host.docker.internal:5432/ceo_platform"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="development-secret-change-in-production"

# Step 1: Build Docker Image (local, no registry)
echo "📦 Step 1: Building Docker image..."
docker build \
  --tag ${APP_NAME}:${STAGING_TAG} \
  --build-arg NODE_ENV=staging \
  -f ceo-monorepo/apps/web/Dockerfile \
  .

if [ $? -eq 0 ]; then
  echo "✅ Docker image built successfully"
else
  echo "❌ Docker build failed"
  exit 1
fi

# Step 2: Stop existing container
echo "🛑 Step 2: Stopping existing container..."
docker stop ${STAGING_CONTAINER} 2>/dev/null || true
docker rm ${STAGING_CONTAINER} 2>/dev/null || true

# Step 3: Run new container
echo "▶️  Step 3: Starting staging container..."
docker run -d \
  --name ${STAGING_CONTAINER} \
  --restart unless-stopped \
  -p ${STAGING_PORT}:3000 \
  -e NODE_ENV=staging \
  -e DATABASE_URL="${DATABASE_URL}" \
  -e NEXTAUTH_URL="${NEXTAUTH_URL}" \
  -e NEXTAUTH_SECRET="${NEXTAUTH_SECRET}" \
  ${APP_NAME}:${STAGING_TAG}

if [ $? -eq 0 ]; then
  echo "✅ Container started successfully"
else
  echo "❌ Container failed to start"
  exit 1
fi

# Step 4: Wait for application to be ready
echo "⏳ Step 4: Waiting for application to be ready..."
sleep 10

# Step 5: Health check
echo "🏥 Step 5: Running health check..."
HEALTH_CHECK=$(curl -s http://localhost:${STAGING_PORT}/api/health || echo "failed")

if [[ $HEALTH_CHECK == *"ok"* ]]; then
  echo "✅ Health check passed"
  echo ""
  echo "🎉 Phase 4 Staging Deployment Complete!"
  echo "=================================="
  echo "Application URL: http://localhost:${STAGING_PORT}"
  echo "Health Check: http://localhost:${STAGING_PORT}/api/health"
  echo "Invoice Endpoint: http://localhost:${STAGING_PORT}/api/invoices"
  echo ""
else
  echo "❌ Health check failed"
  echo "Application may not be ready. Check logs:"
  echo "docker logs ${STAGING_CONTAINER}"
  exit 1
fi

