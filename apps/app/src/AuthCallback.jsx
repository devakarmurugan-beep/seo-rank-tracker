import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { BarChart3, CheckCircle2, Loader2 } from 'lucide-react'

export default function AuthCallback() {
    const navigate = useNavigate()
    const location = useLocation()
    const [status, setStatus] = useState('Authenticating and linking your Google account...')

    useEffect(() => {
        const query = new URLSearchParams(location.search)
        const finalRedirect = query.get('redirect') || '/dashboard'

        const processCallback = async () => {
            try {
                // Supabase client automatically processes the URL hash on load.
                // We wait a beat for it to establish the session.
                const { data: { session }, error } = await supabase.auth.getSession()

                if (error) throw error
                if (!session) throw new Error('No active session found during callback.')

                // Check if this login included a new provider_refresh_token (i.e., from the Connect GSC flow)
                if (session.provider_refresh_token && session.user) {
                    console.log('[Auth] New refresh token received, updating database...')
                    setStatus('Securing your Search Console connection...')

                    localStorage.setItem('gsc_just_connected', 'true')

                    const { error: dbError } = await supabase
                        .from('user_connections')
                        .upsert({
                            user_id: session.user.id,
                            provider: 'google',
                            provider_id: session.user.user_metadata?.provider_id || session.user.id,
                            refresh_token: session.provider_refresh_token,
                            access_token: session.provider_token,
                            expires_at: new Date(Date.now() + 3500 * 1000).toISOString(),
                        }, { onConflict: 'user_id, provider' })

                    if (dbError) {
                        console.error('[Auth] Database Upsert Error:', dbError)
                        setStatus('Critical: Failed to save the secure connection to our database.')
                    } else {
                        console.log('[Auth] Connection successfully updated in DB')
                    }
                } else if (session.user) {
                    console.warn('[Auth] No refresh token received. If you were trying to connect GSC, this is the error.')
                    // Check if it's a re-auth flow and warn the user
                    if (localStorage.getItem('gsc_just_connected') === 'true' || window.location.search.includes('openAddProject')) {
                        setStatus('Alert: Google did not send back the required "Secret Key". Please un-check and re-check the permission box.')
                    }
                }

                setStatus('Success! Redirecting to your dashboard...')
                setTimeout(() => navigate(finalRedirect), 2000)

            } catch (err) {
                console.error('OAuth Callback Error:', err)
                setStatus(`Authentication failed: ${err.message}. Please try logging out and back in.`)
                setTimeout(() => navigate('/login'), 5000)
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
