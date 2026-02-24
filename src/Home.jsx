import { Link } from 'react-router-dom'
import { Target, BarChart2, Globe, TrendingUp, CheckCircle } from 'lucide-react'
import { useAuth } from './AuthContext'
import { LogoFull } from './components/Logo'

export default function Home() {
    const { session } = useAuth()

    return (
        <div className="min-h-screen bg-white font-sans selection:bg-[#2563EB] selection:text-white">
            {/* Nav */}
            <nav className="border-b border-[#E5E7EB] bg-white sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center">
                        <LogoFull className="scale-90 origin-left" />
                    </Link>
                    <div className="flex items-center gap-6">
                        <Link to="/pricing" className="text-[14px] font-medium text-[#4B5563] hover:text-[#111827]">Pricing</Link>
                        {session ? (
                            <Link to="/dashboard" className="px-4 py-2 bg-[#111827] text-white text-[14px] font-medium rounded-lg hover:bg-black transition-colors">Go to Dashboard</Link>
                        ) : (
                            <>
                                <Link to="/login" className="text-[14px] font-medium text-[#4B5563] hover:text-[#111827]">Log in</Link>
                                <Link to="/signup" className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[14px] font-medium rounded-lg transition-colors">Start 7-Day Free Trial</Link>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section className="py-24 px-6 md:py-32">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] mb-8">
                        <TrendingUp className="w-4 h-4 text-[#2563EB]" />
                        <span className="text-[12px] font-medium text-[#2563EB]">The most accurate Rank Tracking built on Google Search Console Data</span>
                    </div>
                    <h1 className="text-[48px] md:text-[64px] font-bold text-[#111827] leading-[1.1] tracking-[-0.02em] mb-6">
                        Monitor Your Search Rankings with Perfect Precision
                    </h1>
                    <p className="text-[18px] text-[#4B5563] mb-10 max-w-2xl mx-auto font-normal leading-relaxed">
                        Say goodbye to scraped proxy data. Built directly on top of Google Search Console APIs, we give you the true, 100% accurate ranking data directly from the source.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link to="/signup" className="px-8 py-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[16px] font-medium rounded-xl transition-all shadow-lg shadow-[#2563EB]/25 w-full sm:w-auto">
                            Start Tracking for Free
                        </Link>
                        <Link to="/pricing" className="px-8 py-4 bg-white border border-[#E5E7EB] hover:border-[#D1D5DB] hover:bg-[#F9FAFB] text-[#111827] text-[16px] font-medium rounded-xl transition-all w-full sm:w-auto">
                            View Pricing
                        </Link>
                    </div>
                    <p className="mt-4 text-[13px] text-[#6B7280]">100% Free 7-Day Trial. No Credit Card Required.</p>
                </div>
            </section>

            {/* Features */}
            <section className="py-24 bg-[#F9FAFB] border-t border-[#E5E7EB]">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-[32px] font-bold text-[#111827] tracking-[-0.01em] mb-4">Everything an SEO Professional Needs</h2>
                        <p className="text-[16px] text-[#4B5563]">We connect beautifully formatted dashboards to the chaotic raw data of Google Search Console.</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="p-8 bg-white rounded-2xl border border-[#E5E7EB] shadow-sm">
                            <div className="w-12 h-12 bg-[#EFF6FF] rounded-xl flex items-center justify-center mb-6">
                                <Target className="w-6 h-6 text-[#2563EB]" />
                            </div>
                            <h3 className="text-[20px] font-semibold text-[#111827] mb-3">Historical Rank Matrix</h3>
                            <p className="text-[14px] text-[#4B5563] leading-relaxed">View week-over-week changes in a gorgeous matrix. Instantly understand ranking movements and volatility.</p>
                        </div>
                        <div className="p-8 bg-white rounded-2xl border border-[#E5E7EB] shadow-sm">
                            <div className="w-12 h-12 bg-[#FEF2F2] rounded-xl flex items-center justify-center mb-6">
                                <BarChart2 className="w-6 h-6 text-[#DC2626]" />
                            </div>
                            <h3 className="text-[20px] font-semibold text-[#111827] mb-3">URL & Intent Separation</h3>
                            <p className="text-[14px] text-[#4B5563] leading-relaxed">Automatically categorize keywords by business intent and map them accurately to their ranking landing pages.</p>
                        </div>
                        <div className="p-8 bg-white rounded-2xl border border-[#E5E7EB] shadow-sm">
                            <div className="w-12 h-12 bg-[#F0FDF4] rounded-xl flex items-center justify-center mb-6">
                                <Globe className="w-6 h-6 text-[#16A34A]" />
                            </div>
                            <h3 className="text-[20px] font-semibold text-[#111827] mb-3">Global Location Drilling</h3>
                            <p className="text-[14px] text-[#4B5563] leading-relaxed">Drill down and see which specific geographical regions are driving the majority of your keyword impressions.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-[#E5E7EB] bg-white text-center">
                <p className="text-[14px] text-[#6B7280]">© {new Date().getFullYear()} SEO Tracker. Built with Next-Gen Engineering.</p>
            </footer>
        </div>
    )
}
