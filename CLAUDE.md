# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Context Files

Detailed project context lives in `.claude/context/` — read these before working on related areas:

- [`.claude/context/project_overview.md`](.claude/context/project_overview.md) — product, pricing, target users
- [`.claude/context/architecture.md`](.claude/context/architecture.md) — data flow, API routes, key files, env vars
- [`.claude/context/db_schema.md`](.claude/context/db_schema.md) — all tables, RLS, query patterns
- [`.claude/context/payments.md`](.claude/context/payments.md) — DodoPayments plan IDs, checkout + webhook flow
- [`.claude/context/ui_design_system.md`](.claude/context/ui_design_system.md) — colors, typography, components, charts

## Slash Commands

Project-specific skills available via `/`:

| Command | Purpose |
|---------|---------|
| `/sync-check` | Trace the full GSC data sync pipeline |
| `/add-feature` | Load architecture context + enforce planning before implementing |
| `/db-help` | Summarize tables, RLS, and query patterns |
| `/deploy-checklist` | Full deploy steps + required env vars |
| `/ui-guidelines` | Load design system rules for UI work |

---

## Commands

```bash
# Development (all services)
npm run dev

# Individual services
npm run dev:api        # Express API (port varies)
npm run dev:app        # Main dashboard SPA
npm run dev:website    # Marketing website

# Build
npm run build:app

# Lint
npm run lint -w apps/app
npm run lint -w apps/website

# API (no test suite)
npm run start -w api
```

---

## Architecture

This is an **npm workspaces monorepo** with three packages:

- `api/` — Express 5 backend, deployed as a Vercel serverless function
- `apps/app/` — React SPA dashboard (Vite + TailwindCSS 4 + Recharts)
- `apps/website/` — React marketing site (Vite + TailwindCSS 4)

### Data Flow

```
User → React App (OAuth) → Google Search Console API
                        ↕
              Express API (/api/*)
                        ↕
              Supabase (PostgreSQL + Auth)
                        ↕
              DodoPayments (webhooks)
```

### Key Systems

**Authentication:** Supabase Auth with Google OAuth. Refresh tokens stored in `user_connections` table. Protected routes handled by `ProtectedRoute.jsx`.

**GSC Data Sync:** `api/services/gscUtility.js` contains `performSiteSync()` which fetches 90-day historical data in 30-day chunks, classifies keyword intent (Navigational/Transactional/Commercial/Informational), and handles GSC's 3-day data delay. Daily incremental sync via `GET /api/cron/daily-sync` (Bearer token protected).

**Database (Supabase):**
- `user_connections` — OAuth tokens
- `sites` — GSC properties (one per user)
- `keywords` — tracked keywords with intent
- `keyword_history` — daily snapshots (position, impressions, clicks, CTR)
- `keyword_cache` — aggregated metrics for fast reads
- `pages` — discovered pages
- Row-level security (RLS) enforces per-user data isolation

**Payments:** DodoPayments integration in `api/routes/payments.js`. Plans: Starter, Pro, Agency (monthly/yearly). Webhook-based plan upgrades.

**Frontend data layer:** `apps/app/src/lib/dataFetcher.js` queries Supabase directly. `apps/app/src/lib/api.js` calls the Express API.

### Deployment

Two Vercel projects:
- `seoranktrackingtool.com` → `apps/website/`
- `app.seoranktrackingtool.com` → repo root (app SPA + API serverless function)

`vercel.json` rewrites `/api/*` to `api/index.js` and handles SPA routing.

---

## Workflow

### Planning
- Enter plan mode for any non-trivial task (3+ steps or architectural decisions)
- Write plan to `todo.md` with checkable items; verify before implementing
- If something goes sideways, stop and re-plan — don't keep pushing

### Subagents
- Use subagents liberally to keep the main context window clean
- Offload research, exploration, and parallel analysis to subagents
- One focused task per subagent

### Verification
- Never mark a task complete without proving it works
- Run lint, check logs, demonstrate correctness
- Ask: "Would a staff engineer approve this?"

### Bug Fixing
- When given a bug report: just fix it
- Point at logs, errors, failing tests — then resolve them

### Self-Improvement
- After any correction from the user, update `lessons.md` with the pattern
- Review `lessons.md` at session start for relevant context

---

## Core Principles

**Simplicity First** — Make every change as simple as possible. Impact minimal code.

**No Laziness** — Find root causes. No temporary fixes. Senior developer standards.

**Minimal Impact** — Changes should only touch what's necessary.

**Demand Elegance** — For non-trivial changes, pause and ask "Is there a more elegant way?" Skip for simple, obvious fixes.
