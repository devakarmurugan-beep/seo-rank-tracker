/**
 * Classifies a search query into an intent category based on a strict
 * rule-based priority hierarchy (Navigational -> Transactional -> Commercial -> Informational).
 */
export const classifyKeywordIntent = (keyword, brandVariations = []) => {
    if (!keyword) return 'Informational'

    let normalized = keyword.toLowerCase().trim().replace(/[^\w\s]/gi, '').replace(/\s+/g, ' ')

    // NAVIGATIONAL (Highest Priority)
    const navKeywords = ['login', 'sign in', 'dashboard', 'official site', 'homepage', 'customer support', 'contact us']
    const isBrand = brandVariations.some(brand => normalized.includes(brand.toLowerCase()))
    if (isBrand || navKeywords.some(w => normalized.includes(w))) {
        return 'Navigational'
    }

    // TRANSACTIONAL (High Intent - Revenue)
    const transKeywords = [
        'buy', 'purchase', 'pricing', 'price', 'cost', 'subscription', 'order',
        'coupon', 'discount', 'free trial', 'demo', 'get started', 'download',
        'book', 'hire', 'near me', 'quote', 'repair', 'fixing', 'repairing'
    ]
    if (transKeywords.some(w => normalized.includes(w))) {
        return 'Transactional'
    }

    // COMMERCIAL (Comparison / Evaluation)
    const commKeywords = [
        'best', 'top', 'review', 'reviews', 'comparison', 'compare', 'vs',
        'alternative', 'alternatives', 'software', 'tool', 'tools', 'solution',
        'platform', 'services', 'service', 'center', 'centre', 'agency', 'training'
    ]
    if (commKeywords.some(w => normalized.includes(w))) {
        return 'Commercial'
    }

    // INFORMATIONAL (Research Phase)
    const infoKeywords = [
        'how', 'what', 'why', 'when', 'guide', 'tutorial', 'tips',
        'examples', 'checklist', 'template', 'meaning', 'definition', 'ideas'
    ]
    if (infoKeywords.some(w => normalized.includes(w))) {
        return 'Informational'
    }

    return 'Informational'
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
