Load and summarize the full database schema and query patterns for this project.

Read `.claude/context/db_schema.md` and `apps/app/src/lib/dataFetcher.js`, then output:

## Tables
List all 6 tables with their key columns, relationships, and what each stores.

## RLS Rules
Explain the row-level security pattern:
- Which column enforces ownership on each table
- Which key (anon vs service role) to use and when
- Why the frontend queries Supabase directly instead of going through the Express API

## Query Patterns
Show the main data fetching functions from `dataFetcher.js`:
- `fetchKeywordCache(siteId)` — what it returns
- `fetchTrackedKeywordsWithHistory(siteId, dateRange)` — how pagination works
- `fetchHistoryForIds(ids, start, end)` — chunking strategy (500 IDs)

## Adding New Queries
Rules for new database queries:
1. Frontend reads → use `apps/app/src/lib/dataFetcher.js` + Supabase client directly
2. Admin writes / cross-user ops → use Express API with service role key
3. Always use `paginateQuery()` helper for tables that could have >1000 rows
4. New tables need RLS policy: `auth.uid() = user_id` (or join through sites)

## Schema Files
- `database_schema.sql` — initial schema
- `update_schema.sql` — migrations (intent column, pages table, last_synced_at)
- `sync_engine.sql` — keyword_cache table + performance indices
