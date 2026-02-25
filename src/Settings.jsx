import { useState } from 'react'
import { useAuth } from './AuthContext'
import { getUserPlan, getSiteLimit } from './lib/permissions'
import { createSubscription } from './lib/api'
import { useLocation, useNavigate } from 'react-router-dom'
import { CreditCard, Shield, Zap, Check, ExternalLink, Loader2 } from 'lucide-react'

export default function Settings({ userSites = [] }) {
    const { session } = useAuth()
    const location = useLocation()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const currentPlan = getUserPlan(session?.user)
    const siteLimit = getSiteLimit(session?.user)
    const siteCount = userSites.length
    const usagePercent = Math.min(Math.round((siteCount / siteLimit) * 100), 100)

    const handleUpgrade = async (planId) => {
        if (loading) return
        setLoading(true)
        try {
            console.log(`[Checkout] Initiating for ${planId} for user ${session?.user.email}`)
            const res = await createSubscription(session?.user.id, session?.user.email, planId)
            if (res.checkoutUrl) {
                window.location.href = res.checkoutUrl
            } else {
                console.error('[Checkout] Error response:', res)
                alert('Could not generate checkout link. Please try again.')
            }
        } catch (err) {
            console.error('[Checkout] Exception:', err)
            alert('Error generating checkout.')
        } finally {
            setLoading(false)
        }
    }

    // Auto-trigger if plan is in URL
    useEffect(() => {
        const params = new URLSearchParams(location.search)
        const plan = params.get('plan')
        if (plan && session) {
            // Clean up URL and trigger
            navigate('/settings', { replace: true })
            handleUpgrade(plan)
        }
    }, [location.search, !!session])

    const plans = [
        { id: 'plan_starter_monthly', name: 'Starter', price: '14', sites: 1, color: '#6366F1' },
        { id: 'plan_pro_monthly', name: 'Professional', price: '39', sites: 5, color: '#2563EB', popular: true },
        { id: 'plan_agency_monthly', name: 'Agency', price: '149', sites: 25, color: '#1E293B' },
    ]

    return (
        <div className="max-w-4xl mx-auto py-8">
            <h1 className="text-[28px] font-bold text-[#111827] mb-8 tracking-tight">Settings</h1>

            <div className="space-y-6">
                {/* Billing Section */}
                <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-[#F3F4F6] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center">
                                <CreditCard className="w-5 h-5 text-[#2563EB]" />
                            </div>
                            <div>
                                <h2 className="text-[16px] font-bold text-[#111827]">Subscription & Billing</h2>
                                <p className="text-[13px] text-[#64748B]">Manage your plan and payment methods</p>
                            </div>
                        </div>
                        <div className="px-3 py-1 rounded-full bg-[#E0E7FF] text-[#4338CA] text-[11px] font-bold uppercase tracking-wider border border-[#C7D2FE]">
                            {currentPlan === 'free_trial' ? '7-Day Trial' : currentPlan.split('_')[1].toUpperCase()}
                        </div>
                    </div>

                    <div className="p-8">
                        {/* Usage Progress */}
                        <div className="mb-10">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[13px] font-semibold text-[#111827]">Website Limit Usage</span>
                                <span className="text-[13px] text-[#64748B] tabular-nums">{siteCount} of {siteLimit} sites used</span>
                            </div>
                            <div className="w-full h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-500 rounded-full ${usagePercent > 90 ? 'bg-[#EF4444]' : 'bg-[#2563EB]'}`}
                                    style={{ width: `${usagePercent}%` }}
                                />
                            </div>
                            <p className="text-[11px] text-[#94A3B8] mt-2">
                                {siteCount >= siteLimit
                                    ? "You've reached your limit. Upgrade to add more properties."
                                    : `You can add ${siteLimit - siteCount} more sites on your current plan.`}
                            </p>
                        </div>

                        {/* Plan Toggle (If they aren't on agency yet) */}
                        <div className="grid grid-cols-3 gap-4">
                            {plans.map((plan) => (
                                <div
                                    key={plan.id}
                                    className={`relative p-5 rounded-xl border-2 transition-all ${currentPlan === plan.id || (currentPlan === 'free_trial' && plan.id.includes('starter')) ? 'border-[#2563EB] bg-[#F8FAFF]' : 'border-[#F1F5F9] bg-white hover:border-[#E2E8F0]'}`}
                                >
                                    {plan.popular && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#2563EB] text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">Popular</span>}
                                    <div className="text-[14px] font-bold text-[#111827] mb-1">{plan.name}</div>
                                    <div className="flex items-baseline gap-0.5 mb-4">
                                        <span className="text-[20px] font-bold text-[#111827]">${plan.price}</span>
                                        <span className="text-[11px] text-[#64748B]">/mo</span>
                                    </div>
                                    <ul className="space-y-2 mb-6">
                                        <li className="flex items-center gap-1.5 text-[11px] text-[#475569]">
                                            <Check className="w-3 h-3 text-[#22C55E]" /> {plan.sites} Websites
                                        </li>
                                        <li className="flex items-center gap-1.5 text-[11px] text-[#475569]">
                                            <Check className="w-3 h-3 text-[#22C55E]" /> Priority Sync
                                        </li>
                                    </ul>
                                    <button
                                        disabled={loading || currentPlan === plan.id}
                                        onClick={() => handleUpgrade(plan.id)}
                                        className={`w-full py-2 rounded-lg text-[12px] font-bold transition-all ${currentPlan === plan.id ? 'bg-[#E2E8F0] text-[#64748B] cursor-default' : 'bg-[#111827] text-white hover:bg-[#1E293B]'}`}
                                    >
                                        {loading ? <Loader2 className="w-3 h-3 animate-spin mx-auto text-white" /> : currentPlan === plan.id ? 'Active' : 'Upgrade'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-6 bg-[#F9FAFB] border-t border-[#F3F4F6] flex items-center justify-between">
                        <div className="flex items-center gap-2 text-[#64748B]">
                            <Shield className="w-4 h-4" />
                            <span className="text-[12px]">Secure billing powered by Dodo Payments</span>
                        </div>
                        <button className="flex items-center gap-1.5 text-[12px] font-semibold text-[#2563EB] hover:text-[#1D4ED8] transition-colors">
                            Customer Portal <ExternalLink className="w-3 h-3" />
                        </button>
                    </div>
                </div>

                {/* Account Security */}
                <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-[#F0FDF4] flex items-center justify-center">
                            <Shield className="w-5 h-5 text-[#10B981]" />
                        </div>
                        <div>
                            <h2 className="text-[16px] font-bold text-[#111827]">Account & Security</h2>
                            <p className="text-[13px] text-[#64748B]">Manage your profile and Google connections</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-xl border border-[#F1F5F9] bg-[#F9FAFB]">
                            <div>
                                <div className="text-[13px] font-bold text-[#111827]">Google Search Console</div>
                                <div className="text-[11px] text-[#059669] flex items-center gap-1 font-medium mt-0.5">
                                    <Check className="w-3 h-3" /> Connected as {session?.user?.email}
                                </div>
                            </div>
                            <button className="px-4 py-2 bg-white border border-[#E5E7EB] text-[#4B5563] text-[12px] font-medium rounded-lg hover:border-[#D1D5DB]">Re-authorize</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
