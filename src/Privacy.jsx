import { Link } from 'react-router-dom'
import { LogoFull } from './components/Logo'
import { Shield, Lock, Eye, FileText, Globe } from 'lucide-react'

export default function Privacy() {
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
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EFF6FF] border border-[#DBEAFE] mb-6">
                        <Shield className="w-4 h-4 text-[#2563EB]" />
                        <span className="text-[11px] font-bold text-[#2563EB] uppercase tracking-wider">Privacy Center</span>
                    </div>
                    <h1 className="text-[40px] font-black text-[#0F172A] leading-tight mb-4 tracking-tight">Privacy Policy</h1>
                    <p className="text-[14px] text-[#64748B]">Last updated: February 24, 2026</p>
                </div>

                <div className="prose prose-blue max-w-none space-y-10 text-[#475569] leading-relaxed">
                    <section>
                        <h2 className="text-[20px] font-bold text-[#111827] mb-4">1. Introduction</h2>
                        <p className="text-[15px]">
                            Rank Tracking SEO Tool ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and protect your information when you use our website and services at seoranktrackingtool.com.
                        </p>
                    </section>

                    <section className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-6">
                        <h2 className="text-[18px] font-bold text-[#111827] mb-3 flex items-center gap-2">
                            <Shield className="w-5 h-5 text-[#2563EB]" />
                            Google API Disclosure (Limited Use)
                        </h2>
                        <p className="text-[14px] font-medium text-[#111827] mb-3">
                            Our use and transfer to any other app of information received from Google APIs will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy#additional_requirements_for_specific_api_scopes" target="_blank" rel="noopener noreferrer" className="text-[#2563EB] underline">Google API Service User Data Policy</a>, including the Limited Use requirements.
                        </p>
                        <p className="text-[14px]">
                            We specifically use the <code>webmasters.readonly</code> scope to fetch your site list and search performance data. This data is used exclusively to display analytics in your dashboard and is never shared with third parties or used for advertising.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-[20px] font-bold text-[#111827] mb-4">2. Information We Collect</h2>
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-xl bg-[#F1F5F9] flex items-center justify-center flex-shrink-0">
                                    <Globe className="w-5 h-5 text-[#475569]" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-[#111827] text-[15px]">Google Search Console Data</h4>
                                    <p className="text-[14px]">With your permission, we access your site list, search queries, rankings, impressions, and click data to provide SEO insights.</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-xl bg-[#F1F5F9] flex items-center justify-center flex-shrink-0">
                                    <Lock className="w-5 h-5 text-[#475569]" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-[#111827] text-[15px]">Account Information</h4>
                                    <p className="text-[14px]">Your email address and basic profile information provided during Google OAuth login.</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-[20px] font-bold text-[#111827] mb-4">3. How We Use Data</h2>
                        <ul className="list-disc pl-5 space-y-2 text-[15px]">
                            <li>To generate your personal SEO ranking dashboard.</li>
                            <li>To monitor and archive keyword position history for your verified sites.</li>
                            <li>To categorize search intent and provide actionable SEO recommendations.</li>
                            <li>We do <span className="font-bold text-[#111827]">not</span> sell your data to brokers or use it for marketing/ads.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-[20px] font-bold text-[#111827] mb-4">4. Data Security</h2>
                        <p className="text-[15px]">
                            We use industry-standard encryption (AES-256) to secure your Google OAuth tokens. Data is stored on secure cloud servers with restricted access. You can revoke our access at any time through your Google Account security settings.
                        </p>
                    </section>

                    <section className="pt-10 border-t border-[#F1F5F9]">
                        <h2 className="text-[20px] font-bold text-[#111827] mb-2">Contact Us</h2>
                        <p className="text-[14px]">If you have questions about this policy, contact us at <span className="font-bold text-[#2563EB]">gamefellow007@gmail.com</span></p>
                    </section>
                </div>
            </main>

            <footer className="py-12 border-t border-[#F1F5F9] bg-[#F8FAFC] text-center">
                <p className="text-[13px] text-[#94A3B8]">© 2026 Rank Tracking SEO TOOL. All rights reserved.</p>
            </footer>
        </div>
    )
}
