import { Link } from 'react-router-dom'
import { LogoFull } from './components/Logo'
import { Scale, Shield, FileText, Globe, AlertCircle } from 'lucide-react'

export default function Terms() {
    return (
        <div className="min-h-screen bg-white font-sans selection:bg-[#2563EB] selection:text-white">
            {/* Nav */}
            <nav className="border-b border-[#F3F4F6] bg-white sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center">
                        <LogoFull className="scale-90 origin-left" />
                    </Link>
                    <Link to="/" className="text-[14px] font-semibold text-[#64748B] hover:text-[#111827]">Back to Home</Link>
                </div>
            </nav>

            <main className="max-w-3xl mx-auto py-20 px-6">
                <div className="mb-12">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F1F5F9] border border-[#E2E8F0] mb-6">
                        <Scale className="w-4 h-4 text-[#475569]" />
                        <span className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">Legal Terms</span>
                    </div>
                    <h1 className="text-[40px] font-black text-[#0F172A] leading-tight mb-4 tracking-tight">Terms of Service</h1>
                    <p className="text-[14px] text-[#64748B]">Last updated: February 24, 2026</p>
                </div>

                <div className="prose prose-blue max-w-none space-y-10 text-[#475569] leading-relaxed">
                    <section>
                        <h2 className="text-[20px] font-bold text-[#111827] mb-4">1. Acceptance of Terms</h2>
                        <p className="text-[15px]">
                            By accessing or using Rank Tracking SEO Tool ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-[20px] font-bold text-[#111827] mb-4">2. Description of Service</h2>
                        <p className="text-[15px]">
                            Rank Tracking SEO Tool provides users with an interface to view and analyze data from their Google Search Console accounts. We provide rank tracking, performance analytics, and reporting features.
                        </p>
                    </section>

                    <section className="bg-[#FFFBEB] border border-[#FEF3C7] rounded-2xl p-6">
                        <h2 className="text-[18px] font-bold text-[#92400E] mb-3 flex items-center gap-2">
                            <Globe className="w-5 h-5 text-[#D97706]" />
                            Google API Integration
                        </h2>
                        <p className="text-[14px] text-[#92400E]">
                            Our service requires integration with Google Search Console via OAuth. You are responsible for ensuring you have the legal right to access the Search Console properties you connect to our Service. We are not responsible for any actions taken by Google regarding your account.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-[20px] font-bold text-[#111827] mb-4">3. User Accounts</h2>
                        <ul className="list-disc pl-5 space-y-2 text-[15px]">
                            <li>You must provide accurate information when creating an account.</li>
                            <li>You are responsible for maintaining the security of your account credentials.</li>
                            <li>You must notify us immediately of any unauthorized use of your account.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-[20px] font-bold text-[#111827] mb-4">4. Subscriptions and Payments</h2>
                        <p className="text-[15px]">
                            We offer various subscription tiers. By selecting a plan, you agree to pay the fees associated with that plan. All payments are processed securely through our third-party payment provider (Dodo Payments).
                        </p>
                    </section>

                    <section>
                        <h2 className="text-[20px] font-bold text-[#111827] mb-4">5. Limitation of Liability</h2>
                        <p className="text-[15px]">
                            To the maximum extent permitted by law, Rank Tracking SEO Tool shall not be liable for any indirect, incidental, special, or consequential damages resulting from the use or inability to use the service.
                        </p>
                    </section>

                    <section className="pt-10 border-t border-[#F1F5F9]">
                        <h2 className="text-[20px] font-bold text-[#111827] mb-2">Termination</h2>
                        <p className="text-[14px]">We reserve the right to terminate or suspend access to our Service immediately, without prior notice, for any reason whatsoever, including breach of Terms.</p>
                    </section>
                </div>
            </main>

            <footer className="py-12 border-t border-[#F1F5F9] bg-[#F8FAFC] text-center">
                <p className="text-[13px] text-[#94A3B8]">© 2026 Rank Tracking SEO TOOL. All rights reserved.</p>
            </footer>
        </div>
    )
}
