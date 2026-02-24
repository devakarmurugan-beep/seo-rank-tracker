import { Link } from 'react-router-dom'
import {
    Target, BarChart2, Globe, TrendingUp, CheckCircle,
    Smartphone, Rocket, ShoppingCart, Newspaper,
    ShieldCheck, Zap, BarChart3, Search, MousePointer2
} from 'lucide-react'
import { useAuth } from './AuthContext'
import { LogoFull } from './components/Logo'

// Product Screenshots
import mainDashboardScreenshot from './assets/product/main-dashboard-screenshot.png'
import keywordsScreenshot from './assets/product/keywords-screenshot.png'
import rankMatrixScreenshot from './assets/product/rank-matrix-screenshot.png'
import geoScreenshot from './assets/product/geo-performance-screenshot.png'
import categoriesScreenshot from './assets/product/categories-performance-screenshot.png'

export default function Home() {
    const { session } = useAuth()

    const isProd = window.location.hostname.includes('seoranktrackingtool.com')
    const APP_URL = isProd ? 'https://app.seoranktrackingtool.com' : window.location.origin

    return (
        <div className="min-h-screen bg-white font-sans selection:bg-[#2563EB] selection:text-white overflow-x-hidden">
            {/* Nav */}
            <nav className="border-b border-[#F3F4F6] bg-white/80 backdrop-blur-md sticky top-0 z-[100]">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center">
                        <LogoFull className="scale-90 origin-left" />
                    </Link>
                    <div className="hidden md:flex items-center gap-8">
                        <Link to="#features" className="text-[14px] font-medium text-[#4B5563] hover:text-[#2563EB] transition-colors">Features</Link>
                        <Link to="#industries" className="text-[14px] font-medium text-[#4B5563] hover:text-[#2563EB] transition-colors">Industries</Link>
                        <Link to="/pricing" className="text-[14px] font-medium text-[#6B7280] hover:text-[#111827]">Pricing</Link>
                    </div>
                    <div className="flex items-center gap-4">
                        {session ? (
                            <a href={`${APP_URL}/dashboard`} className="px-5 py-2 bg-[#111827] text-white text-[13px] font-bold rounded-lg hover:bg-black transition-all shadow-sm">Go to Dashboard</a>
                        ) : (
                            <>
                                <a href={`${APP_URL}/login`} className="hidden sm:block text-[14px] font-semibold text-[#4B5563] hover:text-[#111827]">Log in</a>
                                <a href={`${APP_URL}/signup`} className="px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-bold rounded-lg transition-all shadow-lg shadow-[#2563EB]/20">Start 7-Day Free Trial</a>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-20 pb-24 px-6 md:pt-32 md:pb-40 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#2563EB 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#2563EB]/10 blur-[120px] rounded-full"></div>
                <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#10B981]/10 blur-[120px] rounded-full"></div>

                <div className="max-w-5xl mx-auto text-center relative">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#EFF6FF] border border-[#DBEafe] mb-10 animate-fade-in">
                        <TrendingUp className="w-4 h-4 text-[#2563EB]" />
                        <span className="text-[11px] font-bold text-[#2563EB] uppercase tracking-wider">Built on 100% Accurate Google API Data</span>
                    </div>
                    <h1 className="text-[44px] md:text-[80px] font-black text-[#0F172A] leading-[1.05] tracking-[-0.04em] mb-8">
                        The Rank Tracker for <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] to-[#10B981]">Everyone.</span>
                    </h1>
                    <p className="text-[18px] md:text-[22px] text-[#475569] mb-12 max-w-3xl mx-auto font-medium leading-relaxed">
                        Stop guessing with scraped proxy data. Connect your Google Search Console directly for precise, zero-latency ranking intelligence for every website owner.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
                        <a href={`${APP_URL}/signup`} className="px-10 py-5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[16px] font-bold rounded-2xl transition-all shadow-xl shadow-[#2563EB]/25 w-full sm:w-auto hover:-translate-y-1">
                            Deploy Your First Tracker
                        </a>
                        <Link to="/pricing" className="px-10 py-5 bg-white border-2 border-[#E2E8F0] hover:border-[#CBD5E1] text-[#0F172A] text-[16px] font-bold rounded-2xl transition-all w-full sm:w-auto">
                            Explore Plans
                        </Link>
                    </div>

                    {/* Dashboard Mockup Preview */}
                    <div className="relative mx-auto max-w-5xl rounded-3xl border border-[#E2E8F0] bg-white p-2 shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden animate-fade-in-up">
                        <div className="rounded-2xl border border-[#F1F5F9] bg-[#F8FAFC] overflow-hidden relative group">
                            <div className="h-8 border-b border-[#E2E8F0] bg-white flex items-center px-4 gap-1.5 sticky top-0 z-10">
                                <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]"></div>
                                <div className="w-2.5 h-2.5 rounded-full bg-[#27C93F]"></div>
                                <div className="ml-4 h-4 w-32 bg-[#F1F5F9] rounded-md"></div>
                            </div>
                            <img
                                src={mainDashboardScreenshot}
                                alt="SEO Rank Tracking Dashboard Overview"
                                className="w-full h-auto grayscale-[0.2] group-hover:grayscale-0 transition-all duration-700"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-white/10 to-transparent pointer-events-none"></div>
                        </div>
                    </div>
                </div>
            </section>

            {/* OAuth Compliance & Trust Section */}
            <section className="py-12 border-y border-[#F1F5F9] bg-[#F8FAFC]">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-24 opacity-60 grayscale hover:grayscale-0 transition-all duration-700">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="w-6 h-6 text-[#2563EB]" />
                            <span className="text-[14px] font-bold text-[#475569]">Google Search Console API Verified</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Zap className="w-6 h-6 text-[#F59E0B]" />
                            <span className="text-[14px] font-bold text-[#475569]">Zero Latency Updates</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-6 h-6 text-[#10B981]" />
                            <span className="text-[14px] font-bold text-[#475569]">Privacy Compliant (GDPR/CCPA)</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Detail */}
            <section id="features" className="py-24 md:py-32">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-20">
                        <h2 className="text-[32px] md:text-[48px] font-bold text-[#0F172A] tracking-[-0.02em] mb-4">Powerful Features, Simple Interface</h2>
                        <p className="text-[16px] md:text-[18px] text-[#475569] max-w-2xl mx-auto">Everything you need to monitor your organic presence without the enterprise complexity.</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-16 items-center mb-32">
                        <div>
                            <div className="w-12 h-12 rounded-2xl bg-[#EFF6FF] flex items-center justify-center mb-6">
                                <Search className="w-6 h-6 text-[#2563EB]" />
                            </div>
                            <h3 className="text-[28px] font-bold text-[#0F172A] mb-4">Complete Keyword Intelligence</h3>
                            <p className="text-[16px] text-[#475569] leading-relaxed mb-6">
                                View every single keyword your site ranks for automatically. No manual list building required. Filter by clicks, impressions, and exact average position.
                            </p>
                            <ul className="space-y-4">
                                {['Auto-discover new ranking keywords', 'Track selective primary keywords', 'Filter by Search Intent (Informational vs Transactional)'].map((l, i) => (
                                    <li key={i} className="flex items-center gap-3 text-[14px] font-medium text-[#475569]">
                                        <CheckCircle className="w-4 h-4 text-[#10B981]" /> {l}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="bg-[#F8FAFC] rounded-3xl p-4 border border-[#E2E8F0] shadow-2xl relative group">
                            <div className="rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
                                <img
                                    src={keywordsScreenshot}
                                    alt="Keyword Tracking Dashboard"
                                    className="w-full h-auto group-hover:scale-[1.02] transition-transform duration-700"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-16 items-center flex-row-reverse">
                        <div className="order-2 md:order-1">
                            <div className="bg-[#F8FAFC] rounded-3xl p-4 border border-[#E2E8F0] shadow-2xl group">
                                <div className="rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
                                    <img
                                        src={rankMatrixScreenshot}
                                        alt="Historical Rank Matrix"
                                        className="w-full h-auto group-hover:scale-[1.02] transition-transform duration-700"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="order-1 md:order-2">
                            <div className="w-12 h-12 rounded-2xl bg-[#F0FDF4] flex items-center justify-center mb-6">
                                <Globe className="w-6 h-6 text-[#10B981]" />
                            </div>
                            <h3 className="text-[28px] font-bold text-[#0F172A] mb-4">Historical Rank Matrix</h3>
                            <p className="text-[16px] text-[#475569] leading-relaxed mb-6">
                                See exactly how your rankings move day-over-day in a color-coded matrix. Identify volatility before it hits your traffic.
                            </p>
                            <ul className="space-y-4">
                                {['Daily position snapshots', 'Week-over-week volatility reports', 'Geo-specific performance tracking'].map((l, i) => (
                                    <li key={i} className="flex items-center gap-3 text-[14px] font-medium text-[#475569]">
                                        <CheckCircle className="w-4 h-4 text-[#10B981]" /> {l}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-16 items-center mt-32">
                        <div>
                            <div className="w-12 h-12 rounded-2xl bg-[#F0F9FF] flex items-center justify-center mb-6">
                                <Globe className="w-6 h-6 text-[#0EA5E9]" />
                            </div>
                            <h3 className="text-[28px] font-bold text-[#0F172A] mb-4">Global Geographic Intelligence</h3>
                            <p className="text-[16px] text-[#475569] leading-relaxed mb-6">
                                Track your rankings across different countries and regions. Understand where your audience is coming from and how you perform globally.
                            </p>
                            <ul className="space-y-4">
                                {['Country-wise performance breakdown', 'Identify emerging markets', 'Localized search insights'].map((l, i) => (
                                    <li key={i} className="flex items-center gap-3 text-[14px] font-medium text-[#475569]">
                                        <CheckCircle className="w-4 h-4 text-[#10B981]" /> {l}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="bg-[#F8FAFC] rounded-3xl p-4 border border-[#E2E8F0] shadow-2xl group">
                            <div className="rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-sm">
                                <img
                                    src={geoScreenshot}
                                    alt="Global Geographic Intelligence"
                                    className="w-full h-auto group-hover:scale-[1.02] transition-transform duration-700"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Industry Use-Cases */}
            <section id="industries" className="py-24 bg-[#0F172A] text-white">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-20">
                        <h2 className="text-[32px] md:text-[48px] font-bold text-white tracking-[-0.02em] mb-4">Built for Every Online Business</h2>
                        <p className="text-[16px] md:text-[18px] text-[#94A3B8] max-w-2xl mx-auto">Whether you're a solopreneur or a large agency, accurate data drives better decisions.</p>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { icon: Rocket, title: 'SaaS & Startups', desc: 'Track trial conversions and feature discovery.' },
                            { icon: ShoppingCart, title: 'E-commerce', desc: 'Monitor high-intent product keywords and categories.' },
                            { icon: Newspaper, title: 'Content & Blogs', desc: 'See which articles are actually moving the needle.' },
                            { icon: Smartphone, title: 'Agencies', desc: 'Generate automated reports for clients in seconds.' }
                        ].map((item, i) => (
                            <div key={i} className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
                                <item.icon className="w-10 h-10 text-[#2563EB] mb-6 group-hover:scale-110 transition-transform" />
                                <h4 className="text-[18px] font-bold mb-3">{item.title}</h4>
                                <p className="text-[14px] text-[#94A3B8] leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Roadmap / Coming Soon */}
            <section className="py-24 md:py-32 bg-white">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <h2 className="text-[32px] font-bold text-[#0F172A] mb-12">Constant Innovation</h2>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="p-8 rounded-3xl border border-[#E2E8F0] text-left relative overflow-hidden group hover:border-[#2563EB] transition-colors">
                            <div className="absolute top-4 right-4 bg-[#F1F5F9] text-[#475569] text-[10px] font-bold px-2 py-1 rounded">Q2 2026</div>
                            <h4 className="text-[18px] font-bold mb-2">Advanced Page-Wise Tracking</h4>
                            <p className="text-[14px] text-[#64748B] mb-6">Analyze organic performance by individual URLs and content types.</p>
                            <div className="rounded-xl border border-[#F1F5F9] overflow-hidden shadow-sm">
                                <img src={categoriesScreenshot} alt="Page-Wise Tracking" className="w-full h-auto" />
                            </div>
                        </div>
                        <div className="p-8 rounded-3xl border border-[#E2E8F0] text-left relative overflow-hidden group hover:border-[#2563EB] transition-colors">
                            <div className="absolute top-4 right-4 bg-[#F1F5F9] text-[#475569] text-[10px] font-bold px-2 py-1 rounded">Q3 2026</div>
                            <h4 className="text-[18px] font-bold mb-2">Automated Client Reports</h4>
                            <p className="text-[14px] text-[#64748B] mb-6">Scheduled, white-labeled PDF and live-link reports for agencies.</p>
                            <div className="aspect-video bg-[#F8FAFC] rounded-xl border border-dashed border-[#CBD5E1] flex items-center justify-center">
                                <Rocket className="w-8 h-8 text-[#CBD5E1]" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Human Touch / Trust Values */}
            <section className="py-24 bg-[#0F172A] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-[#2563EB]/10 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="grid md:grid-cols-3 gap-12 text-center">
                        <div className="space-y-4">
                            <div className="w-16 h-16 bg-[#2563EB]/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <Zap className="w-8 h-8 text-[#2563EB]" />
                            </div>
                            <h4 className="text-[20px] font-bold text-white">No Bot Scrapers</h4>
                            <p className="text-[14px] text-[#94A3B8] leading-relaxed">We don't use unreliable proxies. Our data comes directly from the source, ensuring yours stays accurate.</p>
                        </div>
                        <div className="space-y-4">
                            <div className="w-16 h-16 bg-[#10B981]/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <ShieldCheck className="w-8 h-8 text-[#10B981]" />
                            </div>
                            <h4 className="text-[20px] font-bold text-white">Identity Protected</h4>
                            <p className="text-[14px] text-[#94A3B8] leading-relaxed">Your GSC data is never shared with third parties. We are GDPR and CCPA compliant by design.</p>
                        </div>
                        <div className="space-y-4">
                            <div className="w-16 h-16 bg-[#F59E0B]/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <CheckCircle className="w-8 h-8 text-[#F59E0B]" />
                            </div>
                            <h4 className="text-[20px) font-bold text-white">Human-First Design</h4>
                            <p className="text-[14px] text-[#94A3B8] leading-relaxed">Built for busy founders and marketers, not just SEO specialists. Data you can actually understand.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Why Us / Comparison Section */}
            <section className="py-24 bg-[#F8FAFC]">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="bg-white rounded-[3rem] p-12 md:p-20 border border-[#E2E8F0] shadow-xl shadow-[#2563EB]/5">
                        <div className="grid md:grid-cols-2 gap-16">
                            <div>
                                <h2 className="text-[32px] font-bold text-[#0F172A] mb-6 decoration-[#2563EB] decoration-4 underline-offset-8">GSC API vs. Proxy Scrapers</h2>
                                <p className="text-[16px] text-[#475569] leading-relaxed mb-8">
                                    Most rank trackers use bot-proxies that Google hates. They get blocked, provide "blurred" rankings, and can't see geographical nuances accurately.
                                </p>
                                <div className="space-y-4">
                                    <div className="flex items-start gap-4 p-4 rounded-2xl bg-[#F0FDF4] border border-[#DCFCE7]">
                                        <ShieldCheck className="w-6 h-6 text-[#10B981] flex-shrink-0" />
                                        <div>
                                            <h5 className="font-bold text-[#111827]">100% Google Approved</h5>
                                            <p className="text-[13px] text-[#065F46]">We use official APIs. Your site is safe, and the data is 100% what Google sees.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4 p-4 rounded-2xl bg-[#EFF6FF] border border-[#DBEAFE]">
                                        <TrendingUp className="w-6 h-6 text-[#2563EB] flex-shrink-0" />
                                        <div>
                                            <h5 className="font-bold text-[#111827]">Unlimited Keyword Discovery</h5>
                                            <p className="text-[13px] text-[#1E40AF]">Don't just track 10 keywords. See all 10,000+ keywords you rank for automatically.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="relative">
                                <div className="aspect-square bg-[#F1F5F9] rounded-3xl border-2 border-dashed border-[#CBD5E1] flex items-center justify-center p-8">
                                    <div className="text-center">
                                        <MousePointer2 className="w-12 h-12 text-[#94A3B8] mx-auto mb-4" />
                                        <p className="text-[14px] font-bold text-[#475569]">Click-Through Rate (CTR) Tracking</p>
                                        <p className="text-[12px] text-[#64748B] mt-2 italic">Exclusive feature only possible via GSC Data.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Final CTA */}
            <section className="py-24 px-6">
                <div className="max-w-5xl mx-auto rounded-[3rem] bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] p-12 md:p-20 text-center relative overflow-hidden">
                    <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(white 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
                    <h2 className="text-[36px] md:text-[56px] font-black text-white leading-tight mb-8 relative">Ready to see your <br className="hidden md:block" /> true search rankings?</h2>
                    <p className="text-[18px] text-white/80 mb-12 max-w-2xl mx-auto relative font-medium">Join over 1,200+ website owners making smarter SEO decisions with Rank Tracking.</p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 relative">
                        <a href={`${APP_URL}/signup`} className="px-10 py-5 bg-white text-[#2563EB] text-[16px] font-bold rounded-2xl hover:bg-[#F8FAFC] transition-all shadow-2xl w-full sm:w-auto">
                            Start Free 7-Day Trial
                        </a>
                        <p className="text-white/60 text-[13px] font-medium italic">No credit card required to start.</p>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-20 border-t border-[#F1F5F9] bg-[#F8FAFC]">
                <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-12">
                    <div className="col-span-2">
                        <LogoFull className="mb-6" />
                        <p className="text-[14px] text-[#64748B] max-w-sm leading-relaxed">
                            The professional alternative to scraped data. Built directly on Google Search Console APIs for 100% precision.
                        </p>
                    </div>
                    <div>
                        <h5 className="text-[14px] font-bold text-[#0F172A] mb-6">Product</h5>
                        <ul className="space-y-4">
                            <li><Link to="#features" className="text-[14px] text-[#64748B] hover:text-[#2563EB]">Features</Link></li>
                            <li><Link to="/pricing" className="text-[14px] text-[#64748B] hover:text-[#2563EB]">Pricing</Link></li>
                        </ul>
                    </div>
                    <div>
                        <h5 className="text-[14px] font-bold text-[#0F172A] mb-6">Company</h5>
                        <ul className="space-y-4">
                            <li><a href={`${APP_URL}/login`} className="text-[14px] text-[#64748B] hover:text-[#2563EB]">Login</a></li>
                            <li><a href={`${APP_URL}/signup`} className="text-[14px] text-[#64748B] hover:text-[#2563EB]">Signup</a></li>
                        </ul>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto px-6 mt-20 pt-8 border-t border-[#E2E8F0] flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-[13px] text-[#94A3B8]">© {new Date().getFullYear()} Rank Tracking SEO TOOL. All rights reserved.</p>
                    <div className="flex items-center gap-6">
                        <a href="#" className="text-[12px] text-[#94A3B8] hover:text-[#2563EB]">Privacy Policy</a>
                        <a href="#" className="text-[12px] text-[#94A3B8] hover:text-[#2563EB]">Terms of Service</a>
                    </div>
                </div>
            </footer>
        </div>
    )
}
