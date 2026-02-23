import { Search, CheckCircle2, AlertTriangle, XCircle, Eye, TrendingUp, Download, MoreHorizontal, FileText, Globe } from 'lucide-react'

/* 5-tier position color */
const getPositionColor = (pos) => {
    if (pos <= 3) return '#059669'
    if (pos <= 10) return '#0284C7'
    if (pos <= 20) return '#D97706'
    if (pos <= 50) return '#EA580C'
    return '#DC2626'
}

export default function Pages({ activePageCategory, handlePageCategory, pageFilter, handlePageFilter, compact, pageAnalytics = [], isLoadingData }) {
    const cp = compact

    if (isLoadingData) {
        return <div className="flex h-64 items-center justify-center text-[#2563EB]"><div className="w-8 h-8 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin"></div></div>
    }

    if (!pageAnalytics || pageAnalytics.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <div className="w-20 h-20 rounded-2xl bg-[#F0F9FF] flex items-center justify-center mb-6">
                    <FileText className="w-10 h-10 text-[#0284C7]" />
                </div>
                <h3 className="text-[20px] font-semibold text-[#111827] mb-2 tracking-[-0.01em]">No Pages Syncing Yet</h3>
                <p className="text-[13px] text-[#4B5563] max-w-sm text-center mb-6 font-normal">Your indexed pages will appear here after the first data synchronization from Google Search Console.</p>
                <button onClick={() => window.location.reload()} className="flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-medium rounded-lg">
                    <Globe className="w-4 h-4" /> Refresh Status
                </button>
            </div>
        )
    }

    const filteredPages = pageAnalytics.filter(p => {
        if (pageFilter === 'All') return true
        if (pageFilter === 'Performing') return parseFloat(p.clicks) > 0
        if (pageFilter === 'Zero Impressions') return parseFloat(p.impressions) === 0
        if (pageFilter === 'Not Indexed') return p.status === 'Not Indexed'
        return true
    })

    const totalImpressionsAll = pageAnalytics.reduce((acc, p) => acc + parseInt(p.impressions.replace(/,/g, '') || 0), 0)
    const zeroImpCount = pageAnalytics.filter(p => parseInt(p.impressions.replace(/,/g, '') || 0) === 0).length
    const notIndexedCount = pageAnalytics.filter(p => p.status !== 'Indexed').length

    return (
        <div>
            {/* Metric Cards */}
            <div className={`grid grid-cols-4 gap-5 ${cp ? 'mb-4' : 'mb-8'}`}>
                {[
                    { label: 'PAGES INDEXED', value: pageAnalytics.length.toLocaleString(), change: '+3.2%', positive: true, icon: CheckCircle2, iconColor: '#059669', iconBg: '#ECFDF5' },
                    { label: '0 IMPRESSIONS', value: zeroImpCount.toLocaleString(), change: 'Check technicals', icon: AlertTriangle, iconColor: '#D97706', iconBg: '#FFFBEB', isWarning: true },
                    { label: 'NOT INDEXED', value: notIndexedCount.toLocaleString(), change: 'Fix errors', icon: XCircle, iconColor: '#DC2626', iconBg: '#FEF2F2', isError: true },
                    { label: 'TOTAL IMP.', value: totalImpressionsAll.toLocaleString(), change: '+8.1%', positive: true, icon: Eye, iconColor: '#0284C7', iconBg: '#F0F9FF' }
                ].map((card, i) => {
                    const CI = card.icon; return (
                        <div key={i} className={`bg-white rounded-xl ${cp ? 'p-4' : 'p-5'} border border-[#E5E7EB] hover:border-[#D1D5DB] transition-all`} style={{ boxShadow: 'var(--shadow-sm)' }}>
                            <div className="flex items-center justify-between mb-3"><span className="kpi-label text-[11px] font-medium tracking-wider text-[#9CA3AF] uppercase">{card.label}</span><div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: card.iconBg }}><CI className="w-4 h-4" style={{ color: card.iconColor }} /></div></div>
                            <span className={`metric-value ${cp ? 'text-[28px]' : 'text-[36px]'} text-[#111827] block`}>{card.value}</span>
                            <p className={`text-[11px] mt-2 font-medium ${card.isWarning ? 'text-[#D97706]' : card.isError ? 'text-[#DC2626]' : card.positive ? 'text-[#059669]' : 'text-[#4B5563]'}`}>{card.positive && !card.isWarning && !card.isError && <TrendingUp className="w-3 h-3 inline mr-0.5" />}<span className="tabular-nums">{card.change}</span></p>
                        </div>)
                })}
            </div>

            {/* Status Filters + Search */}
            <div className={`flex items-center justify-between ${cp ? 'mb-3' : 'mb-4'}`}><div className="flex items-center gap-1">{['All', 'Performing', 'Zero Impressions', 'Not Indexed'].map((f) => (<button key={f} onClick={() => handlePageFilter(f)} className={`px-3 py-1.5 rounded-lg text-[12px] font-medium ${pageFilter === f ? 'bg-[#EFF6FF] text-[#2563EB] border border-[#2563EB]/20' : 'text-[#9CA3AF] hover:bg-[#F9FAFB] border border-transparent'}`}>{f}</button>))}</div><div className="flex items-center gap-3"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" /><input type="text" placeholder="Search pages..." className="pl-9 pr-4 py-2 border border-[#E5E7EB] rounded-lg text-[13px] font-normal placeholder-[#9CA3AF] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/20 w-[260px]" /></div><button className="p-2 border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] hover:border-[#D1D5DB]"><Download className="w-4 h-4 text-[#4B5563]" /></button></div></div>

            {/* Pages Table */}
            <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
                <table className="w-full">
                    <thead><tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                        <th className={`text-left px-4 ${cp ? 'py-2' : 'py-3'} text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider`}>Page</th>
                        <th className={`text-center px-4 ${cp ? 'py-2' : 'py-3'} text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider`}>Status</th>
                        <th className={`text-left px-4 ${cp ? 'py-2' : 'py-3'} text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider`}>Primary Keyword</th>
                        <th className={`text-right px-4 ${cp ? 'py-2' : 'py-3'} text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider`}>Impressions</th>
                        <th className={`text-right px-4 ${cp ? 'py-2' : 'py-3'} text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider`}>Clicks</th>
                        <th className={`text-right px-4 ${cp ? 'py-2' : 'py-3'} text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider`}>CTR</th>
                        <th className={`text-center px-4 ${cp ? 'py-2' : 'py-3'} text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider`}>Avg Pos</th>
                        <th className={`text-right px-4 ${cp ? 'py-2' : 'py-3'} text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider`}>Updated</th>
                        <th className={`px-4 ${cp ? 'py-2' : 'py-3'}`}></th>
                    </tr></thead>
                    <tbody>{filteredPages.map((page, i) => (
                        <tr key={i} className="border-b border-[#F3F4F6] cursor-pointer hover:bg-[#F9FAFB]">
                            <td className={`px-4 ${cp ? 'py-2.5' : 'py-3.5'}`}><p className="text-[13px] font-medium text-[#111827] truncate max-w-[240px]">{page.title}</p><span className="text-[11px] text-[#9CA3AF] font-normal">{page.url}</span></td>
                            <td className={`text-center px-4 ${cp ? 'py-2.5' : 'py-3.5'}`}><span className={`text-[11px] font-medium px-2 py-1 rounded-md ${page.status === 'Indexed' ? 'bg-[#DCFCE7] text-[#14532D]' : page.status === 'Not Indexed' ? 'bg-[#FEE2E2] text-[#991B1B]' : 'bg-[#FEF3C7] text-[#92400E]'}`}>{page.status}</span></td>
                            <td className={`px-4 ${cp ? 'py-2.5' : 'py-3.5'}`}>{page.keyword ? (<div className="flex items-center gap-2"><span className="text-[12px] text-[#111827] font-normal">{page.keyword}</span>{page.keyPos && <span className="font-mono-data text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${getPositionColor(page.keyPos)}15`, color: getPositionColor(page.keyPos) }}>#{page.keyPos}</span>}</div>) : (<span className="text-[11px] text-[#9CA3AF] italic font-normal">No keyword</span>)}</td>
                            <td className={`text-right px-4 ${cp ? 'py-2.5' : 'py-3.5'}`}><span className="table-num font-normal text-[#111827]">{page.impressions}</span></td>
                            <td className={`text-right px-4 ${cp ? 'py-2.5' : 'py-3.5'}`}><span className="table-num font-normal text-[#111827]">{page.clicks}</span></td>
                            <td className={`text-right px-4 ${cp ? 'py-2.5' : 'py-3.5'} table-num font-normal text-[#111827]`}>{page.ctr}</td>
                            <td className={`text-center px-4 ${cp ? 'py-2.5' : 'py-3.5'}`}>{page.avgPos !== '-' ? <span className="font-mono-data text-[13px] font-semibold" style={{ color: getPositionColor(page.avgPos) }}>{page.avgPos}</span> : <span className="text-[11px] text-[#9CA3AF]">—</span>}</td>
                            <td className={`text-right px-4 ${cp ? 'py-2.5' : 'py-3.5'} text-[11px] text-[#9CA3AF] font-normal`}>{page.updated}</td>
                            <td className={`px-4 ${cp ? 'py-2.5' : 'py-3.5'}`}><button className="p-1 hover:bg-[#F9FAFB] rounded"><MoreHorizontal className="w-4 h-4 text-[#9CA3AF]" /></button></td>
                        </tr>))}</tbody>
                </table>
                <div className="flex items-center justify-between px-4 py-3 border-t border-[#E5E7EB]">
                    <span className="text-[11px] text-[#9CA3AF] font-normal tabular-nums">Showing {filteredPages.length} pages</span>
                    <div className="flex items-center gap-1">
                        <button className="px-3 py-1.5 text-[12px] font-medium text-[#4B5563] border border-[#E5E7EB] rounded-md hover:bg-[#F9FAFB] hover:border-[#D1D5DB]">Previous</button>
                        <button className="px-3 py-1.5 text-[12px] font-medium bg-[#2563EB] text-white rounded-md tabular-nums">1</button>
                        <button className="px-3 py-1.5 text-[12px] font-medium text-[#4B5563] border border-[#E5E7EB] rounded-md hover:bg-[#F9FAFB]">Next</button>
                    </div>
                </div>
            </div>
        </div>
    )
}
