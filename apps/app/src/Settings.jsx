import { useState, useEffect } from 'react'
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
    const [billingCycle, setBillingCycle] = useState('monthly') // 'monthly' | 'yearly'
    const currentPlan = getUserPlan(session?.user)
    const siteLimit = getSiteLimit(session?.user)
    const siteCount = userSites.length
    const usagePercent = Math.min(Math.round((siteCount / siteLimit) * 100), 100)

    const handleUpgrade = async (planId) => {
        if (loading) return
        setLoading(true)
        try {
            console.log(`[Checkout] Initiating for plan: ${planId} for user: ${session?.user?.email}`)
            const res = await createSubscription(session?.user?.id, session?.user?.email, planId)

            console.log('[Checkout] API Response:', res)

            if (res && res.checkoutUrl) {
                console.log('[Checkout] Redirecting to:', res.checkoutUrl)
                window.location.href = res.checkoutUrl
            } else {
                const errorDetail = res?.message || res?.error || 'Unknown error'
                console.error('[Checkout] Failed to get checkout URL:', res)
                alert(`Checkout Error: ${errorDetail}`)
            }
        } catch (err) {
            console.error('[Checkout] Exception during initiation:', err)
            alert(`Error generating checkout: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }

    // Auto-trigger if plan is in URL
    useEffect(() => {
        if (!session || loading) return

        const params = new URLSearchParams(location.search)
        const planFromUrl = params.get('plan')

        if (planFromUrl) {
            console.log(`[Settings] Detected plan in URL: ${planFromUrl}. Triggering checkout...`)
            // Clean up URL without triggering re-render if possible, or just replace
            // window.history.replaceState({}, '', window.location.pathname)
            navigate('/settings', { replace: true })
            handleUpgrade(planFromUrl)
        }
    }, [location.search, !!session])

    const plans = [
        {
            id: 'plan_starter',
            name: 'Starter',
            monthlyPrice: '14',
            yearlyPrice: '9',
            sites: 1,
            color: '#6366F1'
        },
        {
            id: 'plan_pro',
            name: 'Professional',
            monthlyPrice: '39',
            yearlyPrice: '29',
            sites: 5,
            color: '#2563EB',
            popular: true
        },
        {
            id: 'plan_agency',
            name: 'Agency',
            monthlyPrice: '149',
            yearlyPrice: '99',
            sites: 25,
            color: '#1E293B'
        },
    ]

    return (
        <div className="max-w-4xl mx-auto py-8">
            <h1 className="text-[32px] font-bold text-[#111827] mb-10 tracking-tight">Subscription</h1>

            <div className="space-y-8">
                {/* Billing Section */}
                <div className="premium-card overflow-hidden">
                    <div className="p-8 border-b border-[#F1F5F9] flex items-center justify-between bg-gradient-to-r from-white to-[#F8FAFC]">
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

                        {/* Billing Toggle */}
                        <div className="flex justify-center mb-8">
                            <div className="inline-flex items-center p-1 bg-[#F1F5F9] rounded-xl border border-[#E2E8F0]">
                                <button
                                    onClick={() => setBillingCycle('monthly')}
                                    className={`px-6 py-2 rounded-lg text-[13px] font-bold transition-all ${billingCycle === 'monthly' ? 'bg-white text-[#111827] shadow-sm' : 'text-[#64748B] hover:text-[#111827]'}`}
                                >
                                    Monthly
                                </button>
                                <button
                                    onClick={() => setBillingCycle('yearly')}
                                    className={`px-6 py-2 rounded-lg text-[13px] font-bold transition-all flex items-center gap-2 ${billingCycle === 'yearly' ? 'bg-white text-[#111827] shadow-sm' : 'text-[#64748B] hover:text-[#111827]'}`}
                                >
                                    Yearly <span className="bg-[#D1FAE5] text-[#065F46] text-[9px] uppercase px-2 py-0.5 rounded-full">Save 30%</span>
                                </button>
                            </div>
                        </div>

                        {/* Plan Selection */}
                        <div className="grid grid-cols-3 gap-4">
                            {plans.map((plan) => {
                                const fullPlanId = `${plan.id}_${billingCycle}`
                                const isActive = currentPlan === fullPlanId || (currentPlan === 'free_trial' && plan.id === 'plan_starter')

                                return (
                                    <div
                                        key={plan.id}
                                        className={`relative p-6 rounded-2xl border-2 transition-all duration-300 ${isActive ? 'border-[#2563EB] bg-[#F8FAFF] shadow-[0_0_0_4px_rgba(37,99,235,0.05)]' : 'border-[#F1F5F9] bg-white hover:border-[#E2E8F0] hover:shadow-md'}`}
                                    >
                                        {plan.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#2563EB] text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-lg shadow-blue-500/20">Popular Choice</span>}
                                        <div className="text-[15px] font-bold text-[#111827] mb-1">{plan.name}</div>
                                        <div className="flex items-baseline gap-1 mb-1">
                                            <span className="text-[28px] font-bold text-[#111827]">${billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice}</span>
                                            <span className="text-[13px] text-[#64748B] font-medium">/mo</span>
                                        </div>
                                        <div className="text-[11px] font-medium text-[#94A3B8] mb-5 h-4">
                                            {billingCycle === 'yearly' ? `Billed $${plan.yearlyPrice * 12}/year` : 'Billed month-to-month'}
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
                                            disabled={loading || isActive}
                                            onClick={() => handleUpgrade(fullPlanId)}
                                            className={`w-full py-2 rounded-lg text-[12px] font-bold transition-all ${isActive ? 'bg-[#E2E8F0] text-[#64748B] cursor-default' : 'bg-[#111827] text-white hover:bg-[#1E293B]'}`}
                                        >
                                            {loading ? <Loader2 className="w-3 h-3 animate-spin mx-auto text-white" /> : isActive ? 'Active' : 'Upgrade'}
                                        </button>
                                    </div>
                                )
                            })}
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
                <div className="premium-card p-8">
                    <div className="flex items-center gap-4 mb-8">
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
