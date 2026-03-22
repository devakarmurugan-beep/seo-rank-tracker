import { createClient } from '@supabase/supabase-js'

let _supabaseAdmin

/**
 * Lazily initializes and returns the Supabase admin client.
 * Throws if required env vars are missing.
 */
export const getSupabaseAdmin = () => {
    if (!_supabaseAdmin) {
        if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error('Missing Supabase Environment Variables')
        }
        _supabaseAdmin = createClient(
            process.env.VITE_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        )
    }
    return _supabaseAdmin
}
