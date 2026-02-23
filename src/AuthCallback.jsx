import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { BarChart3, CheckCircle2, Loader2 } from 'lucide-react'

export default function AuthCallback() {
    const navigate = useNavigate()
    const [status, setStatus] = useState('Authenticating and linking your Google account...')

    useEffect(() => {
        const processCallback = async () => {
            try {
                // Supabase client automatically processes the URL hash on load.
                // We wait a beat for it to establish the session.
                const { data: { session }, error } = await supabase.auth.getSession()

                if (error) throw error
                if (!session) throw new Error('No active session found during callback.')

                // Check if this login included a new provider_refresh_token (i.e., from the Connect GSC flow)
                if (session.provider_refresh_token && session.user) {
                    setStatus('Account linked! Securing your Search Console connection...')

                    // Upsert the connection token into our custom user_connections table
                    const { error: dbError } = await supabase
                        .from('user_connections')
                        .upsert({
                            user_id: session.user.id,
                            provider: 'google',
                            provider_id: session.user.user_metadata?.provider_id || session.user.id,
                            refresh_token: session.provider_refresh_token,
                            access_token: session.provider_token,
                            expires_at: new Date(Date.now() + 3500 * 1000).toISOString(), // rough approx 1 hr
                        }, { onConflict: 'user_id, provider' })

                    if (dbError) {
                        console.error('Failed to store connection:', dbError)
                        setStatus('Login successful, but failed to save GSC connection internally.')
                        setTimeout(() => navigate('/dashboard'), 3000)
                        return
                    }
                }

                setStatus('Success! Redirecting to your dashboard...')
                // If we stored a provider_refresh_token, this was a GSC connection flow
                // Auto-open the Add Project modal on redirect
                const redirectPath = session.provider_refresh_token ? '/dashboard?openAddProject=true' : '/dashboard'
                setTimeout(() => navigate(redirectPath), 1500)

            } catch (err) {
                console.error('OAuth Callback Error:', err)
                setStatus('Authentication failed. Returning to login...')
                setTimeout(() => navigate('/login'), 3000)
            }
        }

        processCallback()
    }, [navigate])

    return (
        <div className="flex h-screen items-center justify-center bg-[#F9FAFB]" style={{ fontFamily: "var(--font-ui)" }}>
            <div className="bg-white p-8 rounded-2xl border border-[#E5E7EB] text-center max-w-sm w-full" style={{ boxShadow: 'var(--shadow-md)' }}>
                <div className="w-16 h-16 rounded-2xl bg-[#EFF6FF] flex items-center justify-center mx-auto mb-6">
                    {status.includes('Success')
                        ? <CheckCircle2 className="w-8 h-8 text-[#10B981]" />
                        : <Loader2 className="w-8 h-8 text-[#2563EB] animate-spin" />
                    }
                </div>
                <h2 className="text-[18px] font-semibold text-[#111827] tracking-tight mb-2">Connecting Account</h2>
                <p className="text-[14px] text-[#64748B] leading-relaxed">{status}</p>
            </div>
        </div>
    )
}
