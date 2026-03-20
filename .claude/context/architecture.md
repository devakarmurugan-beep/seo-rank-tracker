# Architecture

## Monorepo Structure

```
seo-rank-tracker/
├── api/                    # Express 5 backend → Vercel serverless function
│   ├── index.js            # All routes (922 lines)
│   └── services/
│       ├── gscUtility.js   # GSC client, sync logic, intent classifier
│       └── payments.js     # DodoPayments checkout + webhook
├── apps/
│   ├── app/                # React SPA dashboard (port 5173)
│   │   └── src/
│   │       ├── App.jsx         # Router, global state (sites, keywords, dateRange)
│   │       ├── Layout.jsx      # Sidebar + header shell
│   │       ├── Dashboard.jsx   # KPI cards, charts
│   │       ├── Keywords.jsx    # Keyword table, filters, bulk ops
│   │       ├── Pages.jsx       # Page analytics
│   │       ├── Settings.jsx    # GSC connection, plan info
│   │       ├── AdminDashboard.jsx
│   │       ├── Login.jsx / Signup.jsx / AuthCallback.jsx
│   │       ├── ProtectedRoute.jsx
│   │       ├── PricingGate.jsx
│   │       └── lib/
│   │           ├── api.js          # Calls Express API endpoints
│   │           ├── dataFetcher.js  # Queries Supabase directly (with pagination)
│   │           ├── permissions.js  # Plan limits, admin check, trial expiry
│   │           ├── supabase.js     # Supabase client init
│   │           └── dateUtils.js    # GSC 3-day delay handling
│   └── website/            # React marketing site
├── vercel.json             # Rewrites: /api/* → api/index.js, /* → SPA
├── database_schema.sql     # Initial schema + RLS policies
├── update_schema.sql       # Migrations (intent column, pages table)
└── sync_engine.sql         # keyword_cache table + indices
```

---

## Data Flow

```
User → React App (Google OAuth)
         ↓
    Supabase Auth
         ↓
    Google Search Console API (googleapis)
         ↓
    Express API /api/* (api/index.js)
         ↓
    Supabase PostgreSQL (keywords, history, cache)
         ↓
    DodoPayments (webhooks → update plan in Supabase Auth metadata)
```

**Frontend data query pattern:** Frontend calls Supabase **directly** via RLS (not through Express) for all read-heavy operations. Express API is used for writes, syncs, payments, and admin ops.

---

## API Routes

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/health` | Health check + env var verification |
| POST | `/api/admin/users` | List all users (admin only) |
| POST | `/api/admin/update-user` | Update user plan/metadata |
| POST | `/api/user/available-sites` | Fetch GSC properties (no save) |
| POST | `/api/user/add-site` | Add GSC property to track |
| POST | `/api/user/sync-site-data` | Trigger full 90-day sync |
| GET/POST | `/api/cron/daily-sync` | Daily incremental sync (Bearer token) |
| POST | `/api/keywords/track` | Mark keywords for active tracking |
| POST | `/api/keywords/sync-specific` | Refresh specific tracked keywords |
| POST | `/api/keywords/untrack` | Stop tracking a keyword |
| GET | `/api/gsc/locations` | Country/location aggregation |
| GET | `/api/gsc/trial-keywords` | Top 50 non-branded keywords for trial |
| POST | `/api/payments/create-checkout` | Create Dodo checkout session |
| POST | `/api/payments/webhook` | Handle Dodo payment webhooks |

---

## GSC Sync Process (`api/services/gscUtility.js`)

1. Auth: `getAuthenticatedGSCClient(refreshToken)` → OAuth2 client
2. Fetch: `fetchGSCRankingData()` — 90-day data in 30-day chunks, 3-day delay accounted for
3. Classify: `classifyKeywordIntent(keyword, brandVariations)` — 5-tier priority rule-based
4. Store: keywords → `keywords`, daily metrics → `keyword_history`, pages → `pages`
5. Aggregate: `keyword_cache` table for fast frontend reads

Other exports: `fetchGSCSites(gscClient)` (list user's GSC properties), `gscCountryMap` (country code mapping for location data)

---

## Deployment

Two Vercel projects:
- `seoranktrackingtool.com` → `apps/website/`
- `app.seoranktrackingtool.com` → repo root (SPA + serverless API)

`vercel.json` rewrites:
- `/api/*` → `api/index.js` (serverless)
- `/*` → `index.html` (SPA routing)

---

## Environment Variables

| Variable | Used By | Purpose |
|----------|---------|---------|
| `VITE_SUPABASE_URL` | Frontend + API | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Frontend | Public Supabase key |
| `SUPABASE_SERVICE_ROLE_KEY` | API only | Admin Supabase key (never expose to frontend) |
| `GCP_CLIENT_ID` | API | Google OAuth app ID |
| `GCP_CLIENT_SECRET` | API | Google OAuth secret |
| `GCP_REDIRECT_URI` | API | OAuth callback URL |
| `DODO_PAYMENTS_API_KEY` | API | DodoPayments bearer token |
| `CRON_SECRET` | API | Bearer token for daily-sync cron |
| `VITE_API_URL` | Frontend | Express API base URL |
| `VITE_SITE_URL` | Frontend | Public site URL |

---

## Plan Limits (`apps/app/src/lib/permissions.js`)

| Plan | Max Sites |
|------|-----------|
| free_trial | 1 |
| starter | 1 |
| pro | 5 |
| agency | 25 |

Trial expires after 7 days from account creation.
