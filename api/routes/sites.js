import express from 'express'
import { getSupabaseAdmin } from '../lib/supabase.js'
import { getGSCClient } from '../services/google/client.js'
import { fetchSites } from '../services/google/gsc.js'

const router = express.Router()

// Fetch available properties from GSC without auto-saving
router.post('/available-sites', async (req, res) => {
    const { userId } = req.body
    if (!userId) return res.status(400).json({ error: 'Missing userId' })

    try {
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
        const gscClient = getGSCClient(connection.refresh_token)
        console.log(`[Backend] Fetching sites from Google for user: ${userId}`)

        // Validate token
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

        const sites = await fetchSites(gscClient)
        const sitesPayload = (sites || []).map(site => {
            let name = site.siteUrl.replace('sc-domain:', '').replace('https://', '').replace('http://', '').replace(/[\/]+$/, '')
            return { property_url: site.siteUrl, site_name: name }
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

// Add a specific site to track
router.post('/add-site', async (req, res) => {
    const { userId, property_url, site_name } = req.body
    if (!userId || !property_url || !site_name) return res.status(400).json({ error: 'Missing payload' })

    try {
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

export default router
