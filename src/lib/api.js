import { supabase } from './supabase'

/**
 * Validates if the user has an active, valid connection to Google Search Console
 * by checking the user_connections table for a stored token.
 */
export async function checkGSCConnection() {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user?.id) {
        return { connected: false, error: 'Not authenticated' }
    }

    const { data, error } = await supabase
        .from('user_connections')
        .select('id, expires_at')
        .eq('user_id', session.user.id)
        .eq('provider', 'google')
        .single()

    if (error || !data) {
        return { connected: false }
    }

    return { connected: true, connection: data }
}

/**
 * Retrieves the available GSC sites from the backend without auto-saving them to the DB.
 */
export async function fetchAvailableGSCSites(userId) {
    try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
        const response = await fetch(`${apiUrl}/api/user/available-sites`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
        })
        const data = await response.json()
        return data
    } catch (error) {
        console.error('API Error:', error)
        return { error: error.message }
    }
}

/**
 * Adds a specific GSC site to track as a project in the database.
 */
export async function addProjectSite(userId, property_url, site_name) {
    try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
        const response = await fetch(`${apiUrl}/api/user/add-site`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, property_url, site_name })
        })
        const data = await response.json()
        return data
    } catch (error) {
        console.error('API Error:', error)
        return { error: error.message }
    }
}

/**
 * Placeholder for the heavy lifting data pull function.
 * In a real production architecture, this would not be called directly from the frontend
 * with user tokens. It would trigger a backend Vercel Serverless Function or Supabase Edge function
 * to prevent leaking the GCP Client Secret needed to exchange refresh tokens.
 */
export async function triggerInitialGSCDataSync() {
    // This function simulates the backend trigger
    return new Promise((resolve) => {
        setTimeout(() => resolve({ success: true, message: 'Sync triggered' }), 2000)
    })
}

/**
 * Creates a Dodo Payments checkout session for the selected plan
 */
export async function createSubscription(userId, userEmail, planId) {
    try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'
        const response = await fetch(`${apiUrl}/api/payments/create-checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, userEmail, planId })
        })
        const data = await response.json()
        return data
    } catch (error) {
        console.error('API Error:', error)
        return { error: error.message }
    }
}
