import express from 'express'
import { getSupabaseAdmin } from '../lib/supabase.js'
import { normalizeSiteUrl } from '../lib/constants.js'
import { getGSCClient } from '../services/google/client.js'
import { fetchRankingData } from '../services/google/gsc.js'

const router = express.Router()

// Add keywords to tracking
router.post('/track', async (req, res) => {
    const { siteId, keywords, overwrite = false } = req.body
    if (!siteId || !keywords || !Array.isArray(keywords) || keywords.length === 0) {
        return res.status(400).json({ error: 'Missing siteId or keywords array' })
    }

    try {
        if (overwrite) {
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
        res.json({ success: true, count: keywordsWithIds.length })
    } catch (err) {
        console.error('Error tracking keywords:', err.message)
        res.status(500).json({ error: 'Failed to track keywords' })
    }
})

// Sync specific tracked keywords (fresh stats on reload)
router.post('/sync-specific', async (req, res) => {
    const { siteId, keywordIds } = req.body
    if (!siteId || !keywordIds || !Array.isArray(keywordIds)) {
        return res.status(400).json({ error: 'Missing siteId or keywordIds array' })
    }

    try {
        const supabase = getSupabaseAdmin()
        const { data: site } = await supabase.from('sites').select('*').eq('id', siteId).single()
        const { data: kws } = await supabase.from('keywords').select('*').in('id', keywordIds)
        const { data: connection } = await supabase.from('user_connections').select('*').eq('user_id', site.user_id).eq('provider', 'google').single()

        if (!connection?.refresh_token || !site?.property_url) {
            return res.status(400).json({ error: 'GSC connection not found for this site' })
        }

        const gscClient = getGSCClient(connection.refresh_token)
        const today = new Date()
        const endDate = new Date(today.getTime() - (3 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]
        const startDate = new Date(today.getTime() - ((28 + 3) * 24 * 60 * 60 * 1000)).toISOString().split('T')[0]

        let siteUrl = normalizeSiteUrl(site.property_url)

        const syncResults = []
        for (const kw of kws) {
            try {
                let { history } = await fetchRankingData(gscClient, siteUrl, startDate, endDate, kw.keyword)

                // Fallback for Prefix Properties
                if ((!history || history.length === 0) && !siteUrl.startsWith('sc-domain:')) {
                    const fallbackUrl = siteUrl.endsWith('/') ? siteUrl.slice(0, -1) : `${siteUrl}/`
                    const fallbackData = await fetchRankingData(gscClient, fallbackUrl, startDate, endDate, kw.keyword)
                    if (fallbackData.history && fallbackData.history.length > 0) {
                        history = fallbackData.history
                        siteUrl = fallbackUrl
                    }
                }

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
                    await supabase.from('keyword_history').upsert(historyPayload, { onConflict: 'keyword_id, date' })
                    syncResults.push({ id: kw.id, keyword: kw.keyword, status: 'synced', records: history.length })
                }
            } catch (kwErr) {
                console.error(`Sync failed for keyword ${kw.keyword}:`, kwErr.message)
                syncResults.push({ id: kw.id, keyword: kw.keyword, status: 'failed', error: kwErr.message })
            }
        }

        res.json({ success: true, details: syncResults })
    } catch (err) {
        console.error('Error in specific sync:', err.message)
        res.status(500).json({ error: 'Sync failed', details: err.message })
    }
})

// Untrack a keyword
router.post('/untrack', async (req, res) => {
    const { siteId, keyword } = req.body
    if (!siteId || !keyword) return res.status(400).json({ error: 'Missing siteId or keyword' })
    try {
        await getSupabaseAdmin().from('keywords')
            .delete()
            .eq('site_id', siteId)
            .eq('keyword', keyword.trim().toLowerCase())
        res.json({ success: true })
    } catch (err) {
        res.status(500).json({ error: 'Failed to stop tracking', details: err.message })
    }
})

export default router
