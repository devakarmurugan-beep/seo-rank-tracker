Show the full deployment checklist for this project.

Read `DEPLOY.md` if it exists, then provide the following:

## Two Vercel Projects

### 1. Marketing Site: seoranktrackingtool.com
- Root directory: `apps/website/`
- Build: `npm run build -w apps/website`
- No API routes
- Env vars needed: minimal (just Supabase anon key if any auth)

### 2. App + API: app.seoranktrackingtool.com
- Root directory: repo root
- Build command: `npm run build:app`
- Output directory: `apps/app/dist`
- Install command: `npm install`
- `vercel.json` handles routing: `/api/*` → serverless, `/*` → SPA

## Required Environment Variables (app.seoranktrackingtool.com)

Set these in Vercel project settings:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # API only, never exposed to frontend
GCP_CLIENT_ID=
GCP_CLIENT_SECRET=
GCP_REDIRECT_URI=https://app.seoranktrackingtool.com/auth/callback
DODO_PAYMENTS_API_KEY=
CRON_SECRET=                      # Random secret for cron endpoint
VITE_API_URL=                     # Leave empty for same-domain (Vercel handles this)
VITE_SITE_URL=https://app.seoranktrackingtool.com
```

## Cron Job Setup (Vercel)
- Endpoint: `GET /api/cron/daily-sync`
- Schedule: `0 6 * * *` (6 AM UTC daily)
- Auth header: `Authorization: Bearer <CRON_SECRET>`
- Configure in `vercel.json` under `crons` or via Vercel dashboard

## Pre-Deploy Checks
- [ ] Run `npm run lint -w apps/app` — no errors
- [ ] Run `npm run build:app` locally — build succeeds
- [ ] Verify all env vars are set in Vercel
- [ ] Test Google OAuth redirect URI matches `GCP_REDIRECT_URI`
- [ ] Check DodoPayments webhook URL points to production domain
- [ ] Verify Supabase RLS is enabled on all tables

## Post-Deploy Checks
- [ ] Visit `/api/health` — should return 200 with env var status
- [ ] Test Google OAuth login flow
- [ ] Confirm GSC site sync works
- [ ] Trigger `/api/cron/daily-sync` manually with Bearer token
