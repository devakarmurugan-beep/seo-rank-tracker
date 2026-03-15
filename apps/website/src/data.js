export const trendData = [
    { date: 'Oct 1', top3: 42, top10: 85, top20: 120 },
    { date: 'Oct 7', top3: 48, top10: 92, top20: 125 },
    { date: 'Oct 14', top3: 55, top10: 98, top20: 130 },
    { date: 'Oct 21', top3: 62, top10: 105, top20: 128 },
    { date: 'Oct 30', top3: 71, top10: 112, top20: 132 }
]

export const distributionData = [
    { name: 'Rank 1-3', value: 186, color: '#059669', icon: 'trophy' },
    { name: 'Rank 4-10', value: 342, color: '#0284C7', icon: 'circleCheck' },
    { name: 'Rank 11-20', value: 412, color: '#D97706', icon: 'triangleAlert' },
    { name: 'Rank 20+', value: 300, color: '#DC2626', icon: 'arrowDown' }
]

export const intentData = [
    { name: 'Commercial', value: 485, color: '#2563EB' },
    { name: 'Informational', value: 362, color: '#0D9488' },
    { name: 'Navigational', value: 215, color: '#7C3AED' },
    { name: 'Transactional', value: 178, color: '#D97706' }
]

export const topGainers = [
    { keyword: 'best crm software 2024', to: 4, change: 24, volume: '14.8K' },
    { keyword: 'project management tools', to: 3, change: 16, volume: '22.1K' },
    { keyword: 'team collaboration app', to: 12, change: 23, volume: '9.4K' },
    { keyword: 'business automation platform', to: 18, change: 24, volume: '6.7K' },
    { keyword: 'saas analytics dashboard', to: 8, change: 23, volume: '4.2K' }
]

export const topLosers = [
    { keyword: 'free task manager', to: 18, change: -13, volume: '18.3K' },
    { keyword: 'online scheduling tool', to: 22, change: -14, volume: '11.2K' },
    { keyword: 'workflow automation', to: 11, change: -8, volume: '15.6K' },
    { keyword: 'remote work software', to: 26, change: -14, volume: '8.9K' },
    { keyword: 'kanban board free', to: 19, change: -12, volume: '5.1K' }
]

export const allGSCKeywords = [
    { keyword: 'best crm software 2024', position: 4, change: 24, impressions: '14,832', clicks: '2,104', ctr: '14.2%', page: '/blog/best-crm-2024', intent: 'Commercial', bucket: 'Top 3' },
    { keyword: 'project management tools comparison', position: 3, change: 16, impressions: '22,108', clicks: '4,312', ctr: '19.5%', page: '/tools/project-management', intent: 'Commercial', bucket: 'Top 3' },
    { keyword: 'what is crm software', position: 8, change: 2, impressions: '31,420', clicks: '2,840', ctr: '9.0%', page: '/blog/what-is-crm', intent: 'Informational', bucket: '4-10' },
    { keyword: 'free task manager', position: 18, change: -13, impressions: '18,341', clicks: '1,208', ctr: '6.6%', page: '/blog/free-task-managers', intent: 'Transactional', bucket: '11-20' },
    { keyword: 'team collaboration app', position: 12, change: 23, impressions: '9,408', clicks: '890', ctr: '9.5%', page: '/features/collaboration', intent: 'Commercial', bucket: '11-20' },
    { keyword: 'workflow automation tools', position: 11, change: -8, impressions: '15,620', clicks: '1,804', ctr: '11.5%', page: '/features/automation', intent: 'Commercial', bucket: '11-20' },
    { keyword: 'how to manage remote team', position: 6, change: 3, impressions: '8,240', clicks: '1,120', ctr: '13.6%', page: '/blog/remote-team-guide', intent: 'Informational', bucket: '4-10' },
    { keyword: 'saas analytics dashboard', position: 8, change: 23, impressions: '4,208', clicks: '520', ctr: '12.4%', page: '/product/analytics', intent: 'Commercial', bucket: '4-10' },
    { keyword: 'monday vs asana', position: 5, change: 4, impressions: '12,340', clicks: '2,410', ctr: '19.5%', page: '/compare/monday-vs-asana', intent: 'Commercial', bucket: '4-10' },
    { keyword: 'online scheduling tool', position: 22, change: -14, impressions: '11,204', clicks: '680', ctr: '6.1%', page: '/tools/scheduling', intent: 'Transactional', bucket: '20+' },
    { keyword: 'clickup alternatives', position: 3, change: 5, impressions: '9,820', clicks: '2,140', ctr: '21.8%', page: '/compare/clickup-alternatives', intent: 'Commercial', bucket: 'Top 3' },
    { keyword: 'business process automation', position: 15, change: 1, impressions: '6,702', clicks: '310', ctr: '4.6%', page: '/features/automation', intent: 'Commercial', bucket: '11-20' }
]

export const trackingKeywords = [
    { keyword: 'best crm software 2024', category: 'Blog Content', pageType: 'Blog', position: 4, change: 24, bestPos: 3, trend: [28, 18, 12, 8, 6, 4], page: '/blog/best-crm-2024' },
    { keyword: 'project management tools', category: 'Landing Pages', pageType: 'Landing', position: 3, change: 16, bestPos: 2, trend: [19, 12, 8, 5, 4, 3], page: '/tools/project-management' },
    { keyword: 'team collaboration app', category: 'Feature Pages', pageType: 'Feature', position: 12, change: 23, bestPos: 10, trend: [35, 22, 18, 15, 14, 12], page: '/features/collaboration' },
    { keyword: 'workflow automation', category: 'Feature Pages', pageType: 'Feature', position: 11, change: -8, bestPos: 3, trend: [3, 5, 7, 8, 10, 11], page: '/features/automation' },
    { keyword: 'saas analytics dashboard', category: 'Product Pages', pageType: 'Product', position: 8, change: 23, bestPos: 7, trend: [31, 20, 16, 12, 10, 8], page: '/product/analytics' },
    { keyword: 'monday vs asana', category: 'Comparison Pages', pageType: 'Comparison', position: 5, change: 4, bestPos: 4, trend: [12, 9, 7, 6, 5, 5], page: '/compare/monday-vs-asana' },
    { keyword: 'clickup alternatives 2024', category: 'Comparison Pages', pageType: 'Comparison', position: 3, change: 5, bestPos: 2, trend: [14, 10, 7, 5, 4, 3], page: '/compare/clickup-alternatives' },
    { keyword: 'free task manager', category: 'Blog Content', pageType: 'Blog', position: 18, change: -13, bestPos: 5, trend: [5, 7, 12, 14, 16, 18], page: '/blog/free-task-managers' }
]

export const categoryCards = [
    { name: 'Blog Content', count: 24, avgPos: 12.4, impressions: '45.2K', change: -2.1, distribution: [6, 8, 6, 4] },
    { name: 'Landing Pages', count: 12, avgPos: 8.7, impressions: '28.1K', change: -1.3, distribution: [4, 5, 2, 1] },
    { name: 'Feature Pages', count: 18, avgPos: 15.2, impressions: '12.4K', change: 0.8, distribution: [2, 6, 7, 3] },
    { name: 'Product Pages', count: 8, avgPos: 18.6, impressions: '34.7K', change: -0.5, distribution: [1, 3, 3, 1] },
    { name: 'Comparison Pages', count: 6, avgPos: 6.3, impressions: '19.8K', change: -3.2, distribution: [4, 2, 0, 0] },
    { name: 'Pricing Pages', count: 3, avgPos: 14.1, impressions: '8.9K', change: 1.5, distribution: [0, 2, 1, 0] }
]

export const pageData = [
    { title: 'Best CRM Software in 2024', url: '/blog/best-crm-2024', category: 'Blog Content', status: 'Indexed', keyword: 'best crm software 2024', keyPos: 4, impressions: '14.8K', impChange: 12.3, clicks: '2.1K', clickChange: 8.7, ctr: '14.2%', avgPos: 5.2, updated: '2 hours ago' },
    { title: 'Project Management Tools', url: '/tools/project-management', category: 'Landing Pages', status: 'Indexed', keyword: 'project management tools', keyPos: 3, impressions: '22.1K', impChange: 5.1, clicks: '4.3K', clickChange: 3.2, ctr: '19.5%', avgPos: 4.8, updated: '1 hour ago' },
    { title: 'Team Collaboration Features', url: '/features/collaboration', category: 'Feature Pages', status: 'Indexed', keyword: 'team collaboration app', keyPos: 12, impressions: '9.4K', impChange: -2.4, clicks: '890', clickChange: -1.1, ctr: '9.5%', avgPos: 14.1, updated: '4 hours ago' },
    { title: 'Getting Started with Automation', url: '/docs/getting-started', category: 'Documentation', status: 'Not Indexed', keyword: null, keyPos: null, impressions: '0', impChange: 0, clicks: '0', clickChange: 0, ctr: '0%', avgPos: null, updated: '1 day ago' },
    { title: 'Workflow Automation Platform', url: '/features/automation', category: 'Feature Pages', status: 'Indexed', keyword: 'workflow automation', keyPos: 11, impressions: '15.6K', impChange: 1.8, clicks: '1.8K', clickChange: 2.1, ctr: '11.5%', avgPos: 7.4, updated: '2 hours ago' },
    { title: 'Pricing Plans', url: '/pricing', category: 'Landing Pages', status: 'Indexed', keyword: 'saas pricing', keyPos: 15, impressions: '8.9K', impChange: 3.4, clicks: '1.4K', clickChange: 4.2, ctr: '15.7%', avgPos: 12.3, updated: '1 hour ago' }
]

export const pageCategoryStats = [
    { name: 'All Pages', count: 1234 }, { name: 'Blogs', count: 238 }, { name: 'Landing Pages', count: 45 },
    { name: 'Feature Pages', count: 67 }, { name: 'Product Pages', count: 102 }, { name: 'Documentation', count: 156 }
]
