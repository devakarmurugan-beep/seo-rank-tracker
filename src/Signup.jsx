import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { Mail, Lock, ArrowRight } from 'lucide-react'
import { LogoIcon } from './components/Logo'

export default function Signup() {
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(false)

    const handleEmailSignup = async (e) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/dashboard`
                }
            })
            if (error) throw error

            // If email confirmation is required, Supabase returns a user but no session.
            if (data?.user && data?.session === null) {
                setSuccess('Registration successful! Please check your email to confirm your account.')
            } else {
                // If email confirmation is disabled, they are logged in.
                navigate('/dashboard')
            }
        } catch (err) {
            setError(err.message || 'Failed to create account')
        } finally {
            setLoading(false)
        }
    }

    const handleGoogleSignup = async () => {
        setLoading(true)
        setError(null)
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/dashboard`,
                }
            })
            if (error) throw error
        } catch (err) {
            setError(err.message || 'Failed to initialize Google signup')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex h-screen bg-white" style={{ fontFamily: "var(--font-ui)" }}>
            {/* Left Panel: Branding & Value Prop */}
            <div className="hidden lg:flex flex-col flex-1 bg-[#0F172A] relative overflow-hidden justify-between p-12">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_0%_0%,rgba(37,99,235,0.15)_0,transparent_50%)]"></div>
                <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_100%_100%,rgba(16,185,129,0.1)_0,transparent_50%)]"></div>

                <Link to="/" className="relative z-10 flex items-center gap-3">
                    <LogoIcon className="w-10 h-10" color="white" />
                    <div>
                        <div className="text-white text-[18px] font-bold tracking-tight leading-none">Rank Tracking</div>
                        <div className="text-[#64748B] text-[10px] font-bold tracking-[0.1em] uppercase mt-1">SEO TOOL</div>
                    </div>
                </Link>

                <div className="relative z-10 max-w-md">
                    <h2 className="text-[36px] font-bold text-white leading-[1.15] mb-6 tracking-tight">
                        Start your 7-day free trial today.
                    </h2>
                    <p className="text-[16px] text-[#94A3B8] leading-relaxed mb-10">
                        Join thousands of agencies and brands tracking their organic growth with precision and clarity.
                    </p>

                    <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                        {[
                            { stat: '10k+', label: 'Keywords Tracked' },
                            { stat: '99.9%', label: 'Uptime SLA' },
                            { stat: 'Daily', label: 'Fresh Data' },
                            { stat: 'Unlimited', label: 'Client Seats' }
                        ].map((item, i) => (
                            <div key={i}>
                                <div className="text-[24px] font-bold text-white tracking-tight mb-1">{item.stat}</div>
                                <div className="text-[13px] text-[#64748B] font-medium">{item.label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-8 h-8 rounded-full bg-[#1E293B] border border-white/10 flex items-center justify-center text-white text-[12px] font-medium">JD</div>
                        <div>
                            <div className="text-[13px] font-medium text-white mb-0.5">Jane Doe, Agency Founder</div>
                            <div className="text-[12px] text-[#64748B]">"The best SEO tracking tool we've used."</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Panel: Auth Form */}
            <div className="flex-1 flex items-center justify-center p-8 sm:p-12 relative overflow-y-auto">
                <div className="w-full max-w-[400px]">

                    <div className="mb-10 text-center lg:text-left">
                        <h1 className="text-[28px] font-bold text-[#111827] tracking-tight mb-2">Create an account</h1>
                        <p className="text-[#64748B] text-[14px]">No credit card required to start your functional trial.</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl text-[#991B1B] text-[13px] font-medium">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="mb-6 p-4 bg-[#ECFDF5] border border-[#6EE7B7] rounded-xl text-[#065F46] text-[13px] font-medium">
                            {success}
                        </div>
                    )}

                    {!success && (
                        <>
                            <div className="space-y-4 mb-6">
                                <button
                                    onClick={handleGoogleSignup}
                                    disabled={loading}
                                    className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border border-[#E5E7EB] hover:border-[#D1D5DB] hover:bg-[#F9FAFB] rounded-xl text-[14px] font-medium text-[#111827] transition-all"
                                    style={{ boxShadow: 'var(--shadow-sm)' }}
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                        <path d="M1 1h22v22H1z" fill="none" />
                                    </svg>
                                    Sign up with Google
                                </button>
                            </div>

                            <div className="flex items-center gap-4 mb-6">
                                <div className="flex-1 h-px bg-[#E5E7EB]"></div>
                                <span className="text-[12px] text-[#9CA3AF] font-medium uppercase tracking-wider">Or continue with</span>
                                <div className="flex-1 h-px bg-[#E5E7EB]"></div>
                            </div>

                            <form onSubmit={handleEmailSignup} className="space-y-5">
                                <div>
                                    <label className="block text-[13px] font-medium text-[#4B5563] mb-1.5">Email address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                                        <input
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-[14px] text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
                                            placeholder="you@company.com"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[13px] font-medium text-[#4B5563] mb-1.5">Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                                        <input
                                            type="password"
                                            required
                                            minLength={6}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E5E7EB] rounded-xl text-[14px] text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] transition-all"
                                            placeholder="At least 6 characters"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-[14px] font-semibold transition-colors disabled:opacity-70 mt-2"
                                    style={{ boxShadow: 'var(--shadow-sm)' }}
                                >
                                    {loading ? 'Creating account...' : 'Create account'}
                                    {!loading && <ArrowRight className="w-4 h-4" />}
                                </button>
                            </form>
                        </>
                    )}

                    <p className="mt-8 text-center text-[13px] text-[#64748B]">
                        Already have an account? <Link to="/login" className="font-semibold text-[#2563EB] hover:text-[#1D4ED8]">Sign in here</Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
