import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { getGSCDateRange } from './lib/dateUtils'
import { useAuth } from './AuthContext'
import { Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Key, FileText, BarChart3, ChevronDown, Globe, Calendar, Bell, BarChart2, Rows3, Rows4 } from 'lucide-react'
import Layout from './Layout'
import Dashboard from './Dashboard'
import Keywords from './Keywords'
import Pages from './Pages'
import ProtectedRoute from './ProtectedRoute'
import Login from './Login'
import Signup from './Signup'
import AuthCallback from './AuthCallback'
import PricingGate from './PricingGate'
import Settings from './Settings'
import AdminDashboard from './AdminDashboard'
import { getUserPlan, isAdmin } from './lib/permissions'

function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const activePage = location.pathname.split('/')[1] || 'dashboard'

  const [dateRange, setDateRange] = useState('28d')
  const [kwTab, setKwTab] = useState('tracking')
  const [hasTrackingData, setHasTrackingData] = useState(false)
  const [posFilter, setPosFilter] = useState('All')
  const [activePageCategory, setActivePageCategory] = useState('All Pages')
  const [pageFilter, setPageFilter] = useState('All')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState(null)
  const [compactMode, setCompactMode] = useState(false)

  // GSC Connection State
  const [isGscConnected, setIsGscConnected] = useState(false)
  const [isCheckingGsc, setIsCheckingGsc] = useState(true)

  // Real Database Data States
  const [userSites, setUserSites] = useState([])
  const [activeSite, setActiveSite] = useState(null)
  const [trackedKeywords, setTrackedKeywords] = useState([])
  const [pageAnalytics, setPageAnalytics] = useState([])
  const [totalPages, setTotalPages] = useState(0)
  const [rankingKeywordsCount, setRankingKeywordsCount] = useState(0)
  const [indexedPagesCount, setIndexedPagesCount] = useState(0)
  const [intentData, setIntentData] = useState([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [deviceFilter, setDeviceFilter] = useState(null)
  const [sitemapStats, setSitemapStats] = useState([])

  const { session } = useAuth()
  const isTrial = getUserPlan(session?.user) === 'free_trial'

  const getApiUrl = () => {
    return import.meta.env.VITE_API_URL || ''
  }

  const loadSiteData = async (site, currentRange = dateRange, silent = false) => {
    if (!site) return
    if (!silent) {
      setIsLoadingData(true)
      setTrackedKeywords([])
      setTotalPages(0)
      setRankingKeywordsCount(0)
      setIndexedPagesCount(0)
      setIntentData([])
      setPageAnalytics([])
    }
    try {
      const { fetchTrackedKeywordsWithHistory, fetchTotalPagesCount, fetchIndexedPagesCount, fetchIntentDistribution, fetchPageAnalytics, fetchTrialKeywords, fetchRankingKeywordsCount, fetchSitemapStats } = await import('./lib/dataFetcher')

      let keywords = [];
      const dbTrackedResult = await fetchTrackedKeywordsWithHistory(site.id, currentRange, deviceFilter);
      const dbTracked = Array.isArray(dbTrackedResult) ? dbTrackedResult : (dbTrackedResult?.data || []);
      if (!Array.isArray(dbTrackedResult) && dbTrackedResult?.error) {
        console.error('[App] Failed to load keywords:', dbTrackedResult.error)
      }

      if (isTrial) {
        // Discovery for trial users (only shown in All Keywords tab)
        const discovered = await fetchTrialKeywords(site.id);
        const trackedMap = new Map(dbTracked.map(k => [k.keyword, k]));

        // Merge: DB Tracked (is_tracked: true) + Discovery (is_tracked: false)
        const merged = [...dbTracked];
        discovered.forEach(tk => {
          if (!trackedMap.has(tk.keyword)) {
            merged.push({ ...tk, is_tracked: false });
          }
        });
        keywords = merged;
      } else {
        keywords = dbTracked;
      }

      const { startDate: rangeStart, endDate: rangeEnd } = getGSCDateRange(currentRange)
      const [pagesCount, indexedCount, distribution, pagesAnalytics, rankingCount, smStats] = await Promise.all([
        fetchTotalPagesCount(site.id),
        fetchIndexedPagesCount(site.id),
        fetchIntentDistribution(site.id),
        fetchPageAnalytics(site.id, currentRange),
        fetchRankingKeywordsCount(site.id, rangeStart, rangeEnd),
        fetchSitemapStats(site.id)
      ])

      let finalPagesCount = pagesCount
      if (finalPagesCount === 0 && keywords.length > 0) {
        const uniquePages = new Set(keywords.map(k => k.page).filter(p => p && p !== '-'))
        finalPagesCount = uniquePages.size
      }

      setTrackedKeywords(keywords)
      const trulyTracked = dbTracked.filter(k => k.is_tracked)
      setHasTrackingData(trulyTracked.length > 0)
      setTotalPages(finalPagesCount)
      setIndexedPagesCount(indexedCount)
      setRankingKeywordsCount(rankingCount)
      setIntentData(distribution)
      setPageAnalytics(pagesAnalytics)
      setSitemapStats(smStats)
    } catch (error) {
      console.error("Error loading site data:", error)
    } finally {
      setIsLoadingData(false)
    }
  }

  const syncSiteData = async (site) => {
    if (!site) return
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    setIsLoadingData(true)
    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/user/sync-site-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ userId: session.user.id, siteId: site.id, brandVariations: [site.site_name] })
      })
      if (!response.ok) throw new Error(`Sync API error ${response.status}`)
      const result = await response.json()
      if (result.success) {
        // Refresh sites to pick up the updated last_synced_at timestamp
        const sites = await loadUserInfo()
        const refreshedSite = sites.find(s => s.id === site.id) || site
        setActiveSite(refreshedSite)
        await loadSiteData(refreshedSite)
      }
    } catch (error) {
      console.error("Error syncing site data:", error)
    } finally {
      setIsLoadingData(false)
    }
  }

  // Lifted to component scope so it can be passed as refreshSites prop
  const loadUserInfo = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user?.id) {
      const { fetchUserSites } = await import('./lib/dataFetcher')
      let sites = await fetchUserSites(session.user.id)
      setUserSites(sites)
      return sites
    }
    return []
  }

  const refreshGSCConnection = async () => {
    try {
      const { checkGSCConnection } = await import('./lib/api')
      const gscStatus = await checkGSCConnection()
      setIsGscConnected(gscStatus.connected)
      return gscStatus.connected
    } catch (error) {
      console.error("Error checking GSC status:", error)
      return false
    }
  }

  useEffect(() => {
    async function initializeAppData() {
      setIsCheckingGsc(true)
      setIsLoadingData(true)

      // Don't waste API calls initializing app data on auth pages
      const isAuthPage = location.pathname === '/login' || location.pathname === '/signup'
      if (isAuthPage) {
        setIsCheckingGsc(false)
        setIsLoadingData(false)
        return
      }

      try {
        const connected = await refreshGSCConnection()

        if (connected) {
          const sites = await loadUserInfo()
          if (sites.length > 0) {
            const savedSiteId = localStorage.getItem('activeSiteId')
            const savedSite = sites.find(s => s.id === savedSiteId)
            const active = savedSite || sites[0]
            setActiveSite(active)
            await loadSiteData(active)
          }
        }
      } catch (error) {
        console.error("Error initializing app data:", error)
      } finally {
        setIsCheckingGsc(false)
        setIsLoadingData(false)
      }
    }
    initializeAppData()
  }, [])

  // Fresh check on every location change to handle OAuth redirects properly
  useEffect(() => {
    if (location.pathname === '/dashboard') {
      refreshGSCConnection()
    }
  }, [location.pathname])

  // Re-load data when active site changes
  useEffect(() => {
    if (activeSite) {
      localStorage.setItem('activeSiteId', activeSite.id)
      loadSiteData(activeSite, dateRange)
    }
  }, [activeSite])

  const handleDateRange = (range) => {
    setDateRange(range)
    if (activeSite) {
      loadSiteData(activeSite, range)
    }
  }

  // Reload keyword data when device filter changes
  useEffect(() => {
    if (activeSite) {
      loadSiteData(activeSite, dateRange, true)
    }
  }, [deviceFilter])
  const handleKwTab = (tab) => { setKwTab(tab); setSelectedCategoryFilter(null) }
  const handlePosFilter = (f) => { setPosFilter(f) }
  const handlePageCategory = (cat) => { setActivePageCategory(cat) }
  const handlePageFilter = (f) => { setPageFilter(f) }



  const handleCategoryCardClick = (catName) => { setSelectedCategoryFilter(catName); setKwTab('tracking') }
  const handleClearCategoryFilter = () => { setSelectedCategoryFilter(null) }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white rounded-lg border border-[#E5E7EB] px-3 py-2" style={{ boxShadow: 'var(--shadow-md)' }}>
          <p className="text-[11px] font-medium text-[#111827] mb-1">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-[11px] tabular-nums font-normal" style={{ color: entry.color }}>{entry.name}: <span className="font-medium">{entry.value}</span></p>
          ))}
        </div>
      )
    }
    return null
  }

  const handleConnectGSC = async () => {
    if (isGscConnected) {
      window.dispatchEvent(new CustomEvent('open-add-project'))
      return
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
        redirectTo: `${window.location.origin}/auth/callback?openAddProject=true`,
      }
    })
    if (error) console.error("Error connecting GSC:", error.message)
  }

  // Wait for GSC check before rendering the main shell
  if (isCheckingGsc) {
    return <div className="flex h-screen items-center justify-center bg-[#F9FAFB] text-[#2563EB]"><div className="w-8 h-8 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin"></div></div>
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Authenticated Application Layout */}
      <Route element={<ProtectedRoute><PricingGate><Layout c={compactMode} setCompactMode={setCompactMode} dateRange={dateRange} handleDateRange={handleDateRange} isGscConnected={isGscConnected} userSites={userSites} activeSite={activeSite} setActiveSite={setActiveSite} isLoadingData={isLoadingData} refreshSites={() => loadUserInfo()} syncSiteData={syncSiteData} session={session} isTrial={isTrial} /></PricingGate></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard CustomTooltip={CustomTooltip} compact={compactMode} dateRange={dateRange} isGscConnected={isGscConnected} handleConnectGSC={handleConnectGSC} isLoadingData={isLoadingData} trackedKeywords={trackedKeywords} userSites={userSites} activeSite={activeSite} totalPages={totalPages} indexedPagesCount={indexedPagesCount} rankingKeywordsCount={rankingKeywordsCount} intentData={intentData} syncSiteData={() => syncSiteData(activeSite)} isTrial={isTrial} />} />
        <Route path="/keywords" element={
          <Keywords
            kwTab={kwTab} handleKwTab={handleKwTab}
            handleConnectGSC={handleConnectGSC}
            hasTrackingData={hasTrackingData} setHasTrackingData={setHasTrackingData}
            posFilter={posFilter} handlePosFilter={handlePosFilter}
            selectedCategoryFilter={selectedCategoryFilter}
            handleCategoryCardClick={handleCategoryCardClick}
            handleClearCategoryFilter={handleClearCategoryFilter}
            compact={compactMode}
            isGscConnected={isGscConnected}
            isLoadingData={isLoadingData}
            trackedKeywords={trackedKeywords}
            activeSite={activeSite}
            dateRange={dateRange}
            refreshData={(silent = false) => activeSite && loadSiteData(activeSite, dateRange, silent)}
            setTrackedKeywords={setTrackedKeywords}
            isTrial={isTrial}
            deviceFilter={deviceFilter}
            setDeviceFilter={setDeviceFilter}
          />
        } />
        <Route path="/pages" element={
          <Pages
            activePageCategory={activePageCategory} handlePageCategory={handlePageCategory}
            pageFilter={pageFilter} handlePageFilter={handlePageFilter}
            compact={compactMode}
            pageAnalytics={pageAnalytics}
            isLoadingData={isLoadingData}
            dateRange={dateRange}
            sitemapStats={sitemapStats}
          />
        } />
        <Route path="/reports" element={
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-20 h-20 rounded-2xl bg-[#EFF6FF] flex items-center justify-center mb-6"><BarChart2 className="w-10 h-10 text-[#2563EB]" /></div>
            <h3 className="text-[20px] font-semibold text-[#111827] mb-2 tracking-[-0.01em]">Reports Coming Soon</h3>
            <p className="text-[13px] text-[#4B5563] max-w-sm text-center font-normal">Automated white-label client reporting is currently under development.</p>
          </div>
        } />
        <Route path="/settings" element={<Settings userSites={userSites} />} />
        {isAdmin(session?.user) && <Route path="/admin" element={<AdminDashboard />} />}
      </Route>

      {/* Public Authentication Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
    </Routes>
  )
}

export default App
