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

// Initialize Supabase Admin Client lazily to prevent top-level crashes if env vars are missing
let _supabaseAdmin;
const getSupabaseAdmin = () => {
    if (!_supabaseAdmin) {
        if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error('Missing Supabase Environment Variables')
        }
        _supabaseAdmin = createClient(
            process.env.VITE_SUPABASE_URL,
            process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
        )
    }
    return _supabaseAdmin
}

app.get('/api/health', (req, res) => {
    const missing = []
    const check = {
        VITE_SUPABASE_URL: !!process.env.VITE_SUPABASE_URL,
        VITE_SUPABASE_SERVICE_ROLE_KEY: !!process.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
        GCP_CLIENT_ID: !!process.env.GCP_CLIENT_ID,
        DODO_PAYMENTS_API_KEY: !!process.env.DODO_PAYMENTS_API_KEY,
    }

    const mask = (val) => val ? `${val.substring(0, 4)}...${val.substring(val.length - 4)}` : 'MISSING'

    res.json({
        status: 'Platform API is active',
        time: new Date().toISOString(),
        config: Object.values(check).every(v => v) ? 'COMPLETE' : 'INCOMPLETE',
        verification: {
            dodo_key: mask(process.env.DODO_PAYMENTS_API_KEY),
            supabase_url: mask(process.env.VITE_SUPABASE_URL),
        }
    })
})

// === Core Data Fetcher Endpoints ===

// 1. Fetch available properties from GSC without auto-saving
app.post('/api/user/available-sites', async (req, res) => {
    const { userId } = req.body
    if (!userId) return res.status(400).json({ error: 'Missing userId' })

    try {
        // Use .order('created_at', { ascending: false }).limit(1) instead of .single() 
        // to avoid crashes if multiple tokens exist for one user.
        const { data: connections, error: connError } = await getSupabaseAdmin()
            .from('user_connections')
            .select('refresh_token')
            .eq('user_id', userId)
            .eq('provider', 'google')
            .order('created_at', { ascending: false })
            .limit(1)

        if (connError || !connections || connections.length === 0 || !connections[0].refresh_token) {
            console.log(`[Backend] No Google connection or Refresh Token found for user ${userId}`)
            return res.json({
                success: false,
                count: 0,
                sites: [],
                error: 'CONNECTION_MISSING',
                message: 'Your Google connection is missing a "Refresh Token". Please click "Re-authorize" and make sure to check all permission boxes.'
            })
        }

        const connection = connections[0]

        const gscClient = getAuthenticatedGSCClient(connection.refresh_token)
        console.log(`[Backend] Fetching sites from Google for user: ${userId}`)

        // Debug: Try to see who we are authenticated as
        try {
            const userInfo = await gscClient.sites.list()
            console.log(`[Backend] Google API Status: ${userInfo.status}, Sites Found: ${userInfo.data.siteEntry?.length || 0}`)
        } catch (authErr) {
            console.error('[Backend] Token Validation Failed:', authErr.message)
            return res.status(401).json({
                success: false,
                error: 'TOKEN_INVALID',
                message: 'Your Google permission has expired or was revoked. Please Re-authorize.'
            })
        }

        const sites = await fetchGSCSites(gscClient)

        const sitesPayload = (sites || []).map(site => {
            let name = site.siteUrl.replace('sc-domain:', '').replace('https://', '').replace('http://', '').replace(/[\/]+$/, '')
            return {
                property_url: site.siteUrl,
                site_name: name
            }
        })

        console.log(`[Backend] Returning ${sitesPayload.length} formatted sites for ${userId}`)
        res.json({ success: true, count: sitesPayload.length, sites: sitesPayload })

    } catch (err) {
        console.error('[Backend] Error fetching GSC sites:', err.message)
        res.status(500).json({
            success: false,
            error: 'FETCH_FAILED',
            details: err.message,
            message: `Google API Error: ${err.message}. Please ensure you are a verified owner in Search Console.`
        })
    }
})

// 2. Add a specific site to Track
app.post('/api/user/add-site', async (req, res) => {
    const { userId, property_url, site_name } = req.body
    if (!userId || !property_url || !site_name) return res.status(400).json({ error: 'Missing payload' })

    try {
        // Insert singular site with strict uniqueness manually enforced before the DB layer
        const { data: existingSite } = await getSupabaseAdmin()
            .from('sites')
            .select('id')
            .eq('user_id', userId)
            .eq('property_url', property_url)
            .single()

        if (existingSite) {
            return res.status(400).json({ error: 'Site already exists in your projects.' })
        }

        const { data: newSite, error: insertError } = await getSupabaseAdmin()
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
const performSiteSync = async (userId, siteId, brandVariations = [], daysToFetch = 480) => {
    // 1. Get Site & Connection Details
    const { data: site } = await getSupabaseAdmin().from('sites').select('*').eq('id', siteId).single()
    const { data: connection } = await getSupabaseAdmin().from('user_connections').select('refresh_token').eq('user_id', userId).eq('provider', 'google').single()

    if (!site || !connection?.refresh_token) {
        throw new Error('Site or Google connection not found')
    }

    // 2. Fetch GSC Data (History + Pages)
    const today = new Date()
    const endDateStr = new Date(today.getTime() - (2 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
    const startDateStr = new Date(today.getTime() - (daysToFetch * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]

    const gscClient = getAuthenticatedGSCClient(connection.refresh_token)

    const allHistory = []
    const allPages = new Set()

    let chunkEnd = new Date(endDateStr)
    const totalStart = new Date(startDateStr)

    // Normalize siteUrl for GSC API
    let siteUrl = site.property_url
    if (siteUrl.startsWith('sc-domain:') && siteUrl.endsWith('/')) {
        siteUrl = siteUrl.slice(0, -1)
    }

    while (chunkEnd > totalStart) {
        let chunkStart = new Date(chunkEnd.getTime() - (30 * 24 * 60 * 60 * 1000))
        if (chunkStart < totalStart) chunkStart = totalStart

        const s = chunkStart.toISOString().split('T')[0]
        const e = chunkEnd.toISOString().split('T')[0]

        try {
            let { history, pages } = await fetchGSCRankingData(gscClient, siteUrl, s, e)

            // Fallback for Prefix Properties: Toggle trailing slash if empty
            if (history.length === 0 && !siteUrl.startsWith('sc-domain:')) {
                const fallbackUrl = siteUrl.endsWith('/') ? siteUrl.slice(0, -1) : `${siteUrl}/`
                console.log(`[Sync] No data for ${siteUrl}, trying fallback: ${fallbackUrl}`)
                const fallbackData = await fetchGSCRankingData(gscClient, fallbackUrl, s, e)
                if (fallbackData.history.length > 0) {
                    history = fallbackData.history
                    pages = fallbackData.pages
                    siteUrl = fallbackUrl // Update siteUrl for subsequent chunks
                }
            }

            allHistory.push(...history)
            // Extract pages from both sources for maximum coverage
            pages.forEach(p => allPages.add(p))
            history.forEach(h => { if (h.page_url) allPages.add(h.page_url) })

        } catch (fetchErr) {
            console.error(`[Sync] Chunk failed for ${s} to ${e}:`, fetchErr.message)
            // Continue to next chunk instead of failing entire sync
        }

        chunkEnd = new Date(chunkStart.getTime() - (1 * 24 * 60 * 60 * 1000))
    }

    // 3. Process Keywords & Intent
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
        const { error: kwError } = await getSupabaseAdmin()
            .from('keywords')
            .upsert(keywordList, { onConflict: 'site_id, keyword' })
        if (kwError) throw kwError
    }

    // Fetch back IDs
    const { data: savedKeywords } = await getSupabaseAdmin()
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
            if (row.position < existing.position) {
                existing.position = row.position
                existing.page_url = row.page_url
            }
            existing.ctr = existing.impressions > 0 ? existing.clicks / existing.impressions : 0
        }
    })

    const historyPayload = Object.values(historyMap)
    if (historyPayload.length > 0) {
        const CHUNK_SIZE = 500
        for (let i = 0; i < historyPayload.length; i += CHUNK_SIZE) {
            const chunk = historyPayload.slice(i, i + CHUNK_SIZE)
            const { error: histError } = await getSupabaseAdmin()
                .from('keyword_history')
                .upsert(chunk, { onConflict: 'keyword_id, date' })
            if (histError) throw histError
        }
    }

    // 5. Update Pages Metadata
    const pages = Array.from(allPages)
    if (pages.length > 0) {
        const pagesPayload = pages.map(url => ({ site_id: siteId, page_url: url }))
        await getSupabaseAdmin().from('pages').upsert(pagesPayload, { onConflict: 'site_id, page_url' })
    }

    // ═══ CRITICAL: Update last_synced_at timestamp ═══
    await getSupabaseAdmin()
        .from('sites')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', siteId)

    return {
        totalKeywords: keywordList.length,
        totalPages: pages.length,
        historyRecords: historyPayload.length
    }
}

// 3. Sync Site Analytics Data (Keywords, Pages, History)
app.post('/api/user/sync-site-data', async (req, res) => {
    const { userId, siteId, brandVariations = [] } = req.body
    if (!userId || !siteId) return res.status(400).json({ error: 'Missing userId or siteId' })

    try {
        const metrics = await performSiteSync(userId, siteId, brandVariations)
        res.json({ success: true, metrics })
    } catch (err) {
        console.error('Error syncing site data:', err.message)
        res.status(500).json({ error: 'Failed to sync site data', details: err.message })
    }
})

// ═══ NEW: Daily Cron Sync Endpoint ═══
app.get('/api/cron/daily-sync', async (req, res) => {
    const cronSecret = process.env.CRON_SECRET || 'daily_sync_secret'
    const authHeader = req.headers.authorization

    if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${cronSecret}`) {
        return res.status(401).json({ error: 'Unauthorized' })
    }

    console.log('[Cron] Starting Daily Sync...')
    try {
        const { data: sites, error } = await getSupabaseAdmin().from('sites').select('id, user_id, site_name')
        if (error) throw error

        const results = []
        for (const site of sites) {
            try {
                // For daily sync, only fetch 7 days to keep it efficient
                const metrics = await performSiteSync(site.user_id, site.id, [site.site_name], 7)
                results.push({ siteId: site.id, status: 'success', keywords: metrics.totalKeywords })
            } catch (err) {
                console.error(`[Cron] Failed to sync site ${site.id}:`, err.message)
                results.push({ siteId: site.id, status: 'failed', error: err.message })
            }
        }

        res.json({ success: true, processed: results.length, details: results })
    } catch (err) {
        console.error('[Cron] Critical error in daily sync:', err.message)
        res.status(500).json({ error: 'Cron Failed', details: err.message })
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
            await getSupabaseAdmin()
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

        const { data: keywordsWithIds, error } = await getSupabaseAdmin()
            .from('keywords')
            .upsert(records, { onConflict: 'site_id, keyword' })
            .select('id, keyword')

        if (error) throw error

        // 2. Fetch history for these specific keywords immediately so the user doesn't wait
        const { data: site } = await getSupabaseAdmin().from('sites').select('*').eq('id', siteId).single()
        const { data: connection } = await getSupabaseAdmin().from('user_connections').select('*').eq('user_id', site.user_id).eq('provider', 'google').single()

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
                        await getSupabaseAdmin().from('keyword_history').upsert(historyPayload, { onConflict: 'keyword_id, date' })
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
        await getSupabaseAdmin().from('keywords')
            .update({ is_tracked: false })
            .eq('site_id', siteId)
            .eq('keyword', keyword)
        res.json({ success: true })
    } catch (err) {
        res.status(500).json({ error: 'Failed to stop tracking', details: err.message })
    }
})

// Utility to filter non-branded keywords for trial users
const filterNonBranded = (keywords, brandVars) => {
    return keywords.filter(kw => {
        const text = kw.keyword.toLowerCase();
        return !brandVars.some(b => text.includes(b.toLowerCase()));
    });
};

// 5. Fetch Location/Country Data from GSC On-the-fly
app.get('/api/gsc/locations', async (req, res) => {
    const { siteId, dateRange = '30d', trial = 'false' } = req.query
    if (!siteId) return res.status(400).json({ error: 'Missing siteId' })
    const isTrial = trial === 'true'

    try {
        const { data: site } = await getSupabaseAdmin().from('sites').select('*').eq('id', siteId).single()
        if (!site) return res.status(404).json({ error: 'Site not found' })

        const { data: connection } = await getSupabaseAdmin().from('user_connections').select('*').eq('user_id', site.user_id).eq('provider', 'google').single()
        if (!connection?.refresh_token) return res.status(404).json({ error: 'Google connection not found' })

        // Generate brand variations for filtering
        const domainClean = site.property_url
            .replace(/^https?:\/\//, '').replace(/^sc-domain:/, '').replace(/^www\./, '')
            .replace(/\/.*$/, '').replace(/\.com$|\.in$|\.org$|\.net$|\.co$/g, '').trim().toLowerCase()
        const brandVars = [domainClean]
        if (domainClean.length > 4) {
            // Add spaced version if needed or just simple contains check is usually enough
            const spaced = domainClean.replace(/([a-z])(fuse|tech|web|net|pro|ai|lab|box|hub|bit|app|dev|gen|id|go|my|gown|gowns)/gi, '$1 $2')
            if (spaced !== domainClean) brandVars.push(spaced.toLowerCase())
        }

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
                rowLimit: 25000,
            }
        })

        const rows = response.data.rows || []

        // 4. Aggregate by Country
        const countryMap = {}
        rows.forEach(row => {
            const countryCode = row.keys[0] // e.g., 'ind', 'usa', 'gbr'
            const keyword = row.keys[1]
            const page = row.keys[2]

            // Trial Filtering: Filter branded terms
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
        const locations = Object.values(countryMap).map(c => {
            // Sort by position for trial users to show best rankings
            let kws = c.keywords.sort((a, b) => a.position - b.position)

            return {
                countryCode: c.countryCode,
                keywordCount: isTrial ? kws.length : c.keywordCount,
                impressions: isTrial ? kws.reduce((acc, k) => acc + k.impressions, 0) : c.totalImpressions,
                clicks: isTrial ? kws.reduce((acc, k) => acc + k.clicks, 0) : c.totalClicks,
                avgPosition: kws.length > 0 ? Number((kws.reduce((acc, k) => acc + k.position, 0) / kws.length).toFixed(1)) : 0,
                keywords: kws
            }
        })

        // Sort countries by keyword count (descending)
        locations.sort((a, b) => b.keywordCount - a.keywordCount)

        res.json({ success: true, locations })

    } catch (err) {
        console.error('Error fetching GSC locations:', err.message)
        res.status(500).json({ error: 'Failed to fetch location data', details: err.message })
    }
})

// 6. Trial Keywords Endpoint (Top 25 Non-Branded)
app.get('/api/gsc/trial-keywords', async (req, res) => {
    const { siteId } = req.query
    if (!siteId) return res.status(400).json({ error: 'Missing siteId' })

    try {
        const { data: site } = await getSupabaseAdmin().from('sites').select('*').eq('id', siteId).single()
        if (!site) return res.status(404).json({ error: 'Site Not Found' })

        const { data: connection } = await getSupabaseAdmin().from('user_connections').select('*').eq('user_id', site.user_id).eq('provider', 'google').single()

        if (!connection?.refresh_token) return res.status(404).json({ error: 'Connection Not Found' })

        const domainClean = site.property_url
            .replace(/^https?:\/\//, '').replace(/^sc-domain:/, '').replace(/^www\./, '')
            .replace(/\/.*$/, '').replace(/\.com$|\.in$|\.org$|\.net$|\.co$/g, '').trim().toLowerCase()
        const brandVars = [domainClean]
        const spaced = domainClean.replace(/([a-z])(fuse|tech|web|net|pro|ai|lab|box|hub|bit|app|dev|gen|id|go|my|gown|gowns)/gi, '$1 $2')
        if (spaced !== domainClean) brandVars.push(spaced.toLowerCase())

        const today = new Date()
        const endDate = new Date(today.getTime() - (2 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
        const startDate = new Date(today.getTime() - (32 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]

        // Normalize siteUrl for GSC API
        let siteUrl = site.property_url;
        if (siteUrl.startsWith('sc-domain:') && siteUrl.endsWith('/')) {
            siteUrl = siteUrl.slice(0, -1);
        }

        const gscClient = getAuthenticatedGSCClient(connection.refresh_token)
        console.log(`[Trial] Fetching GSC for: ${siteUrl}`)

        let response = await gscClient.searchanalytics.query({
            siteUrl: siteUrl,
            requestBody: { startDate, endDate, dimensions: ['query', 'page'], rowLimit: 25000 }
        })

        // Fallback: If no rows and it's a URL prefix, try toggling the trailing slash
        if ((!response.data.rows || response.data.rows.length === 0) && !siteUrl.startsWith('sc-domain:')) {
            const fallbackUrl = siteUrl.endsWith('/') ? siteUrl.slice(0, -1) : `${siteUrl}/`;
            console.log(`[Trial] No data for ${siteUrl}, trying fallback: ${fallbackUrl}`);
            try {
                const fallbackRes = await gscClient.searchanalytics.query({
                    siteUrl: fallbackUrl,
                    requestBody: { startDate, endDate, dimensions: ['query', 'page'], rowLimit: 25000 }
                });
                if (fallbackRes.data.rows && fallbackRes.data.rows.length > 0) {
                    console.log(`[Trial] Fallback succeeded with ${fallbackRes.data.rows.length} rows`);
                    response = fallbackRes;
                    siteUrl = fallbackUrl; // Update for debug info
                }
            } catch (e) {
                console.log(`[Trial] Fallback failed: ${e.message}`);
            }
        }

        console.log(`[Trial] GSC matched ${response.data.rows?.length || 0} rows`)

        let allRows = (response.data.rows || []).map(r => ({
            keyword: r.keys[0],
            page: r.keys[1],
            clicks: r.clicks,
            impressions: r.impressions,
            ctr: r.ctr,
            position: r.position
        }))

        // Filter and Sort
        let results = filterNonBranded(allRows, brandVars)
        console.log(`[Trial] Non-branded count: ${results.length}`)

        // Fallback: If no non-branded keywords found, show whatever we have
        // (Better than an empty screen for a trial)
        if (results.length === 0 && allRows.length > 0) {
            console.log(`[Trial] Falling back to branded keywords because non-branded was empty`)
            results = allRows;
        }

        const sorted = results.sort((a, b) => a.position - b.position)
        const allKeywords = sorted.map(kw => ({
            ...kw,
            intent: classifyKeywordIntent(kw.keyword, brandVars),
            is_tracked: false,
            category: 'Trial View'
        }))

        res.json({
            success: true,
            keywords: allKeywords,
            debug: {
                totalRows: allRows.length,
                nonBrandedCount: results.length,
                siteUrlUsed: siteUrl
            }
        })
    } catch (err) {
        console.error(`[Trial] Error: ${err.message}`)
        res.status(500).json({ error: 'Trial fetch failed', details: err.message })
    }
})

const PORT = process.env.PORT || 3001
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Backend Server running on port ${PORT}`)
    })
}

export default app
