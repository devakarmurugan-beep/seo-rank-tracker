import { google } from 'googleapis'

/**
 * Helper utility to authenticate a Google API client using a stored refresh token
 */
export const getAuthenticatedGSCClient = (refreshToken) => {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GCP_CLIENT_ID,
        process.env.GCP_CLIENT_SECRET,
        process.env.GCP_REDIRECT_URI
    )

    // We only need the refresh token. Google's library will automatically 
    // fetch a new access token for us before making the API call!
    oauth2Client.setCredentials({
        refresh_token: refreshToken
    })

    return google.webmasters({
        version: 'v3',
        auth: oauth2Client
    })
}

/**
 * Fetches the keyword metrics (clicks, impressions, ctr, position)
 * for a specific domain for a specific date range.
 */
export const fetchGSCRankingData = async (gscClient, siteUrl, startDate, endDate, keyword = null) => {
    try {
        const body = {
            startDate: startDate,
            endDate: endDate,
            dimensions: ['date', 'query', 'page'],
            rowLimit: 25000,
        }

        if (keyword) {
            body.dimensionFilterGroups = [{
                filters: [{
                    dimension: 'query',
                    operator: 'contains',
                    expression: keyword
                }]
            }]
        }

        const [historyRes, pagesRes] = await Promise.all([
            gscClient.searchanalytics.query({
                siteUrl: siteUrl,
                requestBody: body
            }),
            gscClient.searchanalytics.query({
                siteUrl: siteUrl,
                requestBody: {
                    startDate: startDate,
                    endDate: endDate,
                    dimensions: ['page'],
                    rowLimit: 25000,
                }
            })
        ])

        const keywordLower = keyword ? keyword.toLowerCase() : null
        const historyRows = (historyRes.data.rows || [])
            .filter(row => !keywordLower || (row.keys[1] && row.keys[1].toLowerCase() === keywordLower))
            .map(row => ({
                date: row.keys[0],
                keyword: row.keys[1],
                page_url: row.keys[2],
                clicks: row.clicks,
                impressions: row.impressions,
                ctr: row.ctr,
                position: row.position
            }))

        const pageRows = (pagesRes.data.rows || []).map(row => row.keys[0])

        return { history: historyRows, pages: pageRows }

    } catch (error) {
        console.error(`GSC API Fetch Error for site ${siteUrl}:`, error.message)
        throw error
    }
}

/**
 * Classifies a search query into an intent category based on a strict 
 * rule-based priority hierarchy (Navigational -> Transactional -> Commercial -> Informational).
 */
export const classifyKeywordIntent = (keyword, brandVariations = []) => {
    if (!keyword) return 'Informational'

    // 1. Preprocessing Rules
    let normalized = keyword.toLowerCase().trim().replace(/[^\w\s]/gi, '').replace(/\s+/g, ' ')

    // 2. NAVIGATIONAL (Highest Priority)
    const navKeywords = ['login', 'sign in', 'dashboard', 'official site', 'homepage', 'customer support', 'contact us']
    // If exact brand domain match or contains brand variations
    const isBrand = brandVariations.some(brand => normalized.includes(brand.toLowerCase()))
    if (isBrand || navKeywords.some(w => normalized.includes(w))) {
        return 'Navigational'
    }

    // 3. TRANSACTIONAL (High Intent - Revenue)
    const transKeywords = [
        'buy', 'purchase', 'pricing', 'price', 'cost', 'subscription', 'order',
        'coupon', 'discount', 'free trial', 'demo', 'get started', 'download',
        'book', 'hire', 'near me', 'quote', 'repair', 'fixing', 'repairing'
    ]
    if (transKeywords.some(w => normalized.includes(w))) {
        return 'Transactional'
    }

    // 4. COMMERCIAL (Comparison / Evaluation)
    const commKeywords = [
        'best', 'top', 'review', 'reviews', 'comparison', 'compare', 'vs',
        'alternative', 'alternatives', 'software', 'tool', 'tools', 'solution',
        'platform', 'services', 'service', 'center', 'centre', 'agency', 'training'
    ]
    if (commKeywords.some(w => normalized.includes(w))) {
        return 'Commercial'
    }

    // 5. INFORMATIONAL (Default / Research Phase)
    const infoKeywords = [
        'how', 'what', 'why', 'when', 'guide', 'tutorial', 'tips',
        'examples', 'checklist', 'template', 'meaning', 'definition', 'ideas'
    ]
    if (infoKeywords.some(w => normalized.includes(w))) {
        return 'Informational'
    }

    // Default Fallback
    return 'Informational'
}

/**
 * Fetches the list of sites that the authenticated user has access to.
 */
export const fetchGSCSites = async (gscClient) => {
    try {
        const response = await gscClient.sites.list()
        return response.data.siteEntry || []
    } catch (error) {
        console.error('Error fetching GSC sites:', error.message)
        throw error
    }
}

/**
 * Maps 3-letter GSC country codes to country names and flag emojis.
 */
export const gscCountryMap = {
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
