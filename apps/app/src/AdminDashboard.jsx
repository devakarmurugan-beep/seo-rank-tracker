import { useState, useEffect } from 'react'
import { 
    Users, Shield, ShieldAlert, UserX, UserCheck, 
    Search, Filter, RefreshCw, ChevronRight, 
    Mail, Calendar, Crown, Zap, AlertCircle, Info, X
} from 'lucide-react'
import { LogoFull } from './components/Logo'
import { useAuth } from './AuthContext'

export default function AdminDashboard() {
    const { session } = useAuth()
    const [users, setUsers] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [filter, setFilter] = useState('all') // all, free, paid, admin
    const [statusMsg, setStatusMsg] = useState(null)

    const fetchUsers = async () => {
        setIsLoading(true)
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/admin/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminId: session?.user?.id })
            })
            const data = await response.json()
            if (data.success) {
                setUsers(data.users)
            } else {
                console.error('Failed to fetch users:', data.error)
            }
        } catch (err) {
            console.error('Error fetching users:', err)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (session?.user?.id) fetchUsers()
    }, [session])

    const handleUpdatePlan = async (userId, newPlan) => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/admin/update-user`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    adminId: session?.user?.id,
                    targetUserId: userId,
                    updates: { plan: newPlan }
                })
            })
            const data = await response.json()
            if (data.success) {
                setStatusMsg({ type: 'success', text: `Plan updated to ${newPlan}` })
                fetchUsers()
            } else {
                setStatusMsg({ type: 'error', text: data.error })
            }
        } catch (err) {
            setStatusMsg({ type: 'error', text: 'Network error' })
        }
    }

    const filteredUsers = users.filter(u => {
        const matchesSearch = u.email.toLowerCase().includes(searchQuery.toLowerCase())
        if (filter === 'all') return matchesSearch
        if (filter === 'free') return matchesSearch && u.plan === 'free_trial'
        if (filter === 'paid') return matchesSearch && u.plan !== 'free_trial' && u.plan !== 'admin'
        if (filter === 'admin') return matchesSearch && u.is_admin
        return matchesSearch
    })

    const stats = {
        total: users.length,
        free: users.filter(u => u.plan === 'free_trial').length,
        paid: users.filter(u => u.plan !== 'free_trial' && u.plan !== 'admin' && !u.is_admin).length,
        admins: users.filter(u => u.is_admin).length
    }

    return (
        <div className="min-h-screen bg-[#F9FAFB] p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-[28px] font-bold text-[#111827] tracking-tight mb-1">Internal Admin Dashboard</h1>
                        <p className="text-[14px] text-[#64748B]">Manage user roles, subscriptions, and platform access.</p>
                    </div>
                    <button 
                        onClick={fetchUsers}
                        className="p-2.5 bg-white border border-[#E5E7EB] rounded-xl hover:bg-[#F9FAFB] transition-all shadow-sm group"
                        title="Refresh Users"
                    >
                        <RefreshCw className={`w-5 h-5 text-[#64748B] group-hover:text-[#2563EB] ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Toast */}
                {statusMsg && (
                    <div className={`mb-6 p-4 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2 ${statusMsg.type === 'success' ? 'bg-[#ECFDF5] text-[#065F46] border border-[#DCFCE7]' : 'bg-[#FEF2F2] text-[#991B1B] border border-[#FEE2E2]'}`}>
                        <div className="flex items-center gap-3">
                            {statusMsg.type === 'success' ? <UserCheck className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                            <span className="text-[14px] font-semibold">{statusMsg.text}</span>
                        </div>
                        <button onClick={() => setStatusMsg(null)}><X className="w-4 h-4 opacity-70" /></button>
                    </div>
                )}

                {/* Stats Cards */}
                <div className="grid grid-cols-4 gap-6 mb-8">
                    {[
                        { label: 'Total Users', value: stats.total, icon: Users, color: '#2563EB', bg: '#EFF6FF' },
                        { label: 'Free Trial', value: stats.free, icon: Zap, color: '#F59E0B', bg: '#FFFBEB' },
                        { label: 'Paid Members', value: stats.paid, icon: Crown, color: '#059669', bg: '#ECFDF5' },
                        { label: 'Admins', value: stats.admins, icon: Shield, color: '#7C3AED', bg: '#F5F3FF' }
                    ].map((s, i) => (
                        <div key={i} className="bg-white border border-[#E2E8F0] p-6 rounded-2xl shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-[12px] font-bold text-[#64748B] uppercase tracking-wider">{s.label}</span>
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: s.bg }}>
                                    <s.icon className="w-5 h-5" style={{ color: s.color }} />
                                </div>
                            </div>
                            <div className="text-[32px] font-black text-[#111827]">{s.value}</div>
                        </div>
                    ))}
                </div>

                {/* Table Section */}
                <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-[#F1F5F9] flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="relative group flex-1 max-w-md">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] group-focus-within:text-[#2563EB] transition-colors" />
                            <input 
                                type="text" 
                                placeholder="Search by email..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-11 pr-4 py-2.5 border border-[#E5E7EB] rounded-xl text-[14px] font-medium placeholder-[#9CA3AF] focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-[#2563EB]/5 w-full bg-[#F9FAFB] hover:border-[#D1D5DB] transition-all"
                            />
                        </div>
                        <div className="flex items-center gap-2 p-1 bg-[#F1F5F9] rounded-xl border border-[#E2E8F0]">
                            {['all', 'free', 'paid', 'admin'].map((f) => (
                                <button 
                                    key={f} 
                                    onClick={() => setFilter(f)}
                                    className={`px-4 py-2 rounded-lg text-[12px] font-bold transition-all capitalize ${filter === f ? 'bg-white text-[#2563EB] shadow-sm' : 'text-[#64748B] hover:text-[#111827]'}`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-[#F8FAFC] border-b border-[#F1F5F9]">
                                    <th className="px-6 py-4 text-[12px] font-bold text-[#64748B] uppercase tracking-wider">User / Email</th>
                                    <th className="px-6 py-4 text-[12px] font-bold text-[#64748B] uppercase tracking-wider">Plan Status</th>
                                    <th className="px-6 py-4 text-[12px] font-bold text-[#64748B] uppercase tracking-wider">Joined At</th>
                                    <th className="px-6 py-4 text-[12px] font-bold text-[#64748B] uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#F1F5F9]">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-12 text-center text-[#9CA3AF] text-[14px]">
                                            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 opacity-50" />
                                            Loading users...
                                        </td>
                                    </tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-12 text-center text-[#9CA3AF] text-[14px]">
                                            No users found matching your criteria.
                                        </td>
                                    </tr>
                                ) : filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-[#F9FAFB] transition-colors group">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-[14px] ${user.is_admin ? 'bg-[#7C3AED]/10 text-[#7C3AED]' : 'bg-[#2563EB]/10 text-[#2563EB]'}`}>
                                                    {user.email.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-[14px] font-bold text-[#111827]">{user.email}</p>
                                                    <p className="text-[12px] text-[#64748B] font-mono">ID: {user.id.substring(0, 8)}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2">
                                                {user.is_admin ? (
                                                    <span className="px-3 py-1 bg-[#F5F3FF] text-[#7C3AED] text-[11px] font-black rounded-full border border-[#DDD6FE] uppercase tracking-wider flex items-center gap-1.5">
                                                        <Shield className="w-3 h-3" /> Admin
                                                    </span>
                                                ) : user.plan === 'free_trial' ? (
                                                    <span className="px-3 py-1 bg-[#FFFBEB] text-[#D97706] text-[11px] font-black rounded-full border border-[#FEF3C7] uppercase tracking-wider flex items-center gap-1.5">
                                                        <Zap className="w-3 h-3" /> Free Trial
                                                    </span>
                                                ) : (
                                                    <span className="px-3 py-1 bg-[#ECFDF5] text-[#059669] text-[11px] font-black rounded-full border border-[#DCFCE7] uppercase tracking-wider flex items-center gap-1.5">
                                                        <Crown className="w-3 h-3" /> {user.plan.replace('plan_', '').toUpperCase()}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-[13px] text-[#64748B] font-medium tabular-nums">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 opacity-50" />
                                                {new Date(user.created_at).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <select 
                                                    onChange={(e) => handleUpdatePlan(user.id, e.target.value)}
                                                    className="bg-white border border-[#E5E7EB] rounded-lg text-[12px] font-bold px-3 py-1.5 outline-none focus:border-[#2563EB] shadow-sm transition-all"
                                                    value={user.is_admin ? 'admin' : user.plan}
                                                >
                                                    <option value="free_trial">Set Free Trial</option>
                                                    <option value="plan_starter">Upgrade: Starter</option>
                                                    <option value="plan_pro">Upgrade: Pro</option>
                                                    <option value="plan_agency">Upgrade: Agency</option>
                                                </select>
                                                
                                                <button className="p-2 text-[#64748B] hover:text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg transition-all" title="Restrict User">
                                                    <ShieldAlert className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}
