# Vercel + Supabase Deployment Guide

Complete guide to deploy Visher AI on Vercel (serverless) + Supabase (managed database).

## Why Vercel + Supabase?

- **Vercel**: Global serverless hosting with zero-config deployments
- **Supabase**: PostgreSQL database with built-in auth, real-time, and storage
- **Combined**: Perfect for scaling from 100 to 100,000+ users with automatic scaling
- **Cost**: Pay only for what you use

## Prerequisites

1. Vercel account (free tier available) - [vercel.com](https://vercel.com)
2. Supabase account (free tier available) - [supabase.com](https://supabase.com)
3. Git repository (GitHub/GitLab)
4. Gemini API key

## Step 1: Set Up Supabase Database

### 1.1 Create Supabase Project

1. Go to [app.supabase.com](https://app.supabase.com)
2. Click "New Project"
3. Fill in details:
   - **Project name**: `visher-ai`
   - **Database password**: Generate strong password (save it!)
   - **Region**: Choose closest to your users
4. Click "Create new project"
5. Wait for project initialization (2-3 minutes)

### 1.2 Get API Keys

Once project is created:

1. Go to **Settings** → **API** in the left sidebar
2. Copy these values:
   - **Project URL**: `https://your-project.supabase.co`
   - **Anon (public) key**: `eyJhbGc...`
   - **Service Role Key**: `eyJhbGc...` (keep secret!)

Save these - you'll need them for Vercel environment variables.

### 1.3 Set Up Database Schema

1. Go to **SQL Editor** in the left sidebar
2. Click **New query**
3. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
4. Paste into the SQL editor
5. Click **Run**

Your database schema is now set up with:
- Users table
- Journal entries table
- Insight cache table
- API usage tracking

## Step 2: Set Up Vercel Deployment

### 2.1 Create Vercel Project

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Continue with GitHub** (or GitLab)
3. Authenticate with your Git provider
4. Select your `visher-AI-` repository
5. Click **Import**

### 2.2 Configure Environment Variables

In the Vercel import screen, add these environment variables:

```
GEMINI_API_KEY=your_gemini_api_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_from_step_1_2
SUPABASE_SERVICE_KEY=your_service_key_from_step_1_2
NODE_ENV=production
```

⚠️ **Important**: Never commit these keys to Git! Use Vercel's environment variables.

### 2.3 Deploy

1. Click **Deploy**
2. Wait for deployment to complete (3-5 minutes)
3. Once complete, you'll get a deployment URL: `https://your-project.vercel.app`

Your app is now live!

## Step 3: Verify Deployment

### 3.1 Test Health Check

```bash
curl https://your-project.vercel.app/health
# Expected response: {"status":"ok","timestamp":"..."}
```

### 3.2 Test API Endpoint

```bash
curl -X POST https://your-project.vercel.app/api/insight \
  -H "Content-Type: application/json" \
  -d '{
    "entryText": "I am building a successful business"
  }'

# Expected response: JSON with theme, principle, insight, action
```

## Step 4: Configure Custom Domain (Optional)

1. In Vercel project settings, go to **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `visher.com`)
4. Follow DNS configuration instructions
5. SSL certificate auto-configured

## Step 5: Continuous Deployment

Your app is now set up for auto-deployment:

- **On every push to main**: Automatic deployment
- **Preview deployments**: Every PR gets a preview URL
- **Rollbacks**: Click to revert to previous deployment

## Performance & Scaling

### Vercel Performance

- **Cold starts**: <100ms on average
- **Edge locations**: Deployed globally to 280+ cities
- **Auto-scaling**: Handles traffic spikes automatically
- **Concurrency**: Can handle 10,000+ concurrent users

### Supabase Performance

- **Query optimization**: Automatic with indexes
- **Connection pooling**: Included
- **Real-time capabilities**: Optional Real-time subscriptions
- **Scalability**: Automatic vertical scaling

### Caching Strategy

- **Insight cache**: 24-hour TTL in Supabase
- **CDN**: Vercel CDN caches static assets globally
- **Expected hit rate**: ~70% for repeated entries

## Cost Estimation

### Free Tier (Starting)

| Service | Free Allowance |
|---------|---|
| Vercel | 100GB bandwidth/month, unlimited functions |
| Supabase | 500MB storage, 1M row reads/month |
| Gemini API | $0 (pay per request) |
| **Total** | **Free** |

### Pro Tier (100+ Users)

| Service | Cost |
|---------|------|
| Vercel | $20/month (Pro) |
| Supabase | $25/month (Pro) |
| Gemini API | ~$100-500/month |
| **Total** | **~$150-550/month** |

### Enterprise (1,000+ Users)

| Service | Cost |
|---------|------|
| Vercel | $100+/month (team) |
| Supabase | $100+/month (team) |
| Gemini API | ~$1,000+/month |
| **Total** | **~$1,200+/month** |

## Monitoring & Logs

### View Logs

1. In Vercel project, go to **Deployments**
2. Click on active deployment
3. Go to **Logs** tab
4. View real-time logs

### Monitor Metrics

1. In Vercel, go to **Analytics**
2. See real-time metrics:
   - Requests count
   - Response times
   - Error rates
   - Edge function usage

### Supabase Analytics

1. In Supabase project, go to **Analytics**
2. View:
   - Query performance
   - Storage usage
   - Auth metrics
   - Real-time connections

## Advanced Configuration

### Custom Build Script

The `vercel.json` is already configured. To customize:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}
```

### Edge Middleware (Optional)

Create `middleware.ts` in root for edge-level rate limiting:

```typescript
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Add rate limiting logic here
  return NextResponse.next();
}
```

### Serverless Function Timeout

Default: 60 seconds
- Vercel Free: 60s max
- Vercel Pro: 300s max

Your Gemini API calls typically complete in 1-3 seconds, so no issue.

## Troubleshooting

### Build Fails

**Check logs**: Vercel shows detailed build errors

```bash
# Deploy with verbose logging
vercel --prod --debug
```

### Environment Variables Not Set

1. Go to project **Settings** → **Environment Variables**
2. Re-enter missing variables
3. Redeploy with **Redeploy** button

### Database Connection Fails

1. Check `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct
2. Verify Supabase project is active
3. Check database security settings

### High Response Times

1. Check Gemini API is responding
2. View Supabase analytics for slow queries
3. Check cache hit rate (should be ~70%)

### Deployment Takes Too Long

Default build timeout: 15 minutes
If exceeding:
1. Optimize build process
2. Use `next build --experimental-app-route`
3. Upgrade to Vercel Pro (increased limits)

## Scaling to Production

### When You're Ready to Scale

1. **Upgrade Supabase**
   - Go to **Billing** in Supabase
   - Click **Upgrade to Pro**
   - Get 50GB storage, 2.5M row reads/month

2. **Upgrade Vercel**
   - Go to **Settings** → **Billing**
   - Click **Upgrade to Pro**
   - Get 300s function timeout, more concurrency

3. **Monitor Performance**
   - Check response times (should be <1s)
   - Check error rates (should be <0.1%)
   - Check cache hit rate (aim for >70%)

4. **Add Custom Domain**
   - In Vercel, add your production domain
   - Point DNS to Vercel nameservers

5. **Set Up CI/CD**
   - GitHub Actions auto-runs on push
   - Pre-deployment tests
   - Automatic deployments

## Rollback to Previous Version

1. In Vercel project, go to **Deployments**
2. Find previous working deployment
3. Click three dots
4. Click **Promote to Production**

Instant rollback to previous version!

## Next Steps

1. ✅ Create Supabase project
2. ✅ Set up database schema
3. ✅ Connect to Vercel
4. ✅ Deploy application
5. ✅ Test endpoints
6. ✅ Monitor performance
7. ✅ Configure custom domain
8. ✅ Set up CI/CD

## Environment Variables Reference

| Variable | Example | Where to Get |
|----------|---------|--------------|
| `GEMINI_API_KEY` | `AIzaSyC...` | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `SUPABASE_URL` | `https://project.supabase.co` | Supabase Settings → API |
| `SUPABASE_ANON_KEY` | `eyJhbGc...` | Supabase Settings → API |
| `SUPABASE_SERVICE_KEY` | `eyJhbGc...` | Supabase Settings → API |
| `NODE_ENV` | `production` | Set in Vercel |

## Summary

Your application is now:
- ✅ **Hosted globally** on Vercel
- ✅ **Database managed** on Supabase
- ✅ **Auto-scaling** for 1,000,000+ users
- ✅ **Monitored** with analytics
- ✅ **Backed by** global CDN
- ✅ **Secure** with encryption and RLS

You can now focus on features while Vercel + Supabase handle infrastructure! 🚀

