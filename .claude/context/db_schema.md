# Database Schema (Supabase PostgreSQL)

Schema files: `database_schema.sql`, `update_schema.sql`, `sync_engine.sql`

---

## Tables

### `user_connections`
Stores OAuth tokens for background GSC sync.
```sql
id            UUID PK
user_id       UUID FK → auth.users (NOT NULL)
provider      TEXT DEFAULT 'google'
provider_id   TEXT (Google Account ID)
refresh_token TEXT
access_token  TEXT
expires_at    TIMESTAMP
created_at    TIMESTAMP
updated_at    TIMESTAMP
UNIQUE(user_id, provider)
```
**RLS:** Users can only read/modify their own row.

---

### `sites`
GSC properties being tracked.
```sql
id            UUID PK
user_id       UUID FK → auth.users (NOT NULL)
property_url  TEXT NOT NULL  -- 'sc-domain:example.com' or 'https://example.com/'
site_name     TEXT
created_at    TIMESTAMP
last_synced_at TIMESTAMP     -- added via update_schema.sql
```
**RLS:** Users own their sites.

---

### `keywords`
Master list of discovered/tracked keywords.
```sql
id          UUID PK
site_id     UUID FK → sites (NOT NULL)
keyword     TEXT NOT NULL
category    TEXT  -- e.g., 'Brand', 'Core Product'
intent      TEXT  -- 'Navigational' | 'Transactional' | 'Commercial' | 'Informational'
is_tracked  BOOLEAN DEFAULT FALSE
created_at  TIMESTAMP
UNIQUE(site_id, keyword)
```
**RLS:** Users access keywords via site ownership.

---

### `keyword_history`
Daily position snapshots, per device and search type.
```sql
id          UUID PK
keyword_id  UUID FK → keywords (NOT NULL)
date        DATE NOT NULL
position    NUMERIC(5,2)
impressions INTEGER
clicks      INTEGER
ctr         NUMERIC(5,4)
page_url    TEXT  -- top performing page that day
search_type TEXT DEFAULT 'web'  -- web, image, video, news
device      TEXT DEFAULT NULL   -- desktop, mobile, tablet
created_at  TIMESTAMP
UNIQUE(keyword_id, date, search_type, device)
```
**RLS:** Users access via keyword → site → user chain.

---

### `keyword_cache`
Aggregated metrics for fast frontend reads (avoids scanning keyword_history).
```sql
id                UUID PK
site_id           UUID FK → sites
user_id           UUID FK → auth.users
keyword           TEXT
avg_pos           NUMERIC(5,2)
total_impressions INTEGER
total_clicks      INTEGER
last_synced       TIMESTAMP
UNIQUE(site_id, keyword)
INDEX: (user_id, LOWER(keyword)), (site_id)
```
**RLS:** Users own their cache entries.

---

### `pages`
Discovered pages from GSC data with metrics and inspection results.
```sql
id                 UUID PK
site_id            UUID FK → sites
page_url           TEXT
hostname           TEXT           -- extracted from page_url (e.g. blog.example.com)
source             TEXT DEFAULT 'gsc'  -- gsc, sitemap, crawl
impressions        INTEGER DEFAULT 0
clicks             INTEGER DEFAULT 0
ctr                NUMERIC(5,4) DEFAULT 0
avg_position       NUMERIC(5,2)
primary_keyword    TEXT
index_status       TEXT           -- Indexed, Not Indexed, Pending
index_verdict      TEXT           -- PASS, VERDICT_UNSPECIFIED, etc
crawl_timestamp    TIMESTAMPTZ
crawl_status       TEXT           -- pageFetchState from URL Inspection API
robots_txt_state   TEXT           -- ALLOWED, DISALLOWED, etc
mobile_usability   TEXT           -- PASS, FAIL
rich_results_status TEXT          -- PASS, FAIL
last_inspected_at  TIMESTAMPTZ
created_at         TIMESTAMP
UNIQUE(site_id, page_url)
```
**RLS:** Users access via site ownership.

---

### `sitemaps`
Sitemap metadata from GSC Sitemaps API.
```sql
id              UUID PK
site_id         UUID FK → sites (NOT NULL)
path            TEXT NOT NULL     -- sitemap URL
is_index        BOOLEAN DEFAULT FALSE
type            TEXT              -- sitemap type
last_submitted  TIMESTAMPTZ
last_downloaded TIMESTAMPTZ
warnings        BIGINT DEFAULT 0
errors          BIGINT DEFAULT 0
urls_submitted  BIGINT DEFAULT 0
urls_indexed    BIGINT DEFAULT 0
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
UNIQUE(site_id, path)
```
**RLS:** Users access via site ownership.

---

## RLS Pattern

All tables use `auth.uid() = user_id` or join through `sites.user_id`. Never bypass RLS — always use the anon key on the frontend (RLS enforces isolation). Use service role key only in API for admin operations.

---

## Frontend Query Pattern (`apps/app/src/lib/dataFetcher.js`)

Frontend queries Supabase **directly** (not through Express API) for all read operations:

```js
// Pagination helper for large datasets
async function paginateQuery(queryFn, pageSize = 1000) { ... }

// Main data loaders
fetchKeywordCache(siteId)            // keyword_cache table
fetchKeywordsRegistry(siteId)        // keywords table
fetchHistoryForIds(ids, start, end, device)  // keyword_history, 500 IDs per chunk, optional device filter
fetchTrackedKeywordsWithHistory(siteId, dateRange, device)  // main loader, optional device filter
fetchTotalPagesCount(siteId)
fetchIndexedPagesCount(siteId)       // pages where index_status = 'Indexed'
fetchIntentDistribution(siteId)
fetchPageAnalytics(siteId)           // pages with hostname, mobile usability, rich results
fetchSitemapStats(siteId)            // sitemaps table (urls submitted/indexed, errors)
fetchTrialKeywords(siteId)           // from keyword_cache (trial restriction)
fetchUserSites(userId)               // sites table, returns user's tracked sites
```
