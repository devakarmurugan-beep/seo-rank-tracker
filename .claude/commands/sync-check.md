Trace and explain the full GSC sync pipeline for this project.

Read the following files and provide a concise walkthrough:
1. `api/services/google/client.js` — OAuth2 client factory
2. `api/services/google/gsc.js` — `fetchRankingData()`, `fetchSites()`, `fetchSitemapUrls()`, `inspectUrls()`
3. `api/services/google/intent.js` — `classifyKeywordIntent()`
4. `api/services/syncEngine.js` — `performSiteSync()` (the core sync logic)
5. `api/routes/sync.js` — the `/api/user/sync-site-data` and `/api/cron/daily-sync` route handlers

Then summarize:
- How refresh tokens are used to authenticate with Google
- How data is fetched in chunks (30-day windows, 3-day delay)
- How keywords are classified by intent
- What gets written to which Supabase tables (keywords, keyword_history, keyword_cache, pages)
- How the daily cron sync differs from the full 90-day sync
- Any known edge cases or limits (GSC row limits, pagination, etc.)

Point to specific line numbers for each key function.
