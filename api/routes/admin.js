import express from 'express'
import { getSupabaseAdmin } from '../lib/supabase.js'
import { ADMIN_EMAILS } from '../lib/constants.js'
import { requireAdmin } from '../middleware/adminAuth.js'

const router = express.Router()

router.post('/users', requireAdmin, async (req, res) => {
    try {
        const { data: { users }, error } = await getSupabaseAdmin().auth.admin.listUsers()
        if (error) throw error

        const formattedUsers = users.map(u => ({
            id: u.id,
            email: u.email,
            created_at: u.created_at,
            plan: u.user_metadata?.plan || 'free_trial',
            is_admin: ADMIN_EMAILS.includes(u.email.toLowerCase())
        }))

        res.json({ success: true, users: formattedUsers })
    } catch (err) {
        console.error('Admin Fetch Error:', err.message)
        res.status(500).json({ error: 'Failed to fetch users', details: err.message })
    }
})

router.post('/update-user', requireAdmin, async (req, res) => {
    const { targetUserId, updates } = req.body
    if (!targetUserId || !updates) return res.status(400).json({ error: 'Missing payload' })

    try {
        const { data, error } = await getSupabaseAdmin().auth.admin.updateUserById(
            targetUserId,
            { user_metadata: updates }
        )
        if (error) throw error
        res.json({ success: true, user: data.user })
    } catch (err) {
        console.error('Admin Update Error:', err.message)
        res.status(500).json({ error: 'Failed to update user', details: err.message })
    }
})

export default router
