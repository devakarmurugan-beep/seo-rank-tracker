import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, CheckCircle2 } from 'lucide-react'
import { useAuth } from './AuthContext'
import { supabase } from './lib/supabase'
import { createSubscription } from './lib/api'

export default function Pricing() {
    const { session } = useAuth()
    const navigate = useNavigate()
    const [isUpdating, setIsUpdating] = useState(false)
    const [successMsg, setSuccessMsg] = useState('')
    const [billingCycle, setBillingCycle] = useState('yearly') // 'monthly' | 'yearly'

    const isProd = window.location.hostname.includes('seoranktrackingtool.com')
    const APP_URL = isProd ? 'https://app.seoranktrackingtool.com' : window.location.origin

    const handleSelectPlan = async (planId) => {
        if (!session) {
            window.location.href = `${APP_URL}/signup`
            return
        }

        setIsUpdating(true)
        try {
            const checkoutData = await createSubscription(session.user.id, session.user.email, planId)

            if (checkoutData.error) {
                throw new Error(checkoutData.error)
            }

            if (checkoutData.checkoutUrl) {
                // Redirect user to the secure Dodo Payments checkout UI
                window.location.href = checkoutData.checkoutUrl
            } else {
                throw new Error('Failed to generate checkout URL')
            }
        } catch (err) {
            console.error('Failed to update plan:', err)
            alert('Failed to update plan. Please try again.')
        } finally {
            setIsUpdating(false)
        }
    }

    return (
        <div className="min-h-screen bg-[#F9FAFB] font-sans">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-10">
                <Link to="/" className="text-[18px] font-bold text-[#111827] tracking-tight hover:text-[#2563EB] transition-colors">SEO Tracker</Link>
                {session ? (
                    <a href={`${APP_URL}/dashboard`} className="px-5 py-2.5 bg-white border border-[#E5E7EB] text-[#111827] font-medium text-[14px] rounded-lg shadow-sm hover:border-[#D1D5DB] transition-all">Back to Dashboard</a>
                ) : (
                    <a href={`${APP_URL}/signup`} className="px-5 py-2.5 bg-[#2563EB] text-white font-medium text-[14px] rounded-lg shadow-sm hover:bg-[#1D4ED8] transition-all">Start Free Trial</a>
                )}
            </div>

            <div className="pt-32 pb-24 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h1 className="text-[40px] md:text-[56px] font-bold text-[#111827] tracking-[-0.02em] leading-tight mb-4">Simple, Transparent Pricing</h1>
                        <p className="text-[18px] text-[#4B5563] max-w-2xl mx-auto mb-10">Track your search rankings with a plan that scales perfectly with your portfolio of websites. All plans include 7-day free trial.</p>

                        <div className="inline-flex items-center p-1 bg-[#F3F4F6] rounded-xl border border-[#E5E7EB]">
                            <button
                                onClick={() => setBillingCycle('monthly')}
                                className={`px-6 py-2.5 rounded-lg text-[14px] font-semibold transition-all ${billingCycle === 'monthly' ? 'bg-white text-[#111827] shadow-sm' : 'text-[#6B7280] hover:text-[#374151]'}`}
                            >
                                Monthly
                            </button>
                            <button
                                onClick={() => setBillingCycle('yearly')}
                                className={`px-6 py-2.5 rounded-lg text-[14px] font-semibold transition-all flex items-center gap-2 ${billingCycle === 'yearly' ? 'bg-white text-[#111827] shadow-sm' : 'text-[#6B7280] hover:text-[#374151]'}`}
                            >
                                Yearly <span className="bg-[#D1FAE5] text-[#065F46] text-[10px] uppercase px-2 py-0.5 rounded-full font-bold">Save 30%</span>
                            </button>
                        </div>
                    </div>

                    {successMsg && (
                        <div className="max-w-md mx-auto mb-8 bg-[#ECFDF5] border border-[#10B981] p-4 rounded-xl flex items-center justify-center gap-3">
                            <CheckCircle2 className="w-5 h-5 text-[#10B981]" />
                            <span className="text-[#065F46] font-medium text-[14px]">{successMsg}</span>
                        </div>
                    )}

                    <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {/* Plan 1 */}
                        <div className="bg-white rounded-3xl p-8 border border-[#E5E7EB] shadow-sm hover:border-[#2563EB]/30 transition-all flex flex-col relative">
                            {currentPlan.startsWith('plan_starter') && <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#EFF6FF] text-[#2563EB] text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-[#BFDBFE]">Current Plan</div>}
                            <h3 className="text-[24px] font-bold text-[#111827] mb-2 tracking-tight">Starter</h3>
                            <p className="text-[14px] text-[#6B7280] mb-6">Perfect for single website owners.</p>
                            <div className="mb-2 flex items-baseline gap-1">
                                <span className="text-[48px] font-bold text-[#111827] tracking-tighter">${billingCycle === 'yearly' ? '9' : '14'}</span>
                                <span className="text-[14px] text-[#6B7280] font-medium">/month</span>
                            </div>
                            <p className="text-[13px] text-[#9CA3AF] mb-6 h-5">{billingCycle === 'yearly' ? 'Billed $108 annually' : 'Billed monthly'}</p>
                            <button
                                onClick={() => handleSelectPlan(`plan_starter_${billingCycle}`)}
                                disabled={isUpdating || currentPlan === `plan_starter_${billingCycle}`}
                                className={`w-full py-3 px-4 rounded-xl text-[14px] font-semibold transition-all mb-8 ${currentPlan === `plan_starter_${billingCycle}` ? 'bg-[#F3F4F6] text-[#9CA3AF] cursor-default' : 'bg-[#EFF6FF] text-[#2563EB] hover:bg-[#DBEAFE]'}`}
                            >
                                {currentPlan === `plan_starter_${billingCycle}` ? 'Active Plan' : 'Select Starter'}
                            </button>
                            <div className="flex-1">
                                <p className="text-[12px] font-semibold text-[#111827] uppercase tracking-wider mb-4">Includes</p>
                                <ul className="space-y-4">
                                    <li className="flex items-center gap-3 text-[14px] text-[#4B5563]"><div className="w-5 h-5 rounded-full bg-[#E0E7FF] flex items-center justify-center flex-shrink-0"><Check className="w-3 h-3 text-[#4F46E5]" /></div> <span className="font-semibold text-[#111827]">1 Website</span></li>
                                    <li className="flex items-center gap-3 text-[14px] text-[#4B5563]"><div className="w-5 h-5 rounded-full bg-[#E0E7FF] flex items-center justify-center flex-shrink-0"><Check className="w-3 h-3 text-[#4F46E5]" /></div> Priority Syncing</li>
                                    <li className="flex items-center gap-3 text-[14px] text-[#4B5563]"><div className="w-5 h-5 rounded-full bg-[#E0E7FF] flex items-center justify-center flex-shrink-0"><Check className="w-3 h-3 text-[#4F46E5]" /></div> Full Historical Data</li>
                                </ul>
                            </div>
                        </div>

                        {/* Plan 2 */}
                        <div className="bg-[#111827] rounded-3xl p-8 border border-[#1F2937] shadow-xl hover:border-[#374151] transition-all flex flex-col relative transform md:-translate-y-4">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-[#2563EB] to-[#4F46E5] text-white text-[11px] font-bold px-4 py-1.5 rounded-full uppercase tracking-wider shadow-sm">Most Popular</div>
                            {currentPlan.startsWith('plan_pro') && <div className="absolute top-0 right-4 -translate-y-1/2 bg-[#10B981] text-white text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider">Active</div>}
                            <h3 className="text-[24px] font-bold text-white mb-2 tracking-tight">Professional</h3>
                            <p className="text-[14px] text-[#9CA3AF] mb-6">Designed for freelancers and consultants.</p>
                            <div className="mb-2 flex items-baseline gap-1">
                                <span className="text-[48px] font-bold text-white tracking-tighter">${billingCycle === 'yearly' ? '29' : '39'}</span>
                                <span className="text-[14px] text-[#9CA3AF] font-medium">/month</span>
                            </div>
                            <p className="text-[13px] text-[#6B7280] mb-6 h-5">{billingCycle === 'yearly' ? 'Billed $348 annually' : 'Billed monthly'}</p>
                            <button
                                onClick={() => handleSelectPlan(`plan_pro_${billingCycle}`)}
                                disabled={isUpdating || currentPlan === `plan_pro_${billingCycle}`}
                                className={`w-full py-3 px-4 rounded-xl text-[14px] font-bold transition-all mb-8 ${currentPlan === `plan_pro_${billingCycle}` ? 'bg-[#374151] text-[#9CA3AF] cursor-default' : 'bg-[#2563EB] text-white hover:bg-[#1D4ED8] shadow-lg shadow-[#2563EB]/25'}`}
                            >
                                {currentPlan === `plan_pro_${billingCycle}` ? 'Active Plan' : 'Select Professional'}
                            </button>
                            <div className="flex-1">
                                <p className="text-[12px] font-semibold text-[#D1D5DB] uppercase tracking-wider mb-4">Includes</p>
                                <ul className="space-y-4">
                                    <li className="flex items-center gap-3 text-[14px] text-[#D1D5DB]"><div className="w-5 h-5 rounded-full bg-[#2563EB]/20 flex items-center justify-center flex-shrink-0"><Check className="w-3 h-3 text-[#60A5FA]" /></div> <span className="font-semibold text-white">5 Websites</span></li>
                                    <li className="flex items-center gap-3 text-[14px] text-[#D1D5DB]"><div className="w-5 h-5 rounded-full bg-[#2563EB]/20 flex items-center justify-center flex-shrink-0"><Check className="w-3 h-3 text-[#60A5FA]" /></div> Priority Syncing</li>
                                    <li className="flex items-center gap-3 text-[14px] text-[#D1D5DB]"><div className="w-5 h-5 rounded-full bg-[#2563EB]/20 flex items-center justify-center flex-shrink-0"><Check className="w-3 h-3 text-[#60A5FA]" /></div> Full Historical Data</li>
                                </ul>
                            </div>
                        </div>

                        {/* Plan 3 */}
                        <div className="bg-white rounded-3xl p-8 border border-[#E5E7EB] shadow-sm hover:border-[#2563EB]/30 transition-all flex flex-col relative">
                            {currentPlan.startsWith('plan_agency') && <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#EFF6FF] text-[#2563EB] text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-[#BFDBFE]">Current Plan</div>}
                            <h3 className="text-[24px] font-bold text-[#111827] mb-2 tracking-tight">Agency</h3>
                            <p className="text-[14px] text-[#6B7280] mb-6">Built for growing SEO teams.</p>
                            <div className="mb-2 flex items-baseline gap-1">
                                <span className="text-[48px] font-bold text-[#111827] tracking-tighter">${billingCycle === 'yearly' ? '99' : '149'}</span>
                                <span className="text-[14px] text-[#6B7280] font-medium">/month</span>
                            </div>
                            <p className="text-[13px] text-[#9CA3AF] mb-6 h-5">{billingCycle === 'yearly' ? 'Billed $1,188 annually' : 'Billed monthly'}</p>
                            <button
                                onClick={() => handleSelectPlan(`plan_agency_${billingCycle}`)}
                                disabled={isUpdating || currentPlan === `plan_agency_${billingCycle}`}
                                className={`w-full py-3 px-4 rounded-xl text-[14px] font-semibold transition-all mb-8 ${currentPlan === `plan_agency_${billingCycle}` ? 'bg-[#F3F4F6] text-[#9CA3AF] cursor-default' : 'bg-[#EFF6FF] text-[#2563EB] hover:bg-[#DBEAFE]'}`}
                            >
                                {currentPlan === `plan_agency_${billingCycle}` ? 'Active Plan' : 'Select Agency'}
                            </button>
                            <div className="flex-1">
                                <p className="text-[12px] font-semibold text-[#111827] uppercase tracking-wider mb-4">Includes</p>
                                <ul className="space-y-4">
                                    <li className="flex items-center gap-3 text-[14px] text-[#4B5563]"><div className="w-5 h-5 rounded-full bg-[#E0E7FF] flex items-center justify-center flex-shrink-0"><Check className="w-3 h-3 text-[#4F46E5]" /></div> <span className="font-semibold text-[#111827]">25 Websites</span></li>
                                    <li className="flex items-center gap-3 text-[14px] text-[#4B5563]"><div className="w-5 h-5 rounded-full bg-[#E0E7FF] flex items-center justify-center flex-shrink-0"><Check className="w-3 h-3 text-[#4F46E5]" /></div> Priority Syncing</li>
                                    <li className="flex items-center gap-3 text-[14px] text-[#4B5563]"><div className="w-5 h-5 rounded-full bg-[#E0E7FF] flex items-center justify-center flex-shrink-0"><Check className="w-3 h-3 text-[#4F46E5]" /></div> Full Historical Data</li>
                                </ul>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    )
}
