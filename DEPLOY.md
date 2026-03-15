# Deployment Guide

Two separate Vercel projects from the same repo:

| Project | Domain | Root Directory |
|---------|--------|----------------|
| **website** | `seoreporting.com` | `apps/website` |
| **app + api** | `app.seoreporting.com` | *(repo root)* |

---

## Project 1: Website (`seoreporting.com`)

### Vercel settings

| Setting | Value |
|---------|-------|
| Framework Preset | Vite |
| Root Directory | `apps/website` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

### Domains

Add `seoreporting.com` and `www.seoreporting.com` in **Settings → Domains**.

### Environment variables

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## Project 2: App + API (`app.seoreporting.com`)

### How it works

- Vercel serves `apps/app/dist/` directly as static files (no Express involved in serving the SPA)
- `/api/*` requests are routed to `api/index.js` (auto-detected by Vercel as a serverless function)
- `vercel.json` rewrites handle SPA client-side routing (fallback to `index.html`)

### Vercel settings

| Setting | Value |
|---------|-------|
| Framework Preset | Other |
| Root Directory | *(leave blank — repo root)* |
| Build Command | `npm run build:app` |
| Output Directory | `apps/app/dist` |
| Install Command | `npm install` |

> `npm install` at root triggers `postinstall` which installs deps in `api/`, `apps/app/`, and `apps/website/`. `npm run build:app` builds only the dashboard SPA.

### Domains

Add `app.seoreporting.com` in **Settings → Domains**.

### Environment variables

**Supabase**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_SERVICE_ROLE_KEY` *(API only, keep secret)*

**Google / GSC**
- `GCP_CLIENT_ID`

**Payments**
- `DODO_PAYMENTS_API_KEY`

**Cron**
- `CRON_SECRET`

---

## Verification

```
GET https://seoreporting.com              → website homepage
GET https://seoreporting.com/pricing      → should NOT 404 (SPA routing)
GET https://app.seoreporting.com          → dashboard login
GET https://app.seoreporting.com/dashboard → should NOT 404 (SPA routing)
GET https://app.seoreporting.com/api/health → { "status": "ok" }
```

---

## Cron Job (Daily Sync)

Call via scheduler or Vercel Cron:

```
POST https://app.seoreporting.com/api/cron/daily-sync
Authorization: Bearer <CRON_SECRET>
```

Recommended schedule: `0 2 * * *` (2am UTC daily).

---

## Local Development

```bash
npm install          # installs root + all workspaces via postinstall
npm run dev          # starts api (:3001), app (:5173), website (:5174) in parallel
```
