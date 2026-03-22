import { getSupabaseAdmin } from '../lib/supabase.js'
import { ADMIN_EMAILS } from '../lib/constants.js'

/**
 * Express middleware that validates the request body contains an `adminId`
 * belonging to a known admin email. Attaches `req.adminUser` on success.
 */
export const requireAdmin = async (req, res, next) => {
    const { adminId } = req.body
    if (!adminId) return res.status(400).json({ error: 'Missing adminId' })

    try {
        const { data: adminUser, error } = await getSupabaseAdmin().auth.admin.getUserById(adminId)
        if (error || !adminUser || !ADMIN_EMAILS.includes(adminUser.user.email.toLowerCase())) {
            return res.status(403).json({ error: 'Unauthorized: Admin access only' })
        }
        req.adminUser = adminUser.user
        next()
    } catch (err) {
        console.error('Admin Auth Error:', err.message)
        res.status(500).json({ error: 'Admin authentication failed' })
    }
}
