#!/bin/bash
# Quick Deployment Commands Reference
# Copy and paste these commands for quick deployment

echo "=== VISHER AI - DEPLOYMENT COMMANDS ==="
echo

# ============================================
# DEVELOPMENT
# ============================================
echo "📝 DEVELOPMENT"
echo "  npm install                    # Install dependencies"
echo "  npm run dev                    # Start dev server (http://localhost:3000)"
echo "  npm run lint                   # Check types"
echo

# ============================================
# DOCKER (LOCAL TESTING - RECOMMENDED)
# ============================================
echo "🐳 DOCKER - Local Testing (3 servers + Redis + NGINX)"
echo "  npm run docker:build           # Build image"
echo "  npm run docker:up              # Start services (http://localhost)"
echo "  npm run docker:logs            # View logs"
echo "  npm run docker:down            # Stop services"
echo

# ============================================
# PM2 (SINGLE DEDICATED SERVER)
# ============================================
echo "⚡ PM2 - Production (uses all CPU cores)"
echo "  npm install -g pm2             # Install PM2 globally"
echo "  npm run start:pm2              # Start server cluster"
echo "  npm run logs:pm2               # View logs"
echo "  npm run restart:pm2            # Restart servers"
echo "  npm run stop:pm2               # Stop servers"
echo "  pm2 monit                      # Monitor in real-time"
echo

# ============================================
# KUBERNETES (ENTERPRISE)
# ============================================
echo "☸️  KUBERNETES - Enterprise (auto-scaling 10-50 replicas)"
echo "  npm run docker:build           # Build image first"
echo "  docker tag visher-ai:latest your-registry/visher-ai:latest"
echo "  docker push your-registry/visher-ai:latest"
echo "  kubectl set image deployment/visher-server visher-server=your-registry/visher-ai:latest"
echo "  npm run k8s:deploy             # Deploy all manifests"
echo "  npm run k8s:logs               # View logs"
echo "  npm run k8s:scale --replicas=50  # Scale to 50 replicas"
echo

# ============================================
# GOOGLE CLOUD RUN
# ============================================
echo "🚀 GOOGLE CLOUD RUN"
echo "  gcloud run deploy visher-ai \\"
echo "    --source . \\"
echo "    --region us-central1 \\"
echo "    --memory 1Gi \\"
echo "    --cpu 2 \\"
echo "    --set-env-vars REDIS_URL=redis://your-instance:6379"
echo

# ============================================
# AWS EC2
# ============================================
echo "📦 AWS EC2"
echo "  # SSH into instance"
echo "  ssh -i your-key.pem ec2-user@your-instance.compute-1.amazonaws.com"
echo "  "
echo "  # Clone repo and install"
echo "  git clone https://github.com/chitranshpandeyvlogs-lang/visher-AI-.git"
echo "  cd visher-AI-"
echo "  npm install"
echo "  npm run build"
echo "  "
echo "  # Start with PM2"
echo "  npm install -g pm2"
echo "  npm run start:pm2"
echo

# ============================================
# DOCKER SWARM
# ============================================
echo "🐝 DOCKER SWARM"
echo "  docker swarm init               # Initialize swarm (on manager node)"
echo "  npm run docker:build            # Build image"
echo "  docker service create \\"
echo "    --name visher-app \\"
echo "    --replicas 10 \\"
echo "    --publish 80:3000 \\"
echo "    -e REDIS_URL=redis://redis:6379 \\"
echo "    visher-ai:latest"
echo "  docker service update --replicas 20 visher-app  # Scale to 20"
echo

# ============================================
# HEROKU
# ============================================
echo "📱 HEROKU"
echo "  heroku create visher-ai         # Create app"
echo "  heroku addons:create heroku-redis:premium-0  # Add Redis"
echo "  git push heroku main            # Deploy"
echo "  heroku logs --tail              # View logs"
echo

# ============================================
# ENVIRONMENT SETUP
# ============================================
echo "⚙️  ENVIRONMENT SETUP"
echo "  Development: Use .env.dev"
echo "  Production: Use .env.prod"
echo "  "
echo "  Required variables:"
echo "    GEMINI_API_KEY=your_key"
echo "    REDIS_URL=redis://host:6379"
echo

# ============================================
# MONITORING & LOGS
# ============================================
echo "📊 MONITORING & LOGS"
echo "  curl http://localhost:3000/health       # Health check"
echo "  redis-cli                               # Redis CLI"
echo "  npm run logs:pm2                        # PM2 logs"
echo "  npm run docker:logs                     # Docker logs"
echo "  npm run k8s:logs                        # Kubernetes logs"
echo

# ============================================
# TESTING
# ============================================
echo "🧪 TESTING"
echo "  # Test cache"
echo "  curl -X POST http://localhost:3000/api/insight \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"entryText\": \"I am successful\"}'"
echo "  "
echo "  # Load testing with k6"
echo "  npm install -g k6"
echo "  k6 run load-test.js"
echo

# ============================================
# QUICK REFERENCE
# ============================================
echo "🎯 QUICK REFERENCE"
echo "  Local:        npm run dev"
echo "  Docker:       npm run docker:up"
echo "  Production:   npm run start:pm2"
echo "  Kubernetes:   npm run k8s:deploy"
echo "  Logs:         npm run logs:pm2 / docker:logs / k8s:logs"
echo

echo "📖 Full documentation: See SCALING.md and DEPLOYMENT_SUMMARY.md"
