import { useState, useEffect, useRef } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { LayoutDashboard, Key, FileText, BarChart3, ChevronDown, Globe, Calendar, Bell, BarChart2, Rows3, Rows4, Plus, X, Loader2, Settings as SettingsIcon, LogOut } from 'lucide-react'
import { supabase } from './lib/supabase'
import { fetchAvailableGSCSites, addProjectSite } from './lib/api'
import { canAddSite, getSiteLimit } from './lib/permissions'
import { useNavigate } from 'react-router-dom'
import { LogoIcon } from './components/Logo'

export default function Layout({ c, setCompactMode, dateRange, handleDateRange, isGscConnected, userSites, activeSite, setActiveSite, isLoadingData, refreshSites, syncSiteData, session, isTrial }) {
    const location = useLocation()
    const navigate = useNavigate()
    const activePage = location.pathname.split('/')[1] || 'dashboard'
    const [isSiteDropdownOpen, setIsSiteDropdownOpen] = useState(false)
    const [isAddProjectOpen, setIsAddProjectOpen] = useState(false)
    const [availableSites, setAvailableSites] = useState([])
    const [isFetchingSites, setIsFetchingSites] = useState(false)
    const [addingSiteUrl, setAddingSiteUrl] = useState(null)
    const [showDatePicker, setShowDatePicker] = useState(false)
    const [customStart, setCustomStart] = useState('')
    const [customEnd, setCustomEnd] = useState('')
    const datePickerRef = useRef(null)

    useEffect(() => {
        function handleClickOutside(event) {
            if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
                setShowDatePicker(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const hasProjects = userSites && userSites.length > 0

    const loadAvailableSites = async () => {
        setIsFetchingSites(true)
        setIsAddProjectOpen(true)
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.user?.id) {
                const res = await fetchAvailableGSCSites(session.user.id)
                console.log(`[Frontend] GSC Sites Response for ${session.user.id}:`, res)

                if (res.success) {
                    const trackedUrls = (userSites || []).map(s => s.property_url)
                    const filtered = (res.sites || []).filter(s => !trackedUrls.includes(s.property_url))
                    setAvailableSites(filtered)
                } else {
                    console.error('Failed to fetch available sites:', res.error)
                    alert(`Error fetching properties: ${res.error || 'Unknown error'}`)
                }
            }
        } catch (err) {
            console.error('Error in loadAvailableSites:', err)
            alert('An unexpected error occurred while fetching properties.')
        } finally {
            setIsFetchingSites(false)
        }
    }

    useEffect(() => {
        const handleOpenExternal = () => loadAvailableSites()
        window.addEventListener('open-add-project', handleOpenExternal)
        return () => window.removeEventListener('open-add-project', handleOpenExternal)
    }, [])

    // Auto-open Add Project modal after OAuth callback redirect
    useEffect(() => {
        const params = new URLSearchParams(location.search)
        const justConnected = localStorage.getItem('gsc_just_connected') === 'true'

        if ((params.get('openAddProject') === 'true' || justConnected) && isGscConnected) {
            localStorage.removeItem('gsc_just_connected')
            loadAvailableSites()
            window.history.replaceState({}, '', location.pathname)
        }
    }, [isGscConnected, location.search])

    const handleAddSite = async (site) => {
        setAddingSiteUrl(site.property_url)
        try {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session?.user?.id) {
                console.error('No active session found')
                setAddingSiteUrl(null)
                return
            }

            if (!canAddSite(session.user, userSites.length)) {
                alert(`Your plan is limited to ${getSiteLimit(session.user)} website(s). Please upgrade to add more.`)
                setAddingSiteUrl(null)
                setIsAddProjectOpen(false)
                navigate('/settings')
                return
            }

            console.log('[Track] Adding site:', site.property_url)
            const res = await addProjectSite(session.user.id, site.property_url, site.site_name)
            console.log('[Track] Add site response:', res)

            if (res.success) {
                // Refresh the site list in App
                console.log('[Track] Refreshing site list...')
                const newSites = await refreshSites()
                console.log('[Track] Sites after refresh:', newSites)

                // Find the new site and sync it
                const added = (newSites || []).find(s => s.property_url === site.property_url)
                if (added) {
                    console.log('[Track] Setting active site and syncing:', added.id)
                    setActiveSite(added)
                    await syncSiteData(added)
                    console.log('[Track] Sync complete!')
                } else {
                    console.warn('[Track] Could not find the added site in refreshed list')
                }
                setIsAddProjectOpen(false)
            } else {
                console.error('[Track] Failed to add site:', res.error || res.details)
                alert(`Failed to add site: ${res.error || 'Unknown error'}`)
            }
        } catch (err) {
            console.error('[Track] Error in handleAddSite:', err)
            alert(`Error adding site: ${err.message}`)
        } finally {
            setAddingSiteUrl(null)
        }
    }

    const handleConnectGSC = async (force = false) => {
        if (isGscConnected && !force) {
            loadAvailableSites()
            return
        }

        // If forcing re-auth, sign out first to ensure a completely fresh session & token capture
        if (force) {
            console.log('[Auth] Forcing re-authentication, clearing local session...')
            await supabase.auth.signOut()
        }

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                scopes: 'openid email profile https://www.googleapis.com/auth/webmasters.readonly',
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                    include_granted_scopes: 'true'
                },
                redirectTo: `${window.location.origin}/auth/callback`,
            }
        })
        if (error) console.error("Error connecting GSC:", error.message)
    }

    return (
        <div className={`flex h-screen bg-[#F8FAFC] overflow-hidden ${c ? 'compact' : ''}`} style={{ fontFamily: "var(--font-ui)" }}>
            {/* Sidebar */}
            <div className="w-[260px] bg-[#0F172A] flex flex-col flex-shrink-0 shadow-2xl z-20">
                <div className="p-6 border-b border-white/5 bg-[#0F172A]">
                    <Link to="/" className="flex items-center gap-3 group">
                        <LogoIcon className="w-9 h-9" color="white" />
                        <div>
                            <div className="flex items-center gap-2">
                                <div className="text-white text-[15px] font-bold tracking-tight">Rank Tracking</div>
                                {isTrial && <span className="text-[9px] bg-[#2563EB] text-white px-1.5 py-0.5 rounded font-bold">TRIAL</span>}
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="text-[#64748B] text-[10px] font-bold tracking-[0.1em] uppercase">
                                    SEO TOOL
                                </div>
                                {!isTrial && (
                                    <div className="text-[9px] text-[#2563EB] font-bold ml-2">
                                        {(session?.user?.user_metadata?.plan?.split('_')[1] || 'Starter').toUpperCase()}
                                    </div>
                                )}
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Dynamic Site Selector */}
                <div className="relative mx-3 mt-4">
                    {hasProjects ? (
                        <>
                            <button
                                onClick={() => setIsSiteDropdownOpen(!isSiteDropdownOpen)}
                                disabled={isLoadingData}
                                className={`w-full p-3.5 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between transition-all ${isLoadingData ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-white/10 hover:border-white/20'}`}
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#059669] to-[#10B981] flex items-center justify-center text-white text-[12px] font-bold shadow-sm">
                                        {activeSite ? activeSite.site_name?.charAt(0).toUpperCase() || 'S' : 'S'}
                                    </div>
                                    <span className="text-white text-[14px] font-semibold truncate max-w-[130px]">
                                        {isLoadingData ? 'Loading...' : (activeSite?.site_name || 'Select Site')}
                                    </span>
                                </div>
                                <ChevronDown className={`w-4 h-4 text-[#64748B] transition-transform duration-200 ${isSiteDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isSiteDropdownOpen && (
                                <div className="absolute top-full left-0 mt-1 w-full bg-[#1E293B] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
                                    {userSites.map(site => (
                                        <button
                                            key={site.id}
                                            onClick={() => { setActiveSite(site); setIsSiteDropdownOpen(false) }}
                                            className={`w-full text-left px-4 py-2.5 text-[13px] hover:bg-white/5 transition-colors border-b border-white/5 truncate ${activeSite?.id === site.id ? 'text-white bg-white/5' : 'text-[#94A3B8] hover:text-white'}`}
                                            title={site.property_url}
                                        >
                                            {site.site_name || site.property_url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => { setIsSiteDropdownOpen(false); loadAvailableSites() }}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-3 text-[13px] text-[#38BDF8] hover:bg-[#38BDF8]/10 transition-colors font-medium cursor-pointer"
                                    >
                                        <Plus className="w-4 h-4" /> Add Project
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <button
                            onClick={handleConnectGSC}
                            className="w-full p-3 bg-[#2563EB]/20 hover:bg-[#2563EB]/30 border border-[#2563EB]/30 rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                        >
                            <Globe className="w-4 h-4 text-[#38BDF8]" />
                            <span className="text-[#38BDF8] text-[13px] font-medium">Connect Search Console</span>
                        </button>
                    )}
                </div>
                <nav className="flex-1 px-3 mt-6 space-y-1">
                    {[{ id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' }, { id: 'keywords', icon: Key, label: 'Keywords' }, { id: 'pages', icon: FileText, label: 'Pages' }, { id: 'reports', icon: BarChart2, label: 'Reports' }, { id: 'settings', icon: SettingsIcon, label: 'Settings' }].map((item) => {
                        const Icon = item.icon
                        const isActive = activePage === item.id
                        return (<Link to={`/${item.id}`} key={item.id} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] font-medium ${isActive ? 'bg-[#2563EB] text-white shadow-[0_2px_8px_rgba(37,99,235,0.3)]' : 'text-[#94A3B8] hover:bg-white/5 hover:text-white'}`}><Icon className="w-[18px] h-[18px]" />{item.label}</Link>)
                    })}
                </nav>
                <div className="mx-5 my-1 border-t border-white/5"></div>
                <div className="p-4 mx-3 mb-3 bg-white/5 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-medium text-[#94A3B8]">Usage Limit</span>
                        {isTrial && <span className="text-[9px] bg-[#2563EB] text-white px-1.5 py-0.5 rounded font-bold">TRIAL</span>}
                    </div>
                    {isTrial ? (
                        <>
                            <div className="w-full h-1.5 bg-white/10 rounded-full my-2"><div className="h-full bg-[#2563EB] rounded-full" style={{ width: '100%' }}></div></div>
                            <div className="text-[11px] font-normal text-[#64748B] mb-3">Unlimited Keywords</div>
                        </>
                    ) : (
                        <>
                            <div className="w-full h-1.5 bg-white/10 rounded-full my-2"><div className="h-full bg-[#059669] rounded-full" style={{ width: '35%' }}></div></div>
                            <div className="text-[11px] font-normal text-[#64748B] mb-3">Unlimited Keywords</div>
                        </>
                    )}
                    <button
                        onClick={() => navigate('/settings')}
                        className="w-full py-2 bg-[#1E293B] hover:bg-[#334155] text-white text-[12px] font-semibold rounded-lg transition-colors cursor-pointer border border-white/5"
                    >
                        {isTrial ? 'Upgrade Now' : 'Manage Plans'}
                    </button>
                </div>
                <div className="px-3 pb-3">
                    <button
                        onClick={() => { supabase.auth.signOut(); navigate('/login') }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-[#94A3B8] hover:bg-[#DC2626]/10 hover:text-[#EF4444] transition-all cursor-pointer"
                    >
                        <LogOut className="w-4 h-4" />
                        Log Out
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden bg-[#F8FAFC]">
                {/* Top Bar */}
                <div className="h-16 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-8 flex-shrink-0 z-10 shadow-sm">
                    <h1 className="text-[18px] font-bold text-[#111827] tracking-tight capitalize">{activePage === 'pages' ? 'Page Tracking' : activePage}</h1>
                    <div className="flex items-center gap-3">
                        {/* Compact Mode Toggle */}
                        <button onClick={() => setCompactMode(!c)} className={`p-2 rounded-lg border transition-colors ${c ? 'bg-[#EFF6FF] border-[#2563EB]/30 text-[#2563EB]' : 'border-[#E5E7EB] text-[#9CA3AF] hover:text-[#4B5563] hover:border-[#D1D5DB]'}`} title={c ? 'Normal density' : 'Compact density'}>
                            {c ? <Rows4 className="w-4 h-4" /> : <Rows3 className="w-4 h-4" />}
                        </button>
                        {/* Divider */}
                        <div className="w-px h-6 bg-[#E5E7EB]"></div>
                        <div className="flex items-center bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
                            {['7d', '30d', '90d', '1y', '16m'].map((r) => (<button key={r} onClick={() => handleDateRange(r)} className={`px-3 py-2 text-[12px] font-medium tabular-nums ${dateRange === r ? 'bg-[#2563EB] text-white' : 'text-[#4B5563] hover:bg-[#F9FAFB]'}`}>{r}</button>))}
                        </div>
                        {(() => {
                            let start, end;
                            if (typeof dateRange === 'object' && dateRange.type === 'custom') {
                                start = new Date(dateRange.start)
                                end = new Date(dateRange.end)
                            } else {
                                const rangeDays = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : dateRange === '1y' ? 365 : 480
                                end = new Date()
                                start = new Date(end.getTime() - (rangeDays * 24 * 60 * 60 * 1000))
                            }
                            const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            return (
                                <div className="relative" ref={datePickerRef}>
                                    <div onClick={() => setShowDatePicker(!showDatePicker)} className="flex items-center gap-2 px-3 py-2 border border-[#E5E7EB] rounded-lg cursor-pointer hover:border-[#D1D5DB] bg-white transition-colors">
                                        <Calendar className="w-4 h-4 text-[#4B5563]" /><span className="text-[13px] font-normal text-[#111827]">{fmt(start)} - {fmt(end)}</span><ChevronDown className={`w-3 h-3 text-[#9CA3AF] transition-transform duration-200 ${showDatePicker ? 'rotate-180' : ''}`} />
                                    </div>

                                    {showDatePicker && (
                                        <div className="absolute top-12 right-0 bg-white border border-[#E5E7EB] rounded-xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] p-4 z-50 w-[280px]">
                                            <h4 className="text-[13px] font-semibold text-[#111827] mb-4">Custom Date Range</h4>
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-[11px] font-medium text-[#6B7280] mb-1.5 uppercase tracking-wider">Start Date</label>
                                                    <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="w-full text-[13px] p-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none text-[#111827] bg-[#F9FAFB] hover:bg-white transition-colors" />
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-medium text-[#6B7280] mb-1.5 uppercase tracking-wider">End Date</label>
                                                    <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="w-full text-[13px] p-2 border border-[#E5E7EB] rounded-lg focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] outline-none text-[#111827] bg-[#F9FAFB] hover:bg-white transition-colors" />
                                                </div>
                                                <button onClick={() => {
                                                    if (customStart && customEnd) {
                                                        const s = new Date(customStart)
                                                        const e = new Date(customEnd)
                                                        if (e >= s) {
                                                            handleDateRange({ type: 'custom', start: customStart, end: customEnd })
                                                            setShowDatePicker(false)
                                                        } else {
                                                            alert("End date mapping must be after start date mapping.")
                                                        }
                                                    }
                                                }} disabled={!customStart || !customEnd} className="w-full bg-[#2563EB] text-white py-2 rounded-lg text-[13px] font-medium hover:bg-[#1D4ED8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-2">Apply Range</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })()}
                        {/* Only show Connect GSC button when no projects are connected */}
                        {!hasProjects && (
                            <button onClick={handleConnectGSC} className="flex items-center gap-2 px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-medium rounded-lg"><Globe className="w-4 h-4" />Connect GSC</button>
                        )}
                        <button className="relative p-2 hover:bg-[#F9FAFB] rounded-lg"><Bell className="w-5 h-5 text-[#4B5563]" /><span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#DC2626] rounded-full"></span></button>
                        <div className="w-8 h-8 rounded-full bg-[#2563EB] flex items-center justify-center text-white text-[11px] font-semibold cursor-pointer">JD</div>
                    </div>
                </div>

                {/* Dynamic Page Content */}
                <div className={`flex-1 overflow-y-auto ${c ? 'p-4' : 'p-6'}`}>
                    <Outlet />
                </div>
            </div>
            {/* Add Project Modal */}
            {isAddProjectOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0F172A]/80 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="p-6 border-b border-[#E5E7EB] flex items-center justify-between bg-white relative z-10">
                            <div>
                                <h2 className="text-[18px] font-semibold text-[#111827] tracking-tight mb-1">Add a Project</h2>
                                <p className="text-[14px] text-[#64748B]">Select a verified property from your Search Console to start tracking.</p>
                            </div>
                            <button onClick={() => setIsAddProjectOpen(false)} className="w-8 h-8 rounded-full bg-[#F1F5F9] hover:bg-[#E2E8F0] flex items-center justify-center text-[#64748B] transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 bg-[#F9FAFB]">
                            {isFetchingSites ? (
                                <div className="py-12 flex flex-col items-center justify-center text-[#64748B]">
                                    <Loader2 className="w-8 h-8 text-[#2563EB] animate-spin mb-4" />
                                    <p className="text-[14px] font-medium">Fetching your verified Google properties...</p>
                                </div>
                            ) : availableSites.length > 0 ? (
                                <div className="space-y-3">
                                    {availableSites.map(site => (
                                        <div key={site.property_url} className="bg-white border border-[#E5E7EB] rounded-xl p-4 flex items-center justify-between hover:border-[#CBD5E1] transition-colors shadow-sm">
                                            <div className="flex items-center gap-4 truncate mr-4">
                                                <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center flex-shrink-0">
                                                    <Globe className="w-5 h-5" />
                                                </div>
                                                <div className="truncate">
                                                    <div className="text-[14px] font-medium text-[#111827] truncate mb-0.5">{site.site_name}</div>
                                                    <div className="text-[12px] text-[#64748B] truncate">{site.property_url}</div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleAddSite(site)}
                                                disabled={addingSiteUrl !== null}
                                                className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg text-[13px] font-semibold transition-colors disabled:opacity-50 flex items-center gap-2 flex-shrink-0"
                                            >
                                                {addingSiteUrl === site.property_url ? <><Loader2 className="w-4 h-4 animate-spin" /> Adding...</> : 'Track'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-12 text-center">
                                    <div className="w-16 h-16 bg-[#F1F5F9] rounded-2xl flex items-center justify-center mx-auto mb-4">
                                        <Globe className="w-8 h-8 text-[#94A3B8] opacity-50" />
                                    </div>
                                    {hasProjects ? (
                                        <>
                                            <h3 className="text-[16px] font-semibold text-[#111827] mb-2">All Properties Tracked</h3>
                                            <p className="text-[14px] text-[#64748B] max-w-xs mx-auto mb-6">You're already tracking all available properties from your Google account.</p>
                                        </>
                                    ) : (
                                        <>
                                            <h3 className="text-[16px] font-semibold text-[#111827] mb-2">No Properties Found</h3>
                                            <p className="text-[14px] text-[#64748B] max-w-xs mx-auto mb-6">We couldn't find any verified websites in your connected Google account.</p>
                                        </>
                                    )}
                                    <button
                                        onClick={() => handleConnectGSC(true)}
                                        className="text-[13px] font-medium text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1 mx-auto cursor-pointer hover:underline relative z-[60]"
                                    >
                                        <Key className="w-3 h-3" /> Re-authorize Google Permissions
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
