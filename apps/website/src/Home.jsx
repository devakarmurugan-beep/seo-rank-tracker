import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import {
    Target, BarChart2, Globe, TrendingUp, CheckCircle,
    ShieldCheck, Zap, BarChart3, Search,
    ArrowRight, Play, ChevronRight, Layers, FileText,
    Monitor, Link2, Database, Eye,
    Cpu, Lock
} from 'lucide-react'
import { useContext } from 'react'
import { AuthContext } from './AuthContext'
import { LogoFull } from './components/Logo'

// Product Screenshots
import mainDashboardScreenshot from './assets/product/main-dashboard-screenshot.png'
import keywordsScreenshot from './assets/product/keywords-screenshot.png'
import categoriesScreenshot from './assets/product/categories-performance-screenshot.png'
import heroGlassCard from './assets/product/hero-glassmorphism.png'
import reportingSplitScreen from './assets/product/reporting-split-screen.png'
import technicalSeoIndexing from './assets/product/technical-seo-indexing.png'

// Scroll-reveal hook
function useScrollReveal() {
    const ref = useRef(null)
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) setIsVisible(true) },
            { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
        )
        if (ref.current) observer.observe(ref.current)
        return () => observer.disconnect()
    }, [])

    return [ref, isVisible]
}

// eslint-disable-next-line react/prop-types
const RevealSection = ({ children, className = '', delay = 0 }) => {
    const [ref, isVisible] = useScrollReveal()
    return (
        <div
            ref={ref}
            className={className}
            style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(40px)',
                transition: `all 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`,
            }}
        >
            {children}
        </div>
    )
}

// Animated counter
// eslint-disable-next-line react/prop-types
const AnimatedCounter = ({ end, suffix = '', prefix = '' }) => {
    const [count, setCount] = useState(0)
    const [ref, isVisible] = useScrollReveal()

    useEffect(() => {
        if (!isVisible) return
        let start = 0
        const duration = 2000
        const increment = end / (duration / 16)
        const timer = setInterval(() => {
            start += increment
            if (start >= end) { setCount(end); clearInterval(timer) }
            else setCount(Math.floor(start))
        }, 16)
        return () => clearInterval(timer)
    }, [isVisible, end])

    return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>
}

export default function Home() {
    const { session } = useContext(AuthContext)

    const APP_URL = import.meta.env.VITE_SITE_URL || 'http://localhost:5173'

    // eslint-disable-next-line react/prop-types
    const ProductMockup = ({ src, alt, className = "" }) => (
        <div className={`p-4 md:p-8 bg-transparent ${className}`}>
            <div className="browser-mockup anti-gravity-shadow group">
                <div className="h-8 border-b border-[#F1F5F9] bg-white hidden md:block"></div>
                <img
                    src={src}
                    alt={alt}
                    className="w-full h-auto transition-all duration-700"
                    loading="lazy"
                />
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-white font-sans selection:bg-[#2563EB] selection:text-white overflow-x-hidden">
            {/* ══════════════════════════════════════════════
                NAV
               ══════════════════════════════════════════════ */}
            <nav className="border-b border-[#F3F4F6] bg-white/80 backdrop-blur-md sticky top-0 z-[100]">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center">
                        <LogoFull className="scale-90 origin-left" />
                    </Link>
                    <div className="hidden md:flex items-center gap-8">
                        <a href="#workflow" className="text-[14px] font-medium text-[#4B5563] hover:text-[#2563EB] transition-colors">How It Works</a>
                        <a href="#features" className="text-[14px] font-medium text-[#4B5563] hover:text-[#2563EB] transition-colors">Features</a>
                        <a href="#reports" className="text-[14px] font-medium text-[#4B5563] hover:text-[#2563EB] transition-colors">Reports</a>
                        <Link to="/pricing" className="text-[14px] font-medium text-[#6B7280] hover:text-[#111827]">Pricing</Link>
                    </div>
                    <div className="flex items-center gap-4">
                        {session ? (
                            <a href={`${APP_URL}/dashboard`} className="px-5 py-2 bg-[#111827] text-white text-[13px] font-bold rounded-lg hover:bg-black transition-all shadow-sm">Go to Dashboard</a>
                        ) : (
                            <>
                                <a href={`${APP_URL}/login`} className="hidden sm:block text-[14px] font-semibold text-[#4B5563] hover:text-[#111827]">Log in</a>
                                <a href={`${APP_URL}/signup`} className="px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-bold rounded-lg transition-all shadow-lg shadow-[#2563EB]/20">Start Free Trial</a>
                            </>
                        )}
                    </div>
                </div>
            </nav>

            {/* ══════════════════════════════════════════════
                SECTION 1: THE HERO (The Hook)
               ══════════════════════════════════════════════ */}
            <section className="relative pt-20 pb-24 px-6 md:pt-28 md:pb-36 overflow-hidden">
                {/* Background grid dots */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#2563EB 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
                {/* Glowing orbs */}
                <div className="absolute -top-24 -right-24 w-[500px] h-[500px] bg-[#2563EB]/8 blur-[140px] rounded-full"></div>
                <div className="absolute -bottom-24 -left-24 w-[400px] h-[400px] bg-[#10B981]/8 blur-[120px] rounded-full"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#7C3AED]/3 blur-[200px] rounded-full"></div>

                <div className="max-w-6xl mx-auto relative">
                    <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
                        {/* Left: Copy */}
                        <div className="text-center md:text-left">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#EFF6FF] border border-[#DBEAFE] mb-8" style={{ animation: 'fadeIn 0.6s ease-out' }}>
                                <TrendingUp className="w-4 h-4 text-[#2563EB]" />
                                <span className="text-[11px] font-bold text-[#2563EB] uppercase tracking-wider">100% Google API Data</span>
                            </div>
                            <h1 className="text-[40px] md:text-[56px] lg:text-[64px] font-black text-[#0F172A] leading-[1.05] tracking-[-0.04em] mb-6">
                                Clearer Rankings.{' '}
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] to-[#10B981]">Faster Reports.</span>{' '}
                                Smarter SEO.
                            </h1>
                            <p className="text-[17px] md:text-[19px] text-[#475569] mb-10 max-w-xl font-medium leading-relaxed">
                                Connect your Google Search Console and let our AI organize your keywords and pages into actionable tracking clusters. Real-time data, professional reporting, and technical clarity in one dashboard.
                            </p>
                            <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
                                <a
                                    href={`${APP_URL}/signup`}
                                    className="group px-8 py-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[15px] font-bold rounded-2xl transition-all shadow-xl shadow-[#2563EB]/25 w-full sm:w-auto hover:-translate-y-0.5 flex items-center justify-center gap-2"
                                >
                                    <Search className="w-5 h-5" />
                                    Connect Search Console — Free
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </a>
                                <button className="group px-6 py-4 bg-white border-2 border-[#E2E8F0] hover:border-[#CBD5E1] text-[#0F172A] text-[15px] font-bold rounded-2xl transition-all w-full sm:w-auto flex items-center justify-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-[#EFF6FF] flex items-center justify-center group-hover:bg-[#DBEAFE] transition-colors">
                                        <Play className="w-3.5 h-3.5 text-[#2563EB] ml-0.5" />
                                    </div>
                                    Watch 1-min Demo
                                </button>
                            </div>
                            <p className="text-[12px] text-[#94A3B8] font-medium">No credit card required · 7-day trial · Cancel anytime</p>
                        </div>

                        {/* Right: Glassmorphism Visual */}
                        <div className="relative flex items-center justify-center" style={{ animation: 'float 6s ease-in-out infinite' }}>
                            <img
                                src={heroGlassCard}
                                alt="Keyword Trend Graph showing improving rankings"
                                className="w-full max-w-[500px] drop-shadow-2xl"
                                loading="eager"
                            />
                            {/* Floating stats pills */}
                            <div className="absolute -bottom-4 -left-4 md:-left-8 glass-pill px-4 py-3 rounded-2xl flex items-center gap-3" style={{ animation: 'fadeIn 1s ease-out 0.5s both' }}>
                                <div className="w-10 h-10 rounded-xl bg-[#DCFCE7] flex items-center justify-center">
                                    <TrendingUp className="w-5 h-5 text-[#059669]" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-[#6B7280] uppercase">Avg. Position</p>
                                    <p className="text-[18px] font-black text-[#0F172A]">#3.2</p>
                                </div>
                            </div>
                            <div className="absolute -top-2 -right-2 md:-right-6 glass-pill px-4 py-3 rounded-2xl flex items-center gap-3" style={{ animation: 'fadeIn 1s ease-out 0.8s both' }}>
                                <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] flex items-center justify-center">
                                    <Eye className="w-5 h-5 text-[#2563EB]" />
                                </div>
                                <div>
                                    <p className="text-[11px] font-bold text-[#6B7280] uppercase">Impressions</p>
                                    <p className="text-[18px] font-black text-[#0F172A]">24.5K</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Trust Bar */}
            <section className="py-10 border-y border-[#F1F5F9] bg-[#F8FAFC]">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-20">
                        {[
                            { icon: ShieldCheck, color: '#2563EB', text: 'Google Search Console API Verified' },
                            { icon: Zap, color: '#F59E0B', text: 'Zero Latency Updates' },
                            { icon: CheckCircle, color: '#10B981', text: 'Privacy Compliant (GDPR/CCPA)' },
                            { icon: Lock, color: '#7C3AED', text: 'SOC 2 Type II Secure' }
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-2.5 opacity-70 hover:opacity-100 transition-opacity">
                                <item.icon className="w-5 h-5" style={{ color: item.color }} />
                                <span className="text-[13px] font-bold text-[#475569]">{item.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════════
                SECTION 2: THE CORE WORKFLOW
               ══════════════════════════════════════════════ */}
            <section id="workflow" className="py-24 md:py-32 bg-white">
                <div className="max-w-6xl mx-auto px-6">
                    <RevealSection className="text-center mb-20">
                        <span className="text-[12px] font-bold text-[#2563EB] uppercase tracking-[0.15em] mb-4 block">How It Works</span>
                        <h2 className="text-[32px] md:text-[48px] font-black text-[#0F172A] tracking-[-0.03em] mb-4">
                            Connect. Analyze. <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] to-[#10B981]">Improve.</span>
                        </h2>
                        <p className="text-[16px] md:text-[18px] text-[#475569] max-w-2xl mx-auto font-medium">From zero to actionable insights in under 60 seconds. No manual uploads.</p>
                    </RevealSection>

                    <div className="grid md:grid-cols-3 gap-8 relative">
                        {/* Connection line */}
                        <div className="hidden md:block absolute top-[80px] left-[16.66%] right-[16.66%] h-[2px] bg-gradient-to-r from-[#2563EB]/20 via-[#2563EB] to-[#10B981]/20 z-0"></div>

                        {[
                            {
                                step: '01',
                                icon: Link2,
                                color: '#2563EB',
                                bg: '#EFF6FF',
                                title: '1-Click Connection',
                                desc: 'Securely sync your GSC data. No manual CSV uploads or tedious keyword tagging required. One OAuth click and you\'re live.'
                            },
                            {
                                step: '02',
                                icon: Cpu,
                                color: '#7C3AED',
                                bg: '#F5F3FF',
                                title: 'AI Performance Analysis',
                                desc: 'Our AI instantly clusters your pages into categories and identifies ranking opportunities you\'d miss manually.'
                            },
                            {
                                step: '03',
                                icon: FileText,
                                color: '#10B981',
                                bg: '#ECFDF5',
                                title: 'Professional Output',
                                desc: 'Export internal strategy audits or polished client reports in seconds. No formatting needed.'
                            }
                        ].map((item, i) => (
                            <RevealSection key={i} delay={i * 150}>
                                <div className="relative z-10 text-center group">
                                    <div className="w-[72px] h-[72px] rounded-3xl mx-auto mb-8 flex items-center justify-center transition-transform group-hover:scale-110 group-hover:-translate-y-1" style={{ backgroundColor: item.bg }}>
                                        <item.icon className="w-8 h-8" style={{ color: item.color }} />
                                    </div>
                                    <span className="text-[11px] font-black uppercase tracking-[0.2em] mb-3 block" style={{ color: item.color }}>Step {item.step}</span>
                                    <h3 className="text-[22px] font-bold text-[#0F172A] mb-4">{item.title}</h3>
                                    <p className="text-[15px] text-[#475569] leading-relaxed max-w-xs mx-auto">{item.desc}</p>
                                </div>
                            </RevealSection>
                        ))}
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════════
                SECTION 3: FEATURE DEEP-DIVE (The 4 Pillars)
               ══════════════════════════════════════════════ */}
            <section id="features" className="py-24 md:py-32 bg-[#F8FAFC]">
                <div className="max-w-7xl mx-auto px-6">
                    <RevealSection className="text-center mb-20">
                        <span className="text-[12px] font-bold text-[#2563EB] uppercase tracking-[0.15em] mb-4 block">The 4 Pillars</span>
                        <h2 className="text-[32px] md:text-[48px] font-black text-[#0F172A] tracking-[-0.03em] mb-4">
                            Powerful Features, <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] to-[#10B981]">Simple Interface</span>
                        </h2>
                        <p className="text-[16px] md:text-[18px] text-[#475569] max-w-2xl mx-auto font-medium">Everything you need to monitor and grow your organic presence without the enterprise complexity.</p>
                    </RevealSection>

                    {/* Pillar 1: Dashboard */}
                    <RevealSection className="mb-28">
                        <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
                            <div>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-[#EFF6FF] flex items-center justify-center">
                                        <Monitor className="w-6 h-6 text-[#2563EB]" />
                                    </div>
                                    <span className="text-[11px] font-black text-[#2563EB] uppercase tracking-[0.15em]">Pillar 01</span>
                                </div>
                                <h3 className="text-[28px] md:text-[34px] font-bold text-[#0F172A] mb-4 tracking-[-0.02em]">Dashboard: Your SEO <span className="text-[#2563EB]">Command Center</span></h3>
                                <p className="text-[16px] text-[#475569] leading-relaxed mb-8">
                                    Get a high-level overview of your organic health. Track impressions, clicks, and average position trends without the GSC clutter. All metrics refresh daily.
                                </p>
                                <div className="space-y-4">
                                    {['Real-time KPI cards with trend indicators', 'Click & impression volume over time', 'Instant performance alerts'].map((l, i) => (
                                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-[#E2E8F0] group hover:border-[#2563EB]/30 transition-colors">
                                            <CheckCircle className="w-4 h-4 text-[#10B981] flex-shrink-0" />
                                            <span className="text-[14px] font-medium text-[#475569]">{l}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <ProductMockup src={mainDashboardScreenshot} alt="SEO Dashboard Command Center" />
                        </div>
                    </RevealSection>

                    {/* Pillar 2: Keywords */}
                    <RevealSection className="mb-28">
                        <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
                            <div className="order-2 md:order-1">
                                <ProductMockup src={keywordsScreenshot} alt="Keyword Intelligence Dashboard" />
                            </div>
                            <div className="order-1 md:order-2">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-[#F0FDF4] flex items-center justify-center">
                                        <Search className="w-6 h-6 text-[#10B981]" />
                                    </div>
                                    <span className="text-[11px] font-black text-[#10B981] uppercase tracking-[0.15em]">Pillar 02</span>
                                </div>
                                <h3 className="text-[28px] md:text-[34px] font-bold text-[#0F172A] mb-4 tracking-[-0.02em]">Keywords: Intelligent <span className="text-[#10B981]">Rank Tracking</span></h3>
                                <p className="text-[16px] text-[#475569] leading-relaxed mb-8">
                                    Go beyond a simple list. See which keywords are driving the most value and track their daily movement with precision. AI-powered intent detection included.
                                </p>
                                <div className="space-y-4">
                                    {['Auto-discover 10,000+ ranking keywords', 'Weighted average position accuracy', 'Search intent classification (Info/Trans/Comm)'].map((l, i) => (
                                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-[#E2E8F0] group hover:border-[#10B981]/30 transition-colors">
                                            <CheckCircle className="w-4 h-4 text-[#10B981] flex-shrink-0" />
                                            <span className="text-[14px] font-medium text-[#475569]">{l}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </RevealSection>

                    {/* Pillar 3: Pages / Clusters */}
                    <RevealSection className="mb-28">
                        <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
                            <div>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-[#F5F3FF] flex items-center justify-center">
                                        <Layers className="w-6 h-6 text-[#7C3AED]" />
                                    </div>
                                    <span className="text-[11px] font-black text-[#7C3AED] uppercase tracking-[0.15em]">Pillar 03 · Innovation</span>
                                </div>
                                <h3 className="text-[28px] md:text-[34px] font-bold text-[#0F172A] mb-4 tracking-[-0.02em]">Pages: Semantic <span className="text-[#7C3AED]">Category Clusters</span></h3>
                                <p className="text-[16px] text-[#475569] leading-relaxed mb-8">
                                    We group your URLs by category. Understand which &quot;clusters&quot; of your site are winning and which need more authority. See the big picture at a glance.
                                </p>
                                <div className="space-y-4">
                                    {['AI-powered URL categorization', 'Cluster-level performance metrics', 'Identify content gaps by category'].map((l, i) => (
                                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-[#E2E8F0] group hover:border-[#7C3AED]/30 transition-colors">
                                            <CheckCircle className="w-4 h-4 text-[#10B981] flex-shrink-0" />
                                            <span className="text-[14px] font-medium text-[#475569]">{l}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <ProductMockup src={categoriesScreenshot} alt="Semantic Category Clusters" />
                        </div>
                    </RevealSection>

                    {/* Pillar 4: Technical SEO */}
                    <RevealSection>
                        <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
                            <div className="order-2 md:order-1">
                                <div className="p-4 md:p-8">
                                    <div className="rounded-2xl overflow-hidden border border-[#E2E8F0] anti-gravity-shadow">
                                        <img src={technicalSeoIndexing} alt="Technical SEO Indexing Dashboard" className="w-full h-auto" loading="lazy" />
                                    </div>
                                </div>
                            </div>
                            <div className="order-1 md:order-2">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-[#FFF7ED] flex items-center justify-center">
                                        <Database className="w-6 h-6 text-[#EA580C]" />
                                    </div>
                                    <span className="text-[11px] font-black text-[#EA580C] uppercase tracking-[0.15em]">Pillar 04 · New</span>
                                </div>
                                <h3 className="text-[28px] md:text-[34px] font-bold text-[#0F172A] mb-4 tracking-[-0.02em]">Technical SEO: Real-Time <span className="text-[#EA580C]">Indexing Status</span></h3>
                                <p className="text-[16px] text-[#475569] leading-relaxed mb-8">
                                    Stop guessing. See exactly which pages are Submitted & Indexed, Crawled but Not Indexed, or Discovered. Take action using our Indexing API integration.
                                </p>
                                {/* Semantic color status cards */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F0FDF4] border border-[#DCFCE7]">
                                        <div className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></div>
                                        <span className="text-[14px] font-semibold text-[#065F46]">Submitted & Indexed</span>
                                        <span className="ml-auto text-[14px] font-black text-[#059669]">847</span>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-[#FFFBEB] border border-[#FEF3C7]">
                                        <div className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]"></div>
                                        <span className="text-[14px] font-semibold text-[#92400E]">Crawled but Not Indexed</span>
                                        <span className="ml-auto text-[14px] font-black text-[#D97706]">156</span>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                                        <div className="w-2.5 h-2.5 rounded-full bg-[#94A3B8]"></div>
                                        <span className="text-[14px] font-semibold text-[#475569]">Discovered — Not Yet Crawled</span>
                                        <span className="ml-auto text-[14px] font-black text-[#64748B]">312</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </RevealSection>
                </div>
            </section>

            {/* ══════════════════════════════════════════════
                SECTION 4: THE REPORTING ENGINE
               ══════════════════════════════════════════════ */}
            <section id="reports" className="py-24 md:py-32 bg-white">
                <div className="max-w-7xl mx-auto px-6">
                    <RevealSection className="text-center mb-16">
                        <span className="text-[12px] font-bold text-[#2563EB] uppercase tracking-[0.15em] mb-4 block">Reporting Engine</span>
                        <h2 className="text-[32px] md:text-[48px] font-black text-[#0F172A] tracking-[-0.03em] mb-4">
                            Two Reports. <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] to-[#7C3AED]">Infinite Value.</span>
                        </h2>
                        <p className="text-[16px] md:text-[18px] text-[#475569] max-w-2xl mx-auto font-medium">Whether you&apos;re presenting to your team or your clients, we have the perfect output format.</p>
                    </RevealSection>

                    <RevealSection>
                        <div className="grid md:grid-cols-2 gap-8 items-start mb-12">
                            <div className="p-8 md:p-10 bg-gradient-to-br from-[#F8FAFC] to-white rounded-3xl border border-[#E2E8F0] hover:border-[#2563EB]/30 transition-all group">
                                <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <BarChart3 className="w-7 h-7 text-[#2563EB]" />
                                </div>
                                <h3 className="text-[22px] font-bold text-[#0F172A] mb-3">Internal Analysis Report</h3>
                                <p className="text-[15px] text-[#475569] leading-relaxed mb-6">
                                    Deep-dive data for your team. Identify &quot;low-hanging fruit&quot; keywords and technical bottlenecks to fix. See exactly where to invest your time.
                                </p>
                                <div className="space-y-2.5">
                                    {['Keyword-level position tracking', 'Low-hanging fruit identification', 'Technical audit scores'].map((f, i) => (
                                        <div key={i} className="flex items-center gap-2.5 text-[13px] font-medium text-[#475569]">
                                            <ChevronRight className="w-3.5 h-3.5 text-[#2563EB]" />
                                            {f}
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="p-8 md:p-10 bg-gradient-to-br from-[#F8FAFC] to-white rounded-3xl border border-[#E2E8F0] hover:border-[#10B981]/30 transition-all group">
                                <div className="w-14 h-14 rounded-2xl bg-[#F0FDF4] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                    <FileText className="w-7 h-7 text-[#10B981]" />
                                </div>
                                <h3 className="text-[22px] font-bold text-[#0F172A] mb-3">Client-Ready Report</h3>
                                <p className="text-[15px] text-[#475569] leading-relaxed mb-6">
                                    Professional, high-level summaries that prove your value. Focused on growth, wins, and easy-to-understand metrics your clients will love.
                                </p>
                                <div className="space-y-2.5">
                                    {['Executive growth summaries', 'Visual trend charts', 'White-labeled branding'].map((f, i) => (
                                        <div key={i} className="flex items-center gap-2.5 text-[13px] font-medium text-[#475569]">
                                            <ChevronRight className="w-3.5 h-3.5 text-[#10B981]" />
                                            {f}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </RevealSection>
                    <RevealSection delay={200}>
                        <div className="rounded-3xl overflow-hidden border border-[#E2E8F0] anti-gravity-shadow max-w-5xl mx-auto">
                            <img src={reportingSplitScreen} alt="Internal and Client Reports side by side" className="w-full h-auto" loading="lazy" />
                        </div>
                    </RevealSection>
                </div>
            </section>

            {/* ══════════════════════════════════════════════
                SECTION 5: THE "WHY US" (Micro-SaaS Edge)
               ══════════════════════════════════════════════ */}
            <section className="py-24 md:py-32 bg-[#0F172A] text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#2563EB]/10 blur-[140px] rounded-full translate-x-1/3 -translate-y-1/3"></div>
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#10B981]/10 blur-[120px] rounded-full -translate-x-1/3 translate-y-1/3"></div>

                <div className="max-w-6xl mx-auto px-6 relative z-10">
                    <RevealSection className="text-center mb-20">
                        <h2 className="text-[32px] md:text-[52px] font-black text-white tracking-[-0.03em] mb-6">
                            Enterprise Power.{' '}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#60A5FA] to-[#34D399]">Micro-SaaS Speed.</span>
                        </h2>
                        <p className="text-[17px] text-[#94A3B8] max-w-2xl mx-auto font-medium leading-relaxed">
                            We don&apos;t bloat our tool with features you don&apos;t use. We focus on the data that moves the needle: Rankings, Clusters, and Indexing.
                        </p>
                    </RevealSection>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            { icon: Zap, color: '#2563EB', bg: 'rgba(37, 99, 235, 0.15)', title: 'No Bot Scrapers', desc: 'We don\'t use unreliable proxies. Data comes directly from Google\'s API, ensuring 100% accuracy.' },
                            { icon: ShieldCheck, color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)', title: 'Identity Protected', desc: 'Your GSC data is never shared with third parties. GDPR & CCPA compliant by design.' },
                            { icon: CheckCircle, color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)', title: 'Human-First Design', desc: 'Built for busy founders and marketers, not just SEO specialists. Data you can actually understand.' },
                            { icon: Target, color: '#7C3AED', bg: 'rgba(124, 58, 237, 0.15)', title: 'Unlimited Discovery', desc: 'Don\'t just track 10 keywords. See all 10,000+ keywords your site ranks for automatically.' },
                            { icon: Globe, color: '#0EA5E9', bg: 'rgba(14, 165, 233, 0.15)', title: 'Global Intelligence', desc: 'Track rankings across 150+ countries with real geographic performance insights.' },
                            { icon: BarChart2, color: '#EC4899', bg: 'rgba(236, 72, 153, 0.15)', title: 'Historical Precision', desc: 'Color-coded rank matrix shows daily position changes. Spot volatility before it hits traffic.' }
                        ].map((item, i) => (
                            <RevealSection key={i} delay={i * 80}>
                                <div className="p-8 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group h-full backdrop-blur-sm">
                                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform" style={{ backgroundColor: item.bg }}>
                                        <item.icon className="w-7 h-7" style={{ color: item.color }} />
                                    </div>
                                    <h4 className="text-[19px] font-bold mb-3">{item.title}</h4>
                                    <p className="text-[14px] text-[#94A3B8] leading-relaxed">{item.desc}</p>
                                </div>
                            </RevealSection>
                        ))}
                    </div>

                    {/* Stats bar */}
                    <RevealSection delay={300} className="mt-20">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-12 px-8 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm">
                            {[
                                { value: 1200, suffix: '+', label: 'Active Users' },
                                { value: 50, suffix: 'M+', label: 'Keywords Tracked' },
                                { value: 99, suffix: '.9%', label: 'Uptime SLA' },
                                { value: 150, suffix: '+', label: 'Countries' }
                            ].map((stat, i) => (
                                <div key={i} className="text-center">
                                    <p className="text-[36px] md:text-[44px] font-black bg-clip-text text-transparent bg-gradient-to-br from-white to-white/70">
                                        <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                                    </p>
                                    <p className="text-[13px] font-bold text-[#60A5FA] uppercase tracking-[0.1em] mt-2">{stat.label}</p>
                                </div>
                            ))}
                        </div>
                    </RevealSection>
                </div>
            </section>

            {/* ══════════════════════════════════════════════
                SECTION 6: FOOTER CTA
               ══════════════════════════════════════════════ */}
            <section className="py-24 px-6">
                <RevealSection>
                    <div className="max-w-5xl mx-auto rounded-[3rem] bg-gradient-to-br from-[#2563EB] via-[#1D4ED8] to-[#1E40AF] p-12 md:p-20 text-center relative overflow-hidden">
                        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(white 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
                        {/* Glow effects */}
                        <div className="absolute top-0 left-1/3 w-64 h-64 bg-white/10 blur-[100px] rounded-full"></div>
                        <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-[#10B981]/20 blur-[80px] rounded-full"></div>

                        <h2 className="text-[32px] md:text-[52px] font-black text-white leading-tight mb-6 relative tracking-[-0.02em]">
                            Ready to see what your<br className="hidden md:block" /> Search Console is hiding?
                        </h2>
                        <p className="text-[17px] text-white/80 mb-10 max-w-2xl mx-auto relative font-medium">
                            Join 1,200+ website owners who upgraded their SEO workflow with real Google data.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative">
                            <a href={`${APP_URL}/signup`} className="group px-10 py-5 bg-white text-[#2563EB] text-[16px] font-bold rounded-2xl hover:bg-[#F8FAFC] transition-all shadow-2xl w-full sm:w-auto flex items-center justify-center gap-2">
                                Start Analyzing Now
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </a>
                        </div>
                        <p className="text-white/50 text-[13px] font-medium mt-6 relative">No credit card required · Free 7-day trial</p>
                    </div>
                </RevealSection>
            </section>

            {/* ══════════════════════════════════════════════
                FOOTER
               ══════════════════════════════════════════════ */}
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
                            <li><a href="#features" className="text-[14px] text-[#64748B] hover:text-[#2563EB]">Features</a></li>
                            <li><Link to="/pricing" className="text-[14px] text-[#64748B] hover:text-[#2563EB]">Pricing</Link></li>
                            <li><a href="#workflow" className="text-[14px] text-[#64748B] hover:text-[#2563EB]">How It Works</a></li>
                        </ul>
                    </div>
                    <div>
                        <h5 className="text-[14px] font-bold text-[#0F172A] mb-6">Company</h5>
                        <ul className="space-y-4">
                            <li><a href={`${APP_URL}/login`} className="text-[14px] text-[#64748B] hover:text-[#2563EB]">Login</a></li>
                            <li><a href={`${APP_URL}/signup`} className="text-[14px] text-[#64748B] hover:text-[#2563EB]">Signup</a></li>
                            <li><Link to="/privacy" className="text-[14px] text-[#64748B] hover:text-[#2563EB]">Privacy Policy</Link></li>
                            <li><Link to="/terms" className="text-[14px] text-[#64748B] hover:text-[#2563EB]">Terms of Service</Link></li>
                        </ul>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto px-6 mt-16 pt-8 border-t border-[#E2E8F0] flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-[13px] text-[#94A3B8]">© {new Date().getFullYear()} Rank Tracking SEO TOOL. All rights reserved.</p>
                    <div className="flex items-center gap-6">
                        <Link to="/privacy" className="text-[12px] text-[#94A3B8] hover:text-[#2563EB]">Privacy Policy</Link>
                        <Link to="/terms" className="text-[12px] text-[#94A3B8] hover:text-[#2563EB]">Terms of Service</Link>
                    </div>
                </div>
            </footer>

            {/* Inline Animation Keyframes */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-12px); }
                }
            `}</style>
        </div>
    )
}
