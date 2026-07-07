# Visher AI - Manifestation Journaling App

A scalable React + TypeScript journaling app with AI-powered insights using Google Gemini API.

## Features

- 📝 Journal entry creation with "already true" present tense prompting
- 🤖 AI-powered psychological insights using Google Gemini
- 💾 Redis caching for performance
- 🔄 Async job queue for API processing
- 📊 Scalable to 10,000+ concurrent users
- ⚡ Load balancing with NGINX
- 🐳 Docker & Kubernetes ready

## Quick Start

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

### Production (Local with Docker)

```bash
# Build Docker image
npm run docker:build

# Start with Docker Compose (includes Redis + Load Balancer)
npm run docker:up

# Access at http://localhost
```

### Production (PM2)

```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2 clustering
npm run start:pm2

# View logs
npm run logs:pm2
```

## Environment Setup

### Development (.env.dev)
```env
GEMINI_API_KEY=your_key_here
APP_URL=http://localhost:3000
REDIS_URL=redis://localhost:6379
```

### Production (.env.prod)
```env
GEMINI_API_KEY=your_production_key
APP_URL=https://your-domain.com
REDIS_URL=redis://your-redis-instance:6379
QUEUE_CONCURRENCY=10
NODE_ENV=production
```

## Scaling Guide

**See [SCALING.md](./SCALING.md) for complete scaling documentation**

### Key Metrics

- **Single Server**: 50-100 concurrent users
- **3 Servers**: 200-400 concurrent users  
- **10 Servers**: 1,000-2,000 concurrent users
- **30 Servers**: 3,000-10,000+ concurrent users

### Quick Scale Up

```bash
# Docker Compose (3 servers)
npm run docker:up

# Kubernetes (auto-scales 10-50 replicas)
npm run k8s:deploy

# PM2 (uses all CPU cores)
npm run start:pm2
```

## Architecture

```
NGINX Load Balancer
    ↓↓↓
[Server 1] [Server 2] [Server 3] ...
    ↓↓↓
    Redis Cache
    ↓
    Job Queue (Bull)
    ↓
    Gemini API
```

## API Endpoints

### POST /api/insight
Generate psychological insights for a journal entry.

**Request:**
```json
{
  "entryText": "I am successfully growing my business",
  "waitForResult": false
}
```

**Response (async mode):**
```json
{
  "jobId": "123",
  "message": "Job queued for processing",
  "pollUrl": "/api/insight/123"
}
```

**Response (sync mode):**
```json
{
  "theme": "Career Expansion",
  "principle": "Self-efficacy and growth mindset",
  "insight": "When you project career growth...",
  "action": "Reach out to a colleague..."
}
```

### GET /api/insight/:jobId
Poll job status and retrieve results.

```json
{
  "status": "completed",
  "result": {
    "theme": "...",
    "principle": "...",
    "insight": "...",
    "action": "..."
  }
}
```

### GET /health
Health check endpoint.

```json
{
  "status": "ok",
  "timestamp": "2026-07-07T10:30:00Z"
}
```

## Performance Optimization

### Caching
- Gemini responses cached for 24 hours
- ~70% cache hit rate on typical usage
- Reduces API costs and response time

### Rate Limiting
- 100 requests/15 min per IP (global)
- 10 requests/min per IP (API)
- Prevents abuse and quota exhaustion

### Load Distribution
- NGINX least connections algorithm
- Automatic server failover
- Session affinity (sticky sessions)

## Deployment Options

### Google Cloud Run
```bash
gcloud run deploy visher-ai --source .
```

### AWS EC2
```bash
npm run start:pm2  # Uses all CPU cores
```

### Kubernetes
```bash
npm run k8s:deploy
npm run k8s:scale --replicas=20
```

### Docker Swarm
```bash
docker service create --replicas 10 visher-ai:latest
```

## Monitoring

```bash
# View logs (PM2)
npm run logs:pm2

# View logs (Docker)
npm run docker:logs

# View logs (Kubernetes)
npm run k8s:logs

# Health check
curl http://localhost:3000/health
```

## Dependencies

- **Express.js**: Web framework
- **React**: Frontend framework
- **Vite**: Build tool
- **Bull**: Job queue
- **Redis**: Cache & queue storage
- **Google Gemini API**: AI insights
- **NGINX**: Load balancer

## Production Checklist

- [ ] Set up Redis cluster
- [ ] Configure GEMINI_API_KEY
- [ ] Deploy with HTTPS
- [ ] Set up monitoring/alerting
- [ ] Configure auto-scaling
- [ ] Set up CDN for static assets
- [ ] Enable GZIP compression
- [ ] Configure firewall rules
- [ ] Set up database (if needed)
- [ ] Enable request logging

## Troubleshooting

**Queue backing up?**
- Increase `QUEUE_CONCURRENCY` in `.env.prod`
- Add more server instances
- Check Gemini API quotas

**High memory usage?**
- Reduce `--max-old-space-size` or increase server resources
- Enable Redis memory limits

**Slow responses?**
- Check Redis latency
- Verify Gemini API is not rate-limited
- Scale up server count

## Contributing

See issues and feature requests in the GitHub repo.

## License

Proprietary - Visher AI
