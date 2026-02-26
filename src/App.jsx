import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { useAuth } from './AuthContext'
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom'
import { LayoutDashboard, Key, FileText, BarChart3, ChevronDown, Globe, Calendar, Bell, BarChart2, Rows3, Rows4 } from 'lucide-react'
import Layout from './Layout'
import Dashboard from './Dashboard'
import Keywords from './Keywords'
import Pages from './Pages'
import ProtectedRoute from './ProtectedRoute'
import Login from './Login'
import Signup from './Signup'
import AuthCallback from './AuthCallback'
import Home from './Home'
import Pricing from './Pricing'
import PricingGate from './PricingGate'
import Privacy from './Privacy'
import Terms from './Terms'
import Settings from './Settings'
import { getUserPlan } from './lib/permissions'

function App() {
  const location = useLocation()
  const activePage = location.pathname.split('/')[1] || 'dashboard'

  const [dateRange, setDateRange] = useState('30d')
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
  const [intentData, setIntentData] = useState([])
  const [isLoadingData, setIsLoadingData] = useState(true)

  const { session } = useAuth()
  const isTrial = getUserPlan(session?.user) === 'free_trial'

  // Subdomain Detection Logic
  const hostname = window.location.hostname.toLowerCase()
  const isProd = hostname.includes('seoranktrackingtool.com')
  const isAppSubdomain = hostname.startsWith('app.')

  const MAIN_DOMAIN = isProd ? 'https://www.seoranktrackingtool.com' : `http://${hostname}:5173`
  const APP_DOMAIN = isProd ? 'https://app.seoranktrackingtool.com' : `http://${hostname}:5173`

  // Redirect Logic: For production only
  useEffect(() => {
    if (!isProd) return

    const path = location.pathname

    // 1. If on www: 
    if (!isAppSubdomain) {
      // Allow only /, /pricing, /privacy, and /terms.
      const isMarketingPath = path === '/' || path.toLowerCase() === '/pricing' || path.toLowerCase() === '/privacy' || path.toLowerCase() === '/terms'

      // Force any app path (dashboard, keywords, etc.) to the APP subdomain
      if (!isMarketingPath) {
        window.location.replace(`${APP_DOMAIN}${path}${location.search}`)
        return
      }

      // If user is logged in and lands on root (www) -> Redirect to App Dashboard
      // But allow /pricing to STAY on www.
      if (session && path === '/') {
        window.location.replace(`${APP_DOMAIN}/dashboard`)
        return
      }
    }

    // 2. If on app: Redirect / to /dashboard.
    if (isAppSubdomain) {
      if (path === '/' || path === '/home') {
        window.location.replace(`${APP_DOMAIN}/dashboard`)
      } else if (path.toLowerCase() === '/pricing') {
        // Logged in users on app subdomain should see /settings instead of /pricing
        navigate('/settings')
      }
    }
  }, [location.pathname, isAppSubdomain, isProd, !!session])

  const getApiUrl = () => {
    let apiUrl = import.meta.env.VITE_API_URL || ''
    // If we're in production but the URL is localhost or empty, use the current origin
    const isProdDomain = window.location.hostname.includes('seoranktrackingtool.com')
    if (isProdDomain && (apiUrl.includes('localhost') || !apiUrl)) {
      return window.location.origin
    }
    return apiUrl || 'http://localhost:3001'
  }

  const loadSiteData = async (site, currentRange = dateRange) => {
    if (!site) return
    setIsLoadingData(true)
    setTrackedKeywords([])
    setTotalPages(0)
    setIntentData([])
    setPageAnalytics([])
    try {
      const { fetchTrackedKeywordsWithHistory, fetchTotalPagesCount, fetchIntentDistribution, fetchPageAnalytics, fetchTrialKeywords } = await import('./lib/dataFetcher')

      let keywords = [];
      const dbTracked = await fetchTrackedKeywordsWithHistory(site.id, currentRange);

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

      const [pagesCount, distribution, pagesAnalytics] = await Promise.all([
        fetchTotalPagesCount(site.id),
        fetchIntentDistribution(site.id),
        fetchPageAnalytics(site.id, currentRange)
      ])

      let finalPagesCount = pagesCount
      if (finalPagesCount === 0 && keywords.length > 0) {
        const uniquePages = new Set(keywords.map(k => k.page).filter(p => p && p !== '-'))
        finalPagesCount = uniquePages.size
      }

      setTrackedKeywords(keywords)
      setHasTrackingData(dbTracked.length > 0)
      setTotalPages(finalPagesCount)
      setIntentData(distribution)
      setPageAnalytics(pagesAnalytics)

      // Background sync for tracked keywords in chunks to avoid timeouts
      const trackedIds = dbTracked.map(k => k.id)
      if (trackedIds.length > 0) {
        const apiUrl = getApiUrl()
        const CHUNK_SIZE = 50

        const syncChunks = async () => {
          for (let i = 0; i < trackedIds.length; i += CHUNK_SIZE) {
            const chunk = trackedIds.slice(i, i + CHUNK_SIZE)
            try {
              const res = await fetch(`${apiUrl}/api/keywords/sync-specific`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ siteId: site.id, keywordIds: chunk })
              })
              const data = await res.json()
              if (data.success) {
                // Silently refresh data after each chunk or after all chunks
                const freshKws = await fetchTrackedKeywordsWithHistory(site.id, currentRange)
                if (isTrial) {
                  const freshTrackedMap = new Map(freshKws.map(k => [k.keyword, k]));
                  const merged = [...freshKws];
                  keywords.forEach(tk => {
                    if (!tk.is_tracked && !freshTrackedMap.has(tk.keyword)) {
                      merged.push(tk);
                    }
                  });
                  setTrackedKeywords(merged);
                } else {
                  setTrackedKeywords(freshKws);
                }
              }
            } catch (err) {
              console.error(`Background sync chunk ${i / CHUNK_SIZE} failed:`, err)
            }
          }
        }
        syncChunks()
      }
    } catch (error) {
      console.error("Error loading site data:", error)
    } finally {
      setIsLoadingData(false)
    }
  }

  const syncSiteData = async (site) => {
    if (!site) return
    if (isTrial) {
      console.log("[App] Skipping database sync for Trial user.")
      return
    }
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) return

    try {
      const apiUrl = getApiUrl()
      const response = await fetch(`${apiUrl}/api/user/sync-site-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.user.id, siteId: site.id, brandVariations: [site.site_name] })
      })
      const result = await response.json()
      if (result.success) {
        await loadSiteData(site)
      }
    } catch (error) {
      console.error("Error syncing site data:", error)
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

      // Don't waste API calls initializing app data on marketing pages
      const isMarketingPage = !isAppSubdomain && (location.pathname === '/' || location.pathname === '/pricing')
      if (isMarketingPage) {
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
        redirectTo: `${APP_DOMAIN}/auth/callback?openAddProject=true`,
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
      {/* Public Routes */}
      <Route path="/" element={<Home />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />

      {/* Authenticated Application Layout */}
      <Route element={<ProtectedRoute><PricingGate><Layout c={compactMode} setCompactMode={setCompactMode} dateRange={dateRange} handleDateRange={handleDateRange} isGscConnected={isGscConnected} userSites={userSites} activeSite={activeSite} setActiveSite={setActiveSite} isLoadingData={isLoadingData} refreshSites={() => loadUserInfo()} syncSiteData={syncSiteData} session={session} isTrial={isTrial} /></PricingGate></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard CustomTooltip={CustomTooltip} compact={compactMode} dateRange={dateRange} isGscConnected={isGscConnected} handleConnectGSC={handleConnectGSC} isLoadingData={isLoadingData} trackedKeywords={trackedKeywords} userSites={userSites} activeSite={activeSite} totalPages={totalPages} intentData={intentData} syncSiteData={() => syncSiteData(activeSite)} isTrial={isTrial} />} />
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
            refreshData={() => activeSite && loadSiteData(activeSite)}
            isTrial={isTrial}
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
      </Route>

      {/* Public Authentication Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
    </Routes>
  )
}

export default App
