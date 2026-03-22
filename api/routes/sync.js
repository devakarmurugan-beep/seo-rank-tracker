import express from 'express'
import { getSupabaseAdmin } from '../lib/supabase.js'
import { performSiteSync } from '../services/syncEngine.js'

const router = express.Router()

// Manual sync triggered by user
router.post('/user/sync-site-data', async (req, res) => {
    const { userId, siteId, brandVariations = [] } = req.body
    if (!userId || !siteId) return res.status(400).json({ error: 'Missing userId or siteId' })

    try {
        const metrics = await performSiteSync(userId, siteId, brandVariations)
        res.json({ success: true, metrics })
        // TODO: re-enable URL inspection later
        // performUrlInspection(userId, siteId).catch(() => {})
    } catch (err) {
        console.error('Error syncing site data:', err.message)
        res.status(500).json({ error: 'Failed to sync site data', details: err.message })
    }
})

// Daily Cron Sync
router.all('/cron/daily-sync', async (req, res) => {
    const cronSecret = process.env.CRON_SECRET
    const authHeader = req.headers.authorization

    if (!cronSecret) {
        console.error('[Cron] CRON_SECRET env var is not set')
        return res.status(500).json({ error: 'Cron not configured' })
    }
    if (authHeader !== `Bearer ${cronSecret}`) {
        return res.status(401).json({ error: 'Unauthorized' })
    }

    console.log('[Cron] Starting Daily Sync...')
    try {
        const { data: sites, error } = await getSupabaseAdmin().from('sites').select('id, user_id, site_name')
        if (error) throw error
        if (!sites || sites.length === 0) {
            return res.json({ success: true, processed: 0, details: [] })
        }

        const results = []
        for (const site of sites) {
            try {
                const metrics = await performSiteSync(site.user_id, site.id, [site.site_name], 4)
                results.push({ siteId: site.id, status: 'success', keywords: metrics.totalKeywords })
                // TODO: re-enable URL inspection later
                // performUrlInspection(site.user_id, site.id).catch(() => {})
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

export default router
