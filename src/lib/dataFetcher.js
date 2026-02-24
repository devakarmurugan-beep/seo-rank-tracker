import { supabase } from './supabase'

/**
 * Fetches all tracked keywords for a specific site, including their most recent history
 */
export const fetchTrackedKeywordsWithHistory = async (siteId, dateRange = '30d') => {
    try {
        let startDate, endDate;
        if (typeof dateRange === 'object' && dateRange.type === 'custom') {
            startDate = dateRange.start;
            endDate = dateRange.end;
        } else {
            const rangeDays = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : dateRange === '1y' ? 365 : 480
            const startDateObj = new Date()
            startDateObj.setDate(startDateObj.getDate() - rangeDays)
            startDate = startDateObj.toISOString().split('T')[0]
            endDate = new Date().toISOString().split('T')[0]
        }
        // Paginate to overcome Supabase's default 1000-row limit
        const PAGE_SIZE = 1000
        let allKeywords = []
        let page = 0
        let hasMore = true

        while (hasMore) {
            const from = page * PAGE_SIZE
            const to = from + PAGE_SIZE - 1
            const { data: keywords, error: kwError } = await supabase
                .from('keywords')
                .select(`
                    id, 
                    keyword, 
                    intent,
                    category,
                    is_tracked,
                    keyword_history (
                        date,
                        position,
                        impressions,
                        clicks,
                        ctr,
                        page_url
                    )
                `)
                .eq('site_id', siteId)
                .order('date', { foreignTable: 'keyword_history', ascending: false })
                .limit(1000, { foreignTable: 'keyword_history' })
                .range(from, to)

            if (kwError) throw kwError
            allKeywords = allKeywords.concat(keywords || [])
            hasMore = (keywords || []).length === PAGE_SIZE
            page++
        }

        return allKeywords.map(kw => {
            const sortedHistory = (kw.keyword_history || [])
                .filter(h => h.date >= startDate && h.date <= endDate)
                .sort((a, b) => new Date(b.date) - new Date(a.date))

            const latest = sortedHistory[0] || {}
            const previous = sortedHistory.length > 1 ? sortedHistory[sortedHistory.length - 1] : {}
            const change = (latest.position && previous.position) ? previous.position - latest.position : 0

            const totalImpressionsRange = sortedHistory.reduce((sum, h) => sum + (h.impressions || 0), 0)
            const totalClicksRange = sortedHistory.reduce((sum, h) => sum + (h.clicks || 0), 0)
            const overallCtr = totalImpressionsRange > 0 ? (totalClicksRange / totalImpressionsRange) : 0

            return {
                id: kw.id,
                keyword: kw.keyword,
                category: kw.category || 'Uncategorized',
                intent: kw.intent || 'Informational',
                is_tracked: kw.is_tracked || false,
                pageType: latest.page_url ? (latest.page_url.includes('/blog/') ? 'Blog' : 'Landing') : 'Unknown',
                position: latest.position || '-',
                change: change,
                bestPos: Math.min(...sortedHistory.map(h => h.position).filter(p => p != null)) || '-',
                impressions: totalImpressionsRange,
                clicks: totalClicksRange,
                totalClicks: totalClicksRange,
                totalImpressions: totalImpressionsRange,
                ctr: overallCtr,
                page: latest.page_url || '-',
                trend: sortedHistory.slice(0, 30).map(h => h.position).reverse(),
                history: sortedHistory // raw history for date-range filtering
            }
        })
    } catch (error) {
        console.error("Error fetching keywords data:", error)
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
            name, value, color: name === 'Navigational' ? '#2563EB' : name === 'Transactional' ? '#059669' : name === 'Commercial' ? '#D97706' : '#9CA3AF'
        }))
    } catch (error) {
        return []
    }
}

/**
 * Fetches top 25 non-branded keywords for trial users directly from GSC (via backend)
 */
export const fetchTrialKeywords = async (siteId) => {
    try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/gsc/trial-keywords?siteId=${siteId}`)
        const data = await response.json()
        if (data.success) {
            return data.keywords.map(kw => ({
                ...kw,
                change: 0,
                bestPos: kw.position,
                trend: [kw.position, kw.position, kw.position],
                history: []
            }))
        }
        return []
    } catch (error) {
        console.error("Error fetching trial keywords:", error)
        return []
    }
}

/**
 * Fetches analytics for all indexed pages
 */
export const fetchPageAnalytics = async (siteId, dateRange = '30d') => {
    try {
        let startDate, endDate;
        if (typeof dateRange === 'object' && dateRange.type === 'custom') {
            startDate = dateRange.start;
            endDate = dateRange.end;
        } else {
            const rangeDays = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : dateRange === '1y' ? 365 : 480
            const startDateObj = new Date()
            startDateObj.setDate(startDateObj.getDate() - rangeDays)
            startDate = startDateObj.toISOString().split('T')[0]
            endDate = new Date().toISOString().split('T')[0]
        }

        const { data: pages } = await supabase.from('pages').select('*').eq('site_id', siteId)
        const { data: history } = await supabase.from('keyword_history').select('*, keywords!inner(keyword)').eq('keywords.site_id', siteId).gte('date', startDate).lte('date', endDate).order('date', { ascending: false })

        // If no DB history (Trial user), return empty or fallback
        if (!history || history.length === 0) return []

        return (pages || []).map(p => {
            const pH = (history || []).filter(h => h.page_url === p.page_url)
            const latest = pH[0] || {}
            const totalImp = pH.reduce((acc, h) => acc + h.impressions, 0)
            const totalClick = pH.reduce((acc, h) => acc + h.clicks, 0)
            const kwCounts = {}
            pH.forEach(h => { const n = h.keywords.keyword; kwCounts[n] = (kwCounts[n] || 0) + h.clicks })
            const topKw = Object.entries(kwCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null

            return {
                title: p.page_url.split('/').filter(Boolean).pop() || 'Homepage',
                url: p.page_url,
                status: 'Indexed',
                keyword: topKw,
                keyPos: latest.position || null,
                impressions: totalImp.toLocaleString(),
                clicks: totalClick.toLocaleString(),
                ctr: totalImp > 0 ? ((totalClick / totalImp) * 100).toFixed(1) + '%' : '0%',
                avgPos: pH.length > 0 ? (pH.reduce((acc, h) => acc + h.position, 0) / pH.length).toFixed(1) : '-',
                updated: 'Synced'
            }
        })
    } catch (error) {
        return []
    }
}
