import { supabase } from './supabase'
import { getGSCDateRange, getGSCEndDate } from './dateUtils'

/**
 * Fetches the aggregated cache for all keywords found in GSC for this site.
 */
export const fetchKeywordCache = async (siteId) => {
    try {
        const { data, error } = await supabase
            .from('keyword_cache')
            .select('*')
            .eq('site_id', siteId)
        if (error) throw error
        return data || []
    } catch (error) {
        console.error("Error fetching keyword cache:", error)
        return []
    }
}

/**
 * Fetches all tracked keywords for a specific site, including their most recent history.
 * Date range is anchored to GSC's real end date (today - 3 days) to match Search Console.
 */
export const fetchTrackedKeywordsWithHistory = async (siteId, dateRange = '28d') => {
    try {
        // ── STEP 1: Resolve GSC-accurate date range ──────────────────────
        const { startDate, endDate } = getGSCDateRange(dateRange)

        // Previous period for change calculation (same length window, directly before current)
        const currStart = new Date(startDate)
        const currEnd   = new Date(endDate)
        const periodDays = Math.round((currEnd - currStart) / (24 * 60 * 60 * 1000)) + 1
        const prevEnd   = new Date(currStart.getTime() - 24 * 60 * 60 * 1000)
        const prevStart = new Date(prevEnd.getTime() - (periodDays - 1) * 24 * 60 * 60 * 1000)
        const prevStartStr = prevStart.toISOString().split('T')[0]
        const prevEndStr   = prevEnd.toISOString().split('T')[0]

        // ── STEP 2: Load base data in parallel ───────────────────────────
        const [cacheData, dbProperties] = await Promise.all([
            fetchKeywordCache(siteId),
            supabase.from('keywords').select('id, keyword, intent, category, is_tracked').eq('site_id', siteId)
        ])

        const cacheMap = new Map((cacheData || []).map(c => [c.keyword.toLowerCase(), c]))
        const { data: allKeywordsRegistry } = dbProperties

        // ── STEP 3: Fetch history for current + previous period ──────────
        const trackedIds = (allKeywordsRegistry || []).filter(k => k.is_tracked).map(k => k.id)

        let currentHistory = []
        let previousHistory = []

        if (trackedIds.length > 0) {
            const PAGE_SIZE = 1000
            // Fetch both periods in parallel
            const fetchPeriod = async (start, end) => {
                let all = []
                let page = 0
                let hasMore = true
                while (hasMore) {
                    const from = page * PAGE_SIZE
                    const { data: history, error: hError } = await supabase
                        .from('keyword_history')
                        .select('*')
                        .in('keyword_id', trackedIds)
                        .gte('date', start)
                        .lte('date', end)
                        .order('date', { ascending: false })
                        .range(from, from + PAGE_SIZE - 1)
                    if (hError) throw hError
                    all = all.concat(history || [])
                    hasMore = (history || []).length === PAGE_SIZE
                    page++
                }
                return all
            }

            ;[currentHistory, previousHistory] = await Promise.all([
                fetchPeriod(startDate, endDate),
                fetchPeriod(prevStartStr, prevEndStr)
            ])
        }

        // ── STEP 4: Build lookup maps ─────────────────────────────────────
        // For each keyword_id, aggregate all rows in the period into a single record
        // This mirrors how GSC aggregates: sum clicks/impressions, weighted-avg position
        const buildPeriodMap = (histRows) => {
            const map = {}
            histRows.forEach(h => {
                if (!map[h.keyword_id]) {
                    map[h.keyword_id] = {
                        clicks: 0,
                        impressions: 0,
                        pos_sum: 0,
                        pos_weight: 0,
                        latestDate: '',
                        latestPos: null,
                        latestPage: null,
                        allDates: []
                    }
                }
                const m = map[h.keyword_id]
                m.clicks      += (h.clicks || 0)
                m.impressions += (h.impressions || 0)
                const imp = h.impressions || 1
                m.pos_sum    += (h.position || 0) * imp
                m.pos_weight += imp
                m.allDates.push(h.date)
                if (!m.latestDate || h.date > m.latestDate) {
                    m.latestDate = h.date
                    m.latestPos  = h.position
                    m.latestPage = h.page_url
                }
            })
            // Compute weighted average position for the whole period
            Object.values(map).forEach(m => {
                m.avgPos = m.pos_weight > 0 ? m.pos_sum / m.pos_weight : null
            })
            return map
        }

        const currentMap  = buildPeriodMap(currentHistory)
        const previousMap = buildPeriodMap(previousHistory)

        // ── STEP 5: Build raw daily positions for trend sparkline ─────────
        const dailyLookup = {}
        currentHistory.forEach(h => {
            if (!dailyLookup[h.keyword_id]) dailyLookup[h.keyword_id] = []
            dailyLookup[h.keyword_id].push({ date: h.date, position: h.position })
        })

        // ── STEP 6: Assemble the final keyword objects ────────────────────
        return (allKeywordsRegistry || []).map(kw => {
            const kwLower = kw.keyword.toLowerCase()
            const cache   = cacheMap.get(kwLower) || {}

            const curr  = currentMap[kw.id]  || null
            const prev  = previousMap[kw.id] || null

            const impressions = curr?.impressions ?? cache.total_impressions ?? 0
            const clicks      = curr?.clicks      ?? cache.total_clicks      ?? 0

            // Weighted average position for the selected period. 
            // Falls back to cache avg_pos if no history in range.
            let position = curr?.avgPos ?? cache.avg_pos ?? null

            // N/R guard: if impressions < 10 the position is statistically unreliable
            const displayPosition   = (!position || impressions < 10) ? 'N/R' : parseFloat(position.toFixed(1))
            const displayImpressions = impressions === 0 ? '-' : impressions
            const displayClicks      = impressions === 0 ? '-' : clicks
            const displayCtr         = impressions > 0 ? clicks / impressions : 0

            // ── Change Calculation (GSC-style) ────────────────────────────
            // change = previousPeriodAvgPos - currentPeriodAvgPos
            // A positive number means IMPROVEMENT (rank went up, lower position number)
            let change = 0
            if (curr?.avgPos && prev?.avgPos) {
                // Round to 1 decimal to match GSC display
                change = parseFloat((prev.avgPos - curr.avgPos).toFixed(1))
            }

            // Best position in the current period
            const dailyPositions = (dailyLookup[kw.id] || []).map(d => d.position).filter(p => p != null)
            const bestPos = dailyPositions.length > 0 ? Math.min(...dailyPositions) : (position || null)

            // Trend array (sorted oldest → newest for the sparkline)
            const trend = (dailyLookup[kw.id] || [])
                .sort((a, b) => new Date(a.date) - new Date(b.date))
                .map(d => d.position)

            // History for Dashboard's date-filtering
            const sortedHistory = (dailyLookup[kw.id] || [])
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .map(d => ({
                    date: d.date,
                    position: d.position,
                    clicks: 0,         // We don't store per-day clicks in dailyLookup
                    impressions: 0,    // Same – use total from period
                    page_url: curr?.latestPage || '-'
                }))

            return {
                id:               kw.id,
                keyword:          kw.keyword,
                category:         kw.category   || 'Uncategorized',
                intent:           kw.intent      || 'Informational',
                is_tracked:       kw.is_tracked  || false,
                pageType:         curr?.latestPage
                    ? (curr.latestPage.includes('/blog/') ? 'Blog' : 'Landing')
                    : 'Unknown',
                position:         displayPosition,
                rawPosition:      typeof position === 'number' ? position : 1000,
                change,
                bestPos:          bestPos ? parseFloat(bestPos.toFixed(1)) : '-',
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
 * Fetches keyword intent distribution for the chart
 */
export const fetchIntentDistribution = async (siteId) => {
    try {
        const { data, error } = await supabase.from('keywords').select('intent').eq('site_id', siteId)
        if (error) throw error
        const dist = { 'Navigational': 0, 'Transactional': 0, 'Commercial': 0, 'Informational': 0 }
        data.forEach(kw => { if (dist[kw.intent] !== undefined) dist[kw.intent]++ })
        return Object.entries(dist).map(([name, value]) => ({
            name, value,
            color: name === 'Navigational' ? '#2563EB'
                 : name === 'Transactional' ? '#059669'
                 : name === 'Commercial'    ? '#D97706'
                 : '#9CA3AF'
        }))
    } catch (error) {
        return []
    }
}

const getApiUrl = () => {
    let apiUrl = import.meta.env.VITE_API_URL || ''
    const isProdDomain = window.location.hostname.includes('seoranktrackingtool.com')
    if (isProdDomain && (apiUrl.includes('localhost') || !apiUrl)) {
        return window.location.origin
    }
    return apiUrl || 'http://localhost:3001'
}

/**
 * Fetches top non-branded keywords from cache (for trial users).
 * Cache data is already aggregated for the past 90 days.
 */
export const fetchTrialKeywords = async (siteId) => {
    try {
        const cache = await fetchKeywordCache(siteId)
        if (cache && cache.length > 0) {
            const gscEnd = getGSCEndDate()
            return cache
                .sort((a, b) => b.total_impressions - a.total_impressions)
                .slice(0, 50)
                .map(kw => {
                    const impressions = kw.total_impressions || 0
                    const position = (impressions < 10 || !kw.avg_pos) ? 'N/R' : parseFloat(kw.avg_pos.toFixed(1))
                    return {
                        id:           kw.id,
                        keyword:      kw.keyword,
                        position,
                        clicks:       kw.total_clicks || 0,
                        impressions:  impressions || '-',
                        ctr:          impressions > 0 ? (kw.total_clicks / impressions) : 0,
                        page:         '-',
                        change:       0,
                        bestPos:      position,
                        trend:        [kw.avg_pos, kw.avg_pos, kw.avg_pos],
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
 * Fetches analytics for all indexed pages.
 * Date range uses GSC-accurate dates.
 */
export const fetchPageAnalytics = async (siteId, dateRange = '28d') => {
    try {
        const { startDate, endDate } = getGSCDateRange(dateRange)

        const { data: pages } = await supabase.from('pages').select('*').eq('site_id', siteId)
        const { data: history } = await supabase
            .from('keyword_history')
            .select('*, keywords!inner(keyword)')
            .eq('keywords.site_id', siteId)
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: false })

        if (!history || history.length === 0) return []

        return (pages || []).map(p => {
            const pH       = (history || []).filter(h => h.page_url === p.page_url)
            const latest   = pH[0] || {}
            const totalImp = pH.reduce((acc, h) => acc + h.impressions, 0)
            const totalClick = pH.reduce((acc, h) => acc + h.clicks, 0)
            const kwCounts = {}
            pH.forEach(h => { const n = h.keywords.keyword; kwCounts[n] = (kwCounts[n] || 0) + h.clicks })
            const topKw = Object.entries(kwCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null

            // Weighted average position (matches GSC)
            const totalWeight = pH.reduce((acc, h) => acc + (h.impressions || 1), 0)
            const weightedPos = pH.reduce((acc, h) => acc + (h.position || 0) * (h.impressions || 1), 0)
            const avgPos = totalWeight > 0 ? (weightedPos / totalWeight).toFixed(1) : '-'

            return {
                title:       p.page_url.split('/').filter(Boolean).pop() || 'Homepage',
                url:         p.page_url,
                status:      'Indexed',
                keyword:     topKw,
                keyPos:      latest.position || null,
                impressions: totalImp.toLocaleString(),
                clicks:      totalClick.toLocaleString(),
                ctr:         totalImp > 0 ? ((totalClick / totalImp) * 100).toFixed(1) + '%' : '0%',
                avgPos,
                updated:     'Synced'
            }
        })
    } catch (error) {
        return []
    }
}
