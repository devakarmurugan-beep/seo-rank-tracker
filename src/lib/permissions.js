export const PLAN_LIMITS = {
    free_trial: 1,
    starter: 1,
    pro: 5,
    agency: 25,
}

export function getUserPlan(user) {
    return user?.user_metadata?.plan || 'free_trial'
}

export function canAddSite(user, currentSitesCount) {
    const limit = getSiteLimit(user)
    return currentSitesCount < limit
}

export function getSiteLimit(user) {
    const plan = getUserPlan(user)
    if (plan.startsWith('plan_starter')) return PLAN_LIMITS.starter
    if (plan.startsWith('plan_pro')) return PLAN_LIMITS.pro
    if (plan.startsWith('plan_agency')) return PLAN_LIMITS.agency
    return PLAN_LIMITS.free_trial
}

export function isTrialEnded(user) {
    const plan = getUserPlan(user)
    if (plan !== 'free_trial') return false // Paid users skip trial check

    if (!user || !user.created_at) return false
    const createdAt = new Date(user.created_at)
    const now = new Date()
    const diffTime = now.getTime() - createdAt.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    return diffDays > 7
}
