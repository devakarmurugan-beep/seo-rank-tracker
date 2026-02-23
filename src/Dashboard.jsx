import { Key, FileText, TrendingUp, TrendingDown, MousePointerClick, Target, Plus, Clock, UserPlus, ChevronRight, RefreshCw, Trophy, CircleCheck, TriangleAlert, ArrowDown, Globe, BarChart3 } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LabelList } from 'recharts'
import { trendData, distributionData, topGainers, topLosers, intentData } from './data'

/* 5-tier rank badge */
const getPosBadge = (pos) => {
    if (pos <= 3) return 'bg-[#DCFCE7] text-[#14532D]'
    if (pos <= 10) return 'bg-[#D1FAE5] text-[#065F46]'
    if (pos <= 20) return 'bg-[#FEF3C7] text-[#92400E]'
    if (pos <= 50) return 'bg-[#FFEDD5] text-[#9A3412]'
    return 'bg-[#FEE2E2] text-[#991B1B]'
}

const distIcons = { trophy: Trophy, circleCheck: CircleCheck, triangleAlert: TriangleAlert, arrowDown: ArrowDown }

import { supabase } from './lib/supabase'

export default function Dashboard({ CustomTooltip, compact, dateRange = '30d', isGscConnected, handleConnectGSC, isLoadingData, trackedKeywords = [], userSites = [], activeSite, totalPages, intentData: realIntentData, syncSiteData }) {
    const cp = compact

    // ═══ DATE RANGE FILTERING ═══
    // Compute the date window based on the selected range
    const getDaysFromRange = (range) => {
        if (typeof range === 'object' && range.type === 'custom') {
            const s = new Date(range.start)
            const e = new Date(range.end)
            return Math.ceil(Math.abs(e - s) / (1000 * 60 * 60 * 24)) || 1
        }
        switch (range) {
            case '7d': return 7
            case '30d': return 30
            case '90d': return 90
            case '1y': return 365
            case '16m': return 480
            default: return 30
        }
    }
    const days = getDaysFromRange(dateRange)
    const now = new Date()
    const rangeStart = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000))
    const rangeStartStr = rangeStart.toISOString().split('T')[0]

    // Previous period for comparison (same length window, right before current)
    const prevRangeStart = new Date(rangeStart.getTime() - (days * 24 * 60 * 60 * 1000))
    const prevRangeStartStr = prevRangeStart.toISOString().split('T')[0]

    // Filter each keyword's history to the selected date range, then recompute metrics
    const filteredKeywords = trackedKeywords.map(kw => {
        const fullHistory = kw.history || []
        const rangeHistory = fullHistory.filter(h => h.date >= rangeStartStr)
        const prevHistory = fullHistory.filter(h => h.date >= prevRangeStartStr && h.date < rangeStartStr)

        const latest = rangeHistory[0] || fullHistory[0] || {}
        const previous = rangeHistory[1] || {}
        const change = (latest.position && previous.position) ? previous.position - latest.position : 0
        const rangeClicks = rangeHistory.reduce((sum, h) => sum + (h.clicks || 0), 0)
        const rangeImpressions = rangeHistory.reduce((sum, h) => sum + (h.impressions || 0), 0)
        const prevClicks = prevHistory.reduce((sum, h) => sum + (h.clicks || 0), 0)

        return {
            ...kw,
            position: latest.position || '-',
            change,
            clicks: latest.clicks || 0,
            impressions: latest.impressions || 0,
            totalClicks: rangeClicks,
            totalImpressions: rangeImpressions,
            prevClicks,
            ctr: latest.ctr || 0,
            page: latest.page_url || kw.page || '-',
            hasDataInRange: rangeHistory.length > 0
        }
    })

    // Only count keywords that have data in the selected range for position-based metrics
    const kwWithData = filteredKeywords.filter(kw => kw.hasDataInRange)

    // ═══ KPI CALCULATIONS (date-filtered) ═══
    const totalKeywords = trackedKeywords.length

    // Average Position (from latest position of keywords with data in range)
    const rankedKeywords = kwWithData.filter(kw => typeof kw.position === 'number')
    const avgPosition = rankedKeywords.length > 0
        ? (rankedKeywords.reduce((acc, kw) => acc + kw.position, 0) / rankedKeywords.length).toFixed(1)
        : '-'

    // Total clicks within the date range
    const totalClicks = filteredKeywords.reduce((acc, kw) => acc + (kw.totalClicks || 0), 0)

    // Smart Brand Clicks Logic — generate brand variations from the domain
    const generateBrandVariations = (siteName, propertyUrl) => {
        const variations = new Set()
        let domain = (siteName || '').toLowerCase().replace(/\.com$|\.in$|\.org$|\.net$|\.co$/g, '').trim()
        if (!domain && propertyUrl) {
            domain = propertyUrl.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '').replace(/\.com$|\.in$|\.org$|\.net$|\.co$/g, '').trim()
        }
        if (!domain) return []
        variations.add(domain)
        const words = domain.replace(/[-_]/g, ' ').split(/\s+/)
        if (words.length > 1) {
            words.forEach(w => { if (w.length >= 3) variations.add(w) })
            variations.add(words.join(' '))
        }
        if (words.length === 1 && domain.length > 6) {
            const suffixes = ['tvservicecenter', 'servicecenter', 'servicecentre', 'services', 'service', 'online', 'india', 'tech', 'digital', 'agency', 'studio', 'media', 'group', 'solutions', 'hq']
            for (const suffix of suffixes) {
                if (domain.endsWith(suffix) && domain.length > suffix.length + 2) {
                    const brand = domain.slice(0, -suffix.length)
                    variations.add(brand)
                    const spaced = brand.replace(/([a-z])(fuse|tech|web|net|pro|ai|lab|box|hub|bit|app|dev|gen|id|go|my)/gi, '$1 $2')
                    if (spaced !== brand) variations.add(spaced)
                    break
                }
            }
            const shortBrand = domain.match(/^[a-z]{2,8}(?=[aeiou][a-z]*[aeiou])/)?.[0]
            if (shortBrand && shortBrand.length >= 3) variations.add(shortBrand)
        }
        return [...variations].filter(v => v.length >= 3)
    }

    const brandVariations = generateBrandVariations(activeSite?.site_name, activeSite?.property_url)
    const brandClicks = filteredKeywords
        .filter(kw => {
            const k = kw.keyword.toLowerCase()
            return brandVariations.some(brand => k.includes(brand))
        })
        .reduce((acc, kw) => acc + (kw.totalClicks || 0), 0)

    // Previous period brand clicks for comparison
    const prevBrandClicks = filteredKeywords
        .filter(kw => {
            const k = kw.keyword.toLowerCase()
            return brandVariations.some(brand => k.includes(brand))
        })
        .reduce((acc, kw) => acc + (kw.prevClicks || 0), 0)
    const brandChange = prevBrandClicks > 0 ? (((brandClicks - prevBrandClicks) / prevBrandClicks) * 100).toFixed(1) : '0'

    // Compact number formatter
    const formatNum = (n) => {
        if (n === null || n === undefined || n === '-') return n
        const num = typeof n === 'string' ? parseFloat(n) : n
        if (isNaN(num)) return n
        if (num >= 1000000) return (num / 1000000).toFixed(num >= 10000000 ? 0 : 1).replace(/\.0$/, '') + 'M'
        if (num >= 1000) return (num / 1000).toFixed(num >= 10000 ? 1 : 2).replace(/\.0+$/, '') + 'K'
        return num.toLocaleString()
    }

    // Calculate Top Gainers and Losers (date-filtered)
    const sortedByChange = [...filteredKeywords].sort((a, b) => b.change - a.change)
    const topGainersDynamic = sortedByChange.filter(kw => kw.change > 0).slice(0, 5)

    const sortedByLosses = [...filteredKeywords].sort((a, b) => a.change - b.change)
    const topLosersDynamic = sortedByLosses.filter(kw => kw.change < 0).slice(0, 5)

    // Keyword Distribution (date-filtered positions)
    const distribution = [
        { name: 'Rank 1-3', value: 0, color: '#059669', icon: 'trophy', min: 1, max: 3 },
        { name: 'Rank 4-10', value: 0, color: '#0284C7', icon: 'circleCheck', min: 4, max: 10 },
        { name: 'Rank 11-20', value: 0, color: '#D97706', icon: 'triangleAlert', min: 11, max: 20 },
        { name: 'Rank 20+', value: 0, color: '#DC2626', icon: 'arrowDown', min: 21, max: 1000 }
    ]

    filteredKeywords.forEach(kw => {
        const pos = kw.position
        if (typeof pos === 'number') {
            const dist = distribution.find(d => pos >= d.min && pos <= d.max)
            if (dist) dist.value++
        }
    })

    const distIcons = { trophy: Trophy, circleCheck: CircleCheck, triangleAlert: TriangleAlert, arrowDown: ArrowDown }

    if (!isGscConnected) {
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <div className="w-20 h-20 rounded-2xl bg-[#EFF6FF] flex items-center justify-center mb-6">
                    <BarChart3 className="w-10 h-10 text-[#2563EB]" />
                </div>
                <h3 className="text-[20px] font-semibold text-[#111827] mb-2 tracking-[-0.01em]">Connect to Search Console</h3>
                <p className="text-[13px] text-[#4B5563] max-w-sm text-center mb-6 font-normal">Connect your Google Search Console to securely pull your keyword positions, clicks, and impressions. Your data is never shared.</p>
                <button onClick={handleConnectGSC} className="flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-medium rounded-lg shadow-sm transition-colors">
                    <Globe className="w-4 h-4" />Connect Search Console
                </button>
            </div>
        )
    }

    if (isGscConnected && userSites.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <div className="w-20 h-20 rounded-2xl bg-[#ECFDF5] flex items-center justify-center mb-6">
                    <Globe className="w-10 h-10 text-[#059669]" />
                </div>
                <h3 className="text-[20px] font-semibold text-[#111827] mb-2 tracking-[-0.01em]">Google Account Connected</h3>
                <p className="text-[13px] text-[#4B5563] max-w-sm text-center mb-6 font-normal">Your account was successfully connected. Select a property to start tracking.</p>
                <button
                    onClick={() => window.dispatchEvent(new CustomEvent('open-add-project'))}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#059669] hover:bg-[#047857] text-white text-[13px] font-medium rounded-lg shadow-sm transition-colors"
                >
                    <Plus className="w-4 h-4" /> Add Your First Project
                </button>
            </div>
        )
    }

    return (
        <div>
            {/* ═══ PRIMARY: KPI Metric Cards — 36px / 600 ═══ */}
            <div className={`grid grid-cols-4 gap-5 ${cp ? 'mb-4' : 'mb-8'}`}>
                {[
                    { label: 'TRACKED KEYWORDS', value: isLoadingData ? '...' : formatNum(totalKeywords), change: '', positive: true, icon: Key, iconColor: '#2563EB', iconBg: '#EFF6FF' },
                    { label: 'TOTAL PAGES', value: isLoadingData ? '...' : formatNum(totalPages), change: '', positive: true, icon: FileText, iconColor: '#0284C7', iconBg: '#F0F9FF' },
                    { label: 'BRAND CLICKS', value: isLoadingData ? '...' : formatNum(brandClicks), change: brandChange !== '0' ? `${parseFloat(brandChange) > 0 ? '+' : ''}${brandChange}%` : '', positive: parseFloat(brandChange) >= 0, icon: MousePointerClick, iconColor: '#059669', iconBg: '#ECFDF5' },
                    { label: 'AVG POSITION', value: isLoadingData ? '...' : avgPosition, change: '', positive: true, icon: Target, iconColor: '#D97706', iconBg: '#FFFBEB' }
                ].map((card, i) => {
                    const CardIcon = card.icon
                    return (<div key={i} className={`bg-white rounded-xl ${cp ? 'p-4' : 'p-5'} border border-[#E5E7EB] hover:border-[#D1D5DB] transition-all`} style={{ boxShadow: 'var(--shadow-sm)' }}>
                        <div className="flex items-center justify-between mb-3"><span className="kpi-label text-[11px] font-medium tracking-wider text-[#9CA3AF] uppercase">{card.label}</span><div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: card.iconBg }}><CardIcon className="w-4 h-4" style={{ color: card.iconColor }} /></div></div>
                        <div className="flex items-end gap-3">
                            <span className={`metric-value ${cp ? 'text-[28px]' : 'text-[36px]'} text-[#111827]`}>{card.value}</span>
                            {card.change && <span className={`text-[13px] font-medium flex items-center gap-0.5 mb-1 tabular-nums ${card.positive ? 'text-[#059669]' : 'text-[#DC2626]'}`}>{card.positive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}{card.change}</span>}
                        </div>
                        <span className="text-[11px] text-[#9CA3AF] font-normal mt-2 block">{
                            typeof dateRange === 'object' ? `Custom: ${dateRange.start} to ${dateRange.end}` :
                                dateRange === '7d' ? 'Last 7 days' : dateRange === '30d' ? 'Last 30 days' : dateRange === '90d' ? 'Last 90 days' : dateRange === '1y' ? 'Last 12 months' : 'Last 16 months'
                        }</span>
                    </div>)
                })}
            </div>
            {/* ═══ SECONDARY: Intent Chart ═══ */}
            <div className={`grid grid-cols-12 gap-5 ${cp ? '' : ''}`}>
                <div className="col-span-8 space-y-5">
                    <div className={`bg-white rounded-xl ${cp ? 'p-4' : 'p-6'} border border-[#E5E7EB]`} style={{ boxShadow: 'var(--shadow-sm)' }}>
                        <div className="flex items-center justify-between mb-6"><div><h3 className="section-title text-[16px] font-semibold text-[#111827]">Keyword Intent</h3><p className="text-[11px] text-[#9CA3AF] mt-0.5 font-normal">Search intent distribution across tracked keywords</p></div><div className="flex items-center gap-4">{realIntentData.map((item) => (<div key={item.name} className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div><span className="text-[11px] text-[#9CA3AF] font-normal">{item.name}</span></div>))}</div></div>
                        <div className={cp ? 'h-[220px]' : 'h-[280px]'}><ResponsiveContainer width="100%" height="100%"><BarChart data={realIntentData} maxBarSize={48} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF', fontFamily: 'var(--font-ui)' }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11, fill: '#9CA3AF', fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} /><Tooltip content={CustomTooltip} cursor={{ fill: '#F9FAFB' }} /><Bar name="Keywords" dataKey="value" radius={[4, 4, 0, 0]}>{realIntentData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}<LabelList dataKey="value" position="top" fill="#4B5563" fontSize={11} fontWeight={600} fontFamily="var(--font-mono)" offset={8} /></Bar></BarChart></ResponsiveContainer></div>
                    </div>

                    {/* ═══ TERTIARY: Gainers / Losers ═══ */}
                    <div className="grid grid-cols-2 gap-5">
                        <div className={`bg-white rounded-xl ${cp ? 'p-4' : 'p-5'} border border-[#E5E7EB]`} style={{ boxShadow: 'var(--shadow-sm)' }}>
                            <div className="flex items-center gap-2 mb-4"><TrendingUp className="w-4 h-4 text-[#059669]" /><h3 className="section-title text-[14px] font-semibold text-[#111827]">Top Gainers</h3></div>
                            <div className="space-y-0">
                                {isLoadingData ? (
                                    <div className="text-center py-4 text-[#9CA3AF] text-[13px]">Loading data...</div>
                                ) : topGainersDynamic.length === 0 ? (
                                    <div className="text-center py-4 text-[#9CA3AF] text-[13px]">No recent gains</div>
                                ) : topGainersDynamic.map((item, i) => (
                                    <div key={i} className={`flex items-center justify-between ${cp ? 'py-1.5' : 'py-2.5'} border-b border-[#F3F4F6] last:border-0`}>
                                        <div className="flex-1 min-w-0"><p className="text-[13px] font-medium text-[#111827] truncate">{item.keyword}</p><p className="text-[11px] text-[#9CA3AF] font-normal tabular-nums">{item.impressions} vol</p></div>
                                        <div className="flex items-center gap-2 ml-3"><span className={`text-[12px] font-semibold px-2 py-0.5 rounded-md font-mono-data ${getPosBadge(item.position)}`}>#{item.position}</span><span className="text-[12px] font-medium text-[#059669] tabular-nums">+{item.change}</span></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className={`bg-white rounded-xl ${cp ? 'p-4' : 'p-5'} border border-[#E5E7EB]`} style={{ boxShadow: 'var(--shadow-sm)' }}>
                            <div className="flex items-center gap-2 mb-4"><TrendingDown className="w-4 h-4 text-[#DC2626]" /><h3 className="section-title text-[14px] font-semibold text-[#111827]">Top Losers</h3></div>
                            <div className="space-y-0">
                                {isLoadingData ? (
                                    <div className="text-center py-4 text-[#9CA3AF] text-[13px]">Loading data...</div>
                                ) : topLosersDynamic.length === 0 ? (
                                    <div className="text-center py-4 text-[#9CA3AF] text-[13px]">No recent losses</div>
                                ) : topLosersDynamic.map((item, i) => (
                                    <div key={i} className={`flex items-center justify-between ${cp ? 'py-1.5' : 'py-2.5'} border-b border-[#F3F4F6] last:border-0`}>
                                        <div className="flex-1 min-w-0"><p className="text-[13px] font-medium text-[#111827] truncate">{item.keyword}</p><p className="text-[11px] text-[#9CA3AF] font-normal tabular-nums">{item.impressions} vol</p></div>
                                        <div className="flex items-center gap-2 ml-3"><span className={`text-[12px] font-semibold px-2 py-0.5 rounded-md font-mono-data ${getPosBadge(item.position)}`}>#{item.position}</span><span className="text-[12px] font-medium text-[#DC2626] tabular-nums">{item.change}</span></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="col-span-4 space-y-5">
                    <div className={`bg-white rounded-xl ${cp ? 'p-4' : 'p-5'} border border-[#E5E7EB]`} style={{ boxShadow: 'var(--shadow-sm)' }}>
                        <div className="flex items-center justify-between mb-4"><h3 className="section-title text-[14px] font-semibold text-[#111827]">Keyword Distribution</h3><button onClick={syncSiteData} className="p-1 hover:bg-[#F9FAFB] rounded" title="Sync GSC Data"><RefreshCw className={`w-3.5 h-3.5 text-[#9CA3AF] ${isLoadingData ? 'animate-spin' : ''}`} /></button></div>
                        <div className="h-[180px] relative"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={distribution} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" strokeWidth={3} stroke="#FFFFFF">{distribution.map((e, i) => (<Cell key={i} fill={e.color} />))}</Pie><Tooltip /></PieChart></ResponsiveContainer><div className="absolute inset-0 flex items-center justify-center flex-col"><span className="metric-value text-[24px] text-[#111827]">{totalKeywords.toLocaleString()}</span><span className="text-[10px] font-medium text-[#9CA3AF] tracking-wider uppercase">TOTAL</span></div></div>
                        {/* Section Divider */}
                        <div className="border-t border-[#F3F4F6] my-4"></div>
                        <div className="space-y-2">{distribution.map((item, i) => { const pct = totalKeywords > 0 ? Math.round((item.value / totalKeywords) * 100) : 0; const DIcon = distIcons[item.icon]; return (<div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#F9FAFB] cursor-pointer transition-colors"><div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${item.color}12` }}><DIcon className="w-4 h-4" style={{ color: item.color }} /></div><div className="flex-1"><div className="flex items-center justify-between mb-0.5"><span className="text-[12px] font-medium text-[#111827]">{item.name}</span><span className="text-[12px] font-semibold text-[#111827] tabular-nums">{item.value}</span></div><div className="flex items-center gap-2"><div className="flex-1 h-1.5 rounded-full bg-[#F3F4F6]"><div className="h-full rounded-full transition-all" style={{ backgroundColor: item.color, width: `${pct}%` }}></div></div><span className="text-[10px] font-medium text-[#9CA3AF] w-8 text-right tabular-nums">{pct}%</span></div></div></div>) })}</div>
                    </div>
                    <div className={`bg-white rounded-xl ${cp ? 'p-4' : 'p-5'} border border-[#E5E7EB]`} style={{ boxShadow: 'var(--shadow-sm)' }}>
                        <h3 className="section-title text-[14px] font-semibold text-[#111827] mb-4">Quick Actions</h3>
                        {/* Section Divider */}
                        <div className="border-t border-[#F3F4F6] -mt-1 mb-3"></div>
                        <div className="space-y-1">{[{ icon: Plus, label: 'Add New Keyword', color: '#2563EB', bg: '#EFF6FF' }, { icon: FileText, label: 'Create Report', color: '#059669', bg: '#ECFDF5' }, { icon: Clock, label: 'Schedule Report', color: '#0284C7', bg: '#F0F9FF' }, { icon: UserPlus, label: 'Invite Team Member', color: '#D97706', bg: '#FFFBEB' }].map((a, i) => { const AI = a.icon; return (<button key={i} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#F9FAFB] text-left group"><div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: a.bg }}><AI className="w-4 h-4" style={{ color: a.color }} /></div><span className="text-[13px] font-medium text-[#4B5563] group-hover:text-[#2563EB]">{a.label}</span><ChevronRight className="w-3.5 h-3.5 text-[#9CA3AF] ml-auto opacity-0 group-hover:opacity-100 transition-opacity" /></button>) })}</div>
                    </div>
                </div>
            </div >
        </div >
    )
}
