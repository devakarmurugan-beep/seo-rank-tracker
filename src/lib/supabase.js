import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const isProd = window.location.hostname.includes('seoranktrackingtool.com')

// Create a single supabase client for interacting with your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        storageKey: 'seo-rank-tracker-auth',
        cookieOptions: {
            domain: isProd ? '.seoranktrackingtool.com' : window.location.hostname,
            path: '/',
            sameSite: 'Lax',
            secure: isProd
        }
    }
})
