import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY)

async function run() {
    await supabase.from('keywords').update({ is_tracked: false }).eq('keyword', 'tv service chennai')
    await supabase.from('keywords').update({ is_tracked: false }).eq('keyword', 'laptop tv service chennai')
    console.log('Done cleaning up database!')
}

run()
