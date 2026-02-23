import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '../.env.local' })
const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY)
async function go() {
    const { data, error } = await supabaseAdmin.from('user_connections').select('user_id, provider, refresh_token')
    console.log(error || data)
}
go()
