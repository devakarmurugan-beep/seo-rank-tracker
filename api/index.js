import dotenv from 'dotenv'
if (process.env.NODE_ENV !== 'production') {
    dotenv.config({ path: '../.env.local' })
}

import express from 'express'
import cors from 'cors'

import adminRoutes from './routes/admin.js'
import sitesRoutes from './routes/sites.js'
import keywordsRoutes from './routes/keywords.js'
import gscRoutes from './routes/gsc.js'
import syncRoutes from './routes/sync.js'
import paymentsRoutes from './routes/payments.js'

const app = express()
app.use(cors())
app.use(express.json())

// Health check
app.get('/api/health', (req, res) => {
    const check = {
        VITE_SUPABASE_URL: !!process.env.VITE_SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        GCP_CLIENT_ID: !!process.env.GCP_CLIENT_ID,
        DODO_PAYMENTS_API_KEY: !!process.env.DODO_PAYMENTS_API_KEY,
    }

    const mask = (val) => val ? `${val.substring(0, 4)}...${val.substring(val.length - 4)}` : 'MISSING'

    res.json({
        status: 'Platform API is active',
        time: new Date().toISOString(),
        config: Object.values(check).every(v => v) ? 'COMPLETE' : 'INCOMPLETE',
        verification: {
            dodo_key: mask(process.env.DODO_PAYMENTS_API_KEY),
            supabase_url: mask(process.env.VITE_SUPABASE_URL),
        }
    })
})

// Route mounts
app.use('/api/admin', adminRoutes)
app.use('/api/user', sitesRoutes)
app.use('/api/keywords', keywordsRoutes)
app.use('/api/gsc', gscRoutes)
app.use('/api', syncRoutes)
app.use('/api/payments', paymentsRoutes)

const PORT = process.env.PORT || 3001
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Backend Server running on port ${PORT}`)
    })
}

export default app
