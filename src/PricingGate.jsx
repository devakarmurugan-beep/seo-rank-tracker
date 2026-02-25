import { Link } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { isTrialEnded } from './lib/permissions'
import { Lock } from 'lucide-react'

export default function PricingGate({ children }) {
    const { session } = useAuth()

    if (session && session.user && isTrialEnded(session.user)) {
        return (
            <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#F9FAFB] p-6 backdrop-blur-sm">
                <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-[#E5E7EB] shadow-xl text-center">
                    <div className="w-16 h-16 bg-[#FEF2F2] rounded-full flex items-center justify-center mx-auto mb-6">
                        <Lock className="w-8 h-8 text-[#DC2626]" />
                    </div>
                    <h2 className="text-[24px] font-bold text-[#111827] mb-3">Trial Ended</h2>
                    <p className="text-[14px] text-[#4B5563] mb-8 font-normal leading-relaxed">
                        Your 7-day free trial has expired. To continue tracking your keywords and analyzing search performance, please upgrade your plan.
                    </p>
                    <Link to="/settings" className="block w-full py-3.5 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[15px] font-medium rounded-xl transition-all shadow-sm">
                        View Upgrade Options
                    </Link>
                </div>
            </div>
        )
    }

    return children
}
