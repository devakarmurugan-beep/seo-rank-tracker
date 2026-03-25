import { getSupabaseAdmin } from '../lib/supabase.js'
import { buildBrandVariations, normalizeSiteUrl } from '../lib/constants.js'
import { getGSCClient, getSearchConsoleClient } from './google/client.js'
import { fetchRankingData, fetchSearchAnalyticsPaginated, fetchSitemapUrlsViaGSC, crawlInternalLinks, inspectUrls } from './google/gsc.js'
import { classifyKeywordIntent } from './google/intent.js'

const DAY_MS = 24 * 60 * 60 * 1000
const CHUNK_SIZE = 500

const buildConflictHint = (table, conflict, error) => {
    if (!error?.message?.includes('no unique or exclusion constraint matching the ON CONFLICT specification')) {
        return error
    }

    if (table === 'keyword_history' && conflict === 'keyword_id, date, search_type, device') {
        return new Error(
            'Database schema is missing the unique constraint for keyword_history(keyword_id, date, search_type, device). Run api/migrations/007_search_type_and_inspection.sql or api/migrations/008_fix_sync_conflict_constraints.sql, then retry the sync.'
        )
    }

    return new Error(
        `Database schema is missing the unique constraint required for ${table} ON CONFLICT (${conflict}). Run the latest SQL migrations and retry.`
    )
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const toDateStr = (date) => date.toISOString().split('T')[0]

/** Chunked upsert to stay under Supabase's row limit. */
const upsertChunked = async (supabase, table, payload, conflict, opts = {}) => {
    for (let i = 0; i < payload.length; i += CHUNK_SIZE) {
        const { error } = await supabase
            .from(table)
            .upsert(payload.slice(i, i + CHUNK_SIZE), { onConflict: conflict, ...opts })
        if (error && !opts.ignoreDuplicates) {
            const normalizedError = buildConflictHint(table, conflict, error)
            console.error(`[Sync] Upsert failed on table "${table}" (conflict: ${conflict}):`, normalizedError.message)
            throw normalizedError
        }
    }
}

/** Accumulate page metrics into the allPageMetrics map (weighted avg position). */
const mergePageMetrics = (map, pageUrl, metrics) => {
    const existing = map.get(pageUrl)
    if (!existing) {
        map.set(pageUrl, {
            clicks: metrics.clicks || 0,
            impressions: metrics.impressions || 0,
            ctr: metrics.ctr || 0,
            position: metrics.position ?? null,
            pos_weight: metrics.impressions || 1
        })
    } else {
        const oldW = existing.pos_weight
        const newW = metrics.impressions || 1
        existing.clicks += (metrics.clicks || 0)
        existing.impressions += (metrics.impressions || 0)
        existing.pos_weight = oldW + newW
        existing.position = (existing.position * oldW + metrics.position * newW) / existing.pos_weight
        existing.ctr = existing.impressions > 0 ? existing.clicks / existing.impressions : 0
    }
}

/** Seed a page URL into the map without metrics (discovery-only). */
const seedPage = (map, pageUrl) => {
    if (!map.has(pageUrl)) {
        map.set(pageUrl, { clicks: 0, impressions: 0, ctr: 0, position: null, pos_weight: 0 })
    }
}

// ─── GSC Discovery ──────────────────────────────────────────────────────────

/**
 * Tries multiple GSC property URL variants to find the one that returns data.
 * Returns { rows, siteUrl } where siteUrl is the winning property URL.
 */
const discoverKeywords = async (gscClient, propertyUrl, startDate, endDate) => {
    const query = async (siteUrl) => {
        const rows = await fetchSearchAnalyticsPaginated(gscClient, siteUrl, {
            startDate, endDate,
            dimensions: ['query', 'page'],
            aggregationType: 'auto'
        })
        return rows.map(r => ({
            keyword: r.keys[0],
            page_url: r.keys[1],
            clicks: r.clicks,
            impressions: r.impressions,
            ctr: r.ctr,
            position: r.position
        }))
    }

    let rows = await query(propertyUrl)
    let winningUrl = propertyUrl

    // Fallback 1: toggle trailing slash
    if (rows.length === 0 && !propertyUrl.startsWith('sc-domain:')) {
        const alt = propertyUrl.endsWith('/') ? propertyUrl.slice(0, -1) : `${propertyUrl}/`
        console.log(`[Sync] Discovery empty, trying: ${alt}`)
        const altRows = await query(alt)
        if (altRows.length > rows.length) { rows = altRows; winningUrl = alt }
    }

    // Fallback 2: domain property
    if (rows.length < 10 && !propertyUrl.startsWith('sc-domain:')) {
        const { data: { siteEntry } } = await gscClient.sites.list()
        const domain = propertyUrl.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/[\/]+$/, '')
        const domainSpec = `sc-domain:${domain}`
        if ((siteEntry || []).find(s => s.siteUrl === domainSpec)) {
            console.log(`[Sync] Trying domain property: ${domainSpec}`)
            const dRows = await query(domainSpec)
            if (dRows.length > rows.length) { rows = dRows; winningUrl = domainSpec }
        }
    }

    return { rows, siteUrl: winningUrl }
}

// ─── Data Processing ────────────────────────────────────────────────────────

/** Build keyword registry + cache maps from rows. */
const processKeywordRows = (rows, siteId, userId, brandVars) => {
    const keywords = {}   // kwLower -> registry entry
    const cache = {}      // kwLower -> cache entry

    for (const row of rows) {
        const kw = row.keyword.trim().toLowerCase()

        if (!keywords[kw]) {
            keywords[kw] = { site_id: siteId, keyword: kw, intent: classifyKeywordIntent(row.keyword, brandVars) }
        }

        if (!cache[kw]) {
            cache[kw] = { site_id: siteId, user_id: userId, keyword: kw, total_impressions: 0, total_clicks: 0, pos_sum: 0, pos_count: 0 }
        }
        const c = cache[kw]
        const imp = row.impressions || 0
        c.total_impressions += imp
        c.total_clicks += (row.clicks || 0)
        if (typeof row.position === 'number') {
            c.pos_sum += row.position * (imp || 1)
            c.pos_count += (imp || 1)
        }
    }

    return { keywords, cache }
}

/** Deduplicate history rows by keyword+date, merging metrics. */
const buildHistoryMap = (allHistory, kwLookup, trackedIds, isInitialSync) => {
    const map = {}

    for (const row of allHistory) {
        const kwId = kwLookup[row.keyword.toLowerCase()]
        if (!kwId) continue
        if (!isInitialSync && !trackedIds.has(kwId)) continue

        const searchType = row.search_type || 'web'
        const device = row.device || 'all'
        const key = `${kwId}|${row.date}|${searchType}|${device}`
        if (!map[key]) {
            map[key] = {
                keyword_id: kwId, date: row.date, search_type: searchType, device,
                position: row.position, impressions: row.impressions,
                clicks: row.clicks, ctr: row.ctr, page_url: row.page_url
            }
        } else {
            const e = map[key]
            const oldImp = e.impressions
            const newImp = row.impressions
            e.impressions += newImp
            e.clicks += row.clicks
            if (e.impressions > 0) {
                e.position = (e.position * oldImp + row.position * newImp) / e.impressions
            }
            if (newImp > oldImp) e.page_url = row.page_url
            e.ctr = e.impressions > 0 ? e.clicks / e.impressions : 0
        }
    }

    return Object.values(map)
}

/** Compute primary keyword per page URL from history rows. */
const buildPageKeywords = (allHistory) => {
    const map = {} // page_url -> { keyword -> impressions }
    for (const row of allHistory) {
        if (!row.page_url || !row.keyword) continue
        const kw = row.keyword.toLowerCase()
        if (!map[row.page_url]) map[row.page_url] = {}
        map[row.page_url][kw] = (map[row.page_url][kw] || 0) + (row.impressions || 0)
    }
    return map
}

// ─── Page Discovery Sources ─────────────────────────────────────────────────

/** Query GSC page dimension over 16 months to find pages beyond the 90-day window. */
const discoverPagesFullRange = async (gscClient, siteUrl, endDateStr, allPageMetrics, siteId, supabase) => {
    const start = toDateStr(new Date(Date.now() - (16 * 30 + 3) * DAY_MS))
    const fullPageRows = await fetchSearchAnalyticsPaginated(gscClient, siteUrl, {
        startDate: start, endDate: endDateStr, dimensions: ['page']
    })
    const fullPages = fullPageRows
    const newPages = fullPages.filter(r => !allPageMetrics.has(r.keys[0]))

    if (newPages.length > 0) {
        console.log(`[Sync] 16-month discovery: ${newPages.length} new pages (GSC total: ${fullPages.length})`)
        const payload = newPages.map(r => {
            allPageMetrics.set(r.keys[0], {
                clicks: r.clicks, impressions: r.impressions,
                ctr: r.ctr, position: r.position, pos_weight: r.impressions || 1
            })
            return {
                site_id: siteId, page_url: r.keys[0],
                impressions: r.impressions || 0, clicks: r.clicks || 0,
                ctr: r.impressions > 0 ? r.clicks / r.impressions : 0,
                avg_position: r.position, source: 'gsc'
            }
        })
        await upsertChunked(supabase, 'pages', payload, 'site_id, page_url')
    } else {
        console.log(`[Sync] 16-month discovery: no new pages beyond ${allPageMetrics.size}`)
    }
}

/** Discover pages via GSC Sitemaps API + sitemap XML parsing. Also stores sitemap metadata. */
const discoverPagesFromSitemap = async (gscClient, propertyUrl, siteId, supabase) => {
    const { urls, sitemapMeta } = await fetchSitemapUrlsViaGSC(gscClient, propertyUrl)
    if (urls.length > 0) {
        const payload = urls.map(url => ({ site_id: siteId, page_url: url, source: 'sitemap' }))
        await upsertChunked(supabase, 'pages', payload, 'site_id, page_url', { ignoreDuplicates: true })
        console.log(`[Sync] Sitemap: ${urls.length} pages`)
    }
    if (sitemapMeta.length > 0) {
        const smPayload = sitemapMeta.map(sm => ({
            site_id: siteId, ...sm, updated_at: new Date().toISOString()
        }))
        await upsertChunked(supabase, 'sitemaps', smPayload, 'site_id, path')
        console.log(`[Sync] Sitemap metadata: ${sitemapMeta.length} sitemaps stored`)
    }
}

/** Discover pages by crawling internal links. */
const discoverPagesByCrawling = async (propertyUrl, allPageMetrics, siteId, supabase) => {
    const crawledUrls = await crawlInternalLinks(propertyUrl)
    const newUrls = crawledUrls.filter(url => !allPageMetrics.has(url))
    if (newUrls.length > 0) {
        const payload = newUrls.map(url => ({ site_id: siteId, page_url: url, source: 'crawl' }))
        await upsertChunked(supabase, 'pages', payload, 'site_id, page_url', { ignoreDuplicates: true })
        console.log(`[Sync] Crawl: ${newUrls.length} new pages (${crawledUrls.length} total crawled)`)
    }
}

// ─── Main Sync ──────────────────────────────────────────────────────────────

export const performSiteSync = async (userId, siteId, brandVariations = [], daysToFetch = 90) => {
    const supabase = getSupabaseAdmin()
    const today = new Date()
    const endDateStr = toDateStr(new Date(today.getTime() - 3 * DAY_MS))
    const startDateStr = toDateStr(new Date(today.getTime() - (daysToFetch + 3) * DAY_MS))

    // 1. Load site & auth
    const { data: site } = await supabase.from('sites').select('*').eq('id', siteId).single()
    const { data: connection } = await supabase
        .from('user_connections').select('refresh_token')
        .eq('user_id', userId).eq('provider', 'google').single()

    if (!site || !connection?.refresh_token) throw new Error('Site or Google connection not found')

    const gscClient = getGSCClient(connection.refresh_token)
    const allHistory = []
    const allPageMetrics = new Map()

    // 2. Keyword discovery (with URL fallbacks)
    console.log(`[Sync] Starting sync for ${site.property_url}`)
    let discoveryRows = []
    let siteUrl = site.property_url

    try {
        const result = await discoverKeywords(gscClient, site.property_url, startDateStr, endDateStr)
        discoveryRows = result.rows
        siteUrl = normalizeSiteUrl(result.siteUrl)
        console.log(`[Sync] Discovery: ${discoveryRows.length} keyword×page rows`)
    } catch (err) {
        console.error('[Sync] Discovery failed:', err.message)
        siteUrl = normalizeSiteUrl(site.property_url)
    }

    // Seed page URLs from discovery
    for (const row of discoveryRows) {
        if (row.page_url) seedPage(allPageMetrics, row.page_url)
    }

    // 3. Chunked historical fetch (30-day windows)
    let chunkEnd = new Date(endDateStr)
    const totalStart = new Date(startDateStr)

    while (chunkEnd > totalStart) {
        let chunkStart = new Date(chunkEnd.getTime() - 30 * DAY_MS)
        if (chunkStart < totalStart) chunkStart = totalStart

        const chunkStartStr = toDateStr(chunkStart)
        const chunkEndStr = toDateStr(chunkEnd)

        // TODO: enable image/video/news once frontend supports search type filtering
        for (const searchType of ['web' /*, 'image', 'video', 'news' */]) {
            try {
                const { history, pages } = await fetchRankingData(gscClient, siteUrl, chunkStartStr, chunkEndStr, null, searchType)
                allHistory.push(...history)
                if (searchType === 'web') {
                    for (const p of pages) mergePageMetrics(allPageMetrics, p.page_url, p)
                }
                for (const h of history) if (h.page_url) seedPage(allPageMetrics, h.page_url)
            } catch (err) {
                if (searchType === 'web') {
                    console.error(`[Sync] Chunk ${chunkStartStr}..${chunkEndStr} failed:`, err.message)
                }
            }
        }

        chunkEnd = new Date(chunkStart.getTime() - DAY_MS)
    }

    console.log(`[Sync] Fetched ${allHistory.length} history rows, ${allPageMetrics.size} pages`)

    // 4. Process keywords & cache
    const brandVars = buildBrandVariations(site.property_url, brandVariations)
    const { keywords: keywordMap, cache: keywordCacheMap } = processKeywordRows(
        discoveryRows.length > 0 ? discoveryRows : allHistory,
        siteId, userId, brandVars
    )

    const keywordList = Object.values(keywordMap)
    if (keywordList.length > 0) {
        await upsertChunked(supabase, 'keywords', keywordList, 'site_id, keyword')
    }

    // Fetch back keyword IDs
    const { data: savedKeywords, error: kwErr } = await supabase
        .from('keywords').select('id, keyword').eq('site_id', siteId)
    if (kwErr) throw kwErr

    const kwLookup = {}
    for (const k of savedKeywords) kwLookup[k.keyword] = k.id

    // 5. Keyword cache
    const cachePayload = Object.values(keywordCacheMap).map(c => ({
        site_id: c.site_id, user_id: c.user_id, keyword: c.keyword,
        total_impressions: c.total_impressions, total_clicks: c.total_clicks,
        avg_pos: c.pos_count > 0 ? c.pos_sum / c.pos_count : null,
        last_synced: new Date().toISOString()
    }))
    if (cachePayload.length > 0) {
        await upsertChunked(supabase, 'keyword_cache', cachePayload, 'site_id, keyword')
    }

    // 6. History snapshots
    const { data: siteRow } = await supabase.from('sites').select('last_synced_at').eq('id', siteId).single()
    const isInitialSync = !siteRow?.last_synced_at

    const { data: tracked } = await supabase
        .from('keywords').select('id').eq('site_id', siteId).eq('is_tracked', true)
    const trackedIds = new Set((tracked || []).map(k => k.id))

    const historyPayload = buildHistoryMap(allHistory, kwLookup, trackedIds, isInitialSync)
    if (historyPayload.length > 0) {
        await upsertChunked(supabase, 'keyword_history', historyPayload, 'keyword_id, date, search_type, device')
    }

    // 7. Pages with metrics
    const pageKeywords = buildPageKeywords(allHistory)
    const pageEntries = Array.from(allPageMetrics.entries())
    console.log(`[Sync] Pages discovered: ${pageEntries.length}`)

    if (pageEntries.length > 0) {
        const pagesPayload = pageEntries.map(([url, m]) => {
            const kwMap = pageKeywords[url]
            const primaryKeyword = kwMap
                ? Object.entries(kwMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
                : null
            let hostname = null
            try { hostname = new URL(url).hostname } catch {}
            return {
                site_id: siteId, page_url: url,
                impressions: m.impressions || 0, clicks: m.clicks || 0,
                ctr: m.impressions > 0 ? m.clicks / m.impressions : 0,
                avg_position: m.position, primary_keyword: primaryKeyword,
                hostname
            }
        })
        await upsertChunked(supabase, 'pages', pagesPayload, 'site_id, page_url')
    }

    // 8. Extended page discovery (non-blocking)
    try { await discoverPagesFullRange(gscClient, siteUrl, endDateStr, allPageMetrics, siteId, supabase) }
    catch (err) { console.warn('[Sync] 16-month discovery failed:', err.message) }

    try { await discoverPagesFromSitemap(gscClient, site.property_url, siteId, supabase) }
    catch (err) { console.warn('[Sync] Sitemap failed:', err.message) }

    try { await discoverPagesByCrawling(site.property_url, allPageMetrics, siteId, supabase) }
    catch (err) { console.warn('[Sync] Crawl failed:', err.message) }

    // 9. Update last_synced_at
    await supabase.from('sites').update({ last_synced_at: new Date().toISOString() }).eq('id', siteId)

    return { totalKeywords: keywordList.length, totalPages: allPageMetrics.size, historyRecords: historyPayload.length }
}

/**
 * URL Inspection — runs in background after sync completes.
 * Inspects up to 50 uninspected/stale pages via the GSC URL Inspection API.
 */
export const performUrlInspection = async (userId, siteId) => {
    const supabase = getSupabaseAdmin()

    try {
        const { data: site } = await supabase.from('sites').select('property_url').eq('id', siteId).single()
        const { data: connection } = await supabase
            .from('user_connections').select('refresh_token')
            .eq('user_id', userId).eq('provider', 'google').single()

        if (!site || !connection?.refresh_token) return

        const staleDate = new Date(Date.now() - 7 * DAY_MS).toISOString()
        const { data: pagesToInspect, error } = await supabase
            .from('pages').select('id, page_url').eq('site_id', siteId)
            .or(`last_inspected_at.is.null,last_inspected_at.lt.${staleDate}`)
            .order('last_inspected_at', { ascending: true, nullsFirst: true })
            .limit(50)

        if (error) { console.warn('[Inspect] Query error:', error.message); return }
        if (!pagesToInspect?.length) return

        console.log(`[Inspect] Inspecting ${pagesToInspect.length} pages`)
        const scClient = getSearchConsoleClient(connection.refresh_token)
        const results = await inspectUrls(scClient, site.property_url, pagesToInspect.map(p => p.page_url))

        for (const result of results) {
            const page = pagesToInspect.find(p => p.page_url === result.url)
            if (page) {
                await supabase.from('pages').update({
                    index_status: result.indexStatus,
                    index_verdict: result.verdict,
                    crawl_timestamp: result.crawlTimestamp,
                    crawl_status: result.crawlStatus,
                    robots_txt_state: result.robotsTxtState,
                    mobile_usability: result.mobileUsability,
                    rich_results_status: result.richResultsStatus,
                    last_inspected_at: new Date().toISOString()
                }).eq('id', page.id)
            }
        }
        console.log(`[Inspect] Done: ${results.length} pages inspected`)
    } catch (err) {
        console.warn('[Inspect] Failed:', err.message)
    }
}
