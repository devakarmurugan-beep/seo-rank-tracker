# Deployment Guide

Two separate Vercel projects from the same repo:

| Project | Domain | Root Directory |
|---------|--------|----------------|
| **website** | `seoranktrackingtool.com` | `apps/website` |
| **app + api** | `app.seoranktrackingtool.com` | *(repo root)* |

---

## Project 1: Website (`seoranktrackingtool.com`)

### Vercel settings

| Setting | Value |
|---------|-------|
| Framework Preset | Other |
| Root Directory | `apps/website` |

> Build command, output directory, and install command are set in `apps/website/vercel.json`.

### Domains

Add `seoranktrackingtool.com` and `www.seoranktrackingtool.com` in **Settings → Domains**.

### Environment variables

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## Project 2: App + API (`app.seoranktrackingtool.com`)

### How it works

- Vercel serves `apps/app/dist/` directly as static files (no Express involved in serving the SPA)
- `/api/*` requests are routed to `api/index.js` (auto-detected by Vercel as a serverless function)
- `vercel.json` rewrites handle SPA client-side routing (fallback to `index.html`)

### Vercel settings

| Setting | Value |
|---------|-------|
| Framework Preset | Other |
| Root Directory | *(leave blank — repo root)* |

> Build command, output directory, and install command are set in `vercel.json` at the repo root.

### Domains

Add `app.seoranktrackingtool.com` in **Settings → Domains**.

### Environment variables

**Supabase**
- `VITE_SUPABASE_URL` — project URL (used by both API and frontend build)
- `VITE_SUPABASE_ANON_KEY` — anon key (frontend)
- `SUPABASE_SERVICE_ROLE_KEY` — service role key (API only, never expose to frontend)

**Google / GSC**
- `GCP_CLIENT_ID`
- `GCP_CLIENT_SECRET`
- `GCP_REDIRECT_URI` — e.g. `https://app.seoranktrackingtool.com/auth/callback`

**Payments**
- `DODO_PAYMENTS_API_KEY`

**Cron**
- `CRON_SECRET`

**Frontend (optional — defaults to relative URLs on same domain)**
- `VITE_API_URL` — leave unset in production; set to `http://localhost:3001` in local `.env.local`
- `VITE_SITE_URL` — e.g. `https://app.seoranktrackingtool.com` (used for OAuth redirect URLs)

---

## Verification

```
GET https://seoranktrackingtool.com              → website homepage
GET https://seoranktrackingtool.com/pricing      → should NOT 404 (SPA routing)
GET https://app.seoranktrackingtool.com          → dashboard login
GET https://app.seoranktrackingtool.com/dashboard → should NOT 404 (SPA routing)
GET https://app.seoranktrackingtool.com/api/health → { "status": "ok" }
```

---

## Cron Job (Daily Sync)

Call via scheduler or Vercel Cron:

```
POST https://app.seoranktrackingtool.com/api/cron/daily-sync
Authorization: Bearer <CRON_SECRET>
```

Recommended schedule: `0 2 * * *` (2am UTC daily).

---

## Local Development

```bash
npm install          # installs all workspace deps (api, apps/app, apps/website)
npm run dev          # starts api (:3001), app (:5173), website (:5174) in parallel
```
