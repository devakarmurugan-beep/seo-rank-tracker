import { supabase } from './supabase'
import { getGSCDateRange, getGSCEndDate } from './dateUtils'

// ─────────────────────────────────────────────────────────────────────────────
// PAGINATION HELPER — accepts a FACTORY FUNCTION, not a pre-built query.
// Each iteration creates a FRESH Supabase query with the correct .range().
// This avoids the Supabase JS v2 mutable-builder bug where calling .range()
// on a builder that has already been awaited returns unpredictable results.
//
// Usage:
//   await paginateQuery((from, to) =>
//       supabase.from('table').select('*').eq('x', val).range(from, to)
//   )
// ─────────────────────────────────────────────────────────────────────────────
const paginateQuery = async (queryFactory, pageSize = 1000) => {
    let all  = []
    let page = 0
    while (true) {
        const from = page * pageSize
        const to   = from + pageSize - 1
        const { data, error } = await queryFactory(from, to)
        if (error) {
            console.error('[paginateQuery] Error:', error.message)
            break
        }
        all = all.concat(data || [])
        if ((data || []).length < pageSize) break   // last page or empty
        page++
    }
    return all
}

/**
 * Fetches ALL rows from keyword_cache for a site (paginated).
 */
export const fetchKeywordCache = async (siteId) => {
    try {
        return await paginateQuery((from, to) =>
            supabase.from('keyword_cache').select('*').eq('site_id', siteId).range(from, to)
        )
    } catch (error) {
        console.error('fetchKeywordCache error:', error)
        return []
    }
}

/**
 * Fetches ALL keywords from the registry for a site (paginated).
 */
const fetchKeywordsRegistry = async (siteId) => {
    try {
        return await paginateQuery((from, to) =>
            supabase
                .from('keywords')
                .select('id, keyword, intent, category, is_tracked')
                .eq('site_id', siteId)
                .range(from, to)
        )
    } catch (error) {
        console.error('fetchKeywordsRegistry error:', error)
        return []
    }
}

/**
 * Fetches history rows for a set of keyword IDs within a date range.
 * IDs are chunked in groups of 500 to avoid PostgREST .in() URL-length limits.
 * Each chunk is paginated independently.
 */
const fetchHistoryForIds = async (keywordIds, startDate, endDate) => {
    if (!keywordIds || keywordIds.length === 0) return []

    const CHUNK_SIZE = 500
    const all = []

    for (let i = 0; i < keywordIds.length; i += CHUNK_SIZE) {
        const chunk = keywordIds.slice(i, i + CHUNK_SIZE)

        const rows = await paginateQuery((from, to) =>
            supabase
                .from('keyword_history')
                .select('keyword_id, date, position, clicks, impressions, ctr, page_url')
                .in('keyword_id', chunk)
                .gte('date', startDate)
                .lte('date', endDate)
                .order('date', { ascending: false })
                .range(from, to)
        )

        all.push(...rows)
    }

    return all
}

/**
 * Main data loader: fetches all keywords plus history-based metrics.
 * Date range is anchored to GSC's real end date (today − 3 days).
 */
export const fetchTrackedKeywordsWithHistory = async (siteId, dateRange = '28d') => {
    try {
        // ── STEP 1: Resolve GSC-accurate date window ──────────────────────────
        const { startDate, endDate } = getGSCDateRange(dateRange)

        // Previous period (same length, directly before current window)
        const currStart  = new Date(startDate)
        const currEnd    = new Date(endDate)
        const periodDays = Math.round((currEnd - currStart) / (24 * 60 * 60 * 1000)) + 1
        const prevEnd    = new Date(currStart.getTime() - 24 * 60 * 60 * 1000)
        const prevStart  = new Date(prevEnd.getTime() - (periodDays - 1) * 24 * 60 * 60 * 1000)
        const prevStartStr = prevStart.toISOString().split('T')[0]
        const prevEndStr   = prevEnd.toISOString().split('T')[0]

        // ── STEP 2: Load keyword registry + cache in parallel ─────────────────
        const [cacheData, allKeywordsRegistry] = await Promise.all([
            fetchKeywordCache(siteId),
            fetchKeywordsRegistry(siteId)
        ])

        // cacheMap: lowercase keyword → cache row (90-day aggregate snapshot)
        const cacheMap = new Map((cacheData || []).map(c => [c.keyword.toLowerCase(), c]))

        console.log(`[dataFetcher] Registry: ${allKeywordsRegistry.length} keywords, Cache: ${cacheData.length} entries`)

        // ── STEP 3: Fetch history for tracked keywords only ───────────────────
        const trackedIds = (allKeywordsRegistry || [])
            .filter(k => k.is_tracked)
            .map(k => k.id)

        console.log(`[dataFetcher] Tracked: ${trackedIds.length} keywords`)

        const [currentHistory, previousHistory] = await Promise.all([
            fetchHistoryForIds(trackedIds, startDate, endDate),
            fetchHistoryForIds(trackedIds, prevStartStr, prevEndStr)
        ])

        console.log(`[dataFetcher] Current history: ${currentHistory.length} rows, Previous: ${previousHistory.length} rows`)

        // ── STEP 4: Aggregate history per keyword per period ──────────────────
        // Mirrors GSC: sum clicks/impressions, weighted-avg position by impressions
        const buildPeriodMap = (histRows) => {
            const map = {}
            histRows.forEach(h => {
                if (!map[h.keyword_id]) {
                    map[h.keyword_id] = {
                        clicks:      0,
                        impressions: 0,
                        pos_sum:     0,
                        pos_weight:  0,
                        latestDate:  '',
                        latestPage:  null,
                    }
                }
                const m   = map[h.keyword_id]
                const imp = h.impressions || 0
                m.clicks      += (h.clicks || 0)
                m.impressions += imp
                if (typeof h.position === 'number') {
                    const w = imp > 0 ? imp : 1
                    m.pos_sum    += h.position * w
                    m.pos_weight += w
                }
                if (!m.latestDate || h.date > m.latestDate) {
                    m.latestDate = h.date
                    m.latestPage = h.page_url
                }
            })
            Object.values(map).forEach(m => {
                m.avgPos = m.pos_weight > 0 ? m.pos_sum / m.pos_weight : null
            })
            return map
        }

        const currentMap  = buildPeriodMap(currentHistory)
        const previousMap = buildPeriodMap(previousHistory)

        // ── STEP 5: Daily positions for sparkline trend ───────────────────────
        const dailyLookup = {}
        currentHistory.forEach(h => {
            if (!dailyLookup[h.keyword_id]) dailyLookup[h.keyword_id] = []
            dailyLookup[h.keyword_id].push({ date: h.date, position: h.position })
        })

        // ── STEP 6: Build final keyword objects ───────────────────────────────
        return (allKeywordsRegistry || []).map(kw => {
            const kwLower = kw.keyword.toLowerCase()
            const cache   = cacheMap.get(kwLower) || {}
            const curr    = currentMap[kw.id]  || null
            const prev    = previousMap[kw.id] || null

            // Impressions + clicks: prefer current-period history, fallback to cache
            const impressions = (curr && curr.impressions > 0)
                ? curr.impressions
                : (cache.total_impressions || 0)
            const clicks = (curr && curr.clicks > 0)
                ? curr.clicks
                : (cache.total_clicks || 0)

            // Position: prefer current-period weighted average, fallback to cache
            const rawPosition = typeof curr?.avgPos === 'number'
                ? curr.avgPos
                : (typeof cache.avg_pos === 'number' ? cache.avg_pos : null)

            // Display position: N/R if < 10 impressions (statistically unreliable)
            const displayPosition    = (!rawPosition || impressions < 10) ? 'N/R' : parseFloat(rawPosition.toFixed(1))
            const displayImpressions = impressions === 0 ? '-' : impressions
            const displayClicks      = impressions === 0 ? '-' : clicks
            const displayCtr         = impressions > 0  ? clicks / impressions : 0

            // ── Change Calculation ────────────────────────────────────────────
            // Priority 1: exact period-vs-period comparison (best, needs 56+ days of history)
            // Priority 2: current period vs 90-day cache baseline (works after first sync)
            // Positive change = rank IMPROVED (smaller position = higher rank)
            let change = 0
            if (curr?.avgPos) {
                if (prev?.avgPos) {
                    change = parseFloat((prev.avgPos - curr.avgPos).toFixed(1))
                } else if (cache.avg_pos && Math.abs(cache.avg_pos - curr.avgPos) > 0.5) {
                    // Only show change if difference is meaningful (> 0.5 positions)
                    change = parseFloat((cache.avg_pos - curr.avgPos).toFixed(1))
                }
            }

            // Best position in current period
            const dailyPositions = (dailyLookup[kw.id] || [])
                .map(d => d.position)
                .filter(p => p != null)
            const bestPos = dailyPositions.length > 0
                ? parseFloat(Math.min(...dailyPositions).toFixed(1))
                : (rawPosition ? parseFloat(rawPosition.toFixed(1)) : '-')

            // Sparkline trend (oldest → newest)
            const trend = (dailyLookup[kw.id] || [])
                .sort((a, b) => new Date(a.date) - new Date(b.date))
                .map(d => d.position)

            const sortedHistory = (dailyLookup[kw.id] || [])
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .map(d => ({
                    date:        d.date,
                    position:    d.position,
                    clicks:      curr?.clicks     || 0,
                    impressions: curr?.impressions || 0,
                    page_url:    curr?.latestPage  || '-'
                }))

            return {
                id:               kw.id,
                keyword:          kw.keyword,
                category:         kw.category  || 'Uncategorized',
                intent:           kw.intent     || 'Informational',
                is_tracked:       kw.is_tracked || false,
                pageType:         curr?.latestPage
                    ? (curr.latestPage.includes('/blog/') ? 'Blog' : 'Landing')
                    : 'Unknown',
                // displayPosition is the user-facing value ('N/R' or rounded number)
                position:         displayPosition,
                // rawPosition is always numeric (null → 1000 sentinel) for internal comparisons
                rawPosition:      typeof rawPosition === 'number' ? rawPosition : 1000,
                change,
                bestPos,
                impressions:      displayImpressions,
                clicks:           displayClicks,
                totalClicks:      clicks,
                totalImpressions: impressions,
                ctr:              displayCtr,
                page:             curr?.latestPage || '-',
                trend,
                history:          sortedHistory
            }
        })
    } catch (error) {
        console.error('fetchTrackedKeywordsWithHistory FAILED:', error)
        return { data: [], error: error.message }
    }
}

/**
 * Fetches all tracked properties belonging to the authenticated user.
 */
export const fetchUserSites = async (userId) => {
    try {
        const { data: sites, error } = await supabase
            .from('sites')
            .select('id, property_url, site_name, last_synced_at')
            .eq('user_id', userId)
        if (error) throw error
        return sites || []
    } catch (error) {
        console.error('fetchUserSites error:', error)
        return []
    }
}

/**
 * Fetches total count of indexed pages for a site.
 */
export const fetchTotalPagesCount = async (siteId) => {
    try {
        const { count, error } = await supabase
            .from('pages')
            .select('*', { count: 'exact', head: true })
            .eq('site_id', siteId)
        if (error) throw error
        return count || 0
    } catch (error) {
        return 0
    }
}

/**
 * Fetches keyword intent distribution (paginated to bypass 1K row limit).
 */
export const fetchIntentDistribution = async (siteId) => {
    try {
        const allKeywords = await paginateQuery((from, to) =>
            supabase.from('keywords').select('intent').eq('site_id', siteId).range(from, to)
        )

        const dist = {
            'Navigational':  0,
            'Transactional': 0,
            'Commercial':    0,
            'Informational': 0
        }
        allKeywords.forEach(kw => {
            const intent = kw.intent || 'Informational'
            if (dist[intent] !== undefined) dist[intent]++
            else dist['Informational']++
        })

        return Object.entries(dist).map(([name, value]) => ({
            name, value,
            color: name === 'Navigational'  ? '#2563EB'
                 : name === 'Transactional' ? '#059669'
                 : name === 'Commercial'    ? '#D97706'
                 : '#9CA3AF'
        }))
    } catch (error) {
        console.error('fetchIntentDistribution error:', error)
        return []
    }
}

/**
 * Fetches top non-branded keywords from cache (trial users).
 * Cache is the 90-day aggregate — no history queries needed.
 */
export const fetchTrialKeywords = async (siteId) => {
    try {
        const cache  = await fetchKeywordCache(siteId)
        const gscEnd = getGSCEndDate()

        if (cache && cache.length > 0) {
            return cache
                .sort((a, b) => b.total_impressions - a.total_impressions)
                .slice(0, 50)
                .map(kw => {
                    const impressions = kw.total_impressions || 0
                    const position    = (impressions < 10 || !kw.avg_pos)
                        ? 'N/R'
                        : parseFloat(kw.avg_pos.toFixed(1))
                    return {
                        id:          kw.id,
                        keyword:     kw.keyword,
                        position,
                        clicks:      kw.total_clicks || 0,
                        impressions: impressions || '-',
                        ctr:         impressions > 0 ? kw.total_clicks / impressions : 0,
                        page:        '-',
                        change:      0,
                        bestPos:     position,
                        trend:       [kw.avg_pos, kw.avg_pos, kw.avg_pos],
                        history: [{
                            date:        gscEnd,
                            position:    kw.avg_pos,
                            clicks:      kw.total_clicks,
                            impressions,
                            ctr:         impressions > 0 ? kw.total_clicks / impressions : 0,
                            page_url:    '-'
                        }]
                    }
                })
        }
    } catch (e) {
        console.error('fetchTrialKeywords error:', e)
    }
    return []
}

/**
 * Fetches analytics for all indexed pages (paginated history).
 */
export const fetchPageAnalytics = async (siteId, dateRange = '28d') => {
    try {
        const { startDate, endDate } = getGSCDateRange(dateRange)

        const pages = await paginateQuery((from, to) =>
            supabase.from('pages').select('*').eq('site_id', siteId).range(from, to)
        )

        const history = await paginateQuery((from, to) =>
            supabase
                .from('keyword_history')
                .select('*, keywords!inner(keyword, site_id)')
                .eq('keywords.site_id', siteId)
                .gte('date', startDate)
                .lte('date', endDate)
                .order('date', { ascending: false })
                .range(from, to)
        )

        return (pages || []).map(p => {
            const pH         = history.filter(h => h.page_url === p.page_url)
            const totalImp   = pH.reduce((acc, h) => acc + h.impressions, 0)
            const totalClick = pH.reduce((acc, h) => acc + h.clicks, 0)

            const kwCounts = {}
            pH.forEach(h => {
                const n = h.keywords?.keyword
                if (n) kwCounts[n] = (kwCounts[n] || 0) + h.clicks
            })
            const topKw = Object.entries(kwCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null

            const totalWeight = pH.reduce((acc, h) => acc + (h.impressions || 1), 0)
            const weightedPos = pH.reduce((acc, h) => acc + (h.position || 0) * (h.impressions || 1), 0)
            const avgPos      = totalWeight > 0 ? (weightedPos / totalWeight).toFixed(1) : '-'

            return {
                title:       p.page_url.split('/').filter(Boolean).pop() || 'Homepage',
                url:         p.page_url,
                status:      'Indexed',
                keyword:     topKw,
                keyPos:      pH[0]?.position || null,
                impressions: totalImp.toLocaleString(),
                clicks:      totalClick.toLocaleString(),
                ctr:         totalImp > 0 ? ((totalClick / totalImp) * 100).toFixed(1) + '%' : '0%',
                avgPos,
                updated:     'Synced'
            }
        })
    } catch (error) {
        console.error('fetchPageAnalytics error:', error)
        return []
    }
}
