# Deployment Guide

Single Vercel project serving:
- `api/` — Express.js serverless API
- `apps/app/` — Dashboard SPA (`app.seoranktrackingtool.com`)
- `apps/website/` — Marketing site SPA (`seoranktrackingtool.com`)

---

## How It Works

All traffic is handled by a single `@vercel/node` serverless function wrapping the Express app (`api/index.js`).

- **API routes** (`/api/*`) are handled by Express route handlers.
- **Static files** are served by Express based on the `host` header:
  - `app.seoranktrackingtool.com` → serves `apps/app/dist/`
  - everything else → serves `apps/website/dist/`
- **SPA fallback**: any path not matched by a static file falls through to the SPA's `index.html` so React Router handles client-side routes.

The `@vercel/node` builder uses `bundle: false` + `includeFiles` to deploy the full file tree (API code + both built SPAs) as one serverless function.

---

## Vercel Project Setup

### 1. Import repo

Go to [vercel.com/new](https://vercel.com/new) → import the GitHub repo.

### 2. Project settings

In **Settings → General**, set:

| Setting | Value |
|---------|-------|
| Framework Preset | Other |
| Root Directory | *(leave blank)* |
| Build Command | `npm run build` |
| Output Directory | *(leave blank)* |
| Install Command | `npm install` |

### 3. Environment variables

In **Settings → Environment Variables**, add all of the following for **Production**:

**Supabase**
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon key (used by frontends)
- `VITE_SUPABASE_SERVICE_ROLE_KEY` — Service role key (API only, keep secret)

**Google / GSC**
- `GCP_CLIENT_ID` — Google OAuth client ID

**Payments**
- `DODO_PAYMENTS_API_KEY` — Dodo Payments API key

**Cron**
- `CRON_SECRET` — Random secret string for protecting `/api/cron/daily-sync`

### 4. Domains

In **Settings → Domains**, add:
- `seoranktrackingtool.com`
- `www.seoranktrackingtool.com`
- `app.seoranktrackingtool.com`

All three point to the same Vercel project. Subdomain routing is handled by `vercel.json`.

### 5. Deploy

Push to the connected branch — Vercel auto-deploys. Or manually:

```bash
vercel --prod
```

---

## Verification

After deploy, check:

```
GET https://seoranktrackingtool.com          → website homepage
GET https://app.seoranktrackingtool.com      → dashboard login
GET https://seoranktrackingtool.com/api/health → { "status": "ok" }
GET https://app.seoranktrackingtool.com/dashboard → should NOT 404 (SPA routing)
```

---

## Local Development

```bash
npm install          # installs root + all workspaces via postinstall
npm run dev          # starts api (3001), app (5173), website (5174) in parallel
```

Or individually:

```bash
npm run dev:api      # Express on :3001
npm run dev:app      # Vite dashboard on :5173
npm run dev:website  # Vite marketing on :5174
```

Build both SPAs:

```bash
npm run build        # builds apps/app and apps/website
```

---

## Cron Job (Daily Sync)

Set up in **Settings → Cron Jobs** or call manually:

```
POST https://seoranktrackingtool.com/api/cron/daily-sync
Authorization: Bearer <CRON_SECRET>
```

Recommended schedule: `0 2 * * *` (2am UTC daily).
