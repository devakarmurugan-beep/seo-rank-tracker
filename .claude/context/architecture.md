# Architecture

## Monorepo Structure

```
seo-rank-tracker/
├── api/                        # Express 5 backend → Vercel serverless function
│   ├── index.js                # App setup + route mounting (~56 lines)
│   ├── lib/
│   │   ├── supabase.js         # Shared Supabase admin singleton
│   │   └── constants.js        # Admin emails, brand utils, normalizeSiteUrl
│   ├── middleware/
│   │   └── adminAuth.js        # Reusable admin auth middleware (requireAdmin)
│   ├── routes/
│   │   ├── admin.js            # /api/admin/* (user management)
│   │   ├── sites.js            # /api/user/available-sites, add-site
│   │   ├── keywords.js         # /api/keywords/* (track, untrack, sync-specific)
│   │   ├── gsc.js              # /api/gsc/* (locations, trial-keywords)
│   │   ├── sync.js             # /api/user/sync-site-data, /api/cron/daily-sync
│   │   └── payments.js         # /api/payments/* (DodoPayments checkout + webhook)
│   ├── services/
│   │   ├── google/
│   │   │   ├── client.js       # OAuth2 factory, GSC + SearchConsole client builders
│   │   │   ├── gsc.js          # GSC API calls: fetchRankingData, fetchSites, fetchSitemapUrls, inspectUrls
│   │   │   └── intent.js       # classifyKeywordIntent, gscCountryMap
│   │   └── syncEngine.js       # performSiteSync() — core sync logic
│   └── migrations/             # SQL schema migrations (001–007)
├── apps/
│   ├── app/                    # React SPA dashboard (port 5173)
│   │   └── src/
│   │       ├── App.jsx         # Router, global state (sites, keywords, dateRange, deviceFilter)
│   │       ├── Layout.jsx      # Sidebar + header shell
│   │       ├── Dashboard.jsx   # KPI cards, charts
│   │       ├── Keywords.jsx    # Keyword table, filters, bulk ops, device filter
│   │       ├── Pages.jsx       # Page analytics, hostname filter, mobile/rich results badges
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
│   └── website/                # React marketing site
├── vercel.json                 # Rewrites: /api/* → api/index.js, /* → SPA
└── database_schema.sql         # Initial schema + RLS policies
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
    Express API /api/* (api/index.js → route files)
         ↓
    Supabase PostgreSQL (keywords, history, cache)
         ↓
    DodoPayments (webhooks → update plan in Supabase Auth metadata)
```

**Frontend data query pattern:** Frontend calls Supabase **directly** via RLS (not through Express) for all read-heavy operations. Express API is used for writes, syncs, payments, and admin ops.

---

## API Routes

| Method | Endpoint | Route File | Purpose |
|--------|----------|------------|---------|
| GET | `/api/health` | `index.js` | Health check + env var verification |
| POST | `/api/admin/users` | `routes/admin.js` | List all users (admin only) |
| POST | `/api/admin/update-user` | `routes/admin.js` | Update user plan/metadata |
| POST | `/api/user/available-sites` | `routes/sites.js` | Fetch GSC properties (no save) |
| POST | `/api/user/add-site` | `routes/sites.js` | Add GSC property to track |
| POST | `/api/user/sync-site-data` | `routes/sync.js` | Trigger full 90-day sync |
| GET/POST | `/api/cron/daily-sync` | `routes/sync.js` | Daily incremental sync (Bearer token) |
| POST | `/api/keywords/track` | `routes/keywords.js` | Mark keywords for active tracking |
| POST | `/api/keywords/sync-specific` | `routes/keywords.js` | Refresh specific tracked keywords |
| POST | `/api/keywords/untrack` | `routes/keywords.js` | Stop tracking a keyword |
| GET | `/api/gsc/locations` | `routes/gsc.js` | Country/location aggregation |
| GET | `/api/gsc/trial-keywords` | `routes/gsc.js` | Top 50 non-branded keywords for trial |
| POST | `/api/payments/create-checkout` | `routes/payments.js` | Create Dodo checkout session |
| POST | `/api/payments/webhook` | `routes/payments.js` | Handle Dodo payment webhooks |

---

## Google API Integration (`api/services/google/`)

The `services/google/` folder is the integration layer for all Google APIs:

- **`client.js`** — `createGoogleOAuth2Client(refreshToken)` is the shared OAuth2 factory. `getGSCClient()` and `getSearchConsoleClient()` build on it. Future APIs (GA4, etc.) add new client builders here.
- **`gsc.js`** — All GSC-specific API calls: `fetchSearchAnalyticsPaginated()`, `fetchRankingData()`, `fetchSites()`, `fetchSitemapUrlsViaGSC()`, `inspectUrls()`, `crawlInternalLinks()`
- **`intent.js`** — `classifyKeywordIntent()` (5-tier priority rule-based) + `gscCountryMap`

## GSC Sync Process (`api/services/syncEngine.js`)

1. Auth: `getGSCClient(refreshToken)` → OAuth2 client
2. Discovery: Paginated fetch of all keywords+pages (25k row pages), with trailing-slash and domain-property fallbacks
3. Chunked History: 90-day data in 30-day chunks, 3-day delay accounted for. Includes device dimension (desktop/mobile/tablet). Multi-search-type ready (web/image/video/news — currently web only).
4. Classify: `classifyKeywordIntent(keyword, brandVariations)` — 5-tier priority rule-based
5. Store: keywords → `keywords`, daily metrics → `keyword_history` (with `device` + `search_type`), pages → `pages` (with `hostname`)
6. Aggregate: `keyword_cache` table for fast frontend reads
7. Sitemap crawl: discover pages not found via GSC + store sitemap metadata (urls submitted/indexed, errors)
8. URL Inspection: batch 50 uninspected/stale pages per sync — extracts index status, mobile usability, rich results, crawl status, robots.txt state
9. 16-month page discovery: paginated query for pages beyond the 90-day window

---

## Shared Utilities (`api/lib/`)

- **`supabase.js`** — Singleton Supabase admin client (used by all route files and syncEngine)
- **`constants.js`** — `ADMIN_EMAILS`, `buildBrandVariations()`, `buildSimpleBrandVars()`, `filterNonBranded()`, `normalizeSiteUrl()`

## Middleware (`api/middleware/`)

- **`adminAuth.js`** — `requireAdmin` middleware validates `adminId` in request body against known admin emails

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
