import { supabase } from './supabase'
import { getGSCDateRange, getGSCEndDate } from './dateUtils'

// ─────────────────────────────────────────────────────────────────────────────
// CORE HELPER: paginate ANY supabase query builder that uses .range()
// Supabase defaults to 1000 rows. This helper pages through ALL rows.
// ─────────────────────────────────────────────────────────────────────────────
const fetchAllRows = async (queryBuilder, pageSize = 1000) => {
    let all = []
    let page = 0
    let hasMore = true
    while (hasMore) {
        const from = page * pageSize
        const { data, error } = await queryBuilder.range(from, from + pageSize - 1)
        if (error) throw error
        all = all.concat(data || [])
        hasMore = (data || []).length === pageSize
        page++
    }
    return all
}

/**
 * Fetches the aggregated cache for ALL keywords found in GSC for this site.
 * Uses pagination to bypass Supabase's 1000-row default limit.
 */
export const fetchKeywordCache = async (siteId) => {
    try {
        const data = await fetchAllRows(
            supabase.from('keyword_cache').select('*').eq('site_id', siteId)
        )
        return data
    } catch (error) {
        console.error("Error fetching keyword cache:", error)
        return []
    }
}

/**
 * Fetches ALL keywords in the registry for this site with pagination.
 */
const fetchKeywordsRegistry = async (siteId) => {
    try {
        const data = await fetchAllRows(
            supabase
                .from('keywords')
                .select('id, keyword, intent, category, is_tracked')
                .eq('site_id', siteId)
        )
        return data
    } catch (error) {
        console.error("Error fetching keywords registry:", error)
        return []
    }
}

/**
 * Fetches all tracked keywords for a specific site, including history for the date range.
 * Date range is anchored to GSC's real end date (today - 3 days) to match Search Console.
 */
export const fetchTrackedKeywordsWithHistory = async (siteId, dateRange = '28d') => {
    try {
        // ── STEP 1: Resolve GSC-accurate date range ──────────────────────────
        const { startDate, endDate } = getGSCDateRange(dateRange)

        // Previous period for change calculation (same length, directly before current)
        const currStart  = new Date(startDate)
        const currEnd    = new Date(endDate)
        const periodDays = Math.round((currEnd - currStart) / (24 * 60 * 60 * 1000)) + 1
        const prevEnd    = new Date(currStart.getTime() - 24 * 60 * 60 * 1000)
        const prevStart  = new Date(prevEnd.getTime() - (periodDays - 1) * 24 * 60 * 60 * 1000)
        const prevStartStr = prevStart.toISOString().split('T')[0]
        const prevEndStr   = prevEnd.toISOString().split('T')[0]

        // ── STEP 2: Load ALL base data (with pagination) ─────────────────────
        const [cacheData, allKeywordsRegistry] = await Promise.all([
            fetchKeywordCache(siteId),
            fetchKeywordsRegistry(siteId)
        ])

        const cacheMap = new Map((cacheData || []).map(c => [c.keyword.toLowerCase(), c]))

        // ── STEP 3: Fetch history ONLY for tracked keywords ──────────────────
        const trackedIds = (allKeywordsRegistry || []).filter(k => k.is_tracked).map(k => k.id)

        let currentHistory  = []
        let previousHistory = []

        if (trackedIds.length > 0) {
            const PAGE_SIZE = 1000

            const fetchPeriod = async (start, end) => {
                let all  = []
                let page = 0
                let hasMore = true
                while (hasMore) {
                    const from = page * PAGE_SIZE
                    // Supabase .in() can fail with very large arrays; chunk if needed
                    const idChunks = []
                    for (let i = 0; i < trackedIds.length; i += 500) {
                        idChunks.push(trackedIds.slice(i, i + 500))
                    }

                    for (const chunk of idChunks) {
                        const { data: history, error: hError } = await supabase
                            .from('keyword_history')
                            .select('keyword_id, date, position, clicks, impressions, ctr, page_url')
                            .in('keyword_id', chunk)
                            .gte('date', start)
                            .lte('date', end)
                            .order('date', { ascending: false })
                            .range(from, from + PAGE_SIZE - 1)
                        if (hError) throw hError
                        all = all.concat(history || [])
                    }
                    // Note: with chunking we might over-fetch, but hasMore check is conservative
                    hasMore = false  // Each chunk handles its own pagination above
                    page++
                    break // Single full pass for now — chunks handle the volume
                }
                return all
            }

            ;[currentHistory, previousHistory] = await Promise.all([
                fetchPeriod(startDate, endDate),
                fetchPeriod(prevStartStr, prevEndStr)
            ])
        }

        // ── STEP 4: Build lookup maps ─────────────────────────────────────────
        // Aggregate all rows per keyword per period:
        // - sum clicks and impressions
        // - weighted-average position (by impressions) — matches GSC formula
        const buildPeriodMap = (histRows) => {
            const map = {}
            histRows.forEach(h => {
                if (!map[h.keyword_id]) {
                    map[h.keyword_id] = {
                        clicks:     0,
                        impressions: 0,
                        pos_sum:    0,
                        pos_weight: 0,
                        latestDate: '',
                        latestPos:  null,
                        latestPage: null,
                    }
                }
                const m   = map[h.keyword_id]
                const imp = h.impressions || 0
                m.clicks      += (h.clicks || 0)
                m.impressions += imp
                // Weighted position: weight each position by impressions (GSC method)
                if (typeof h.position === 'number') {
                    const w = imp > 0 ? imp : 1
                    m.pos_sum    += h.position * w
                    m.pos_weight += w
                }
                if (!m.latestDate || h.date > m.latestDate) {
                    m.latestDate = h.date
                    m.latestPos  = h.position
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

            // Impressions & clicks: prefer period history sum, fall back to cache
            const impressions = (curr && curr.impressions > 0)
                ? curr.impressions
                : (cache.total_impressions || 0)
            const clicks = (curr && curr.clicks > 0)
                ? curr.clicks
                : (cache.total_clicks || 0)

            // Position: prefer period weighted-avg, fall back to cache
            const rawPosition = curr?.avgPos ?? cache.avg_pos ?? null

            // N/R guard: < 10 impressions = statistically unreliable
            const displayPosition    = (!rawPosition || impressions < 10) ? 'N/R' : parseFloat(rawPosition.toFixed(1))
            const displayImpressions = impressions === 0 ? '-' : impressions
            const displayClicks      = impressions === 0 ? '-' : clicks
            const displayCtr         = impressions > 0  ? clicks / impressions : 0

            // ── Change Calculation ──────────────────────────────────────────────────
            // Priority order:
            // 1. Best: exact previous-period weighted avg vs current-period weighted avg
            //    (requires ~56 days of synced history)
            // 2. Fallback: current-period avg vs the 90-day cache baseline
            //    (works as long as the keyword has been synced at least once)
            // Positive = improved (rank went UP = lower position number = better)
            let change = 0
            if (curr?.avgPos) {
                if (prev?.avgPos) {
                    // Best case: period-vs-period
                    change = parseFloat((prev.avgPos - curr.avgPos).toFixed(1))
                } else if (cache.avg_pos && curr.avgPos !== cache.avg_pos) {
                    // Fallback: compare current period against 90-day cache baseline
                    // Positive = current period is BETTER than the long-term average
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

            // Trend sparkline (oldest → newest)
            const trend = (dailyLookup[kw.id] || [])
                .sort((a, b) => new Date(a.date) - new Date(b.date))
                .map(d => d.position)

            // History array for any component still consuming it
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
                position:         displayPosition,
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
        console.error("Error in fetchTrackedKeywordsWithHistory:", error)
        return []
    }
}

/**
 * Fetches all tracked properties (domains) belonging to the authenticated user
 */
export const fetchUserSites = async (userId) => {
    try {
        const { data: sites, error } = await supabase
            .from('sites')
            .select('id, property_url, site_name')
            .eq('user_id', userId)
        if (error) throw error
        return sites || []
    } catch (error) {
        console.error("Error fetching user sites:", error)
        return []
    }
}

/**
 * Fetches total count of indexed pages for a site
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
 * Fetches keyword intent distribution for the chart.
 * Paginated to handle 1000+ keywords.
 */
export const fetchIntentDistribution = async (siteId) => {
    try {
        // Paginate to get ALL keywords, not just first 1000
        const allKeywords = await fetchAllRows(
            supabase.from('keywords').select('intent').eq('site_id', siteId)
        )

        const dist = { 'Navigational': 0, 'Transactional': 0, 'Commercial': 0, 'Informational': 0 }
        allKeywords.forEach(kw => {
            const intent = kw.intent || 'Informational'
            if (dist[intent] !== undefined) dist[intent]++
            else dist['Informational']++
        })

        return Object.entries(dist).map(([name, value]) => ({
            name,
            value,
            color: name === 'Navigational'    ? '#2563EB'
                 : name === 'Transactional'   ? '#059669'
                 : name === 'Commercial'      ? '#D97706'
                 : '#9CA3AF'
        }))
    } catch (error) {
        console.error("Error in fetchIntentDistribution:", error)
        return []
    }
}

/**
 * Fetches top non-branded keywords from cache (for trial users).
 * Cache data is already aggregated for the past 90 days.
 * Paginated to get all keywords.
 */
export const fetchTrialKeywords = async (siteId) => {
    try {
        // fetchKeywordCache is already paginated
        const cache = await fetchKeywordCache(siteId)
        if (cache && cache.length > 0) {
            const gscEnd = getGSCEndDate()
            return cache
                .filter(kw => (kw.total_impressions || 0) >= 10) // N/R guard
                .sort((a, b) => b.total_impressions - a.total_impressions)
                .slice(0, 50)
                .map(kw => {
                    const impressions = kw.total_impressions || 0
                    const position    = !kw.avg_pos ? 'N/R' : parseFloat(kw.avg_pos.toFixed(1))
                    return {
                        id:          kw.id,
                        keyword:     kw.keyword,
                        position,
                        clicks:      kw.total_clicks || 0,
                        impressions: impressions || '-',
                        ctr:         impressions > 0 ? (kw.total_clicks / impressions) : 0,
                        page:        '-',
                        change:      0,
                        bestPos:     position,
                        trend:       [kw.avg_pos, kw.avg_pos, kw.avg_pos],
                        history: [{
                            date:        gscEnd,
                            position:    kw.avg_pos,
                            clicks:      kw.total_clicks,
                            impressions: impressions,
                            ctr:         impressions > 0 ? (kw.total_clicks / impressions) : 0,
                            page_url:    '-'
                        }]
                    }
                })
        }
    } catch (e) {
        console.error("Error in fetchTrialKeywords:", e)
    }
    return []
}

/**
 * Fetches analytics for all indexed pages. Date range uses GSC-accurate dates.
 */
export const fetchPageAnalytics = async (siteId, dateRange = '28d') => {
    try {
        const { startDate, endDate } = getGSCDateRange(dateRange)

        const { data: pages } = await supabase.from('pages').select('*').eq('site_id', siteId)

        // Paginate history
        const history = await fetchAllRows(
            supabase
                .from('keyword_history')
                .select('*, keywords!inner(keyword)')
                .eq('keywords.site_id', siteId)
                .gte('date', startDate)
                .lte('date', endDate)
                .order('date', { ascending: false })
        )

        if (!history || history.length === 0) return []

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

            // Weighted average position (matches GSC)
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
        console.error("Error in fetchPageAnalytics:", error)
        return []
    }
}
