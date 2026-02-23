import dotenv from 'dotenv'
if (process.env.NODE_ENV !== 'production') {
    dotenv.config({ path: '../.env.local' })
}

import express from 'express'
import cors from 'cors'
import { createClient } from '@supabase/supabase-js'
import { getAuthenticatedGSCClient, fetchGSCRankingData, fetchGSCSites, classifyKeywordIntent } from './services/gscUtility.js'
import paymentsRoute from './routes/payments.js'

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api/payments', paymentsRoute)

// Initialize Supabase Admin Client (Bypasses RLS for backend cron jobs)
const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
)

app.get('/health', (req, res) => {
    res.json({ status: 'Platform API is active', time: new Date().toISOString() })
})

// === Core Data Fetcher Endpoints ===

// 1. Fetch available properties from GSC without auto-saving
app.post('/api/user/available-sites', async (req, res) => {
    const { userId } = req.body
    if (!userId) return res.status(400).json({ error: 'Missing userId' })

    try {
        // Use .order('created_at', { ascending: false }).limit(1) instead of .single() 
        // to avoid crashes if multiple tokens exist for one user.
        const { data: connections, error: connError } = await supabaseAdmin
            .from('user_connections')
            .select('refresh_token')
            .eq('user_id', userId)
            .eq('provider', 'google')
            .order('created_at', { ascending: false })
            .limit(1)

        if (connError || !connections || connections.length === 0) {
            console.log(`[Backend] No Google connection found for user ${userId}`)
            return res.json({ success: true, count: 0, sites: [], message: 'No connection found' })
        }

        const connection = connections[0]

        const gscClient = getAuthenticatedGSCClient(connection.refresh_token)
        console.log(`[Backend] Fetching sites from Google for user: ${userId}`)
        const sites = await fetchGSCSites(gscClient).catch(e => {
            console.error('[Backend] Google API Call Failed:', e.message)
            throw e
        })

        console.log(`[Backend] Raw sites count: ${sites?.length || 0}`)

        // Simply map and return the available domains for the user to choose from
        const sitesPayload = (sites || []).map(site => {
            let name = site.siteUrl.replace('sc-domain:', '').replace('https://', '').replace('http://', '').replace(/[\/]+$/, '')
            return {
                property_url: site.siteUrl,
                site_name: name
            }
        })

        console.log(`[Backend] Returning ${sitesPayload.length} formatted sites`)
        res.json({ success: true, count: sitesPayload.length, sites: sitesPayload })

    } catch (err) {
        console.error('Error fetching GSC sites:', err)
        res.status(500).json({ error: 'Failed to fetch sites from Google', details: err.message })
    }
})

// 2. Add a specific site to Track
app.post('/api/user/add-site', async (req, res) => {
    const { userId, property_url, site_name } = req.body
    if (!userId || !property_url || !site_name) return res.status(400).json({ error: 'Missing payload' })

    try {
        // Insert singular site with strict uniqueness manually enforced before the DB layer
        const { data: existingSite } = await supabaseAdmin
            .from('sites')
            .select('id')
            .eq('user_id', userId)
            .eq('property_url', property_url)
            .single()

        if (existingSite) {
            return res.status(400).json({ error: 'Site already exists in your projects.' })
        }

        const { data: newSite, error: insertError } = await supabaseAdmin
            .from('sites')
            .insert([{ user_id: userId, property_url, site_name }])
            .select('*')
            .single()

        if (insertError) throw insertError

        res.json({ success: true, site: newSite })
    } catch (err) {
        console.error('Error adding site:', err.message)
        res.status(500).json({ error: 'Failed to add site', details: err.message })
    }
})

// 3. Sync Site Analytics Data (Keywords, Pages, History)
app.post('/api/user/sync-site-data', async (req, res) => {
    const { userId, siteId, brandVariations = [] } = req.body
    if (!userId || !siteId) return res.status(400).json({ error: 'Missing userId or siteId' })

    try {
        // 1. Get Site & Connection Details
        const { data: site } = await supabaseAdmin.from('sites').select('*').eq('id', siteId).single()
        const { data: connection } = await supabaseAdmin.from('user_connections').select('refresh_token').eq('user_id', userId).eq('provider', 'google').single()

        if (!site || !connection?.refresh_token) {
            return res.status(404).json({ error: 'Site or Google connection not found' })
        }

        // 2. Fetch GSC Data (History + Pages) — Last 16 months (approx 480 days)
        // 2. Fetch All Tracked Keywords for this site to prioritize history
        const { data: currentTracked } = await supabaseAdmin
            .from('keywords')
            .select('keyword')
            .eq('site_id', siteId)
            .eq('is_tracked', true)

        const today = new Date()
        const endDateStr = new Date(today.getTime() - (2 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
        const startDateStr = new Date(today.getTime() - (480 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]

        const gscClient = getAuthenticatedGSCClient(connection.refresh_token)

        // Chunking Strategy: Fetch in 30-day blocks to avoid 25,000 row limit
        const allHistory = []
        const allPages = new Set()

        let chunkEnd = new Date(endDateStr)
        const totalStart = new Date(startDateStr)

        while (chunkEnd > totalStart) {
            let chunkStart = new Date(chunkEnd.getTime() - (30 * 24 * 60 * 60 * 1000))
            if (chunkStart < totalStart) chunkStart = totalStart

            const s = chunkStart.toISOString().split('T')[0]
            const e = chunkEnd.toISOString().split('T')[0]

            console.log(`Syncing chunk: ${s} to ${e}`)
            const { history, pages } = await fetchGSCRankingData(gscClient, site.property_url, s, e)
            allHistory.push(...history)
            pages.forEach(p => allPages.add(p))

            chunkEnd = new Date(chunkStart.getTime() - (1 * 24 * 60 * 60 * 1000))
        }

        // Also specifically fetch recent history for tracked keywords to ensure they aren't missed
        if (currentTracked && currentTracked.length > 0) {
            // Fetch last 30 days specifically for these keywords if not already deep enough
            // (The chunking above covers everything, but this is a safety net for high-volume sites)
            for (const kwObj of currentTracked) {
                // If history is still sparse for this keyword, we could do a targeted fetch
                // For now, chunking 60 days should be plenty.
            }
        }

        // 3. Process Keywords & Intent
        const pages = Array.from(allPages)
        // Generate smart brand variations from property URL
        const domainClean = site.property_url
            .replace(/^https?:\/\//, '').replace(/^sc-domain:/, '').replace(/^www\./, '')
            .replace(/\/.*$/, '').replace(/\.com$|\.in$|\.org$|\.net$|\.co$/g, '').trim().toLowerCase()
        const smartBrandVars = [...brandVariations.map(b => b.toLowerCase())]
        smartBrandVars.push(domainClean)
        const suffixes = ['tvservicecenter', 'servicecenter', 'servicecentre', 'services', 'service', 'online', 'india', 'tech', 'digital', 'agency', 'studio', 'media', 'group', 'solutions', 'hq']
        for (const suffix of suffixes) {
            if (domainClean.endsWith(suffix) && domainClean.length > suffix.length + 2) {
                const brandCore = domainClean.slice(0, -suffix.length)
                smartBrandVars.push(brandCore)
                const spaced = brandCore.replace(/([a-z])(fuse|tech|web|net|pro|ai|lab|box|hub|bit|app|dev|gen|id|go|my)/gi, '$1 $2')
                if (spaced !== brandCore) smartBrandVars.push(spaced)
                break
            }
        }
        const uniqueBrandVars = [...new Set(smartBrandVars)].filter(v => v.length >= 3)

        const keywordMap = {}
        allHistory.forEach(row => {
            if (!keywordMap[row.keyword]) {
                keywordMap[row.keyword] = {
                    site_id: siteId,
                    keyword: row.keyword,
                    intent: classifyKeywordIntent(row.keyword, uniqueBrandVars)
                }
            }
        })

        const keywordList = Object.values(keywordMap)

        if (keywordList.length > 0) {
            const { error: kwError } = await supabaseAdmin
                .from('keywords')
                .upsert(keywordList, { onConflict: 'site_id, keyword' })
            if (kwError) throw kwError
        }

        // Fetch back IDs
        const { data: savedKeywords } = await supabaseAdmin
            .from('keywords')
            .select('id, keyword')
            .eq('site_id', siteId)

        const kwLookup = {}
        savedKeywords.forEach(k => kwLookup[k.keyword] = k.id)

        // 4. Process History Snapshots
        const historyMap = {}
        allHistory.forEach(row => {
            const kwId = kwLookup[row.keyword]
            if (!kwId) return
            const key = `${kwId}|${row.date}`
            if (!historyMap[key]) {
                historyMap[key] = {
                    keyword_id: kwId,
                    date: row.date,
                    position: row.position,
                    impressions: row.impressions,
                    clicks: row.clicks,
                    ctr: row.ctr,
                    page_url: row.page_url
                }
            } else {
                const existing = historyMap[key]
                existing.impressions += row.impressions
                existing.clicks += row.clicks
                // Keep the page_url with the best (lowest) position
                if (row.position < existing.position) {
                    existing.position = row.position
                    existing.page_url = row.page_url
                }
                // Recalculate CTR
                existing.ctr = existing.impressions > 0 ? existing.clicks / existing.impressions : 0
            }
        })
        const historyPayload = Object.values(historyMap)

        if (historyPayload.length > 0) {
            // Batch upsert in chunks of 500 to avoid payload limits
            const CHUNK_SIZE = 500
            for (let i = 0; i < historyPayload.length; i += CHUNK_SIZE) {
                const chunk = historyPayload.slice(i, i + CHUNK_SIZE)
                const { error: histError } = await supabaseAdmin
                    .from('keyword_history')
                    .upsert(chunk, { onConflict: 'keyword_id, date' })
                if (histError) throw histError
            }
        }

        // 5. Update Pages Metadata
        if (pages.length > 0) {
            const pagesPayload = pages.map(url => ({ site_id: siteId, page_url: url }))
            await supabaseAdmin.from('pages').upsert(pagesPayload, { onConflict: 'site_id, page_url' })
        }

        res.json({
            success: true,
            metrics: {
                totalKeywords: keywordList.length,
                totalPages: pages.length,
                historyRecords: historyPayload.length
            }
        })

    } catch (err) {
        console.error('Error syncing site data:', err.message)
        res.status(500).json({ error: 'Failed to sync site data', details: err.message })
    }
})

// 4. Add Keywords to Tracking
app.post('/api/keywords/track', async (req, res) => {
    const { siteId, keywords, overwrite = false } = req.body
    // keywords: [{ keyword, category, expected_url }]
    if (!siteId || !keywords || !Array.isArray(keywords) || keywords.length === 0) {
        return res.status(400).json({ error: 'Missing siteId or keywords array' })
    }

    try {
        if (overwrite) {
            // Clear current tracking for this site
            await supabaseAdmin
                .from('keywords')
                .update({ is_tracked: false })
                .eq('site_id', siteId)
        }

        const records = keywords.map(kw => ({
            site_id: siteId,
            keyword: kw.keyword.trim().toLowerCase(),
            category: kw.category || 'Uncategorized',
            expected_url: kw.expected_url || null,
            is_tracked: true
        }))

        const { data: keywordsWithIds, error } = await supabaseAdmin
            .from('keywords')
            .upsert(records, { onConflict: 'site_id, keyword' })
            .select('id, keyword')

        if (error) throw error

        // 2. Fetch history for these specific keywords immediately so the user doesn't wait
        const { data: site } = await supabaseAdmin.from('sites').select('*').eq('id', siteId).single()
        const { data: connection } = await supabaseAdmin.from('user_connections').select('*').eq('user_id', site.user_id).eq('provider', 'google').single()

        if (connection?.refresh_token && site?.property_url) {
            const gscClient = getAuthenticatedGSCClient(connection.refresh_token)
            const today = new Date()
            const endDate = new Date(today.getTime() - (2 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
            const startDate = new Date(today.getTime() - (480 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]

            for (const kw of keywordsWithIds) {
                try {
                    const { history } = await fetchGSCRankingData(gscClient, site.property_url, startDate, endDate, kw.keyword)
                    if (history && history.length > 0) {
                        const historyPayload = history.map(h => ({
                            keyword_id: kw.id,
                            date: h.date,
                            position: h.position,
                            impressions: h.impressions,
                            clicks: h.clicks,
                            ctr: h.ctr,
                            page_url: h.page_url
                        }))
                        await supabaseAdmin.from('keyword_history').upsert(historyPayload, { onConflict: 'keyword_id, date' })
                    }
                } catch (e) {
                    console.error(`Error fetching history for specific keyword ${kw.keyword}:`, e.message)
                }
            }
        }

        res.json({ success: true, count: records.length })
    } catch (err) {
        console.error('Error adding tracked keywords:', err.message)
        res.status(500).json({ error: 'Failed to add keywords', details: err.message })
    }
})

app.post('/api/keywords/untrack', async (req, res) => {
    const { siteId, keyword } = req.body
    if (!siteId || !keyword) return res.status(400).json({ error: 'Missing siteId or keyword' })
    try {
        await supabaseAdmin.from('keywords')
            .update({ is_tracked: false })
            .eq('site_id', siteId)
            .eq('keyword', keyword)
        res.json({ success: true })
    } catch (err) {
        res.status(500).json({ error: 'Failed to stop tracking', details: err.message })
    }
})

// 5. Fetch Location/Country Data from GSC On-the-fly
app.get('/api/gsc/locations', async (req, res) => {
    const { siteId, dateRange = '30d' } = req.query
    if (!siteId) return res.status(400).json({ error: 'Missing siteId' })

    try {
        // ... previous code 1-2 ...
        const { data: site } = await supabaseAdmin.from('sites').select('*').eq('id', siteId).single()
        if (!site) return res.status(404).json({ error: 'Site not found' })

        const { data: connection } = await supabaseAdmin.from('user_connections').select('*').eq('user_id', site.user_id).eq('provider', 'google').single()
        if (!connection?.refresh_token) return res.status(404).json({ error: 'Google connection not found' })

        // 3. Fetch from GSC (Based on Date Range)
        let startDate, endDate;
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
            const rangeDays = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : dateRange === '1y' ? 365 : 480
            const today = new Date()
            endDate = new Date(today.getTime() - (2 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
            startDate = new Date(today.getTime() - ((rangeDays + 2) * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
        }

        const gscClient = getAuthenticatedGSCClient(connection.refresh_token)

        const response = await gscClient.searchanalytics.query({
            siteUrl: site.property_url,
            requestBody: {
                startDate: startDate,
                endDate: endDate,
                dimensions: ['country', 'query', 'page'],
                rowLimit: 5000,
            }
        })

        const rows = response.data.rows || []

        // 4. Aggregate by Country
        const countryMap = {}
        rows.forEach(row => {
            const countryCode = row.keys[0] // e.g., 'ind', 'usa', 'gbr'
            const keyword = row.keys[1]
            const page = row.keys[2]

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
                keyword,
                page,
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

        // 5. Format results
        const locations = Object.values(countryMap).map(c => ({
            countryCode: c.countryCode,
            keywordCount: c.keywordCount,
            impressions: c.totalImpressions,
            clicks: c.totalClicks,
            avgPosition: Number((c.sumPosition / c.keywordCount).toFixed(1)),
            keywords: c.keywords.sort((a, b) => a.position - b.position)
        }))

        // Sort countries by keyword count (descending)
        locations.sort((a, b) => b.keywordCount - a.keywordCount)

        res.json({ success: true, locations })

    } catch (err) {
        console.error('Error fetching GSC locations:', err.message)
        res.status(500).json({ error: 'Failed to fetch location data', details: err.message })
    }
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
    console.log(`Backend Server running on port ${PORT}`)
})
