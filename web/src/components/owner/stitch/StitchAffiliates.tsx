"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
    subscribeToAffiliates,
    createAffiliateProfile,
    sendAffiliateCodeEmail,
} from "@/src/lib/affiliate/affiliateService";
import { AffiliateProfile, AffiliateType } from "@/src/lib/affiliate/types";
import {
    Users,
    Plus,
    Copy,
    Check,
    Search,
    Mail,
    Tag,
    X,
    Loader2,
    UserCheck,
    UserCog,
} from "lucide-react";
import { Tooltip } from "@/components/ui";

function formatDate(ts: any): string {
    if (!ts) return "—";
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function typeBadge(type?: string) {
    if (type === "client")
        return { label: "Client", cls: "bg-[#e9ddff] text-[#6b38d4] dark:bg-[#6b38d4]/20 dark:text-[#d0bcff]" };
    return { label: "General", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" };
}

interface CopyButtonProps { code: string }
function CopyButton({ code }: CopyButtonProps) {
    const [copied, setCopied] = useState(false);
    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation();
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
    };
    return (
        <Tooltip content={copied ? "Copied!" : "Copy Code"} position="top">
            <button
                onClick={handleCopy}
                className="ml-1.5 p-1 rounded-lg hover:bg-[#e9ddff] dark:hover:bg-slate-700 text-slate-400 hover:text-[#6b38d4] transition-colors"
                aria-label="Copy referral code"
            >
                {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
            </button>
        </Tooltip>
    );
}

export default function StitchAffiliates() {
    const [affiliates, setAffiliates] = useState<AffiliateProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState<"all" | AffiliateType>("all");
    const [selected, setSelected] = useState<AffiliateProfile | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [sendingEmail, setSendingEmail] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    // Add affiliate form state
    const [form, setForm] = useState({ name: "", email: "", type: "general" as AffiliateType });
    const [formSaving, setFormSaving] = useState(false);
    const [formError, setFormError] = useState("");

    useEffect(() => {
        const unsub = subscribeToAffiliates((data) => {
            setAffiliates(data);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const filtered = useMemo(() => {
        let list = affiliates;
        if (typeFilter !== "all") list = list.filter((a) => a.type === typeFilter);
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(
                (a) =>
                    a.name.toLowerCase().includes(q) ||
                    a.email.toLowerCase().includes(q) ||
                    a.code.toLowerCase().includes(q)
            );
        }
        return list;
    }, [affiliates, typeFilter, search]);

    const handleAddAffiliate = async () => {
        if (!form.name || !form.email) {
            setFormError("Name and email are required.");
            return;
        }
        setFormError("");
        setFormSaving(true);
        try {
            await createAffiliateProfile({ name: form.name, email: form.email, type: form.type });
            setIsAdding(false);
            setForm({ name: "", email: "", type: "general" });
        } catch (err: any) {
            setFormError(err.message || "Failed to create affiliate.");
        } finally {
            setFormSaving(false);
        }
    };

    const handleSendEmail = async (profile: AffiliateProfile) => {
        setSendingEmail(true);
        setEmailSent(false);
        try {
            await sendAffiliateCodeEmail(profile);
            setEmailSent(true);
            setTimeout(() => setEmailSent(false), 3000);
        } catch (err) {
            console.error(err);
        } finally {
            setSendingEmail(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 size={40} className="animate-spin text-[#6b38d4]" />
            </div>
        );
    }

    const clientCount = affiliates.filter((a) => a.type === "client").length;
    const generalCount = affiliates.filter((a) => a.type === "general").length;

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold font-headline tracking-tight text-slate-900 dark:text-white">
                        Affiliates
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Manage your referral partners and discount codes.
                    </p>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#6b38d4] to-[#8455ef] text-white font-bold shadow-lg shadow-[#8455ef]/20 hover:scale-105 active:scale-95 transition-all self-start md:self-auto"
                >
                    <Plus size={18} /> Add Affiliate
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-5 border border-slate-100 dark:border-slate-800 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Total Affiliates</p>
                    <p className="text-3xl font-black font-headline text-slate-900 dark:text-white">{affiliates.length}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-5 border border-slate-100 dark:border-slate-800 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-widest text-[#6b38d4] dark:text-[#d0bcff] mb-1">Client Partners</p>
                    <p className="text-3xl font-black font-headline text-[#6b38d4] dark:text-[#d0bcff]">{clientCount}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-[1.5rem] p-5 border border-slate-100 dark:border-slate-800 shadow-sm col-span-2 md:col-span-1">
                    <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-1">General Partners</p>
                    <p className="text-3xl font-black font-headline text-emerald-600 dark:text-emerald-400">{generalCount}</p>
                </div>
            </div>

            {/* Filter + Search */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex bg-[#eff4ff] dark:bg-slate-800 rounded-full p-1 gap-1">
                    {(["all", "client", "general"] as const).map((t) => (
                        <button
                            key={t}
                            onClick={() => setTypeFilter(t)}
                            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                                typeFilter === t
                                    ? "bg-white dark:bg-slate-900 text-[#6b38d4] shadow-sm"
                                    : "text-slate-500 hover:text-[#6b38d4]"
                            }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
                <div className="relative flex-1 max-w-sm">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search affiliates or codes..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#6b38d4]"
                    />
                </div>
            </div>

            {/* Affiliate List + Detail */}
            <div className="flex flex-col lg:flex-row gap-6">
                {/* List */}
                <div className="flex-1 space-y-4 min-w-0">
                    {filtered.length === 0 && (
                        <div className="py-24 text-center bg-white dark:bg-slate-900 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-700">
                            <Users size={48} className="mx-auto text-slate-300 mb-4" />
                            <p className="font-bold text-slate-500">No affiliates found.</p>
                        </div>
                    )}
                    {filtered.map((affiliate) => {
                        const badge = typeBadge(affiliate.type);
                        const isSelected = selected?.id === affiliate.id;
                        return (
                            <div
                                key={affiliate.id}
                                onClick={() => setSelected(affiliate)}
                                className={`group bg-white dark:bg-slate-900 p-6 rounded-[1.75rem] border cursor-pointer transition-all hover:shadow-lg hover:shadow-[#6b38d4]/5 ${
                                    isSelected
                                        ? "border-[#6b38d4] ring-2 ring-[#6b38d4]/20"
                                        : "border-slate-100 dark:border-slate-800"
                                }`}
                            >
                                <div className="flex flex-wrap items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#6b38d4] to-[#fd56a7] flex items-center justify-center text-white font-bold text-lg shrink-0">
                                            {affiliate.name[0]?.toUpperCase() ?? "?"}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-bold font-headline text-slate-900 dark:text-white">
                                                    {affiliate.name}
                                                </span>
                                                <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full tracking-wider ${badge.cls}`}>
                                                    {badge.label}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{affiliate.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-center px-4 border-x border-slate-100 dark:border-slate-800 hidden sm:block">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Usages</p>
                                            <p className="text-lg font-black text-slate-900 dark:text-white">
                                                {affiliate.usageCount || 0}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <div className="flex items-center gap-1 bg-[#eff4ff] dark:bg-slate-800 px-3 py-1.5 rounded-full">
                                                <Tag size={12} className="text-[#6b38d4]" />
                                                <span className="text-xs font-black text-[#6b38d4] dark:text-[#d0bcff] font-mono tracking-widest">
                                                    {affiliate.code}
                                                </span>
                                                <CopyButton code={affiliate.code} />
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {(affiliate.usageCount || 0) > 0 ? (
                                                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                                                        <Check size={10} /> Redeemed
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-bold uppercase text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                                        Active
                                                    </span>
                                                )}
                                                <span className="text-[10px] text-slate-400">
                                                    {formatDate(affiliate.createdAt)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Detail Panel */}
                {selected && (
                    <aside className="w-full lg:w-[380px] shrink-0 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-2xl shadow-[#6b38d4]/5 p-8 self-start sticky top-24 space-y-8">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-extrabold font-headline text-slate-900 dark:text-white">Affiliate Details</h2>
                            <Tooltip content="Close Panel" position="left">
                                <button
                                    onClick={() => setSelected(null)}
                                    className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </Tooltip>
                        </div>

                        {/* Avatar + Info */}
                        <div className="flex items-center gap-4 p-4 bg-[#eff4ff] dark:bg-slate-800 rounded-2xl">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#6b38d4] to-[#fd56a7] flex items-center justify-center text-white font-bold text-xl shrink-0">
                                {selected.name[0]?.toUpperCase()}
                            </div>
                            <div>
                                <p className="font-bold text-slate-900 dark:text-white">{selected.name}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{selected.email}</p>
                            </div>
                        </div>

                        {/* Code block */}
                        <div className="space-y-2">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Referral Code</p>
                            <div className="flex items-center justify-between bg-[#e9ddff] dark:bg-slate-800 px-5 py-4 rounded-2xl">
                                <span className="text-xl font-black font-mono text-[#6b38d4] dark:text-[#d0bcff] tracking-widest">
                                    {selected.code}
                                </span>
                                <CopyButton code={selected.code} />
                            </div>
                        </div>

                        {/* Meta */}
                        <div className="space-y-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Details</p>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500 flex items-center gap-1.5">
                                        {selected.type === "client" ? <UserCheck size={14} className="text-[#6b38d4]" /> : <UserCog size={14} className="text-emerald-500" />}
                                        Type
                                    </span>
                                    <span className={`font-bold px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider ${typeBadge(selected.type).cls}`}>
                                        {typeBadge(selected.type).label}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Joined</span>
                                    <span className="font-bold text-slate-900 dark:text-white">{formatDate(selected.createdAt)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Discount</span>
                                    <span className="font-bold text-[#6b38d4]">10% off</span>
                                </div>
                                <div className="flex justify-between text-sm border-t border-slate-50 dark:border-slate-800 pt-2 mt-2">
                                    <span className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Performance</span>
                                    <span className="font-black text-slate-900 dark:text-white">
                                        {selected.usageCount || 0} Uses
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="space-y-3">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Actions</p>
                            <button
                                disabled={sendingEmail}
                                onClick={() => handleSendEmail(selected)}
                                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#6b38d4] text-white font-bold text-sm shadow-lg shadow-[#6b38d4]/20 hover:translate-y-[-1px] transition-all active:scale-95 disabled:opacity-50"
                            >
                                {sendingEmail ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : emailSent ? (
                                    <Check size={16} className="text-emerald-300" />
                                ) : (
                                    <Mail size={16} />
                                )}
                                {emailSent ? "Email Sent!" : "Resend Code Email"}
                            </button>
                        </div>
                    </aside>
                )}
            </div>

            {/* Add Affiliate Modal */}
            {isAdding && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-md bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl space-y-6 border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                            <h3 className="text-2xl font-extrabold font-headline text-slate-900 dark:text-white">
                                New Affiliate
                            </h3>
                            <button
                                onClick={() => { setIsAdding(false); setFormError(""); }}
                                className="text-slate-400 p-2 bg-slate-100 dark:bg-slate-800 rounded-full transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {formError && (
                            <p className="text-sm text-red-500 font-semibold bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-2">
                                {formError}
                            </p>
                        )}

                        <div className="space-y-4">
                            {[
                                { label: "Full Name *", key: "name", type: "text", placeholder: "e.g. Jane Smith" },
                                { label: "Email *", key: "email", type: "email", placeholder: "jane@example.com" },
                            ].map((f) => (
                                <div key={f.key} className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-widest text-slate-400">{f.label}</label>
                                    <input
                                        type={f.type}
                                        placeholder={f.placeholder}
                                        value={(form as any)[f.key]}
                                        onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                                        className="w-full rounded-2xl py-3.5 px-5 bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-[#6b38d4] text-slate-900 dark:text-white text-sm font-bold focus:outline-none"
                                    />
                                </div>
                            ))}

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Affiliate Type</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {(["general", "client"] as AffiliateType[]).map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => setForm((s) => ({ ...s, type: t }))}
                                            className={`py-3 rounded-2xl font-bold text-sm transition-all ${
                                                form.type === t
                                                    ? "bg-[#6b38d4] text-white shadow-lg shadow-[#6b38d4]/20"
                                                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-[#e9ddff] hover:text-[#6b38d4]"
                                            }`}
                                        >
                                            {t === "client" ? "Client Partner" : "General Partner"}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <p className="text-xs text-slate-400 bg-[#eff4ff] dark:bg-slate-800 rounded-xl px-4 py-3">
                            A unique referral code will be auto-generated (e.g. <span className="font-mono font-bold text-[#6b38d4]">DB-AFF-XXXXXX</span>) and a welcome email will be queued.
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setIsAdding(false); setFormError(""); }}
                                className="flex-1 py-4 rounded-2xl font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddAffiliate}
                                disabled={formSaving || !form.name || !form.email}
                                className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#6b38d4] text-white font-bold shadow-lg shadow-[#6b38d4]/20 disabled:opacity-50 hover:translate-y-[-1px] transition-all active:scale-95"
                            >
                                {formSaving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                                Create Affiliate
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
