import express from 'express'
import { getSupabaseAdmin } from '../lib/supabase.js'
import { buildSimpleBrandVars, filterNonBranded, normalizeSiteUrl } from '../lib/constants.js'
import { getGSCClient } from '../services/google/client.js'
import { fetchSearchAnalyticsPaginated } from '../services/google/gsc.js'
import { classifyKeywordIntent, gscCountryMap } from '../services/google/intent.js'

const router = express.Router()

// Fetch Location/Country Data from GSC
router.get('/locations', async (req, res) => {
    const { siteId, dateRange = '30d', trial = 'false' } = req.query
    if (!siteId) return res.status(400).json({ error: 'Missing siteId' })
    const isTrial = trial === 'true'

    try {
        const supabase = getSupabaseAdmin()
        const { data: site } = await supabase.from('sites').select('*').eq('id', siteId).single()
        if (!site) return res.status(404).json({ error: 'Site not found' })

        const { data: connection } = await supabase.from('user_connections').select('*').eq('user_id', site.user_id).eq('provider', 'google').single()
        if (!connection?.refresh_token) return res.status(404).json({ error: 'Google connection not found' })

        const brandVars = buildSimpleBrandVars(site.property_url)

        let startDate, endDate
        if (dateRange.startsWith('{')) {
            try {
                const customDate = JSON.parse(dateRange)
                startDate = customDate.start
                endDate = customDate.end
            } catch (e) {
                console.warn("Failed to parse custom dateRange JSON", e)
            }
        }

        if (!startDate || !endDate) {
            const delay = 3
            const rangeMap = { '7d': 7, '28d': 28, '30d': 30, '3m': 91, '90d': 91, '6m': 182, '12m': 365, '1y': 365 }
            const rangeDays = rangeMap[dateRange] || 28
            const today = new Date()
            endDate = new Date(today.getTime() - (delay * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
            startDate = new Date(today.getTime() - ((rangeDays + delay) * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
        }

        const gscClient = getGSCClient(connection.refresh_token)

        const rows = await fetchSearchAnalyticsPaginated(gscClient, site.property_url, {
            startDate, endDate, dimensions: ['country', 'query', 'page']
        })
        const countryMap = {}

        rows.forEach(row => {
            const countryCode = row.keys[0]
            const keyword = row.keys[1]
            const page = row.keys[2]

            if (isTrial) {
                const isBranded = brandVars.some(b => keyword.toLowerCase().includes(b))
                if (isBranded) return
            }

            if (!countryMap[countryCode]) {
                countryMap[countryCode] = {
                    countryCode,
                    keywords: [],
                    totalImpressions: 0,
                    totalClicks: 0,
                    sumPosition: 0,
                    keywordCount: 0
                }
            }

            countryMap[countryCode].keywords.push({
                keyword, page,
                clicks: row.clicks,
                impressions: row.impressions,
                ctr: row.ctr,
                position: row.position
            })

            countryMap[countryCode].totalImpressions += row.impressions
            countryMap[countryCode].totalClicks += row.clicks
            countryMap[countryCode].sumPosition += row.position
            countryMap[countryCode].keywordCount += 1
        })

        const locations = Object.values(countryMap).map(c => {
            let kws = c.keywords.sort((a, b) => a.position - b.position)
            const countryInfo = gscCountryMap[c.countryCode.toLowerCase()]
            return {
                countryCode: c.countryCode,
                countryName: countryInfo?.name || c.countryCode.toUpperCase(),
                keywordCount: isTrial ? kws.length : c.keywordCount,
                impressions: isTrial ? kws.reduce((acc, k) => acc + k.impressions, 0) : c.totalImpressions,
                clicks: isTrial ? kws.reduce((acc, k) => acc + k.clicks, 0) : c.totalClicks,
                avgPosition: kws.length > 0 ? Number((kws.reduce((acc, k) => acc + k.position, 0) / kws.length).toFixed(1)) : 0,
                keywords: kws
            }
        })

        locations.sort((a, b) => b.keywordCount - a.keywordCount)
        res.json({ success: true, locations })
    } catch (err) {
        console.error('Error fetching GSC locations:', err.message)
        res.status(500).json({ error: 'Failed to fetch location data', details: err.message })
    }
})

// Trial Keywords Endpoint (Top 50 Non-Branded)
router.get('/trial-keywords', async (req, res) => {
    const { siteId } = req.query
    if (!siteId) return res.status(400).json({ error: 'Missing siteId' })

    try {
        const supabase = getSupabaseAdmin()
        const { data: site } = await supabase.from('sites').select('*').eq('id', siteId).single()
        if (!site) return res.status(404).json({ error: 'Site Not Found' })

        const { data: connection } = await supabase.from('user_connections').select('*').eq('user_id', site.user_id).eq('provider', 'google').single()
        if (!connection?.refresh_token) return res.status(404).json({ error: 'Connection Not Found' })

        const brandVars = buildSimpleBrandVars(site.property_url)

        const today = new Date()
        const endDate = new Date(today.getTime() - (3 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
        const startDate = new Date(today.getTime() - (32 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]

        let siteUrl = normalizeSiteUrl(site.property_url)
        const gscClient = getGSCClient(connection.refresh_token)
        console.log(`[Trial] Fetching GSC for: ${siteUrl}`)

        const body = { startDate, endDate, dimensions: ['query', 'page'] }
        let fetchedRows = await fetchSearchAnalyticsPaginated(gscClient, siteUrl, body)

        // Fallback: toggle trailing slash
        if (fetchedRows.length === 0 && !siteUrl.startsWith('sc-domain:')) {
            const fallbackUrl = siteUrl.endsWith('/') ? siteUrl.slice(0, -1) : `${siteUrl}/`
            console.log(`[Trial] No data for ${siteUrl}, trying fallback: ${fallbackUrl}`)
            try {
                const fallbackRows = await fetchSearchAnalyticsPaginated(gscClient, fallbackUrl, body)
                if (fallbackRows.length > 0) {
                    console.log(`[Trial] Fallback succeeded with ${fallbackRows.length} rows`)
                    fetchedRows = fallbackRows
                    siteUrl = fallbackUrl
                }
            } catch (e) {
                console.log(`[Trial] Fallback failed: ${e.message}`)
            }
        }

        console.log(`[Trial] GSC matched ${fetchedRows.length} rows`)

        let allRows = fetchedRows.map(r => ({
            keyword: r.keys[0],
            page: r.keys[1],
            clicks: r.clicks,
            impressions: r.impressions,
            ctr: r.ctr,
            position: r.position
        }))

        let results = filterNonBranded(allRows, brandVars)
        console.log(`[Trial] Non-branded count: ${results.length}`)

        if (results.length === 0 && allRows.length > 0) {
            console.log(`[Trial] Falling back to branded keywords because non-branded was empty`)
            results = allRows
        }

        const sorted = results.sort((a, b) => b.impressions - a.impressions).slice(0, 50)

        const allKeywords = sorted.map(kw => ({
            ...kw,
            intent: classifyKeywordIntent(kw.keyword, brandVars),
            is_tracked: false,
            category: 'High-Volume Discovery'
        }))

        res.json({
            success: true,
            keywords: allKeywords,
            debug: { totalRows: allRows.length, nonBrandedCount: results.length, siteUrlUsed: siteUrl }
        })
    } catch (err) {
        console.error(`[Trial] Error: ${err.message}`)
        res.status(500).json({ error: 'Trial fetch failed', details: err.message })
    }
})

export default router
