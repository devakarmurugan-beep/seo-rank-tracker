import { XMLParser } from 'fast-xml-parser'

/**
 * Paginated GSC search analytics query. Loops with startRow until all rows
 * are fetched (or maxRows reached). Returns raw row objects from the API.
 */
export const fetchSearchAnalyticsPaginated = async (gscClient, siteUrl, requestBody, maxRows = 100000) => {
    const PAGE_SIZE = 25000
    const allRows = []
    let startRow = 0

    while (startRow < maxRows) {
        const res = await gscClient.searchanalytics.query({
            siteUrl,
            requestBody: { ...requestBody, rowLimit: PAGE_SIZE, startRow }
        })
        const rows = res.data.rows || []
        allRows.push(...rows)

        if (rows.length < PAGE_SIZE) break
        startRow += PAGE_SIZE
    }

    return allRows
}

/**
 * Fetches keyword metrics (clicks, impressions, ctr, position)
 * for a specific domain and date range.
 * Returns { history: [], pages: [] }
 */
export const fetchRankingData = async (gscClient, siteUrl, startDate, endDate, keyword = null, searchType = 'web') => {
    try {
        const body = {
            startDate,
            endDate,
            dimensions: ['date', 'query', 'page', 'device'],
            type: searchType,
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

        const [historyRows, pageRows] = await Promise.all([
            fetchSearchAnalyticsPaginated(gscClient, siteUrl, body),
            fetchSearchAnalyticsPaginated(gscClient, siteUrl, {
                startDate, endDate, dimensions: ['page']
            })
        ])

        const keywordLower = keyword ? keyword.toLowerCase() : null
        const history = historyRows
            .filter(row => !keywordLower || (row.keys[1] && row.keys[1].toLowerCase() === keywordLower))
            .map(row => ({
                date: row.keys[0],
                keyword: row.keys[1],
                page_url: row.keys[2],
                device: row.keys[3]?.toLowerCase() || 'all',
                clicks: row.clicks,
                impressions: row.impressions,
                ctr: row.ctr,
                position: row.position,
                search_type: searchType
            }))

        const pages = pageRows.map(row => ({
            page_url: row.keys[0],
            clicks: row.clicks,
            impressions: row.impressions,
            ctr: row.ctr,
            position: row.position
        }))

        return { history, pages }
    } catch (error) {
        console.error(`GSC API Fetch Error for site ${siteUrl}:`, error.message)
        throw error
    }
}

/**
 * Fetches the list of sites the authenticated user has access to.
 */
export const fetchSites = async (gscClient) => {
    try {
        const response = await gscClient.sites.list()
        return response.data.siteEntry || []
    } catch (error) {
        console.error('Error fetching GSC sites:', error.message)
        throw error
    }
}

/**
 * Fetches all page URLs from a site's sitemap.xml (handles sitemap indexes recursively).
 * Returns string[] of URLs. Non-blocking — returns [] on any failure.
 */
/**
 * Lists all sitemaps submitted to GSC for a site, then fetches URLs from each.
 * Falls back to {baseUrl}/sitemap.xml if the API returns nothing.
 */
export const fetchSitemapUrlsViaGSC = async (gscClient, siteUrl) => {
    const allUrls = new Set()
    const sitemapMeta = []
    const parser = new XMLParser()

    // Get sitemaps Google knows about via the Sitemaps API
    let sitemapLocations = []
    try {
        const res = await gscClient.sitemaps.list({ siteUrl })
        const rawSitemaps = res.data.sitemap || []
        sitemapLocations = rawSitemaps.filter(s => s.path).map(s => s.path)

        // Extract metadata from each sitemap entry
        for (const s of rawSitemaps) {
            if (!s.path) continue
            const contents = s.contents || []
            let urlsSubmitted = 0, urlsIndexed = 0
            for (const c of contents) {
                urlsSubmitted += parseInt(c.submitted || 0, 10)
                urlsIndexed += parseInt(c.indexed || 0, 10)
            }
            sitemapMeta.push({
                path: s.path,
                is_index: s.isSitemapsIndex || false,
                type: s.type || null,
                last_submitted: s.lastSubmitted || null,
                last_downloaded: s.lastDownloaded || null,
                warnings: parseInt(s.warnings || 0, 10),
                errors: parseInt(s.errors || 0, 10),
                urls_submitted: urlsSubmitted,
                urls_indexed: urlsIndexed,
            })
        }

        console.log(`[sitemap] GSC Sitemaps API returned ${sitemapLocations.length} sitemaps`)
    } catch (err) {
        console.warn(`[sitemap] GSC Sitemaps API failed:`, err.message)
    }

    // Fallback: try {baseUrl}/sitemap.xml
    if (sitemapLocations.length === 0) {
        let baseUrl = siteUrl.replace(/^sc-domain:/, 'https://').replace(/\/$/, '')
        if (!baseUrl.startsWith('http')) baseUrl = 'https://' + baseUrl
        sitemapLocations = [`${baseUrl}/sitemap.xml`]
    }

    const parseSitemap = async (url) => {
        try {
            const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
            if (!res.ok) return
            const xml = await res.text()
            const parsed = parser.parse(xml)

            if (parsed.sitemapindex?.sitemap) {
                const sitemaps = Array.isArray(parsed.sitemapindex.sitemap)
                    ? parsed.sitemapindex.sitemap
                    : [parsed.sitemapindex.sitemap]
                for (const sm of sitemaps) {
                    if (sm.loc) await parseSitemap(sm.loc)
                }
            }

            if (parsed.urlset?.url) {
                const urls = Array.isArray(parsed.urlset.url)
                    ? parsed.urlset.url
                    : [parsed.urlset.url]
                urls.forEach(u => { if (u.loc) allUrls.add(u.loc) })
            }
        } catch (err) {
            console.warn(`[sitemap] Failed to fetch ${url}:`, err.message)
        }
    }

    for (const loc of sitemapLocations) {
        await parseSitemap(loc)
    }
    console.log(`[sitemap] Total URLs discovered: ${allUrls.size}, ${sitemapMeta.length} sitemaps with metadata`)
    return { urls: Array.from(allUrls), sitemapMeta }
}

export const fetchSitemapUrls = async (siteUrl) => {
    const parser = new XMLParser()
    const allUrls = new Set()

    let baseUrl = siteUrl
        .replace(/^sc-domain:/, 'https://')
        .replace(/\/$/, '')
    if (!baseUrl.startsWith('http')) baseUrl = 'https://' + baseUrl

    const parseSitemap = async (url) => {
        try {
            const res = await fetch(url, { signal: AbortSignal.timeout(10000) })
            if (!res.ok) return
            const xml = await res.text()
            const parsed = parser.parse(xml)

            if (parsed.sitemapindex?.sitemap) {
                const sitemaps = Array.isArray(parsed.sitemapindex.sitemap)
                    ? parsed.sitemapindex.sitemap
                    : [parsed.sitemapindex.sitemap]
                for (const sm of sitemaps) {
                    if (sm.loc) await parseSitemap(sm.loc)
                }
            }

            if (parsed.urlset?.url) {
                const urls = Array.isArray(parsed.urlset.url)
                    ? parsed.urlset.url
                    : [parsed.urlset.url]
                urls.forEach(u => { if (u.loc) allUrls.add(u.loc) })
            }
        } catch (err) {
            console.warn(`[sitemap] Failed to fetch ${url}:`, err.message)
        }
    }

    await parseSitemap(`${baseUrl}/sitemap.xml`)
    console.log(`[sitemap] Discovered ${allUrls.size} URLs from ${baseUrl}/sitemap.xml`)
    return Array.from(allUrls)
}

/**
 * Inspects a batch of URLs via the GSC URL Inspection API.
 * Returns [{ url, indexStatus, verdict, crawlTimestamp }].
 * Sequential calls to respect rate limits.
 */
export const inspectUrls = async (searchconsoleClient, siteUrl, urls, concurrency = 10) => {
    console.log(`[inspect] Inspecting ${urls.length} URLs (concurrency: ${concurrency})`)
    const results = []

    const inspectOne = async (url) => {
        try {
            const res = await searchconsoleClient.urlInspection.index.inspect({
                requestBody: { inspectionUrl: url, siteUrl }
            })
            const ir = res.data.inspectionResult || {}
            const idx = ir.indexStatusResult || {}
            const verdict = idx.verdict || 'VERDICT_UNSPECIFIED'
            const mobile = ir.mobileUsabilityResult?.verdict || null
            const richResults = ir.richResultsResult?.verdict || null
            return {
                url,
                indexStatus: verdict === 'PASS' ? 'Indexed' : 'Not Indexed',
                verdict,
                crawlTimestamp: idx.lastCrawlTime || null,
                crawlStatus: idx.pageFetchState || null,
                robotsTxtState: idx.robotsTxtState || null,
                mobileUsability: mobile,
                richResultsStatus: richResults,
            }
        } catch (err) {
            console.warn(`[inspect] Failed for ${url}:`, err.message)
            return { url, indexStatus: 'Error', verdict: 'ERROR', crawlTimestamp: null, crawlStatus: null, robotsTxtState: null, mobileUsability: null, richResultsStatus: null }
        }
    }

    for (let i = 0; i < urls.length; i += concurrency) {
        const batch = urls.slice(i, i + concurrency)
        const batchResults = await Promise.all(batch.map(inspectOne))
        results.push(...batchResults)
    }

    return results
}

/**
 * Crawls a site's internal links starting from the homepage.
 * Follows same-origin <a> links up to a configurable limit.
 * Returns string[] of discovered page URLs.
 */
export const crawlInternalLinks = async (siteUrl, maxPages = 3000, concurrency = 10) => {
    let baseUrl = siteUrl
        .replace(/^sc-domain:/, 'https://')
        .replace(/\/$/, '')
    if (!baseUrl.startsWith('http')) baseUrl = 'https://' + baseUrl

    const origin = new URL(baseUrl).origin
    const visited = new Set()
    const discovered = new Set()
    const queue = [baseUrl + '/']
    discovered.add(baseUrl + '/')

    console.log(`[crawl] Starting internal link crawl from ${baseUrl} (concurrency: ${concurrency})`)

    const fetchPage = async (url) => {
        try {
            const res = await fetch(url, {
                signal: AbortSignal.timeout(8000),
                headers: { 'User-Agent': 'SeoRankTracker-Crawler/1.0' },
                redirect: 'follow'
            })
            if (!res.ok) return []
            const contentType = res.headers.get('content-type') || ''
            if (!contentType.includes('text/html')) return []

            const html = await res.text()
            const links = []
            const hrefRegex = /href=["']([^"']+)["']/gi
            let match
            while ((match = hrefRegex.exec(html)) !== null) {
                try {
                    const resolved = new URL(match[1], url)
                    if (resolved.origin !== origin) continue
                    if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') continue
                    const clean = resolved.origin + resolved.pathname
                    if (/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|pdf|zip|xml|json)$/i.test(clean)) continue
                    links.push(clean)
                } catch { /* invalid URL */ }
            }
            return links
        } catch {
            return []
        }
    }

    while (queue.length > 0 && visited.size < maxPages) {
        // Take up to `concurrency` URLs from the queue
        const batch = []
        while (batch.length < concurrency && queue.length > 0) {
            const url = queue.shift()
            const normalized = url.split('#')[0].split('?')[0]
            if (visited.has(normalized)) continue
            visited.add(normalized)
            batch.push(normalized)
        }
        if (batch.length === 0) break

        // Fetch all pages in the batch concurrently
        const results = await Promise.all(batch.map(fetchPage))

        // Collect new links
        for (const links of results) {
            for (const link of links) {
                if (!discovered.has(link) && discovered.size < maxPages) {
                    discovered.add(link)
                    queue.push(link)
                }
            }
        }

        if (visited.size % 100 === 0) {
            console.log(`[crawl] Progress: visited ${visited.size}, discovered ${discovered.size}`)
        }
    }

    console.log(`[crawl] Done: ${discovered.size} pages discovered (${visited.size} visited)`)
    return Array.from(discovered)
}
