# Deployment Checklist

Use this checklist to ensure your deployment is production-ready.

## Pre-Deployment (Local Testing)

- [ ] Clone repository
- [ ] Run `npm install`
- [ ] Run `npm run docker:build`
- [ ] Run `npm run docker:up`
- [ ] Test basic health check: `curl http://localhost/health`
- [ ] Test API endpoint with sample journal entry
- [ ] Verify cache works (same entry returns faster)
- [ ] Test with load: `ab -n 1000 -c 100 http://localhost/health`
- [ ] Check all services healthy: `docker-compose ps`
- [ ] Run `npm run docker:down` (cleanup)

## Configuration Setup

- [ ] Create `.env.prod` file
- [ ] Set `GEMINI_API_KEY` (production key)
- [ ] Set `APP_URL` to production domain
- [ ] Set `REDIS_URL` to production Redis instance
- [ ] Set `NODE_ENV=production`
- [ ] Set `QUEUE_CONCURRENCY` (start with 10)
- [ ] Verify all env vars are set: `env | grep -E "GEMINI|REDIS|NODE"`

## Database Setup (if needed)

- [ ] Provision Redis instance (ElastiCache/Memorystore/Azure Cache)
- [ ] Test Redis connection: `redis-cli -h <host> ping`
- [ ] Set Redis eviction policy to `allkeys-lru`
- [ ] Set Redis memory limit (e.g., 512MB minimum)
- [ ] Enable Redis persistence (AOF or RDB)
- [ ] Test Redis connectivity from app server

## Infrastructure Setup

### Option A: Single Server with PM2

- [ ] Provision server (2+ vCPU, 2GB+ RAM)
- [ ] Install Node.js 18+
- [ ] Install Redis locally (or use remote Redis)
- [ ] Install PM2: `npm install -g pm2`
- [ ] Clone application code
- [ ] Run `npm install`
- [ ] Run `npm run build`
- [ ] Test locally: `npm run dev`
- [ ] Set production environment variables
- [ ] Start with PM2: `npm run start:pm2`

### Option B: Docker (Multiple Servers)

- [ ] Build Docker image: `npm run docker:build`
- [ ] Tag image: `docker tag visher-ai:latest registry/visher-ai:v1`
- [ ] Push to registry: `docker push registry/visher-ai:v1`
- [ ] Configure docker-compose for production (set replica count)
- [ ] Deploy to servers
- [ ] Verify all containers running: `docker ps`

### Option C: Kubernetes

- [ ] Set up Kubernetes cluster
- [ ] Build Docker image
- [ ] Push to container registry
- [ ] Update `k8s-deployment.yaml` with image URL
- [ ] Create namespace: `kubectl create namespace visher`
- [ ] Update k8s manifests for production values
- [ ] Deploy: `kubectl apply -f k8s-deployment.yaml`
- [ ] Verify pods: `kubectl get pods`
- [ ] Verify services: `kubectl get svc`
- [ ] Check pod logs: `kubectl logs -f deployment/visher-server`

## Load Balancer Setup

- [ ] Configure load balancer (NGINX/ALB/CLB)
- [ ] Set up health check endpoint: `/health`
- [ ] Configure rate limiting zones
- [ ] Set up SSL/TLS certificate
- [ ] Configure sticky sessions (optional)
- [ ] Set appropriate timeouts (30s for API calls)
- [ ] Enable compression (GZIP)
- [ ] Configure static asset caching (1 hour)
- [ ] Test load balancer health checks

## SSL/TLS Setup

- [ ] Obtain SSL certificate (Let's Encrypt/AWS ACM)
- [ ] Install certificate on load balancer
- [ ] Redirect HTTP → HTTPS
- [ ] Set HSTS header (optional)
- [ ] Test HTTPS: `curl https://your-domain.com/health`

## DNS Setup

- [ ] Update DNS records
- [ ] Point domain to load balancer
- [ ] Wait for DNS propagation
- [ ] Verify DNS resolution: `nslookup your-domain.com`
- [ ] Test from multiple locations

## Monitoring & Logging

- [ ] Set up application logs collection
  - [ ] PM2: Configure log file locations
  - [ ] Docker: Configure logging driver
  - [ ] Kubernetes: Configure log aggregation

- [ ] Set up monitoring:
  - [ ] CPU & Memory usage
  - [ ] Response times
  - [ ] Error rates
  - [ ] Queue depth
  - [ ] Cache hit rate

- [ ] Set up alerting for:
  - [ ] High CPU (>80%)
  - [ ] High memory (>85%)
  - [ ] High latency (>2s)
  - [ ] Error rate (>1%)
  - [ ] Queue depth (>1000)

- [ ] Configure dashboards
- [ ] Test alert notifications

## Security Setup

- [ ] Enable firewall rules
  - [ ] Only allow inbound on ports 80, 443
  - [ ] Only allow SSH from trusted IPs

- [ ] Set up DDoS protection
  - [ ] CloudFlare/AWS Shield
  - [ ] Rate limiting enabled

- [ ] Configure authentication (if needed)
  - [ ] API key management
  - [ ] OAuth integration

- [ ] Enable request logging
- [ ] Set up intrusion detection
- [ ] Regular security audits

## Performance Optimization

- [ ] Enable GZIP compression
- [ ] Enable HTTP keep-alive
- [ ] Set up CDN for static assets
- [ ] Configure Redis cache properly
- [ ] Increase `QUEUE_CONCURRENCY` as needed
- [ ] Monitor and optimize database queries
- [ ] Use connection pooling if using database

## Backup & Disaster Recovery

- [ ] Set up Redis backups
  - [ ] Daily snapshots
  - [ ] Retain 30 days

- [ ] Set up application backups
  - [ ] Source code in Git
  - [ ] Configuration files backed up

- [ ] Document disaster recovery procedure
- [ ] Test recovery procedure

## Testing Before Go-Live

- [ ] Load test at 2x expected capacity
- [ ] Latency test (verify <2s response time)
- [ ] Failover test (kill a server, verify recovery)
- [ ] Cache test (verify cache hits)
- [ ] Queue test (verify job processing)
- [ ] Long-running test (12+ hours)
- [ ] Error handling test
- [ ] Rate limiting test

## Go-Live Checklist

- [ ] All tests passed ✓
- [ ] All monitoring configured ✓
- [ ] Backup systems verified ✓
- [ ] Team trained on operations ✓
- [ ] Rollback plan documented ✓
- [ ] Post-launch monitoring scheduled ✓
- [ ] Verify health check endpoint: `curl https://your-domain.com/health`
- [ ] Verify API works: Test with real request
- [ ] Monitor for first 24 hours

## Post-Deployment (First 24 Hours)

- [ ] Monitor error rates
- [ ] Monitor response times
- [ ] Monitor cache hit rate (should be ~70%)
- [ ] Monitor queue depth (should remain <100)
- [ ] Check CPU/Memory usage
- [ ] Review application logs for errors
- [ ] Verify backups are working
- [ ] Get feedback from early users
- [ ] Be ready to scale if needed

## Performance Tuning (After Stabilization)

- [ ] Analyze cache hit patterns
- [ ] Optimize `QUEUE_CONCURRENCY` based on metrics
- [ ] Consider database indexing (if using DB)
- [ ] Enable CDN if traffic is high
- [ ] Consider read replicas for database
- [ ] Analyze and optimize slow endpoints
- [ ] Set up comprehensive monitoring dashboard

## Regular Maintenance

- [ ] Weekly: Check error rates and logs
- [ ] Weekly: Verify backups
- [ ] Weekly: Review performance metrics
- [ ] Monthly: Update dependencies
- [ ] Monthly: Review and optimize slow queries
- [ ] Quarterly: Full security audit
- [ ] Quarterly: Disaster recovery drill
- [ ] Annually: Capacity planning review

## Scaling Thresholds

Monitor these metrics and scale when they're reached:

- **CPU Usage**: Scale when consistently >70%
  - Action: Add 2-3 more servers or increase instance size

- **Queue Depth**: Scale when >500 jobs
  - Action: Increase `QUEUE_CONCURRENCY` or add queue workers

- **Cache Hit Rate**: Alert if <50%
  - Action: Investigate cache invalidation issues

- **Response Time**: Alert if >2 seconds
  - Action: Check database/API latency, scale if needed

- **Memory**: Scale when consistently >80%
  - Action: Increase instance size or add Redis replicas

## Emergency Procedures

- [ ] Document rollback procedure
- [ ] Document emergency contacts
- [ ] Document incident response plan
- [ ] Set up on-call rotation
- [ ] Document runbooks for common issues
- [ ] Practice incident response

---

**Sign-off:**

- Deployment Owner: _______________
- Deployment Date: _______________
- Environment: _______________
- Approved by: _______________

---

**Status:**
- [ ] Ready for Production ✓
- [ ] Needs Additional Work

