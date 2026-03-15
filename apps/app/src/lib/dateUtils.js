/**
 * GSC Date Utilities — Single Source of Truth
 *
 * Google Search Console data has a consistent 3-day delay.
 * All date ranges in this tool must be computed relative to the
 * "GSC end date" (today minus 3 days), NOT relative to today.
 *
 * This matches exactly how Search Console displays "Last 28 days":
 *   End date:   today - 3 days  (e.g., 2026-03-09 when today is 2026-03-12)
 *   Start date: end - 27 days   (28 days inclusive)
 */

// GSC consistently lags by 3 days (sometimes 2, we use 3 to be safe)
const GSC_DATA_DELAY_DAYS = 3

/**
 * Returns the latest date for which GSC has reliable data.
 * This is today minus the GSC data delay.
 */
export function getGSCEndDate() {
    const d = new Date()
    d.setDate(d.getDate() - GSC_DATA_DELAY_DAYS)
    return d.toISOString().split('T')[0]
}

/**
 * Returns the { startDate, endDate } pair for a given range label,
 * always anchored to the GSC end date (not today).
 *
 * Matches Search Console range labels:
 *   '7d'  → Last 7 days  (Search Console "7 days")
 *   '28d' → Last 28 days (Search Console default "28 days")
 *   '3m'  → Last 3 months (~91 days)
 *   '6m'  → Last 6 months (~182 days)
 *   '12m' → Last 12 months (~365 days)
 *   '16m' → Last 16 months (~486 days)
 */
export function getGSCDateRange(rangeKey) {
    const endDate = getGSCEndDate()
    const endObj = new Date(endDate)

    let startObj

    if (typeof rangeKey === 'object' && rangeKey.type === 'custom') {
        return { startDate: rangeKey.start, endDate: rangeKey.end }
    }

    // Number of days back from the end date (inclusive of the end date)
    const RANGE_MAP = {
        '7d':  6,   // 7 days inclusive (0..6 back from end)
        '28d': 27,  // 28 days inclusive — this matches Search Console "28 days"
        '30d': 29,  // Legacy alias for 30 days
        '3m':  90,
        '90d': 89,
        '6m':  181,
        '12m': 364,
        '1y':  364,
        '16m': 485,
    }

    const daysBack = RANGE_MAP[rangeKey] ?? 27 // default to 28 days

    startObj = new Date(endObj.getTime() - daysBack * 24 * 60 * 60 * 1000)

    return {
        startDate: startObj.toISOString().split('T')[0],
        endDate
    }
}

/**
 * Returns the GSC end date minus N extra days (for the "previous period" comparison).
 */
export function getPreviousPeriodRange(rangeKey) {
    const { startDate: currStart, endDate: currEnd } = getGSCDateRange(rangeKey)
    const currStartObj = new Date(currStart)
    const currEndObj   = new Date(currEnd)
    const periodDays   = Math.round((currEndObj - currStartObj) / (24 * 60 * 60 * 1000)) + 1

    const prevEnd   = new Date(currStartObj.getTime() - 1 * 24 * 60 * 60 * 1000)
    const prevStart = new Date(prevEnd.getTime() - (periodDays - 1) * 24 * 60 * 60 * 1000)

    return {
        startDate: prevStart.toISOString().split('T')[0],
        endDate:   prevEnd.toISOString().split('T')[0]
    }
}

/**
 * Human-readable label for each range key.
 */
export function getRangeLabel(rangeKey) {
    if (typeof rangeKey === 'object' && rangeKey.type === 'custom') {
        return `${rangeKey.start} → ${rangeKey.end}`
    }
    const labels = {
        '7d':  'Last 7 days',
        '28d': 'Last 28 days',
        '30d': 'Last 30 days',
        '3m':  'Last 3 months',
        '90d': 'Last 3 months',
        '6m':  'Last 6 months',
        '12m': 'Last 12 months',
        '1y':  'Last 12 months',
        '16m': 'Last 16 months',
    }
    return labels[rangeKey] || 'Last 28 days'
}
