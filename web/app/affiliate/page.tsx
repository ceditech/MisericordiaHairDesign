"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button, Badge, Input, Card, Accordion, useToast } from "@/components/ui";
import {
    Users,
    Gift,
    CheckCircle,
    Copy,
    Mail,
    ChevronRight,
    HelpCircle,
    Phone,
    MessageCircle,
    Zap,
    ExternalLink,
    ShieldCheck,
    Coins,
    Sparkles
} from "lucide-react";
import { AffiliateType, AffiliateProfile } from "@/src/lib/affiliate/types";
import { createAffiliateProfile, sendAffiliateCodeEmail } from "@/src/lib/affiliate/affiliateService";
import { CONTACT_PHONE, CONTACT_EMAIL } from "@/src/content/legal";

export default function AffiliatePage() {
    const { showToast } = useToast();
    const [selectedType, setSelectedType] = useState<AffiliateType>("client");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedProfile, setGeneratedProfile] = useState<AffiliateProfile | null>(null);

    const handleGenerateCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !email) {
            showToast("Please fill in all fields", "error");
            return;
        }

        setIsGenerating(true);
        try {
            const profile = await createAffiliateProfile({ name, email, type: selectedType });
            await sendAffiliateCodeEmail(profile);
            setGeneratedProfile(profile);
            showToast("Success! Your code is ready and email sent.", "success");
        } catch (err) {
            console.error("Affiliate generation error:", err);
            showToast("Failed to generate code. Please try again.", "error");
        } finally {
            setIsGenerating(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        showToast("Copied to clipboard!", "success");
    };

    const faqItems = [
        {
            title: "Who can join the affiliate program?",
            content: "Anyone can join! Whether you're a regular client at Misericordia Hair Designs or simply a professional looking to earn commissions by referring people to our salon."
        },
        {
            title: "What is the difference between “Client/Future Client” and “General Affiliate”?",
            content: "Clients/Future Clients earn a 10% discount on their NEXT braiding service. General Affiliates earn 10% cash commission on the product or service cost of qualified referrals."
        },
        {
            title: "How do I get my 10% discount as a client?",
            content: "Once you generate your code and a referral completes their booking/purchase, we'll apply the 10% discount to your next hair braiding session automatically or via your unique code."
        },
        {
            title: "How does a referral redeem my code?",
            content: "Referrals just need to enter your unique code in the 'Promo Code' or 'Referral Code' field during the checkout process on our website."
        },
        {
            title: "What counts as a qualified referral?",
            content: "A qualified referral is a new customer who completes a hair braiding service or product purchase through our website and pays successfully."
        },
        {
            title: "When and how do payouts happen?",
            content: "Cash payouts for General Affiliates are issued once per month at month-end via Zelle, PayPal, or Venmo."
        },
        {
            title: "What does the $50 minimum payout mean?",
            content: "To keep processing efficient, we issue cash payouts once your earned commission balance reaches $50. If you have less, it rolls over to the next month."
        },
        {
            title: "Can I share my code on social media?",
            content: "Absolutely! We encourage sharing your code on Instagram, TikTok, Facebook, and other platforms to reach more people."
        },
        {
            title: "Can I use multiple referral codes?",
            content: "Customers can only use one referral/promo code per transaction. However, you can generate new codes for yourself if you want to track different campaigns."
        },
        {
            title: "What if my referral forgets to apply the code?",
            content: "Unfortunately, codes must be applied at the time of purchase to be automatically tracked. Please ensure your referrals know to use your code!"
        },
        {
            title: "How can I contact support?",
            content: `You can reach us at ${CONTACT_EMAIL} or call us at ${CONTACT_PHONE} for any affiliate-related questions.`
        }
    ];

    return (
        <main className="min-h-screen pt-32 pb-20 px-6 max-w-7xl mx-auto space-y-32">

            {/* SECTION 1: HERO */}
            <section className="text-center relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-24 w-64 h-64 bg-[#9F2D5C]/10 rounded-full blur-[100px] -z-10" />
                <Badge className="mb-6 bg-[#9F2D5C]/10 text-[#9F2D5C] border-none px-6 py-2 uppercase tracking-widest text-xs font-black">
                    Official Referral Program
                </Badge>
                <h1 className="text-5xl sm:text-7xl font-black text-slate-900 dark:text-white mb-8 italic uppercase tracking-tighter leading-[0.9]">
                    Earn Rewards With <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#9F2D5C] via-[#9F2D5C] to-emerald-500">
                        MHDESIGNS&apos;s Braids Referrals
                    </span>
                </h1>
                <p className="text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto mb-12 font-medium">
                    Share your love for premium braids and get rewarded. Choose how you want to earn—whether it&apos;s discounts on your next look or cash commissions.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button
                        size="lg"
                        onClick={() => document.getElementById('generate-section')?.scrollIntoView({ behavior: 'smooth' })}
                        className="bg-[#9F2D5C] hover:bg-[#B8326A] text-white rounded-2xl py-8 px-10 text-xl font-black shadow-2xl shadow-[#9F2D5C]/30 group"
                    >
                        Generate My Referral Code
                        <ChevronRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                    <Button
                        size="lg"
                        variant="secondary"
                        onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                        className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl py-8 px-10 text-xl font-black"
                    >
                        How it Works
                    </Button>
                </div>
            </section>

            {/* SECTION 2: CHOOSE AFFILIATE TYPE */}
            <section className="max-w-4xl mx-auto">
                <div className="text-center mb-12">
                    <h2 className="text-xs font-black uppercase tracking-[0.3em] text-[#9F2D5C] mb-4">Select Your Role</h2>
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white italic uppercase tracking-tighter">How do you want to be rewarded?</h3>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                    <button
                        onClick={() => setSelectedType("client")}
                        className={`p-10 rounded-[2.5rem] border-2 text-left transition-all relative overflow-hidden group ${selectedType === "client" ? "border-[#9F2D5C] bg-[#9F2D5C]/5 shadow-xl shadow-[#9F2D5C]/5" : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-[#9F2D5C]/30"}`}
                    >
                        {selectedType === "client" && <CheckCircle className="absolute top-8 right-8 text-[#9F2D5C]" size={32} />}
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-colors ${selectedType === "client" ? "bg-[#9F2D5C] text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
                            <Users size={32} />
                        </div>
                        <h4 className="text-2xl font-black text-slate-900 dark:text-white mb-2 italic uppercase tracking-tighter">Braids Client</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 font-medium">Current or potential hair-braids clients.</p>
                        <Badge className="bg-[#9F2D5C] text-white border-none font-black px-4 py-2 text-lg italic shadow-lg shadow-[#9F2D5C]/20">
                            10% OFF NEXT SERVICE
                        </Badge>
                    </button>

                    <button
                        onClick={() => setSelectedType("general")}
                        className={`p-10 rounded-[2.5rem] border-2 text-left transition-all relative overflow-hidden group ${selectedType === "general" ? "border-emerald-500 bg-emerald-500/5 shadow-xl shadow-emerald-500/5" : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500/30"}`}
                    >
                        {selectedType === "general" && <CheckCircle className="absolute top-8 right-8 text-emerald-500" size={32} />}
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-colors ${selectedType === "general" ? "bg-emerald-500 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
                            <Coins size={32} />
                        </div>
                        <h4 className="text-2xl font-black text-slate-900 dark:text-white mb-2 italic uppercase tracking-tighter">General Affiliate</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 font-medium">Non-customers / general promoters.</p>
                        <Badge className="bg-emerald-500 text-white border-none font-black px-4 py-2 text-lg italic shadow-lg shadow-emerald-500/20">
                            10% CASH COMMISSION
                        </Badge>
                    </button>
                </div>
            </section>

            {/* SECTION 3: HOW IT WORKS */}
            <section id="how-it-works" className="max-w-5xl mx-auto">
                <div className="bg-slate-900 dark:bg-slate-800 rounded-[3rem] p-12 sm:p-20 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-1/2 h-full bg-[radial-gradient(circle_at_top_right,rgba(159,45,92,0.2),transparent_70%)]" />
                    <div className="absolute bottom-0 left-0 w-1/2 h-full bg-[radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.1),transparent_70%)]" />

                    <div className="relative z-10 grid lg:grid-cols-2 gap-20 items-center">
                        <div>
                            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-[#9F2D5C] mb-6">Process</h2>
                            <h3 className="text-4xl sm:text-5xl font-black italic uppercase tracking-tighter leading-none mb-10">
                                Simple Steps To <br />
                                <span className="text-[#9F2D5C]">Start Earning</span>
                            </h3>

                            <div className="space-y-10">
                                {[
                                    { step: "01", title: "Generate Code", desc: "Fill in your details and get your unique DB-AFF code." },
                                    { step: "02", title: "Share Code", desc: "Post it on social media or send directly to friends." },
                                    { step: "03", title: "Referral Redeems", desc: "Your friend uses the code at checkout or booking." },
                                    { step: "04", title: "Rewards Tracked", desc: "Every successful referral is automatically recorded." },
                                    { step: "05", title: "Get Paid", desc: "Monthly payouts when you reach $50 minimum." }
                                ].map((item, idx) => (
                                    <div key={idx} className="flex gap-6 group">
                                        <span className="text-2xl font-black text-white/20 group-hover:text-[#9F2D5C] transition-colors italic">{item.step}</span>
                                        <div>
                                            <h4 className="text-lg font-bold uppercase tracking-widest text-[#9F2D5C] mb-2">{item.title}</h4>
                                            <p className="text-slate-400 text-sm font-medium">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="hidden lg:block relative">
                            <div className="aspect-[4/5] rounded-[2.5rem] bg-gradient-to-br from-slate-800 to-slate-950 border border-slate-700/50 p-12 flex flex-col justify-center items-center text-center shadow-2xl relative">
                                <Sparkles className="text-[#9F2D5C] mb-8 animate-pulse" size={64} />
                                <h4 className="text-3xl font-black italic uppercase tracking-tighter mb-4">Refer. Earn. Repeat.</h4>
                                <p className="text-slate-400 mb-10 text-sm leading-relaxed">Join hundreds of stylists and enthusiasts earning rewards with the most generous affiliate program in Manor, TX.</p>
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/10 w-full">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9F2D5C] mb-2">Next Payout Window</p>
                                    <p className="text-xl font-bold">End of Month</p>
                                </div>
                                {/* Floating elements */}
                                <div className="absolute -top-6 -right-6 w-24 h-24 bg-[#9F2D5C]/20 rounded-full blur-2xl" />
                                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* SECTION 4: GENERATE REFERRAL CODE */}
            <section id="generate-section" className="max-w-4xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-xs font-black uppercase tracking-[0.3em] text-[#9F2D5C] mb-4">The Generator</h2>
                    <h3 className="text-4xl font-black text-slate-900 dark:text-white italic uppercase tracking-tighter">Get Your Unique Code</h3>
                </div>

                {!generatedProfile ? (
                    <Card className="p-10 sm:p-16 rounded-[3rem] border-slate-100 dark:border-slate-800 shadow-2xl shadow-slate-950/5">
                        <form onSubmit={handleGenerateCode} className="space-y-8">
                            <div className="grid sm:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label htmlFor="affiliate-name" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</label>
                                    <Input
                                        id="affiliate-name"
                                        placeholder="Jane Smith"
                                        className="rounded-2xl py-8 px-6 text-lg border-2 focus:border-[#9F2D5C] transition-all"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label htmlFor="affiliate-email" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
                                    <Input
                                        id="affiliate-email"
                                        type="email"
                                        placeholder="jane@example.com"
                                        className="rounded-2xl py-8 px-6 text-lg border-2 focus:border-[#9F2D5C] transition-all"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-900/50 p-8 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Reward Summary</p>
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedType === 'client' ? 'bg-[#9F2D5C]/10 text-[#9F2D5C]' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                        {selectedType === 'client' ? <Gift size={24} /> : <Coins size={24} />}
                                    </div>
                                    <div>
                                        <p className="font-black text-slate-900 dark:text-white italic uppercase tracking-tight">
                                            {selectedType === 'client' ? '10% OFF BRAIDING' : '10% CASH COMMISSION'}
                                        </p>
                                        <p className="text-sm text-slate-500 font-medium">Applied to your {selectedType === 'client' ? 'next hair appointment' : 'monthly payout totals'}.</p>
                                    </div>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={isGenerating}
                                className={`w-full py-10 rounded-2xl text-2xl font-black italic uppercase tracking-tighter shadow-xl transition-all ${isGenerating ? 'bg-slate-400' : 'bg-[#9F2D5C] hover:bg-[#B8326A] shadow-[#9F2D5C]/30'}`}
                            >
                                {isGenerating ? 'Generating...' : 'Generate My Code'}
                            </Button>
                            <p className="text-center text-xs text-slate-400 font-bold uppercase tracking-widest">
                                By clicking, you agree to our affiliate terms and conditions.
                            </p>
                        </form>
                    </Card>
                ) : (
                    <Card className="p-12 sm:p-20 rounded-[4rem] border-2 border-[#9F2D5C]/20 bg-white dark:bg-slate-900 shadow-2xl text-center space-y-10 animate-in zoom-in-95 duration-500">
                        <div className="w-24 h-24 rounded-[2.5rem] bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/10">
                            <CheckCircle size={48} />
                        </div>

                        <div>
                            <h4 className="text-xl font-black text-slate-900 dark:text-white italic uppercase tracking-tighter mb-2">Congratulations, {generatedProfile.name}!</h4>
                            <p className="text-slate-500 font-medium">Your referral code is active and ready to use.</p>
                        </div>

                        <div className="relative group max-w-md mx-auto">
                            <div className="bg-slate-50 dark:bg-slate-950 p-8 rounded-[2rem] border-2 border-[#9F2D5C] text-4xl sm:text-5xl font-black text-[#9F2D5C] tracking-widest uppercase italic">
                                {generatedProfile.code}
                            </div>
                            <button
                                onClick={() => copyToClipboard(generatedProfile.code)}
                                className="absolute -top-4 -right-4 w-12 h-12 rounded-2xl bg-[#9F2D5C] text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform active:scale-95"
                            >
                                <Copy size={20} />
                            </button>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <div className="flex items-center gap-2 text-emerald-600 font-black uppercase tracking-widest text-xs bg-emerald-50 dark:bg-emerald-500/10 px-4 py-2 rounded-full">
                                <Mail size={14} />
                                Email Sent Successfully
                            </div>
                            <span className="text-slate-300">|</span>
                            <div className="flex items-center gap-2 text-slate-400 font-black uppercase tracking-widest text-xs">
                                <ShieldCheck size={14} />
                                Tracked Profile #{generatedProfile.id.toUpperCase()}
                            </div>
                        </div>

                        <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                            We&apos;ve emailed you this code at <span className="text-slate-900 dark:text-white font-bold">{generatedProfile.email}</span> for your records. Please use it for all future communications.
                        </p>

                        <div className="pt-6">
                            <button
                                onClick={() => setGeneratedProfile(null)}
                                className="text-xs font-black uppercase tracking-[0.2em] text-[#9F2D5C] hover:opacity-70 transition-opacity"
                            >
                                Generate New Code
                            </button>
                        </div>
                    </Card>
                )}
            </section>

            {/* SECTION 5: REWARDS & PAYOUT RULES */}
            <section className="bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] p-12 sm:p-20 relative overflow-hidden">
                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    <div>
                        <h2 className="text-xs font-black uppercase tracking-[0.3em] text-[#9F2D5C] mb-6">Program Rules</h2>
                        <h3 className="text-4xl font-black text-slate-900 dark:text-white italic uppercase tracking-tighter leading-tight mb-8">
                            Transparent Rewards <br />
                            For Every Referral
                        </h3>
                        <div className="space-y-6">
                            {[
                                "Clients receive 10% discount on their subsequent hair braiding service.",
                                "General affiliates earn 10% of product or braiding service cost per qualified referral.",
                                "A qualified referral is a new client purchase or booking paid successfully.",
                                "Cash payouts are distributed once per month at month-end.",
                                "Minimum earnings of $50 are required for a cash payout to be issued."
                            ].map((rule, idx) => (
                                <div key={idx} className="flex gap-4 items-start">
                                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#9F2D5C] shrink-0" />
                                    <p className="text-slate-600 dark:text-slate-400 font-medium text-lg leading-relaxed">{rule}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        <div className="p-6 sm:p-8 rounded-[2.5rem] bg-white dark:bg-slate-900 shadow-xl border border-slate-100 dark:border-slate-800 text-center">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Service Discount</p>
                            <p className="text-5xl font-black text-[#9F2D5C] italic tracking-tighter">10%</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase mt-2">Off Braids</p>
                        </div>
                        <div className="p-6 sm:p-8 rounded-[2.5rem] bg-white dark:bg-slate-900 shadow-xl border border-slate-100 dark:border-slate-800 text-center">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Cash Commission</p>
                            <p className="text-5xl font-black text-emerald-500 italic tracking-tighter">10%</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase mt-2">Per Sale</p>
                        </div>
                        <div className="p-6 sm:p-8 rounded-[2.5rem] bg-white dark:bg-slate-900 shadow-xl border border-slate-100 dark:border-slate-800 text-center">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Payout Minimum</p>
                            <p className="text-5xl font-black text-slate-900 dark:text-white italic tracking-tighter">$50</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase mt-2">Earnings</p>
                        </div>
                        <div className="p-6 sm:p-8 rounded-[2.5rem] bg-white dark:bg-slate-900 shadow-xl border border-slate-100 dark:border-slate-800 text-center">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Schedule</p>
                            <p className="text-3xl font-black text-slate-900 dark:text-white italic tracking-tighter uppercase">Monthly</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase mt-2">At Month-End</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* SECTION 6: FAQ */}
            <section className="max-w-4xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-xs font-black uppercase tracking-[0.3em] text-[#9F2D5C] mb-4">FAQ</h2>
                    <h3 className="text-4xl font-black text-slate-900 dark:text-white italic uppercase tracking-tighter">Everything You Need To Know</h3>
                </div>
                <Accordion items={faqItems} />
            </section>

            {/* SECTION 7: SUPPORT / CONTACT CTA */}
            <section className="text-center">
                <div className="max-w-3xl mx-auto p-12 sm:p-20 rounded-[4rem] bg-slate-900 text-white relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_left,rgba(159,45,92,0.4),transparent_60%)]" />
                    <div className="relative z-10">
                        <HelpCircle className="mx-auto text-[#9F2D5C] mb-8" size={64} />
                        <h2 className="text-4xl font-black italic uppercase tracking-tighter mb-6">Need Extra Support?</h2>
                        <p className="text-slate-400 mb-10 text-lg font-medium leading-relaxed">
                            Have questions about your referrals, custom terms, or partnership opportunities? <br className="hidden sm:block" />
                            Our team is here to help you succeed.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                            <Link
                                href="/contact"
                                className="bg-[#9F2D5C] hover:bg-[#B8326A] text-white px-10 py-7 rounded-2xl font-black uppercase tracking-widest text-sm inline-flex items-center justify-center transition-all shadow-lg active:scale-95"
                            >
                                Contact Support
                            </Link>
                            <div className="flex flex-col items-center sm:items-start text-xs font-black uppercase tracking-[0.2em] text-slate-400 space-y-2">
                                <a href={`tel:${CONTACT_PHONE.replace(/\D/g, '')}`} className="flex items-center gap-2 hover:text-white transition-colors">
                                    <Phone size={14} className="text-[#9F2D5C]" />
                                    {CONTACT_PHONE}
                                </a>
                                <a href={`mailto:${CONTACT_EMAIL}`} className="flex items-center gap-2 hover:text-white transition-colors">
                                    <Mail size={14} className="text-[#9F2D5C]" />
                                    {CONTACT_EMAIL}
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

        </main>
    );
}
