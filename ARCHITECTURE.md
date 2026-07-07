# Architecture & Scaling Diagrams

## 1. System Architecture (Production)

```
                          USERS (3,000-10,000)
                                  ↓
                    ┌─────────────────────────┐
                    │   NGINX Load Balancer   │
                    │  (Rate Limit + Cache)   │
                    └────────┬────────────────┘
                             │
            ┌────────────────┼────────────────┐
            ↓                ↓                ↓
        ┌──────┐         ┌──────┐         ┌──────┐
        │ Srv1 │         │ Srv2 │         │ Srv3 │
        │ :300 │  ...    │ :300 │  ...    │ :300 │
        └──┬───┘         └──┬───┘         └──┬───┘
           │                │                │
           └────────────────┼────────────────┘
                            ↓
                    ┌───────────────────┐
                    │   Redis Cluster   │
                    │  (Cache + Queue)  │
                    └────────┬──────────┘
                             │
                    ┌────────▼──────────┐
                    │ Job Queue Worker  │
                    │ (Gemini API Calls)│
                    └───────────────────┘
                             ↓
                    ┌────────────────────┐
                    │  Gemini API        │
                    │  (AI Insights)     │
                    └────────────────────┘
```

## 2. Request Flow (Typical)

```
User Request (Journal Entry)
         ↓
   NGINX Load Balancer
    (Rate Limit Check)
         ↓
   Selected Server
         ↓
   Check Redis Cache
    /yes→ Return cached response (50-100ms) ✓
    /no ↓
         ↓
   Add Job to Queue
    (Return 202 Accepted)
         ↓
   User can poll /api/insight/:jobId
         ↓
   Job Queue Worker processes job
    (Max 30 seconds)
         ↓
   Call Gemini API
    (1-3 seconds)
         ↓
   Cache result in Redis
         ↓
   Return response (800-1200ms total)
```

## 3. Scaling Progression

```
┌─────────────────────────────────────────────────┐
│ PHASE 1: SINGLE SERVER (50-100 users)           │
│                                                  │
│  Server (All cores via PM2)                      │
│  └─ Node.js Cluster: 4-32 processes             │
│     └─ Direct Gemini API calls                  │
└─────────────────────────────────────────────────┘
                     ↓ (scale up)
┌─────────────────────────────────────────────────┐
│ PHASE 2: MULTI-SERVER (200-1,000 users)        │
│                                                  │
│  Load Balancer (NGINX)                          │
│  ├─ Server 1 (4-8 cores)                       │
│  ├─ Server 2 (4-8 cores)                       │
│  ├─ Server 3 (4-8 cores)                       │
│  └─ ... (N servers)                             │
│  Redis Cache (Single instance)                  │
│  Job Queue (Bull)                               │
└─────────────────────────────────────────────────┘
                     ↓ (scale up)
┌─────────────────────────────────────────────────┐
│ PHASE 3: ENTERPRISE (1,000-10,000+ users)      │
│                                                  │
│  Cloud Load Balancer (ALB/CLB)                  │
│  ├─ Auto-scaling group (10-50 servers)         │
│  │  └─ 4-8 CPU cores each                      │
│  ├─ Redis Cluster (HA replication)             │
│  ├─ Job Queue (distributed workers)            │
│  └─ CDN for static assets                      │
│  Database (optional for persistence)            │
│  Monitoring & Alerting (Prometheus/Grafana)    │
└─────────────────────────────────────────────────┘
```

## 4. Performance Scaling

```
Concurrent Users vs Response Time

10,000 ┤        ╱─────── Auto-scaled (Phase 3)
       │      ╱
 8,000 ┤    ╱
       │  ╱
 6,000 ┤╱            ╱─── Phase 2 (Docker)
       │          ╱╱
 4,000 ┤      ╱╱
       │   ╱╱
 2,000 ┤ ╱─────── Single server (PM2)
       │╱
    0  ├─────────────────────────────
       0    500   1000   1500   2000
                Response Time (ms)
    
Target Response Time: 800-1200ms (API-dependent)
```

## 5. Cache Efficiency

```
API Calls Reduction with Caching

Without Cache:         With Cache (24h TTL):
Every Request          1st request → API call
   ↓                   2nd-69th same entry
   ↓                      ↓
   ↓                      ↓ (cached)
   ↓
 API Call               70th different entry
   ↓                      ↓
  1-3s                    ↓ (new API call)
 Response
   ↓                   Result: ~70% cache hit
                       Cost reduction: 70%
```

## 6. Server Deployment Options

```
DEPLOYMENT MATRIX
┌─────────────────┬──────────┬──────────┬──────────┐
│ Platform        │ Servers  │ Users    │ Cost/mo  │
├─────────────────┼──────────┼──────────┼──────────┤
│ PM2 (Single)    │ 1        │ 50-100   │ $50-100  │
│ Docker (Local)  │ 3        │ 200-400  │ $150-300 │
│ AWS EC2         │ 10-20    │ 1k-2k    │ $300-600 │
│ Google Cloud    │ 10-20    │ 1k-2k    │ $400-800 │
│ Kubernetes      │ 20-50    │ 2k-10k   │ $600-1.5k│
│ Full Enterprise │ 50+      │ 10k+     │ $2k-5k   │
└─────────────────┴──────────┴──────────┴──────────┘
```

## 7. Data Flow During High Load

```
High Load Scenario: 1,000 concurrent users

Time: t=0
├─ Requests arrive: ~50 req/sec
│  └─ NGINX distributes across servers
│
Time: t=100ms
├─ 30 requests cached (returned instantly)
├─ 20 new requests queued
│  └─ Job Queue now has 100+ pending jobs
│
Time: t=500ms
├─ Queue processing: ~5-10 jobs/sec
├─ 5 jobs calling Gemini API
├─ Redis cache growing with results
│
Time: t=1500ms
├─ All initial batch responses complete
├─ New requests flowing in
├─ System maintaining 800-1200ms response time
│
Result: System handling 50 req/sec sustainable
```

## 8. Auto-scaling Triggers (Kubernetes)

```
CPU/Memory Thresholds:

   100%  ├─────────────────────────
         │                    ↗ Scale UP
    80%  ├─────────────────╱
         │
    70%  ├─ SCALE TRIGGER (threshold)
         │
    60%  ├─────────────────╲
         │                    ↘ Scale DOWN
    30%  ├─────────────────────────
         │
      0% ├─────────────────────────
            Time →

Min replicas: 10
Max replicas: 50
Scale-up: +100% (+replicas) or +2 pods
Scale-down: -50% (-replicas) gradually
```

## 9. Database Addition (Future)

```
If you need persistent user data:

        ┌────────────────────────┐
        │  Application Servers   │
        │  (10-50 instances)     │
        └───────────┬────────────┘
                    │
        ┌───────────┼───────────┐
        ↓           ↓           ↓
    ┌───────────────────────────────┐
    │  Database Connection Pool      │
    │  (pgBouncer or PgPool)         │
    │  (Max 100 connections)         │
    └───────────┬───────────────────┘
                │
        ┌───────┴─────────┐
        ↓                 ↓
    ┌─────────┐       ┌─────────┐
    │ Primary │       │ Replica │
    │   DB    │ ←→    │  DB     │
    └─────────┘       └─────────┘
    (Write)           (Read)

Benefits:
- User persistence
- Session storage
- Analytics
- Audit logs
```

## 10. Monitoring Dashboard

```
METRICS TO MONITOR

┌────────────────────────────────────┐
│ Real-time Monitoring Dashboard     │
├────────────────────────────────────┤
│                                    │
│ Requests/sec:      ████████░░ 45  │
│ Avg Response:      ██████░░░░ 850ms
│ Cache Hit Rate:    ███████░░░ 72% │
│ Queue Depth:       ████░░░░░░ 42  │
│ CPU Usage:         ██████░░░░ 68% │
│ Memory:            █████░░░░░ 62% │
│ Active Servers:    ██████░░░░ 15  │
│ Redis Memory:      ███░░░░░░░ 32% │
│                                    │
│ ⚠️  Warnings: None                 │
│ 🔴 Errors (1m):    2               │
│                                    │
└────────────────────────────────────┘
```

