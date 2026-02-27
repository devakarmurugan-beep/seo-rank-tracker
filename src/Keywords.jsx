import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Info, Plus, Sparkles, Target, Tag, X, Check, MoreHorizontal, ChevronRight, Globe, BarChart3, Upload, Loader2, Palette, FolderOpen, Trash2, ShoppingBag, ChevronDown, MapPin, ArrowLeft, ChevronUp, ArrowUpDown } from 'lucide-react'
import { allGSCKeywords, trackingKeywords, categoryCards } from './data'
import { supabase } from './lib/supabase'



/* 5-tier position color */
const getPositionColor = (pos) => {
    if (pos <= 3) return '#059669'
    if (pos <= 10) return '#0284C7'
    if (pos <= 20) return '#D97706'
    if (pos <= 50) return '#EA580C'
    return '#DC2626'
}

const getApiUrl = () => {
    let apiUrl = import.meta.env.VITE_API_URL || ''
    // If we're in production but the URL is localhost or empty, use the current origin
    const isProdDomain = window.location.hostname.includes('seoranktrackingtool.com')
    if (isProdDomain && (apiUrl.includes('localhost') || !apiUrl)) {
        return window.location.origin
    }
    return apiUrl || 'http://localhost:3001'
}

/* 5-tier bucket badge */
const getBucketStyle = (bucket) => {
    if (bucket === 'Top 3') return 'bg-[#DCFCE7] text-[#14532D]'
    if (bucket === '4-10') return 'bg-[#D1FAE5] text-[#065F46]'
    if (bucket === '11-20') return 'bg-[#FEF3C7] text-[#92400E]'
    return 'bg-[#FEE2E2] text-[#991B1B]'
}

const getMatrixCellColor = (pos) => {
    if (!pos || pos === '-') return { bg: '#F9FAFB', text: '#9CA3AF' }
    if (pos === 1) return { bg: '#BBF7D0', text: '#166534' } // very bright green
    if (pos <= 3) return { bg: '#DCFCE7', text: '#166534' } // light green
    if (pos <= 10) return { bg: '#FEF08A', text: '#854D0E' } // yellow
    if (pos <= 20) return { bg: '#FED7AA', text: '#9A3412' } // orange
    if (pos <= 50) return { bg: '#FECACA', text: '#991B1B' } // light red
    return { bg: '#FCA5A5', text: '#7F1D1D' } // deeper red
}

const renderSparkline = (data, color) => {
    const max = Math.max(...data)
    const min = Math.min(...data)
    const range = max - min || 1
    const pts = data.map((v, i) => `${(i / (data.length - 1)) * 72},${28 - ((v - min) / range) * 24}`).join(' ')
    return (
        <svg width="72" height="28" viewBox="0 0 72 28" className="inline-block">
            <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

const Pagination = ({ totalItems, currentPage, onPageChange, itemsPerPage, setItemsPerPage }) => {
    const safeTotalItems = totalItems || 0
    const totalPages = Math.ceil(safeTotalItems / itemsPerPage)
    if (totalPages <= 1 && safeTotalItems <= 25) return null

    return (
        <div className="px-4 py-3 flex items-center justify-between bg-white border-t border-[#E5E7EB]">
            <div className="flex items-center gap-4">
                <span className="text-[12px] text-[#9CA3AF]">
                    Showing <span className="font-medium text-[#4B5563]">{Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)}</span> to{' '}
                    <span className="font-medium text-[#4B5563]">{Math.min(currentPage * itemsPerPage, totalItems)}</span> of{' '}
                    <span className="font-medium text-[#4B5563]">{totalItems}</span> keywords
                </span>
                <div className="flex items-center gap-2 border-l border-[#E5E7EB] pl-4">
                    <span className="text-[11px] text-[#9CA3AF] uppercase font-bold tracking-wider">Per Page</span>
                    <select
                        value={itemsPerPage}
                        onChange={(e) => {
                            setItemsPerPage(Number(e.target.value))
                            onPageChange(1)
                        }}
                        className="text-[12px] font-medium text-[#4B5563] bg-transparent focus:outline-none cursor-pointer"
                    >
                        {[25, 50, 100, 250].map(val => (
                            <option key={val} value={val}>{val}</option>
                        ))}
                    </select>
                </div>
            </div>
            <div className="flex items-center gap-1">
                <button
                    disabled={currentPage === 1}
                    onClick={() => onPageChange(currentPage - 1)}
                    className="p-1 px-2 text-[12px] font-medium text-[#4B5563] hover:bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                    Prev
                </button>
                <div className="flex items-center px-2">
                    <span className="text-[12px] text-[#9CA3AF]">Page <span className="font-medium text-[#4B5563]">{currentPage}</span> of {totalPages}</span>
                </div>
                <button
                    disabled={currentPage === totalPages}
                    onClick={() => onPageChange(currentPage + 1)}
                    className="p-1 px-2 text-[12px] font-medium text-[#4B5563] hover:bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                    Next
                </button>
            </div>
        </div>
    )
}

export default function Keywords({ kwTab, handleKwTab, handleConnectGSC, hasTrackingData, setHasTrackingData, posFilter, handlePosFilter, selectedCategoryFilter, handleCategoryCardClick, handleClearCategoryFilter, compact, isGscConnected, isLoadingData, trackedKeywords = [], setTrackedKeywords, activeSite, dateRange, refreshData, isTrial }) {
    const cp = compact
    const navigate = useNavigate()

    // ═══ ADD KEYWORDS MODAL STATE ═══
    const [showAddModal, setShowAddModal] = useState(false)
    const [addMode, setAddMode] = useState('single') // 'single' | 'bulk'
    const [isSaving, setIsSaving] = useState(false)
    const [saveError, setSaveError] = useState('')
    const [saveSuccess, setSaveSuccess] = useState('')
    const [replaceTracking, setReplaceTracking] = useState(false)

    // Single mode fields
    const [singleEntries, setSingleEntries] = useState([{ keyword: '', category: '', expectedUrl: '' }])

    // Bulk mode fields
    const [bulkText, setBulkText] = useState('')
    const [bulkCategory, setBulkCategory] = useState('')

    const categoryOptions = ['Blog Keywords', 'Landing Pages', 'Product Pages', 'Service Pages', 'Brand Keywords', 'Local SEO', 'Long Tail']

    // ═══ CATEGORY MANAGEMENT STATE ═══
    const [showCategoryModal, setShowCategoryModal] = useState(false)
    const [catName, setCatName] = useState('')
    const [catDescription, setCatDescription] = useState('')
    const [catColor, setCatColor] = useState('#2563EB')
    const [categories, setCategories] = useState([])
    const [catSaveError, setCatSaveError] = useState('')

    // ═══ SORT STATE ═══
    const [posSortOrder, setPosSortOrder] = useState(null) // null | 'asc' | 'desc'

    // ═══ SEARCH STATE ═══
    const [allKwSearch, setAllKwSearch] = useState('')
    const [trackingKwSearch, setTrackingKwSearch] = useState('')

    // ═══ MATRIX VIEW STATE ═══
    const [trackingViewMode, setTrackingViewMode] = useState('standard') // 'standard' | 'matrix' | 'category'
    const [matrixInterval, setMatrixInterval] = useState(30) // 1, 7, 14, 30

    // ═══ PAGINATION STATE ═══
    const [itemsPerPage, setItemsPerPage] = useState(25)
    const [allKwPage, setAllKwPage] = useState(1)
    const [trackingKwPage, setTrackingKwPage] = useState(1)
    const [locationsKwPage, setLocationsKwPage] = useState(1)

    // ═══ LOCATIONS STATE & FETCHER ═══
    const [locations, setLocations] = useState([])
    const [isLoadingLoc, setIsLoadingLoc] = useState(false)
    const [selectedLocation, setSelectedLocation] = useState(null) // null = overview, or countryCode
    const [selectedCountryFilter, setSelectedCountryFilter] = useState('All') // For 'All Keywords' tab filtering

    // ═══ ADD TO BASKET STATE ═══
    const [basketDropdown, setBasketDropdown] = useState(null) // keyword string of row with open dropdown
    const [addingToTrack, setAddingToTrack] = useState({}) // { keywordString: true/false }

    // ═══ EFFECTS & LOGIC ═══

    const catColors = [
        { color: '#2563EB', label: 'Blue' },
        { color: '#059669', label: 'Green' },
        { color: '#D97706', label: 'Amber' },
        { color: '#DC2626', label: 'Red' },
        { color: '#7C3AED', label: 'Purple' },
        { color: '#0891B2', label: 'Cyan' },
        { color: '#EA580C', label: 'Orange' },
        { color: '#DB2777', label: 'Pink' }
    ]


    // Load categories from localStorage on mount
    useEffect(() => {
        const siteKey = activeSite?.id || 'default'
        const stored = localStorage.getItem(`categories_${siteKey}`)
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) setCategories(parsed);
            } catch (e) { console.error("Error parsing categories:", e) }
        }
    }, [activeSite?.id])

    // Save categories to localStorage whenever they change
    const saveCategories = (cats) => {
        const siteKey = activeSite?.id || 'default'
        localStorage.setItem(`categories_${siteKey}`, JSON.stringify(cats))
        setCategories(cats)
    }

    const openCategoryModal = () => {
        setShowCategoryModal(true)
        setCatName('')
        setCatDescription('')
        setCatColor('#2563EB')
        setCatSaveError('')
    }

    const handleCreateCategory = () => {
        if (!catName.trim()) {
            setCatSaveError('Category name is required')
            return
        }
        if (categories.find(c => c.name.toLowerCase() === catName.trim().toLowerCase())) {
            setCatSaveError('Category already exists')
            return
        }
        const newCat = {
            id: Date.now().toString(),
            name: catName.trim(),
            description: catDescription.trim(),
            color: catColor,
            createdAt: new Date().toISOString()
        }
        saveCategories([...categories, newCat])
        setShowCategoryModal(false)
        // Also add to categoryOptions if not already there
    }

    const handleDeleteCategory = (catId) => {
        saveCategories(categories.filter(c => c.id !== catId))
    }

    // Compute stats for each category from trackedKeywords
    const getCategoryStats = (categoryName) => {
        const kwInCat = trackedKeywords.filter(kw => kw.category === categoryName)
        const ranked = kwInCat.filter(kw => typeof kw.position === 'number')
        const avgPos = ranked.length > 0 ? (ranked.reduce((a, kw) => a + kw.position, 0) / ranked.length).toFixed(1) : '-'
        const totalImpr = kwInCat.reduce((a, kw) => a + (kw.impressions || 0), 0)
        const totalClicks = kwInCat.reduce((a, kw) => a + (kw.clicks || 0), 0)
        const dist = [0, 0, 0, 0] // Top3, 4-10, 11-20, 20+
        ranked.forEach(kw => {
            if (kw.position <= 3) dist[0]++
            else if (kw.position <= 10) dist[1]++
            else if (kw.position <= 20) dist[2]++
            else dist[3]++
        })
        return { count: kwInCat.length, avgPos, impressions: totalImpr, clicks: totalClicks, distribution: dist }
    }

    // Merge stored categories with categoryOptions for the Add Keywords dropdown
    const allCategoryOptions = [...new Set([...categoryOptions, ...(categories || []).map(c => c?.name).filter(Boolean)])]

    // ═══ CLIENT-SIDE INTENT RE-CLASSIFICATION ═══
    // Re-classify intent on the fly using domain-derived brand variations
    const getBrandVariations = () => {
        if (!activeSite?.property_url) return []
        const domainClean = activeSite.property_url
            .replace(/^https?:\/\//, '').replace(/^sc-domain:/, '').replace(/^www\./, '')
            .replace(/\/.*$/, '').replace(/\.com$|\.in$|\.org$|\.net$|\.co$/g, '').trim().toLowerCase()
        const vars = [domainClean]
        // Add singular form (drop trailing 's')
        if (domainClean.endsWith('s') && domainClean.length > 4) {
            vars.push(domainClean.slice(0, -1))
        }
        // Add space-separated version by splitting at common word boundaries
        // e.g. "getgowns" → try "get gowns", "get gown"
        for (let i = 3; i < domainClean.length - 2; i++) {
            const left = domainClean.slice(0, i)
            const right = domainClean.slice(i)
            if (left.length >= 3 && right.length >= 3) {
                vars.push(`${left} ${right}`)
                // Also singular of right part
                if (right.endsWith('s') && right.length > 3) {
                    vars.push(`${left} ${right.slice(0, -1)}`)
                }
            }
        }
        // Add without common suffixes
        const suffixes = ['online', 'india', 'tech', 'digital', 'agency', 'studio', 'media', 'group', 'solutions', 'hq', 'services', 'service']
        for (const suffix of suffixes) {
            if (domainClean.endsWith(suffix) && domainClean.length > suffix.length + 2) {
                vars.push(domainClean.slice(0, -suffix.length))
                break
            }
        }
        return [...new Set(vars)].filter(v => v.length >= 3)
    }

    const classifyIntent = (keyword) => {
        if (!keyword) return 'Informational'
        const normalized = keyword.toLowerCase().trim().replace(/[^\w\s]/gi, '').replace(/\s+/g, ' ')
        const brandVars = getBrandVariations()

        // NAVIGATIONAL — brand terms
        const navKeywords = ['login', 'sign in', 'dashboard', 'official site', 'homepage', 'customer support', 'contact us']
        const isBrand = brandVars.some(brand => normalized.includes(brand))
        if (isBrand || navKeywords.some(w => normalized.includes(w))) return 'Navigational'

        // TRANSACTIONAL — buying intent
        const transKeywords = ['buy', 'purchase', 'pricing', 'price', 'cost', 'subscription', 'order', 'coupon', 'discount', 'free trial', 'demo', 'get started', 'download', 'book', 'hire', 'near me', 'quote', 'shop', 'shopping', 'delivery', 'rent', 'rental']
        if (transKeywords.some(w => normalized.includes(w))) return 'Transactional'

        // COMMERCIAL — comparison / evaluation
        const commKeywords = ['best', 'top', 'review', 'reviews', 'comparison', 'compare', 'vs', 'alternative', 'alternatives', 'software', 'tool', 'tools', 'solution', 'platform', 'services']
        if (commKeywords.some(w => normalized.includes(w))) return 'Commercial'

        // INFORMATIONAL — research
        const infoKeywords = ['how', 'what', 'why', 'when', 'guide', 'tutorial', 'tips', 'examples', 'checklist', 'template', 'meaning', 'definition', 'ideas']
        if (infoKeywords.some(w => normalized.includes(w))) return 'Informational'

        return 'Informational'
    }

    const intentColor = (intent) => {
        switch (intent) {
            case 'Navigational': return { bg: '#EFF6FF', text: '#2563EB' }
            case 'Transactional': return { bg: '#ECFDF5', text: '#059669' }
            case 'Commercial': return { bg: '#FEF3C7', text: '#D97706' }
            case 'Informational': return { bg: '#F3F4F6', text: '#6B7280' }
            default: return { bg: '#F3F4F6', text: '#9CA3AF' }
        }
    }



    const gscCountryMap = {
        'usa': { name: 'United States', emoji: '🇺🇸' },
        'ind': { name: 'India', emoji: '🇮🇳' },
        'gbr': { name: 'United Kingdom', emoji: '🇬🇧' },
        'can': { name: 'Canada', emoji: '🇨🇦' },
        'aus': { name: 'Australia', emoji: '🇦🇺' },
        'deu': { name: 'Germany', emoji: '🇩🇪' },
        'fra': { name: 'France', emoji: '🇫🇷' },
        'bra': { name: 'Brazil', emoji: '🇧🇷' },
        'jpn': { name: 'Japan', emoji: '🇯🇵' },
        'ita': { name: 'Italy', emoji: '🇮🇹' },
        'esp': { name: 'Spain', emoji: '🇪🇸' },
        'idn': { name: 'Indonesia', emoji: '🇮🇩' },
        'mex': { name: 'Mexico', emoji: '🇲🇽' },
        'nld': { name: 'Netherlands', emoji: '🇳🇱' },
        'zaf': { name: 'South Africa', emoji: '🇿🇦' },
        'sgp': { name: 'Singapore', emoji: '🇸🇬' },
        'mys': { name: 'Malaysia', emoji: '🇲🇾' },
        'phl': { name: 'Philippines', emoji: '🇵🇭' },
        'pak': { name: 'Pakistan', emoji: '🇵🇰' },
        'bgd': { name: 'Bangladesh', emoji: '🇧🇩' },
        'nga': { name: 'Nigeria', emoji: '🇳🇬' },
        'ken': { name: 'Kenya', emoji: '🇰🇪' },
        'are': { name: 'United Arab Emirates', emoji: '🇦🇪' },
        'sau': { name: 'Saudi Arabia', emoji: '🇸🇦' },
        'arg': { name: 'Argentina', emoji: '🇦🇷' },
        'col': { name: 'Colombia', emoji: '🇨🇴' },
        'tur': { name: 'Turkey', emoji: '🇹🇷' },
        'vnm': { name: 'Vietnam', emoji: '🇻🇳' },
        'kor': { name: 'South Korea', emoji: '🇰🇷' },
        'pol': { name: 'Poland', emoji: '🇵🇱' },
        'swe': { name: 'Sweden', emoji: '🇸🇪' },
        'che': { name: 'Switzerland', emoji: '🇨🇭' }
    }

    const fetchLocations = async () => {
        if (!activeSite?.id || !isGscConnected) return
        setIsLoadingLoc(true)
        try {
            const encodedRange = encodeURIComponent(typeof dateRange === 'object' ? JSON.stringify(dateRange) : dateRange)
            const apiUrl = getApiUrl()
            const response = await fetch(`${apiUrl}/api/gsc/locations?siteId=${activeSite.id}&dateRange=${encodedRange}&trial=${isTrial}`)
            const data = await response.json()
            if (data.success) {
                setLocations(data.locations)
            }
        } catch (error) {
            console.error("Error fetching locations:", error)
        } finally {
            setIsLoadingLoc(false)
        }
    }



    // Fetch locations when the tab is clicked and data is empty
    useEffect(() => {
        if ((kwTab === 'locations' || kwTab === 'all') && locations.length === 0) {
            fetchLocations()
        }
    }, [kwTab, activeSite?.id, isGscConnected, locations.length])

    // Format metrics
    const formatNumber = (num) => num >= 1000 ? (num / 1000).toFixed(1) + 'K' : num

    // Filter out GSC noise (long tail of 1-impression countries) and show top 20
    const meaningfulLocations = [...(locations || [])]
        .filter(loc => loc && (loc.impressions > 5 || loc.clicks > 0))
        .sort((a, b) => (b?.impressions || 0) - (a?.impressions || 0))
        .slice(0, 20);

    // Reset pages when filters change
    useEffect(() => setAllKwPage(1), [posFilter, selectedCountryFilter, allKwSearch])
    useEffect(() => setTrackingKwPage(1), [selectedCategoryFilter, trackingKwSearch])
    useEffect(() => setLocationsKwPage(1), [selectedLocation])

    // Clear locations when site changes
    useEffect(() => {
        setLocations([])
        setSelectedCountryFilter('All')
        setSelectedLocation(null)
    }, [activeSite?.id])

    const handlePosSortToggle = () => {
        if (posSortOrder === null) setPosSortOrder('asc')
        else if (posSortOrder === 'asc') setPosSortOrder('desc')
        else setPosSortOrder(null)
        setAllKwPage(1)
        setTrackingKwPage(1)
    }

    if (isLoadingData) {
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <Loader2 className="w-10 h-10 text-[#2563EB] animate-spin mb-4" />
                <h3 className="text-[18px] font-medium text-[#111827]">Loading your keywords...</h3>
                <p className="text-[13px] text-[#6B7280]">Connecting to Search Console and syncing positions</p>
            </div>
        )
    }



    const handleAddToTrack = async (kw, categoryName, kwStringId) => {
        setAddingToTrack(prev => ({ ...prev, [kwStringId]: true }))
        try {
            const apiUrl = getApiUrl()
            const response = await fetch(`${apiUrl}/api/keywords/track`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    siteId: activeSite?.id,
                    keywords: [{ keyword: kw.keyword, category: categoryName, expected_url: kw.page || null }]
                })
            })
            const result = await response.json()
            if (result.success) {
                if (setHasTrackingData) setHasTrackingData(true)
                if (refreshData) refreshData(true)
                // Mark as added with a brief success state
                setAddingToTrack(prev => ({ ...prev, [kwStringId]: 'done' }))
                setTimeout(() => setAddingToTrack(prev => ({ ...prev, [kwStringId]: false })), 2000)
            }
        } catch (error) {
            console.error("Error adding to track:", error)
            setAddingToTrack(prev => ({ ...prev, [kwStringId]: false }))
        } finally {
            setBasketDropdown(null)
        }
    }

    const handleBulkAddToTrack = async (keywords) => {
        if (!activeSite?.id || !keywords?.length) return
        setIsSaving(true)
        try {
            const apiUrl = getApiUrl()
            const response = await fetch(`${apiUrl}/api/keywords/track`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    siteId: activeSite.id,
                    keywords: keywords.map(kw => ({
                        keyword: kw.keyword,
                        category: kw.category || 'High-Volume Discovery',
                        expected_url: kw.page || null
                    })),
                    overwrite: false
                })
            })
            const result = await response.json()
            if (result.success) {
                if (setHasTrackingData) setHasTrackingData(true)
                if (refreshData) refreshData(true)
            }
        } catch (error) {
            console.error("Error bulk adding to track:", error)
        } finally {
            setIsSaving(false)
        }
    }

    const openAddModal = () => {
        setShowAddModal(true)
        setAddMode('single')
        setSingleEntries([{ keyword: '', category: '', expectedUrl: '' }])
        setBulkText('')
        setBulkCategory('')
        setSaveError('')
        setSaveSuccess('')
        setReplaceTracking(false)
    }

    const handleUntrackKeyword = async (keyword) => {
        // Optimistic UI Update
        const previousKeywords = [...trackedKeywords]
        if (setTrackedKeywords) {
            setTrackedKeywords(trackedKeywords.filter(kw => kw.keyword !== keyword))
        }

        try {
            const apiUrl = getApiUrl()
            const response = await fetch(`${apiUrl}/api/keywords/untrack`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ siteId: activeSite.id, keyword })
            })
            const result = await response.json()
            if (result.success && refreshData) {
                // Background refresh without spinner
                refreshData(true)
            } else if (!result.success) {
                // Rollback if failed
                if (setTrackedKeywords) setTrackedKeywords(previousKeywords)
            }
        } catch (err) {
            console.error('Error untracking keyword:', err)
            // Rollback on error
            if (setTrackedKeywords) setTrackedKeywords(previousKeywords)
        }
    }

    const addSingleEntry = () => {
        setSingleEntries([...singleEntries, { keyword: '', category: '', expectedUrl: '' }])
    }

    const updateSingleEntry = (index, field, value) => {
        const updated = [...singleEntries]
        updated[index][field] = value
        setSingleEntries(updated)
    }

    const removeSingleEntry = (index) => {
        if (singleEntries.length === 1) return
        setSingleEntries(singleEntries.filter((_, i) => i !== index))
    }

    const handleSaveKeywords = async () => {
        if (!activeSite?.id) {
            setSaveError('No active site selected')
            return
        }

        let keywordsToAdd = []

        if (addMode === 'single') {
            keywordsToAdd = singleEntries
                .filter(e => e.keyword.trim())
                .map(e => ({
                    keyword: e.keyword.trim(),
                    category: e.category || 'Uncategorized',
                    expected_url: e.expectedUrl.trim() || null
                }))
        } else {
            // Bulk mode: parse textarea
            // Supports: keyword (one per line) or keyword, category, url (CSV)
            const lines = bulkText.split('\n').filter(l => l.trim())
            keywordsToAdd = lines.map(line => {
                const parts = line.split(',').map(p => p.trim())
                return {
                    keyword: parts[0],
                    category: parts[1] || bulkCategory || 'Uncategorized',
                    expected_url: parts[2] || null
                }
            }).filter(k => k.keyword)
        }

        if (keywordsToAdd.length === 0) {
            setSaveError('Please enter at least one keyword')
            return
        }

        setIsSaving(true)
        setSaveError('')

        try {
            const apiUrl = getApiUrl()
            const response = await fetch(`${apiUrl}/api/keywords/track`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ siteId: activeSite.id, keywords: keywordsToAdd, overwrite: replaceTracking })
            })
            const result = await response.json()
            if (result.success) {
                setSaveSuccess(`${result.count} keyword${result.count > 1 ? 's' : ''} added to tracking!`)
                if (setHasTrackingData) setHasTrackingData(true)
                if (refreshData) refreshData(true)
                setTimeout(() => {
                    setShowAddModal(false)
                    setSaveSuccess('')
                }, 1500)
            } else {
                setSaveError(result.error || 'Failed to save keywords')
            }
        } catch (err) {
            setSaveError('Network error: ' + err.message)
        } finally {
            setIsSaving(false)
        }
    }

    // For this build, we map all keywords into both tabs just for UI demonstration of the live data integration.
    // In production, the backend sync would differentiate tracked (manually added) vs discovered keywords.
    let baseAllKeywords = trackedKeywords || [];
    if (selectedCountryFilter !== 'All') {
        const countryData = (locations || []).find(l => l?.countryCode === selectedCountryFilter)
        if (countryData && countryData.keywords) {
            baseAllKeywords = countryData.keywords;
        } else {
            baseAllKeywords = [];
        }
    }

    let filteredGSC = posFilter === 'All' ? baseAllKeywords : baseAllKeywords.filter((kw) => {
        if (posFilter === 'Top 3') return kw.position <= 3
        if (posFilter === '4-10') return kw.position > 3 && kw.position <= 10
        if (posFilter === '11-20') return kw.position > 10 && kw.position <= 20
        return kw.position > 20
    })

    if (allKwSearch.trim()) {
        const q = allKwSearch.toLowerCase()
        filteredGSC = filteredGSC.filter(kw => kw.keyword.toLowerCase().includes(q))
    }

    const trackingOnly = (trackedKeywords || []).filter(kw => kw?.is_tracked)
    let filteredTracking = selectedCategoryFilter ? trackingOnly.filter((kw) => kw?.category === selectedCategoryFilter) : trackingOnly

    if (trackingKwSearch.trim()) {
        const q = trackingKwSearch.toLowerCase()
        filteredTracking = filteredTracking.filter(kw => kw.keyword.toLowerCase().includes(q))
    }

    // ═══ POSITION SORTING LOGIC ═══
    const sortKeywordsByPos = (list) => {
        if (!posSortOrder) return list
        return [...list].sort((a, b) => {
            const aPos = (a.impressions < 10) ? Infinity : (a.position || 0)
            const bPos = (b.impressions < 10) ? Infinity : (b.position || 0)

            if (aPos === Infinity && bPos === Infinity) return 0
            if (aPos === Infinity) return 1
            if (bPos === Infinity) return -1

            return posSortOrder === 'asc' ? aPos - bPos : bPos - aPos
        })
    }

    filteredGSC = sortKeywordsByPos(filteredGSC)
    filteredTracking = sortKeywordsByPos(filteredTracking)

    // Calculate Matrix Columns (Oldest to Newest, spaced by Interval)
    let matrixDates = []
    if (trackingViewMode === 'matrix') {
        let dEnd = new Date()
        let dStart = new Date()

        if (typeof dateRange === 'object' && dateRange.type === 'custom') {
            const [sy, sm, sd] = dateRange.start.split('-')
            dStart = new Date(sy, sm - 1, sd)
            const [ey, em, ed] = dateRange.end.split('-')
            dEnd = new Date(ey, em - 1, ed)
        } else {
            const rangeDays = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : dateRange === '1y' ? 365 : 480
            dStart.setDate(dEnd.getDate() - rangeDays)
        }

        const tempDates = []
        let current = new Date(dEnd.getTime())
        const pad = (n) => n.toString().padStart(2, '0')
        const MAX_COLS = 60 // Cap columns to prevent DOM freezing

        while (current >= dStart && tempDates.length < MAX_COLS) {
            const dateStr = `${current.getFullYear()}-${pad(current.getMonth() + 1)}-${pad(current.getDate())}`
            tempDates.push(dateStr)
            current.setDate(current.getDate() - matrixInterval)
        }
        matrixDates = tempDates.reverse()
    }

    // Generate dynamic category cards based on trackedKeywords groupings
    const categoryMap = trackingOnly.reduce((acc, kw) => {
        const catName = kw.category || 'Uncategorized'
        if (!acc[catName]) {
            acc[catName] = {
                name: catName, count: 0, totalPos: 0, rankedCount: 0,
                impressions: 0, clicks: 0,
                distribution: [0, 0, 0, 0], // Top 3, 4-10, 11-20, 21+
                historyPos: [] // Store position histories for change calculation
            }
        }
        acc[catName].count += 1

        if (typeof kw.position === 'number') {
            acc[catName].totalPos += kw.position
            acc[catName].rankedCount += 1

            if (kw.position <= 3) acc[catName].distribution[0] += 1
            else if (kw.position <= 10) acc[catName].distribution[1] += 1
            else if (kw.position <= 20) acc[catName].distribution[2] += 1
            else acc[catName].distribution[3] += 1

            if (kw.change) {
                acc[catName].historyPos.push(kw.position + kw.change) // Calculate old pos
            }
        }

        acc[catName].impressions += (kw.impressions || 0)
        acc[catName].clicks += (kw.clicks || 0)

        return acc
    }, {})

    // Format the reduced map into the array format needed for rendering
    const categoryCardsDynamic = Object.values(categoryMap || {}).map(cat => {
        const currentAvg = cat.rankedCount > 0 ? (cat.totalPos / cat.rankedCount) : 0
        const pastAvg = (cat.historyPos && cat.historyPos.length > 0) ? (cat.historyPos.reduce((a, b) => a + (b || 0), 0) / cat.historyPos.length) : currentAvg

        return {
            name: cat.name || 'Uncategorized',
            count: cat.count || 0,
            avgPos: currentAvg > 0 ? (typeof currentAvg === 'number' ? currentAvg.toFixed(1) : currentAvg) : '-',
            change: currentAvg > 0 ? (typeof pastAvg === 'number' && typeof currentAvg === 'number' ? (pastAvg - currentAvg).toFixed(1) : 0) : 0,
            impressions: (cat.impressions || 0) >= 1000 ? ((cat.impressions || 0) / 1000).toFixed(1) + 'K' : (cat.impressions || 0),
            distribution: cat.distribution || [0, 0, 0, 0]
        }
    })

    return (
        <div>
            <div className="flex items-center gap-1 mb-6 border-b border-[#E5E7EB]">
                {[
                    { id: 'all', label: 'All Keywords' },
                    { id: 'tracking', label: 'Tracking Keywords' },
                    { id: 'locations', label: 'Locations' }
                ].map((tab) => (
                    <button key={tab.id} onClick={() => handleKwTab(tab.id)} className={`px-5 py-3 text-[14px] font-medium border-b-2 ${kwTab === tab.id ? 'border-[#2563EB] text-[#2563EB]' : 'border-transparent text-[#9CA3AF] hover:text-[#4B5563]'}`}>{tab.label}</button>
                ))}
            </div>

            {/* TAB 1: ALL KEYWORDS */}
            {kwTab === 'all' && (
                <div>
                    {!isGscConnected ? (
                        <div className="flex flex-col items-center justify-center py-24 bg-white border border-[#E5E7EB] rounded-2xl">
                            <div className="w-20 h-20 rounded-2xl bg-[#EFF6FF] flex items-center justify-center mb-6">
                                <BarChart3 className="w-10 h-10 text-[#2563EB]" />
                            </div>
                            <h3 className="text-[20px] font-semibold text-[#111827] mb-2 tracking-[-0.01em]">Connect to Search Console</h3>
                            <p className="text-[13px] text-[#4B5563] max-w-sm text-center mb-6 font-normal">Connect your Google Search Console to securely pull your full list of indexing keywords.</p>
                            <button onClick={() => handleConnectGSC()} className="flex items-center gap-2 px-6 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all">
                                <Globe className="w-4 h-4" /> Connect Property
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <h2 className="text-[18px] font-bold text-[#111827] tracking-tight">{isTrial ? 'Trial View: Discovered GSC Keywords' : 'All Google Search Console Keywords'}</h2>
                                    {isTrial && <span className="px-2 py-0.5 bg-[#EFF6FF] text-[#2563EB] text-[10px] font-bold rounded-md border border-[#DBEAFE] uppercase tracking-wider">TRIAL MODE</span>}
                                </div>
                                <div className="flex items-center gap-2">
                                    {isTrial && <span className="text-[11px] text-[#9CA3AF] font-medium">Keywords fetched: {trackedKeywords?.length || 0}</span>}
                                    {isTrial && <span className="text-[11px] text-[#9CA3AF] italic">Upgrade for full data and branded tracking</span>}
                                </div>
                            </div>
                            <div className="flex items-start gap-4 p-5 bg-gradient-to-br from-[#F8FAFC] to-[#F1F5F9] border border-[#E2E8F0] rounded-2xl mb-6 shadow-sm">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                                    <Info className="w-4 h-4 text-[#2563EB]" />
                                </div>
                                <div>
                                    <p className="text-[14px] text-[#334155] font-semibold mb-0.5">{isTrial ? 'Trial View: Discovered GSC Keywords' : 'Organic Intelligence Data'}</p>
                                    <p className="text-[13px] text-[#64748B] font-normal leading-relaxed">{isTrial ? 'Top 25 High-Volume Discovery Keywords' : 'All Keywords are automatically pulled from Search Console daily.'}</p>
                                    {!isTrial && <p className="text-[12px] text-[#2563EB] mt-2 font-medium">Add to <button onClick={() => handleKwTab('tracking')} className="hover:underline font-bold">Tracking Keywords</button> for historical analysis.</p>}
                                </div>
                            </div>
                            <div className={`premium-card p-4 flex items-center justify-between ${cp ? 'mb-4' : 'mb-6'}`}>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1.5 p-1 bg-[#F1F5F9] rounded-xl border border-[#E2E8F0]">
                                        {['All', 'Top 3', '4-10', '11-20', '20+'].map((f) => (
                                            <button key={f} onClick={() => handlePosFilter(f)} className={`px-4 py-1.5 rounded-lg text-[12px] font-bold transition-all ${posFilter === f ? 'bg-white text-[#2563EB] shadow-sm' : 'text-[#64748B] hover:text-[#111827]'}`}>{f}</button>
                                        ))}
                                    </div>
                                    <div className="w-px h-6 bg-[#E5E7EB] mx-1"></div>
                                    <div className="relative group">
                                        <MapPin className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2 z-10" />
                                        <select
                                            value={selectedCountryFilter}
                                            onChange={(e) => setSelectedCountryFilter(e.target.value)}
                                            className="appearance-none pl-10 pr-10 py-2 border border-[#E5E7EB] rounded-xl text-[13px] font-semibold text-[#334155] bg-white cursor-pointer hover:border-[#D1D5DB] focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/5 transition-all w-[180px]"
                                        >
                                            <option value="All">All Regions</option>
                                            {meaningfulLocations.map(loc => {
                                                const countryCode = loc?.countryCode || 'Unknown';
                                                const cInfo = gscCountryMap[countryCode] || { name: countryCode.toUpperCase(), emoji: '🌍' }
                                                return <option key={countryCode} value={countryCode}>{cInfo.name}</option>
                                            })}
                                        </select>
                                        <ChevronDown className="w-4 h-4 text-[#9CA3AF] pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 group-hover:text-[#4B5563] transition-colors" />
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="relative group min-w-[280px]">
                                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] group-focus-within:text-[#2563EB] transition-colors" />
                                        <input type="text" placeholder="Filter discovered keywords..." value={allKwSearch} onChange={(e) => setAllKwSearch(e.target.value)} className="pl-11 pr-4 py-2.5 border border-[#E5E7EB] rounded-xl text-[13px] font-medium placeholder-[#9CA3AF] focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/5 w-full bg-white hover:border-[#D1D5DB] transition-all" />
                                    </div>
                                    {isTrial && filteredGSC?.length > 0 && (
                                        <button
                                            onClick={() => handleBulkAddToTrack(filteredGSC.slice(0, 25))}
                                            disabled={isSaving}
                                            className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[12px] font-bold rounded-lg transition-all shadow-sm flex items-center gap-2 disabled:bg-[#9CA3AF]"
                                        >
                                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                            Add All to Tracking
                                        </button>
                                    )}
                                    <div className="px-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[11px] font-bold text-[#64748B] uppercase tracking-wider tabular-nums">
                                        25 Limit
                                    </div>
                                </div>
                            </div>
                            <div className="premium-card overflow-hidden">
                                <table className="w-full">
                                    <thead><tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                                        <th className={`text-left px-4 ${cp ? 'py-2' : 'py-3'} text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider`}>Keyword</th>
                                        <th className={`text-left px-3 ${cp ? 'py-2' : 'py-3'} text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider`}>View Page</th>
                                        <th className={`text-center px-3 ${cp ? 'py-2' : 'py-3'} text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider cursor-pointer group/sort transition-colors`} onClick={handlePosSortToggle}>
                                            <div className="flex items-center justify-center gap-1.5">
                                                <span className={posSortOrder ? 'text-[#2563EB]' : ''}>Position</span>
                                                {posSortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-[#2563EB]" /> :
                                                    posSortOrder === 'desc' ? <ChevronDown className="w-3.5 h-3.5 text-[#2563EB]" /> :
                                                        <ArrowUpDown className="w-3 h-3 opacity-0 group-hover/sort:opacity-100 transition-opacity" />}
                                            </div>
                                        </th>
                                        <th className={`text-right px-3 ${cp ? 'py-2' : 'py-3'} text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider`}>Impressions</th>
                                        <th className={`text-right px-3 ${cp ? 'py-2' : 'py-3'} text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider`}>Clicks</th>
                                        <th className={`text-right px-3 ${cp ? 'py-2' : 'py-3'} text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider`}>CTR</th>
                                        <th className={`text-left px-3 ${cp ? 'py-2' : 'py-3'} text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider`}>Intent</th>
                                        <th className={`text-center px-3 ${cp ? 'py-2' : 'py-3'} text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider w-[100px]`}>Action</th>
                                    </tr></thead>
                                    <tbody>
                                        {(() => {
                                            const displayList = filteredGSC || [];
                                            if (displayList.length === 0 && !isLoadingData) {
                                                return (
                                                    <tr>
                                                        <td colSpan="8" className="py-16 text-center">
                                                            <div className="flex flex-col items-center justify-center">
                                                                <div className="w-16 h-16 bg-[#F9FAFB] rounded-full flex items-center justify-center mb-4">
                                                                    <Search className="w-8 h-8 text-[#9CA3AF] opacity-20" />
                                                                </div>
                                                                <p className="text-[15px] font-semibold text-[#111827]">No keywords found</p>
                                                                <p className="text-[13px] text-[#6B7280] mt-1 max-w-xs mx-auto">
                                                                    {isTrial
                                                                        ? "We didn't find any non-branded keywords for this site in the top positions."
                                                                        : "Try adjusting your filters or search query to find more results."}
                                                                </p>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            }

                                            // Regular table rows
                                            return displayList.slice((allKwPage - 1) * itemsPerPage, allKwPage * itemsPerPage).map((kw, i) => {
                                                const kwStringId = kw.keyword;
                                                const intent = classifyIntent(kw.keyword)
                                                const iColor = intentColor(intent)
                                                const isAdded = addingToTrack[kwStringId] === 'done'

                                                return (
                                                    <tr key={`${kw.keyword}-${i}`} className="border-b border-[#F3F4F6] hover:bg-[#FAFBFC] group transition-colors">
                                                        <td className={`px-4 ${cp ? 'py-2.5' : 'py-4'}`}>
                                                            <div className="flex flex-col"><span className="text-[13px] font-medium text-[#4B5563]">{kw.keyword}</span></div>
                                                        </td>
                                                        <td className={`px-3 ${cp ? 'py-2.5' : 'py-4'} text-[12px] font-medium`}>
                                                            {kw.page ? (
                                                                <a href={kw.page} target="_blank" rel="noopener noreferrer" className="text-[#2563EB] hover:text-[#1D4ED8] hover:underline" title={kw.page} onClick={(e) => e.stopPropagation()}>Visit Page</a>
                                                            ) : '-'}
                                                        </td>
                                                        <td className={`text-center px-3 ${cp ? 'py-2.5' : 'py-4'}`}>
                                                            {kw.impressions < 10 ? (
                                                                <span className="text-[11px] font-bold text-[#9CA3AF] cursor-help" title="Not Reliable: Fewer than 10 impressions">N/R</span>
                                                            ) : (
                                                                <span className="font-mono-data text-[13px] font-semibold text-[#111827]">#{kw.position && kw.position.toFixed ? parseFloat(kw.position.toFixed(1)) : (kw.position || 0)}</span>
                                                            )}
                                                        </td>
                                                        <td className={`text-right px-3 ${cp ? 'py-2.5' : 'py-4'} tabular-nums text-[13px] text-[#4B5563]`}>{kw.impressions ? kw.impressions.toLocaleString() : '-'}</td>
                                                        <td className={`text-right px-3 ${cp ? 'py-2.5' : 'py-4'} tabular-nums text-[13px] text-[#4B5563]`}>{kw.clicks ? kw.clicks.toLocaleString() : '-'}</td>
                                                        <td className={`text-right px-3 ${cp ? 'py-2.5' : 'py-4'} tabular-nums text-[13px] text-[#4B5563]`}>{kw.ctr ? (kw.ctr * 100).toFixed(2) + '%' : '-'}</td>
                                                        <td className={`px-3 ${cp ? 'py-2.5' : 'py-4'}`}>
                                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider" style={{ backgroundColor: iColor.bg, color: iColor.text }}>{intent}</span>
                                                        </td>
                                                        <td className={`text-center px-3 ${cp ? 'py-2.5' : 'py-4'}`}>
                                                            {isAdded ? (
                                                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#059669] uppercase"><Check className="w-3.5 h-3.5" /> Added</span>
                                                            ) : (
                                                                !isTrial && (
                                                                    <button onClick={(e) => { e.stopPropagation(); setBasketDropdown(basketDropdown === kwStringId ? null : kwStringId) }} className="p-1.5 hover:bg-[#F3F4F6] rounded-lg transition-colors text-[#9CA3AF] hover:text-[#4B5563] ml-auto">
                                                                        <ShoppingBag className="w-4 h-4" />
                                                                    </button>
                                                                )
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            });
                                        })()}
                                        {isTrial && (
                                            <tr>
                                                <td colSpan="8" className="px-5 py-6 text-center bg-[#F9FAFB]/50">
                                                    <div className="flex flex-col items-center justify-center gap-2">
                                                        <p className="text-[13px] text-[#6B7280] font-medium">Currently viewing 25 restricted keywords from GSC.</p>
                                                        <button
                                                            onClick={() => navigate('/settings')}
                                                            className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[12px] font-bold rounded-lg transition-all shadow-sm hover:shadow-md active:scale-95"
                                                        >
                                                            Load all keywords & unlock tracking
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                                <Pagination
                                    totalItems={isTrial ? Math.min(filteredGSC?.length || 0, 25) : filteredGSC?.length || 0}
                                    currentPage={allKwPage}
                                    onPageChange={setAllKwPage}
                                    itemsPerPage={itemsPerPage}
                                    setItemsPerPage={setItemsPerPage}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: TRACKING */}
            {kwTab === 'tracking' && (
                <div>
                    {!hasTrackingData ? (
                        <div className="flex flex-col items-center justify-center py-24">
                            <div className="w-20 h-20 rounded-2xl bg-[#EFF6FF] flex items-center justify-center mb-6"><Target className="w-10 h-10 text-[#2563EB]" /></div>
                            <h3 className="text-[20px] font-semibold text-[#111827] mb-2 tracking-[-0.01em]">Track Strategic Keywords</h3>
                            <p className="text-[13px] text-[#4B5563] max-w-md text-center mb-2 font-normal">Add high-priority keywords manually to monitor their historical performance and ranking trends.</p>
                            <div className="flex items-center gap-2 mb-8 px-3 py-1.5 bg-[#F9FAFB] rounded-lg"><Info className="w-3 h-3 text-[#9CA3AF]" /><span className="text-[11px] text-[#9CA3AF] font-normal">Tracking Keywords are monitored historically and included in client reports.</span></div>
                            <div className="flex items-center gap-3">
                                <button onClick={openAddModal} className="flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-medium rounded-lg shadow-sm transition-all"><Plus className="w-4 h-4" />Add Keywords</button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            {selectedCategoryFilter && (
                                <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-[#EFF6FF] border border-[#2563EB]/20 rounded-lg">
                                    <Tag className="w-3.5 h-3.5 text-[#2563EB]" /><span className="text-[13px] text-[#2563EB] font-medium">Filtered by: {selectedCategoryFilter}</span>
                                    <button onClick={handleClearCategoryFilter} className="ml-auto p-0.5 hover:bg-[#2563EB]/10 rounded"><X className="w-3.5 h-3.5 text-[#2563EB]" /></button>
                                </div>
                            )}
                            <div className={`flex items-center justify-between ${cp ? 'mb-3' : 'mb-4'}`}>
                                <div className="flex items-center gap-3">
                                    <h2 className="text-[18px] font-bold text-[#111827] tracking-tight">{isTrial ? 'Trial View: Tracked Keywords' : 'Tracked Keywords'}</h2>
                                    {isTrial && <span className="px-2 py-0.5 bg-[#EFF6FF] text-[#2563EB] text-[10px] font-bold rounded-md border border-[#DBEAFE] uppercase tracking-wider">TRIAL MODE</span>}
                                    <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" /><input type="text" placeholder="Search tracked keywords..." value={trackingKwSearch} onChange={(e) => setTrackingKwSearch(e.target.value)} className="pl-9 pr-4 py-2 border border-[#E5E7EB] rounded-lg text-[13px] font-normal placeholder-[#9CA3AF] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/20 w-[240px] bg-white" /></div>
                                    <div className="flex items-center gap-1 px-2 py-1.5 bg-[#F9FAFB] rounded-lg"><Info className="w-3 h-3 text-[#9CA3AF]" /><span className="text-[11px] text-[#9CA3AF] font-normal">{isTrial ? 'Trial mode shows 25 pre-tracked keywords.' : 'Only tracked keywords appear in reports'}</span></div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* Matrix View Toggle */}
                                    <div className="flex bg-[#F3F4F6] p-0.5 rounded-lg border border-[#E5E7EB]">
                                        <button onClick={() => setTrackingViewMode('standard')} className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors ${trackingViewMode === 'standard' ? 'bg-white text-[#111827] shadow-sm' : 'text-[#6B7280] hover:text-[#374151]'}`}>Standard</button>
                                        <button onClick={() => setTrackingViewMode('matrix')} className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors ${trackingViewMode === 'matrix' ? 'bg-white text-[#111827] shadow-sm' : 'text-[#6B7280] hover:text-[#374151]'}`}>Rank Matrix</button>
                                        <button onClick={() => setTrackingViewMode('category')} className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors ${trackingViewMode === 'category' ? 'bg-white text-[#111827] shadow-sm' : 'text-[#6B7280] hover:text-[#374151]'}`}>Category</button>
                                    </div>
                                    {trackingViewMode === 'matrix' && (
                                        <select value={matrixInterval} onChange={(e) => setMatrixInterval(Number(e.target.value))} className="bg-white border border-[#E5E7EB] text-[#4B5563] text-[12px] rounded-lg focus:ring-[#2563EB]/20 focus:border-[#2563EB] block px-3 py-2 outline-none h-[34px]">
                                            <option value={1}>Daily</option>
                                            <option value={7}>Weekly</option>
                                            <option value={14}>Bi-Weekly</option>
                                            <option value={30}>Monthly</option>
                                        </select>
                                    )}
                                    <div className="w-px h-6 bg-[#E5E7EB] mx-1"></div>

                                    <button onClick={openAddModal} className="flex items-center gap-2 px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-medium rounded-lg"><Plus className="w-4 h-4" />Add</button>
                                </div>
                            </div>
                            <div className={`bg-white rounded-xl ${trackingViewMode === 'category' ? '' : 'border border-[#E5E7EB] overflow-x-auto'}`} style={{ boxShadow: trackingViewMode === 'category' ? 'none' : 'var(--shadow-sm)' }}>
                                {trackingViewMode === 'standard' && (
                                    <table className="w-full">
                                        <thead><tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                                            <th className={`text-left px-4 ${cp ? 'py-2' : 'py-3'} text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider`}>Keyword</th>
                                            <th className={`text-left px-3 ${cp ? 'py-2' : 'py-3'} text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider`}>View Page</th>
                                            <th className={`text-center px-3 ${cp ? 'py-2' : 'py-3'} text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider cursor-pointer group/sort transition-colors`} onClick={handlePosSortToggle}>
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <span className={posSortOrder ? 'text-[#2563EB]' : ''}>Position</span>
                                                    {posSortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-[#2563EB]" /> :
                                                        posSortOrder === 'desc' ? <ChevronDown className="w-3.5 h-3.5 text-[#2563EB]" /> :
                                                            <ArrowUpDown className="w-3 h-3 opacity-0 group-hover/sort:opacity-100 transition-opacity" />}
                                                </div>
                                            </th>
                                            <th className={`text-right px-3 ${cp ? 'py-2' : 'py-3'} text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider`}>Impressions</th>
                                            <th className={`text-right px-3 ${cp ? 'py-2' : 'py-3'} text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider`}>Clicks</th>
                                            <th className={`text-right px-3 ${cp ? 'py-2' : 'py-3'} text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider`}>CTR</th>
                                            <th className={`text-left px-3 ${cp ? 'py-2' : 'py-3'} text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider`}>Intent</th>
                                            <th className={`text-center px-3 ${cp ? 'py-2' : 'py-3'} text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider w-[100px]`}>Action</th>
                                        </tr></thead>
                                        <tbody>
                                            {filteredTracking.slice((trackingKwPage - 1) * itemsPerPage, trackingKwPage * itemsPerPage).map((kw, i) => {
                                                const intent = classifyIntent(kw.keyword)
                                                const iColor = intentColor(intent)
                                                return (
                                                    <tr key={i} className="border-b border-[#F3F4F6] hover:bg-[#FAFBFC] group">
                                                        <td className={`px-4 ${cp ? 'py-2' : 'py-3'}`}>
                                                            <div className="flex flex-col"><span className="text-[13px] font-medium text-[#111827]">{kw.keyword}</span></div>
                                                        </td>
                                                        <td className={`px-3 ${cp ? 'py-2' : 'py-3'} text-[12px] font-medium`}>
                                                            {kw.page && kw.page !== '-' ? (
                                                                <a
                                                                    href={kw.page}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-[#2563EB] hover:text-[#1D4ED8] hover:underline focus:outline-none block truncate w-[120px]"
                                                                    title={kw.page}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    Visit Page
                                                                </a>
                                                            ) : '-'}
                                                        </td>
                                                        <td className={`text-center px-3 ${cp ? 'py-2' : 'py-3'}`}>
                                                            {kw.impressions < 10 ? (
                                                                <span className="text-[11px] font-bold text-[#9CA3AF] cursor-help" title="Not Reliable: Fewer than 10 impressions">N/R</span>
                                                            ) : (
                                                                <span className="font-mono-data text-[13px] font-semibold text-[#4B5563]">#{kw.position && kw.position.toFixed ? parseFloat(kw.position.toFixed(1)) : (kw.position || 0)}</span>
                                                            )}
                                                        </td>
                                                        <td className={`text-right px-3 ${cp ? 'py-2' : 'py-3'} table-num font-normal text-[#4B5563]`}>{kw.impressions ? kw.impressions.toLocaleString() : '-'}</td>
                                                        <td className={`text-right px-3 ${cp ? 'py-2' : 'py-3'} table-num font-normal text-[#4B5563]`}>{kw.clicks ? kw.clicks.toLocaleString() : '-'}</td>
                                                        <td className={`text-right px-3 ${cp ? 'py-2' : 'py-3'} table-num font-normal text-[#4B5563]`}>{kw.ctr ? (kw.ctr * 100 > 1 ? kw.ctr.toFixed(2) + '%' : (kw.ctr * 100).toFixed(2) + '%') : '-'}</td>
                                                        <td className={`px-3 ${cp ? 'py-2' : 'py-3'}`}>
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium`} style={{ backgroundColor: iColor.bg, color: iColor.text }}>
                                                                {intent}
                                                            </span>
                                                        </td>
                                                        <td className={`text-center px-3 ${cp ? 'py-2' : 'py-3'}`}>
                                                            <div className="relative group/action inline-block">
                                                                <button onClick={() => handleUntrackKeyword(kw.keyword)} title="Delete keyword" className="p-1 hover:bg-[#FEE2E2] rounded text-[#9CA3AF] hover:text-[#DC2626] transition-colors"><Trash2 className="w-4 h-4" /></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                )}
                                {trackingViewMode === 'matrix' && (
                                    <table className="w-full min-w-max">
                                        <thead>
                                            <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                                                <th className={`sticky left-0 z-10 bg-[#F9FAFB] text-left px-4 ${cp ? 'py-2' : 'py-3'} text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider min-w-[300px] w-[300px]`}>Keyword</th>
                                                <th className={`text-center px-4 ${cp ? 'py-2' : 'py-3'} text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider border-r border-[#E5E7EB] w-[120px] whitespace-nowrap`}>Vol / Imp</th>
                                                {matrixDates.map((date, idx) => {
                                                    const [y, m, d] = date.split('-')
                                                    const dObj = new Date(y, m - 1, d)
                                                    const formatted = `${d} ${dObj.toLocaleString('default', { month: 'short' })}`
                                                    return <th key={idx} className={`text-center px-2 ${cp ? 'py-2' : 'py-3'} text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider w-[80px]`}>{formatted}</th>
                                                })}
                                                <th className="w-full min-w-[40px] bg-[#F9FAFB]"></th>
                                                <th className="w-[40px] bg-[#F9FAFB] border-l border-[#E5E7EB]"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredTracking.slice((trackingKwPage - 1) * itemsPerPage, trackingKwPage * itemsPerPage).map((kw, i) => (
                                                <tr key={i} className="border-b border-[#F3F4F6] hover:bg-[#FAFBFC]">
                                                    <td className={`sticky left-0 z-10 bg-white hover:bg-[#FAFBFC] px-4 ${cp ? 'py-1.5' : 'py-2'}`}>
                                                        <span className="text-[13px] font-medium text-[#111827] truncate block max-w-[280px]" title={kw.keyword}>{kw.keyword}</span>
                                                    </td>
                                                    <td className={`text-center px-4 ${cp ? 'py-1.5' : 'py-2'} text-[12px] font-normal text-[#4B5563] border-r border-[#E5E7EB]`}>
                                                        {kw.impressions ? kw.impressions.toLocaleString() : '-'}
                                                    </td>
                                                    {matrixDates.map((date, idx) => {
                                                        // Robust lookup: find the latest rank record that is <= this column's date
                                                        const historyForDate = (kw.history || []).find(h => h.date <= date)
                                                        const pos = historyForDate && historyForDate.position ? Math.round(historyForDate.position) : '-'
                                                        const colorStyle = getMatrixCellColor(pos)

                                                        return (
                                                            <td key={idx} className="p-1 text-center">
                                                                <div className="w-full h-full rounded flex items-center justify-center font-mono-data text-[12px] font-medium min-h-[32px] transition-colors" style={{ backgroundColor: colorStyle.bg, color: colorStyle.text }}>
                                                                    {pos}
                                                                </div>
                                                            </td>
                                                        )
                                                    })}
                                                    <td></td>
                                                    <td className="px-2 text-center border-l border-[#E5E7EB]">
                                                        <button onClick={() => handleUntrackKeyword(kw.keyword)} title="Delete keyword" className="p-1 hover:bg-[#FEE2E2] rounded text-[#9CA3AF] hover:text-[#DC2626] transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                                {trackingViewMode !== 'category' && (
                                    <Pagination
                                        totalItems={filteredTracking?.length || 0}
                                        currentPage={trackingKwPage}
                                        onPageChange={setTrackingKwPage}
                                        itemsPerPage={itemsPerPage}
                                        setItemsPerPage={setItemsPerPage}
                                    />
                                )}
                                {trackingViewMode === 'category' && (
                                    <div>
                                        {categories.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-24 border border-[#E5E7EB] rounded-xl bg-white">
                                                <div className="w-20 h-20 rounded-2xl bg-[#FEF3C7] flex items-center justify-center mb-6"><Tag className="w-10 h-10 text-[#D97706]" /></div>
                                                <h3 className="text-[20px] font-semibold text-[#111827] mb-2 tracking-[-0.01em]">Organize Keywords by Category</h3>
                                                <p className="text-[13px] text-[#4B5563] max-w-md text-center mb-2 font-normal">Create custom categories like "Blog Keywords", "Landing Pages", or "Product Pages" to group and monitor keyword performance by business intent.</p>
                                                <div className="flex items-center gap-2 mb-8 px-3 py-1.5 bg-[#F9FAFB] rounded-lg"><Info className="w-3 h-3 text-[#9CA3AF]" /><span className="text-[11px] text-[#9CA3AF] font-normal">Categories help you see how different content types perform in search.</span></div>
                                                <button onClick={openCategoryModal} className="flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-medium rounded-lg shadow-sm transition-colors"><Plus className="w-4 h-4" />Create Your First Category</button>
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="flex items-center justify-between mb-5">
                                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB]"><Info className="w-3 h-3 text-[#9CA3AF]" /><span className="text-[11px] text-[#9CA3AF] font-normal">Assign keywords to categories from the Add Keywords modal.</span></div>
                                                    <button onClick={openCategoryModal} className="flex items-center gap-1.5 px-3 py-2 border border-[#E5E7EB] rounded-lg text-[13px] font-medium text-[#4B5563] hover:border-[#D1D5DB] bg-white"><Plus className="w-3.5 h-3.5" />Add Category</button>
                                                </div>
                                                <div className="grid grid-cols-3 gap-5">
                                                    {categories.map((cat) => {
                                                        const stats = getCategoryStats(cat.name)
                                                        return (
                                                            <div key={cat.id} className={`bg-white rounded-xl ${cp ? 'p-4' : 'p-5'} border border-[#E5E7EB] hover:border-[#D1D5DB] transition-all group`} style={{ boxShadow: 'var(--shadow-sm)' }}>
                                                                <div className="flex items-center justify-between mb-4">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }}></div>
                                                                        <h4 className="text-[14px] font-semibold text-[#111827]">{cat.name}</h4>
                                                                    </div>
                                                                    <div className="flex items-center gap-1">
                                                                        <span className="text-[11px] text-[#9CA3AF] bg-[#F9FAFB] px-2 py-0.5 rounded-full font-normal tabular-nums">{stats.count} keywords</span>
                                                                        <button onClick={() => handleDeleteCategory(cat.id)} className="p-1 rounded hover:bg-[#FEE2E2] opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3 text-[#DC2626]" /></button>
                                                                    </div>
                                                                </div>
                                                                {cat.description && <p className="text-[11px] text-[#6B7280] mb-3 font-normal">{cat.description}</p>}
                                                                <div className="grid grid-cols-3 gap-3 mb-4">
                                                                    <div><p className="text-[10px] font-medium text-[#9CA3AF] uppercase tracking-wider">Avg Pos</p><p className="text-[18px] font-semibold text-[#111827] tabular-nums tracking-[-0.02em]">{stats.avgPos}</p></div>
                                                                    <div><p className="text-[10px] font-medium text-[#9CA3AF] uppercase tracking-wider">Impr.</p><p className="text-[18px] font-semibold text-[#111827] tabular-nums tracking-[-0.02em]">{stats.impressions >= 1000 ? (stats.impressions / 1000).toFixed(1) + 'K' : stats.impressions}</p></div>
                                                                    <div><p className="text-[10px] font-medium text-[#9CA3AF] uppercase tracking-wider">Clicks</p><p className="text-[18px] font-semibold text-[#111827] tabular-nums tracking-[-0.02em]">{stats.clicks}</p></div>
                                                                </div>
                                                                <div className="mb-3"><div className="flex h-2 rounded-full overflow-hidden bg-[#F3F4F6]">
                                                                    {['#059669', '#0284C7', '#D97706', '#DC2626'].map((color, j) => {
                                                                        const widthPct = stats.count > 0 ? (stats.distribution[j] / stats.count) * 100 : 0
                                                                        return <div key={j} className="h-full" style={{ backgroundColor: color, opacity: 0.6, width: `${widthPct}%` }}></div>
                                                                    })}
                                                                </div></div>
                                                                <button onClick={() => { handleCategoryCardClick(cat.name); setTrackingViewMode('standard') }} className="text-[12px] font-medium text-[#2563EB] flex items-center gap-1">View Keywords <ChevronRight className="w-3 h-3" /></button>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}



            {/* TAB 4: LOCATIONS VIEW */}
            {kwTab === 'locations' && (
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <h2 className="text-[18px] font-bold text-[#111827] tracking-tight">{isTrial ? 'Trial View: Top 25 Keywords per Country' : 'Geographic Performance'}</h2>
                            {isTrial && <span className="px-2 py-0.5 bg-[#EFF6FF] text-[#2563EB] text-[10px] font-bold rounded-md border border-[#DBEAFE] uppercase tracking-wider">TRIAL MODE</span>}
                        </div>
                    </div>
                    {!isGscConnected ? (
                        <div className="flex flex-col items-center justify-center py-24 bg-white border border-[#E5E7EB] rounded-2xl">
                            <div className="w-20 h-20 rounded-2xl bg-[#EFF6FF] flex items-center justify-center mb-6"><Globe className="w-10 h-10 text-[#2563EB]" /></div>
                            <h3 className="text-[20px] font-semibold text-[#111827] mb-2 tracking-[-0.01em]">Unlock Geographic Intelligence</h3>
                            <p className="text-[13px] text-[#4B5563] max-w-sm text-center mb-6 font-normal">Connect Search Console to see exactly which countries are driving your keyword rankings.</p>
                            <button onClick={handleConnectGSC} className="flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-medium rounded-lg shadow-sm">
                                <Globe className="w-4 h-4" />Connect Search Console
                            </button>
                        </div>
                    ) : isLoadingLoc ? (
                        <div className="flex flex-col items-center justify-center py-24 bg-white border border-[#E5E7EB] rounded-2xl">
                            <Loader2 className="w-8 h-8 text-[#2563EB] animate-spin mb-4" />
                            <p className="text-[13px] font-medium text-[#111827]">Analyzing Global Data...</p>
                            <p className="text-[12px] text-[#6B7280]">Fetching location metrics from Google Search Console</p>
                        </div>
                    ) : !selectedLocation ? (
                        // --- LOCATIONS OVERVIEW GRID ---
                        <div>
                            <div className="flex items-center gap-3 p-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl mb-5">
                                <Info className="w-4 h-4 text-[#9CA3AF] mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-[13px] text-[#4B5563] font-normal">Locations data is pulled directly from Search Console for the last 30 days.</p>
                                    <p className="text-[11px] text-[#9CA3AF] mt-1 font-normal">Select a country card to see the specific keywords ranking in that region.</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-[#EFF6FF] border border-[#2563EB]/20 rounded-lg">
                                    <MapPin className="w-3.5 h-3.5 text-[#2563EB]" />
                                    <span className="text-[12px] font-semibold text-[#2563EB] tracking-wide">
                                        Data from {meaningfulLocations.length} Countries
                                    </span>
                                </div>
                                <button onClick={fetchLocations} className="px-3 py-1.5 text-[11px] font-medium text-[#4B5563] border border-[#E5E7EB] rounded-lg hover:border-[#D1D5DB] bg-white transition-colors">
                                    Refresh Data
                                </button>
                            </div>

                            {meaningfulLocations.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-24 bg-white border border-[#E5E7EB] rounded-2xl">
                                    <p className="text-[14px] text-[#6B7280]">No location data found in Search Console for the last 30 days.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-4 gap-4">
                                    {meaningfulLocations.map((loc) => {
                                        const countryInfo = gscCountryMap[loc.countryCode] || { name: (loc.countryCode || 'Unknown').toUpperCase(), emoji: '🌍' }
                                        return (
                                            <div
                                                key={loc.countryCode}
                                                onClick={() => setSelectedLocation(loc.countryCode)}
                                                className="bg-white rounded-xl p-5 border border-[#E5E7EB] hover:border-[#2563EB] hover:ring-1 hover:ring-[#2563EB]/20 transition-all cursor-pointer group flex flex-col"
                                                style={{ boxShadow: 'var(--shadow-sm)' }}
                                            >
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[28px] leading-none filter drop-shadow-sm">{countryInfo.emoji}</span>
                                                        <h4 className="text-[15px] font-semibold text-[#111827] leading-tight truncate max-w-[120px]">{countryInfo.name}</h4>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4 mb-5 flex-1">
                                                    <div>
                                                        <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-1">Keywords</p>
                                                        <p className="text-[20px] font-bold text-[#111827] tabular-nums tracking-tight">{(loc.keywordCount || 0).toLocaleString()}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wider mb-1">Avg Pos.</p>
                                                        <p className="text-[20px] font-bold text-[#2563EB] tabular-nums tracking-tight">{loc.avgPosition}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between border-t border-[#F3F4F6] pt-3 mt-auto">
                                                    <div className="flex gap-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Clicks</span>
                                                            <span className="text-[13px] font-medium text-[#4B5563]">{formatNumber(loc.clicks)}</span>
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-[9px] font-semibold text-[#9CA3AF] uppercase tracking-wider">Impressions</span>
                                                            <span className="text-[13px] font-medium text-[#4B5563]">{formatNumber(loc.impressions)}</span>
                                                        </div>
                                                    </div>
                                                    <div className="w-6 h-6 rounded-full bg-[#F3F4F6] group-hover:bg-[#EFF6FF] flex items-center justify-center transition-colors">
                                                        <ChevronRight className="w-3.5 h-3.5 text-[#9CA3AF] group-hover:text-[#2563EB]" />
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    ) : (
                        // --- LOCATIONS DRILL-DOWN TABLE ---
                        <div>
                            {(() => {
                                const selectedData = locations.find(l => l.countryCode === selectedLocation)
                                if (!selectedData) return null
                                const cInfo = gscCountryMap[selectedData.countryCode] || { name: selectedData.countryCode.toUpperCase(), emoji: '🌍' }
                                return (
                                    <>
                                        <div className="flex items-center justify-between mb-5">
                                            <div className="flex items-center gap-3">
                                                <button onClick={() => setSelectedLocation(null)} className="p-1.5 hover:bg-[#E5E7EB] rounded-lg transition-colors border border-transparent hover:border-[#D1D5DB]"><ArrowLeft className="w-5 h-5 text-[#4B5563]" /></button>
                                                <div className="flex items-center gap-2.5">
                                                    <span className="text-[24px] filter drop-shadow-sm">{cInfo.emoji}</span>
                                                    <h3 className="text-[20px] font-semibold text-[#111827] tracking-tight">{cInfo.name} Rankings</h3>
                                                    <span className="ml-2 px-2.5 py-1 text-[11px] font-semibold bg-[#F3F4F6] text-[#4B5563] rounded-md border border-[#E5E7EB]">{selectedData.keywordCount} Keywords</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-white rounded-xl border border-[#E5E7EB] overflow-hidden" style={{ boxShadow: 'var(--shadow-sm)' }}>
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                                                        <th className={`text-left px-5 ${cp ? 'py-2' : 'py-3.5'} text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider`}>Keyword</th>
                                                        <th className={`text-left px-5 ${cp ? 'py-2' : 'py-3.5'} text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider`}>Ranking Page</th>
                                                        <th className={`text-center px-4 ${cp ? 'py-2' : 'py-3.5'} text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider w-[120px]`}>Local Position</th>
                                                        <th className={`text-right px-4 ${cp ? 'py-2' : 'py-3.5'} text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider`}>Impressions</th>
                                                        <th className={`text-right px-4 ${cp ? 'py-2' : 'py-3.5'} text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider`}>Clicks</th>
                                                        <th className={`text-right px-4 ${cp ? 'py-2' : 'py-3.5'} text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider`}>CTR</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(() => {
                                                        const list = isTrial ? (selectedData?.keywords || []).slice(0, 25) : (selectedData?.keywords || []);
                                                        return (
                                                            <>
                                                                {list.slice((locationsKwPage - 1) * itemsPerPage, locationsKwPage * itemsPerPage).map((kw, i) => (
                                                                    <tr key={i} className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB] transition-colors">
                                                                        <td className={`px-5 ${cp ? 'py-2.5' : 'py-4'} text-[13px] font-medium text-[#111827]`}>{kw.keyword}</td>
                                                                        <td className={`px-5 ${cp ? 'py-2.5' : 'py-4'} text-[13px] font-medium`}>
                                                                            {kw.page ? (
                                                                                <a
                                                                                    href={kw.page}
                                                                                    target="_blank"
                                                                                    rel="noopener noreferrer"
                                                                                    className="text-[#2563EB] hover:text-[#1D4ED8] hover:underline focus:outline-none"
                                                                                    title={kw.page}
                                                                                    onClick={(e) => e.stopPropagation()}
                                                                                >
                                                                                    Visit Page
                                                                                </a>
                                                                            ) : '-'}
                                                                        </td>
                                                                        <td className={`text-center px-4 ${cp ? 'py-2.5' : 'py-4'}`}>
                                                                            <span className="font-mono-data text-[13px] font-bold" style={{ color: (kw.position || 0) <= 3 ? '#059669' : '#111827' }}>#{kw.position && kw.position.toFixed ? parseFloat(kw.position.toFixed(1)) : (kw.position || 0)}</span>
                                                                        </td>
                                                                        <td className={`text-right px-4 ${cp ? 'py-2.5' : 'py-4'} table-num font-medium text-[#4B5563]`}>{kw.impressions ? kw.impressions.toLocaleString() : '-'}</td>
                                                                        <td className={`text-right px-4 ${cp ? 'py-2.5' : 'py-4'} table-num font-medium text-[#4B5563]`}>{kw.clicks ? kw.clicks.toLocaleString() : '-'}</td>
                                                                        <td className={`text-right px-4 ${cp ? 'py-2.5' : 'py-4'} table-num font-medium text-[#9CA3AF]`}>{kw.ctr ? (kw.ctr * 100).toFixed(2) + '%' : '-'}</td>
                                                                    </tr>
                                                                ))}
                                                                {isTrial && (selectedData?.keywords || []).length > 25 && (
                                                                    <tr>
                                                                        <td colSpan="6" className="px-5 py-4 text-center bg-[#F9FAFB]">
                                                                            <p className="text-[12px] text-[#6B7280]">Trial limited to Top 25 keywords. <button onClick={() => navigate('/settings')} className="text-[#2563EB] font-semibold hover:underline">Upgrade to see all {(selectedData?.keywords || []).length} keywords</button></p>
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                            </>
                                                        )
                                                    })()}
                                                </tbody>
                                            </table>
                                            <Pagination
                                                totalItems={isTrial ? Math.min(selectedData?.keywords?.length || 0, 25) : selectedData?.keywords?.length || 0}
                                                currentPage={locationsKwPage}
                                                onPageChange={setLocationsKwPage}
                                                itemsPerPage={itemsPerPage}
                                                setItemsPerPage={setItemsPerPage}
                                            />
                                        </div>
                                    </>
                                )
                            })()}
                        </div>
                    )}
                </div>
            )}



            {/* ═══ ADD KEYWORDS MODAL ═══ */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" style={{ backdropFilter: 'blur(4px)' }}>
                    <div className="bg-white rounded-2xl w-[620px] max-h-[85vh] overflow-hidden flex flex-col" style={{ boxShadow: 'var(--shadow-lg)' }}>
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] flex-shrink-0">
                            <div className="flex items-center gap-2">
                                <Plus className="w-5 h-5 text-[#2563EB]" />
                                <h3 className="text-[16px] font-semibold text-[#111827]">Add Keywords to Track</h3>
                            </div>
                            <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-[#F9FAFB] rounded-lg"><X className="w-5 h-5 text-[#9CA3AF]" /></button>
                        </div>

                        {/* Mode Toggle */}
                        <div className="px-6 pt-5 pb-0 flex-shrink-0">
                            <div className="flex items-center gap-1 bg-[#F3F4F6] rounded-lg p-1 w-fit">
                                <button onClick={() => setAddMode('single')} className={`px-4 py-2 rounded-md text-[13px] font-medium transition-all ${addMode === 'single' ? 'bg-white text-[#111827] shadow-sm' : 'text-[#6B7280] hover:text-[#111827]'}`}>
                                    <span className="flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" />Single</span>
                                </button>
                                <button onClick={() => setAddMode('bulk')} className={`px-4 py-2 rounded-md text-[13px] font-medium transition-all ${addMode === 'bulk' ? 'bg-white text-[#111827] shadow-sm' : 'text-[#6B7280] hover:text-[#111827]'}`}>
                                    <span className="flex items-center gap-1.5"><Upload className="w-3.5 h-3.5" />Bulk Import</span>
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="px-6 py-5 overflow-y-auto flex-1">
                            {addMode === 'single' ? (
                                <div className="space-y-4">
                                    {singleEntries.map((entry, idx) => (
                                        <div key={idx} className={`${singleEntries.length > 1 ? 'p-4 bg-[#F9FAFB] rounded-xl border border-[#E5E7EB]' : ''}`}>
                                            {singleEntries.length > 1 && (
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className="text-[11px] font-medium text-[#9CA3AF] uppercase">Keyword {idx + 1}</span>
                                                    <button onClick={() => removeSingleEntry(idx)} className="p-0.5 hover:bg-white rounded"><X className="w-3.5 h-3.5 text-[#9CA3AF]" /></button>
                                                </div>
                                            )}
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="block text-[12px] font-medium text-[#374151] mb-1.5">Primary Keyword <span className="text-[#DC2626]">*</span></label>
                                                    <input
                                                        type="text" placeholder="e.g. led tv repair near me"
                                                        value={entry.keyword}
                                                        onChange={(e) => updateSingleEntry(idx, 'keyword', e.target.value)}
                                                        className="w-full px-3 py-2.5 border border-[#E5E7EB] rounded-lg text-[13px] font-normal placeholder-[#9CA3AF] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/20 bg-white"
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="block text-[12px] font-medium text-[#374151] mb-1.5">Category</label>
                                                        <select
                                                            value={entry.category}
                                                            onChange={(e) => updateSingleEntry(idx, 'category', e.target.value)}
                                                            className="w-full px-3 py-2.5 border border-[#E5E7EB] rounded-lg text-[13px] font-normal text-[#4B5563] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/20 bg-white appearance-none cursor-pointer"
                                                        >
                                                            <option value="">Select category...</option>
                                                            {allCategoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[12px] font-medium text-[#374151] mb-1.5">Expected URL <span className="text-[11px] text-[#9CA3AF] font-normal">(optional)</span></label>
                                                        <input
                                                            type="text" placeholder="https://example.com/page"
                                                            value={entry.expectedUrl}
                                                            onChange={(e) => updateSingleEntry(idx, 'expectedUrl', e.target.value)}
                                                            className="w-full px-3 py-2.5 border border-[#E5E7EB] rounded-lg text-[13px] font-normal placeholder-[#9CA3AF] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/20 bg-white"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <button onClick={addSingleEntry} className="w-full flex items-center justify-center gap-1.5 py-2.5 border-2 border-dashed border-[#E5E7EB] rounded-xl text-[13px] font-medium text-[#6B7280] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors">
                                        <Plus className="w-3.5 h-3.5" />Add Another Keyword
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[12px] font-medium text-[#374151] mb-1.5">Default Category for Bulk Import</label>
                                        <select
                                            value={bulkCategory}
                                            onChange={(e) => setBulkCategory(e.target.value)}
                                            className="w-full px-3 py-2.5 border border-[#E5E7EB] rounded-lg text-[13px] font-normal text-[#4B5563] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/20 bg-white appearance-none cursor-pointer"
                                        >
                                            <option value="">Select category...</option>
                                            {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[12px] font-medium text-[#374151] mb-1.5">Keywords <span className="text-[#DC2626]">*</span></label>
                                        <textarea
                                            value={bulkText}
                                            onChange={(e) => setBulkText(e.target.value)}
                                            placeholder={`Enter one keyword per line:\n\nled tv repair near me\nsmart tv service center\nlcd panel replacement cost\n\nOr use CSV format:\nkeyword, category, expected_url`}
                                            className="w-full px-3 py-3 border border-[#E5E7EB] rounded-lg text-[13px] font-normal placeholder-[#9CA3AF] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/20 bg-white resize-none font-mono"
                                            rows={10}
                                        />
                                    </div>
                                    <div className="flex items-start gap-2 px-3 py-2.5 bg-[#F9FAFB] rounded-lg">
                                        <Info className="w-3.5 h-3.5 text-[#9CA3AF] mt-0.5 flex-shrink-0" />
                                        <div className="text-[11px] text-[#6B7280] font-normal leading-relaxed">
                                            <p><strong>Simple:</strong> One keyword per line</p>
                                            <p><strong>CSV:</strong> keyword, category, expected_url</p>
                                            <p className="text-[#9CA3AF] mt-1">{bulkText.split('\n').filter(l => l.trim()).length} keyword{bulkText.split('\n').filter(l => l.trim()).length !== 1 ? 's' : ''} detected</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Error / Success messages */}
                            {saveError && <div className="mt-4 px-3 py-2 bg-[#FEF2F2] border border-[#FECACA] rounded-lg text-[12px] text-[#DC2626] font-medium">{saveError}</div>}
                            {saveSuccess && <div className="mt-4 px-3 py-2 bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg text-[12px] text-[#059669] font-medium flex items-center gap-1.5"><Check className="w-3.5 h-3.5" />{saveSuccess}</div>}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-[#E5E7EB] flex items-center justify-between flex-shrink-0 bg-[#F9FAFB]">
                            <span className="text-[11px] text-[#9CA3AF] font-normal">
                                {addMode === 'single'
                                    ? `${singleEntries.filter(e => e.keyword.trim()).length} keyword${singleEntries.filter(e => e.keyword.trim()).length !== 1 ? 's' : ''} ready`
                                    : `${bulkText.split('\n').filter(l => l.trim()).length} keywords detected`
                                }
                            </span>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setShowAddModal(false)} className="px-4 py-2 border border-[#E5E7EB] rounded-lg text-[13px] font-medium text-[#4B5563] hover:bg-white">Cancel</button>
                                <button onClick={handleSaveKeywords} disabled={isSaving} className="flex items-center gap-1.5 px-5 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
                                    {isSaving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving...</> : <><Plus className="w-3.5 h-3.5" />Add to Tracking</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ CREATE CATEGORY MODAL ═══ */}
            {showCategoryModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" style={{ backdropFilter: 'blur(4px)' }}>
                    <div className="bg-white rounded-2xl w-[460px] overflow-hidden" style={{ boxShadow: 'var(--shadow-lg)' }}>
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
                            <div className="flex items-center gap-2">
                                <Tag className="w-5 h-5 text-[#D97706]" />
                                <h3 className="text-[16px] font-semibold text-[#111827]">Create Category</h3>
                            </div>
                            <button onClick={() => setShowCategoryModal(false)} className="p-1 hover:bg-[#F9FAFB] rounded-lg"><X className="w-5 h-5 text-[#9CA3AF]" /></button>
                        </div>

                        {/* Body */}
                        <div className="px-6 py-5 space-y-4">
                            <div>
                                <label className="block text-[12px] font-medium text-[#374151] mb-1.5">Category Name <span className="text-[#DC2626]">*</span></label>
                                <input
                                    type="text" placeholder="e.g. Blog Keywords"
                                    value={catName}
                                    onChange={(e) => { setCatName(e.target.value); setCatSaveError('') }}
                                    className="w-full px-3 py-2.5 border border-[#E5E7EB] rounded-lg text-[13px] font-normal placeholder-[#9CA3AF] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/20 bg-white"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-[12px] font-medium text-[#374151] mb-1.5">Description <span className="text-[11px] text-[#9CA3AF] font-normal">(optional)</span></label>
                                <input
                                    type="text" placeholder="e.g. Tracks keywords for blog articles"
                                    value={catDescription}
                                    onChange={(e) => setCatDescription(e.target.value)}
                                    className="w-full px-3 py-2.5 border border-[#E5E7EB] rounded-lg text-[13px] font-normal placeholder-[#9CA3AF] focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/20 bg-white"
                                />
                            </div>
                            <div>
                                <label className="block text-[12px] font-medium text-[#374151] mb-2">Color</label>
                                <div className="flex items-center gap-2">
                                    {catColors.map(c => (
                                        <button key={c.color} onClick={() => setCatColor(c.color)}
                                            className={`w-7 h-7 rounded-full transition-all ${catColor === c.color ? 'ring-2 ring-offset-2 ring-[#2563EB] scale-110' : 'hover:scale-110'}`}
                                            style={{ backgroundColor: c.color }} title={c.label}
                                        />
                                    ))}
                                </div>
                            </div>

                            {catSaveError && <div className="px-3 py-2 bg-[#FEF2F2] border border-[#FECACA] rounded-lg text-[12px] text-[#DC2626] font-medium">{catSaveError}</div>}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-[#E5E7EB] flex items-center justify-end gap-2 bg-[#F9FAFB]">
                            <button onClick={() => setShowCategoryModal(false)} className="px-4 py-2 border border-[#E5E7EB] rounded-lg text-[13px] font-medium text-[#4B5563] hover:bg-white">Cancel</button>
                            <button onClick={handleCreateCategory} className="flex items-center gap-1.5 px-5 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-medium rounded-lg">
                                <Plus className="w-3.5 h-3.5" />Create Category
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
