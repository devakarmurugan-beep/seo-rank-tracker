// Admin Emails (Synced with frontend src/lib/permissions.js)
export const ADMIN_EMAILS = [
    'devakarmurugan@gmail.com',
    'sylvester.jayan@hilabs.com'
]

/**
 * Extracts a clean domain stem and generates smart brand variations
 * for filtering branded keywords.
 */
export const buildBrandVariations = (propertyUrl, extraVariations = []) => {
    const domainClean = propertyUrl
        .replace(/^https?:\/\//, '').replace(/^sc-domain:/, '').replace(/^www\./, '')
        .replace(/\/.*$/, '').replace(/\.com$|\.in$|\.org$|\.net$|\.co$/g, '').trim().toLowerCase()

    const vars = [...extraVariations.map(b => b.toLowerCase()), domainClean]

    const suffixes = [
        'tvservicecenter', 'servicecenter', 'servicecentre', 'services', 'service',
        'online', 'india', 'tech', 'digital', 'agency', 'studio', 'media',
        'group', 'solutions', 'hq'
    ]
    for (const suffix of suffixes) {
        if (domainClean.endsWith(suffix) && domainClean.length > suffix.length + 2) {
            vars.push(domainClean.slice(0, -suffix.length))
            break
        }
    }

    return [...new Set(vars)].filter(v => v.length >= 3)
}

/**
 * Builds a shorter brand-vars list for trial/location filtering
 * (domain stem + optional spaced version).
 */
export const buildSimpleBrandVars = (propertyUrl) => {
    const domainClean = propertyUrl
        .replace(/^https?:\/\//, '').replace(/^sc-domain:/, '').replace(/^www\./, '')
        .replace(/\/.*$/, '').replace(/\.com$|\.in$|\.org$|\.net$|\.co$/g, '').trim().toLowerCase()

    const vars = [domainClean]
    const spaced = domainClean.replace(
        /([a-z])(fuse|tech|web|net|pro|ai|lab|box|hub|bit|app|dev|gen|id|go|my|gown|gowns)/gi,
        '$1 $2'
    )
    if (spaced !== domainClean) vars.push(spaced.toLowerCase())
    return vars
}

/**
 * Filters out branded keywords from an array of keyword objects.
 */
export const filterNonBranded = (keywords, brandVars) => {
    return keywords.filter(kw => {
        const text = kw.keyword.toLowerCase()
        return !brandVars.some(b => text.includes(b.toLowerCase()))
    })
}

/**
 * Normalizes a GSC siteUrl (strips trailing slash from sc-domain: URLs).
 */
export const normalizeSiteUrl = (siteUrl) => {
    if (siteUrl.startsWith('sc-domain:') && siteUrl.endsWith('/')) {
        return siteUrl.slice(0, -1)
    }
    return siteUrl
}
