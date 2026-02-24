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
import { getUserPlan } from './lib/permissions'

function App() {
  const location = useLocation()
  const activePage = location.pathname.split('/')[1] || 'dashboard'

  const [dateRange, setDateRange] = useState('30d')
  const [kwTab, setKwTab] = useState('tracking')
  const [hasTrackingData, setHasTrackingData] = useState(false)
  const [showAIModal, setShowAIModal] = useState(false)
  const [aiStep, setAiStep] = useState(0)
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
  const hostname = window.location.hostname
  const isProd = hostname.includes('seoranktrackingtool.com')
  const isAppSubdomain = hostname.startsWith('app.')

  const MAIN_DOMAIN = isProd ? 'https://www.seoranktrackingtool.com' : `http://${hostname}:5173`
  const APP_DOMAIN = isProd ? 'https://app.seoranktrackingtool.com' : `http://${hostname}:5173`

  // Redirect Logic: For production only
  useEffect(() => {
    if (!isProd) return

    const path = location.pathname
    const isMarketingPath = path === '/' || path === '/pricing'
    // Everything else including /login, /signup, /dashboard etc is an App path
    const isAppPath = !isMarketingPath

    // 1. If on www (or root) but trying to access an app path -> REDIRECT TO APP
    if (!isAppSubdomain && isAppPath) {
      window.location.href = `${APP_DOMAIN}${path}${location.search}`
    }

    // 2. If on app but trying to access a marketing path (Home/Pricing) -> REDIRECT TO WWW
    if (isAppSubdomain && isMarketingPath) {
      window.location.href = `${MAIN_DOMAIN}${path}${location.search}`
    }
  }, [location.pathname, isAppSubdomain, isProd])

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
      if (isTrial) {
        keywords = await fetchTrialKeywords(site.id);
        // Fallback to database if GSC live fetch returned nothing but DB has tracked keywords
        if (keywords.length === 0) {
          console.log("[App] Trial discovery empty, falling back to DB keywords");
          keywords = await fetchTrackedKeywordsWithHistory(site.id, currentRange);
        }
      } else {
        keywords = await fetchTrackedKeywordsWithHistory(site.id, currentRange);
      }

      const [pagesCount, distribution, pagesAnalytics] = await Promise.all([
        fetchTotalPagesCount(site.id),
        fetchIntentDistribution(site.id),
        fetchPageAnalytics(site.id, currentRange)
      ])

      setTrackedKeywords(keywords)
      setTotalPages(pagesCount)
      setIntentData(distribution)
      setPageAnalytics(pagesAnalytics)
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
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/user/sync-site-data`, {
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

  const handleStartAI = () => { setShowAIModal(true); setAiStep(1); setTimeout(() => { setAiStep(2) }, 2500) }
  const handleConfirmAI = () => { setShowAIModal(false); setAiStep(0); setHasTrackingData(true); setKwTab('tracking') }
  const handleCloseAI = () => { setShowAIModal(false); setAiStep(0) }

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

      {/* Authenticated Application Layout */}
      <Route element={<ProtectedRoute><PricingGate><Layout c={compactMode} setCompactMode={setCompactMode} dateRange={dateRange} handleDateRange={handleDateRange} isGscConnected={isGscConnected} userSites={userSites} activeSite={activeSite} setActiveSite={setActiveSite} isLoadingData={isLoadingData} refreshSites={() => loadUserInfo()} syncSiteData={syncSiteData} session={session} isTrial={isTrial} /></PricingGate></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard CustomTooltip={CustomTooltip} compact={compactMode} dateRange={dateRange} isGscConnected={isGscConnected} handleConnectGSC={handleConnectGSC} isLoadingData={isLoadingData} trackedKeywords={trackedKeywords} userSites={userSites} activeSite={activeSite} totalPages={totalPages} intentData={intentData} syncSiteData={() => syncSiteData(activeSite)} />} />
        <Route path="/keywords" element={
          <Keywords
            kwTab={kwTab} handleKwTab={handleKwTab}
            handleConnectGSC={handleConnectGSC}
            hasTrackingData={hasTrackingData} setHasTrackingData={setHasTrackingData}
            posFilter={posFilter} handlePosFilter={handlePosFilter}
            selectedCategoryFilter={selectedCategoryFilter}
            handleCategoryCardClick={handleCategoryCardClick}
            handleClearCategoryFilter={handleClearCategoryFilter}
            handleStartAI={handleStartAI} handleConfirmAI={handleConfirmAI} handleCloseAI={handleCloseAI}
            showAIModal={showAIModal} aiStep={aiStep}
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
      </Route>

      {/* Public Authentication Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
    </Routes>
  )
}

export default App
