import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '../.env.local' })
const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY)
async function go() {
    const { data: sites } = await supabaseAdmin.from('sites').select('*')
    if (!sites || sites.length === 0) return console.log('No sites found')
    
    // Find duplicates based on user_id + property_url
    const keepIds = new Set()
    const deleteIds = []
    const seen = new Set()
    
    for (const site of sites) {
        const key = site.user_id + '_' + site.property_url
        if (!seen.has(key)) {
            seen.add(key)
            keepIds.add(site.id)
        } else {
            deleteIds.push(site.id)
        }
    }
    
    if (deleteIds.length > 0) {
        console.log('Deleting ' + deleteIds.length + ' duplicates...')
        const { error } = await supabaseAdmin.from('sites').delete().in('id', deleteIds)
        if (error) console.error('Delete error', error)
        else console.log('Cleaned up!')
    } else {
        console.log('No duplicates.')
    }
}
go()
