"use client";

import React, { useState, useEffect } from "react";
import { Mail, AlertCircle, CheckCircle2, Lock, Trash2, Plus, Sparkles, RefreshCw } from "lucide-react";
import { useAuth } from "@/src/providers/AuthProvider";

interface EmailSender {
    email: string;
    name: string;
    isPrimary: boolean;
    connected: boolean;
    updatedAt?: any;
}

export default function StitchEmailSettings() {
    const { isSuperAdmin } = useAuth();
    const [senders, setSenders] = useState<EmailSender[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [newEmail, setNewEmail] = useState("");
    const [newName, setNewName] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Fetch all configured email senders from our secure API
    const fetchSenders = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch("/api/admin/email/senders");
            const data = await res.json();
            if (data.success) {
                // Ensure primary is always sorted first, followed by others
                const sortedSenders = [...data.senders].sort((a, b) => {
                    if (a.isPrimary) return -1;
                    if (b.isPrimary) return 1;
                    return a.email.localeCompare(b.email);
                });
                setSenders(sortedSenders);
            } else {
                setError(data.error || "Failed to load email configurations.");
            }
        } catch (err: any) {
            setError(err.message || "Failed to fetch email configurations.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSenders();

        // Check query parameters for success/error redirection from OAuth
        const params = new URLSearchParams(window.location.search);
        if (params.get("email_success") === "true") {
            setSuccess("Google account successfully authorized!");
            // Clean up url parameters without reloading page
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (params.get("email_error")) {
            setError(`Authorization failed: ${decodeURIComponent(params.get("email_error") || "")}`);
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, []);

    const handleConnect = (email: string) => {
        // Redirect to the auth API route with target email parameter
        window.location.href = `/api/admin/email/auth?email=${encodeURIComponent(email)}`;
    };

    const handleDelete = async (email: string) => {
        if (!confirm(`Are you sure you want to remove the email configuration for ${email}?`)) {
            return;
        }

        try {
            setActionLoading(email);
            setError(null);
            setSuccess(null);
            const res = await fetch(`/api/admin/email/senders?email=${encodeURIComponent(email)}`, {
                method: "DELETE"
            });
            const data = await res.json();
            if (data.success) {
                setSuccess(`Successfully removed email sender: ${email}`);
                await fetchSenders();
            } else {
                setError(data.error || "Failed to delete sender.");
            }
        } catch (err: any) {
            setError(err.message || "Failed to delete sender.");
        } finally {
            setActionLoading(null);
        }
    };

    const handleAddSender = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        const email = newEmail.trim().toLowerCase();
        const name = newName.trim();

        if (!email || !name) {
            setError("Both Name and Email are required.");
            return;
        }

        if (senders.some(s => s.email.toLowerCase() === email)) {
            setError("An integration for this email address already exists.");
            return;
        }

        // To add a sender to the Firestore database with pending authorization,
        // we can trigger the OAuth connection directly for it.
        handleConnect(email);
    };

    const primarySender = senders.find(s => s.isPrimary);
    const customSenders = senders.filter(s => !s.isPrimary);

    return (
        <div className="max-w-full space-y-8 pb-20 animate-in fade-in duration-700">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-2 flex items-center gap-2">
                        Global Email Integrations <Sparkles className="text-purple-500 w-6 h-6 animate-pulse" />
                    </h2>
                    <p className="text-slate-500 font-medium">Manage primary and custom email senders for Misericordia Hair Design.</p>
                </div>
                <button 
                    onClick={fetchSenders} 
                    className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-slate-100 dark:border-slate-800"
                    title="Refresh List"
                >
                    <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                </button>
            </div>

            {error && (
                <div className="p-4 border border-rose-100 bg-rose-50 dark:bg-rose-950/20 dark:border-rose-900/50 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="text-rose-500 shrink-0 mt-0.5" size={20} />
                    <div className="text-sm font-medium text-rose-800 dark:text-rose-400">{error}</div>
                </div>
            )}

            {success && (
                <div className="p-4 border border-emerald-100 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-900/50 rounded-2xl flex items-start gap-3">
                    <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={20} />
                    <div className="text-sm font-medium text-emerald-800 dark:text-emerald-400">{success}</div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* PRIMARY SENDER INTEGRATION */}
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[380px]">
                    <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-200/5 dark:bg-indigo-900/5 rounded-full blur-3xl pointer-events-none"></div>
                    
                    <div className="space-y-6">
                        <div className="flex items-start justify-between">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner">
                                <Mail size={24} />
                            </div>
                            {primarySender?.connected ? (
                                <span className="px-3 py-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold rounded-xl flex items-center gap-1.5 border border-emerald-500/20">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Connected
                                </span>
                            ) : (
                                <span className="px-3 py-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-bold rounded-xl flex items-center gap-1.5 border border-amber-500/20">
                                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span> Not Connected
                                </span>
                            )}
                        </div>

                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-xl font-black text-slate-900 dark:text-white">Primary Sender</h3>
                                <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-[10px] font-black uppercase tracking-wider rounded-md">Primary</span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">Standard system email address used for automatic booking receipts and alerts.</p>
                        </div>
                    </div>

                    <div className="p-6 bg-slate-50/50 dark:bg-slate-800/20 rounded-2xl border border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm mt-6">
                        <div className="min-w-0 flex-1">
                            <h4 className="font-extrabold text-slate-800 dark:text-slate-200 truncate whitespace-nowrap">{primarySender?.name || "Misericordia Hair Design"}</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">{primarySender?.email || "sales@edxstore.com"}</p>
                        </div>
                        {isSuperAdmin ? (
                            <button 
                                onClick={() => handleConnect(primarySender?.email || "sales@edxstore.com")}
                                className="px-4 py-2.5 bg-[#6b38d4] hover:bg-purple-700 text-white rounded-xl text-xs font-black shadow-md shadow-purple-200 dark:shadow-none transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-95 shrink-0 self-end sm:self-auto"
                            >
                                <RefreshCw size={12} className={actionLoading === (primarySender?.email || "sales@edxstore.com") ? "animate-spin" : ""} />
                                {primarySender?.connected ? "Reconnect" : "Connect"}
                            </button>
                        ) : (
                            <div className="flex items-center gap-1.5 text-slate-400 font-bold text-[10px]">
                                <Lock size={12} /> Super Admin Only
                            </div>
                        )}
                    </div>
                </div>

                {/* CUSTOM SENDERS AND MANAGEMENT */}
                <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-8 min-h-[380px] flex flex-col justify-between">
                    <div>
                        <div className="mb-4">
                            <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">Additional Senders</h3>
                            <p className="text-slate-500 font-medium text-xs">Register additional staff or brand emails. Customers will receive communications from the sender selected by the booker.</p>
                        </div>

                        {loading ? (
                            <div className="py-8 text-center text-slate-400 font-bold">Loading email configurations...</div>
                        ) : customSenders.length === 0 ? (
                            <div className="py-10 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-[2rem] text-slate-400 font-medium text-sm my-4">
                                No custom email senders configured yet. Add one below!
                            </div>
                        ) : (
                            <div className="overflow-hidden border border-slate-100 dark:border-slate-800 rounded-3xl my-4">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                            <th className="p-4 pl-6">Display Name</th>
                                            <th className="p-4">Email Address</th>
                                            <th className="p-4">Connection Status</th>
                                            <th className="p-4 pr-6 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm font-semibold text-slate-800 dark:text-slate-200">
                                        {customSenders.map((sender) => (
                                            <tr key={sender.email} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/20 transition-all">
                                                <td className="p-4 pl-6 font-bold">{sender.name || "Custom Sender"}</td>
                                                <td className="p-4 text-slate-500 dark:text-slate-400 font-medium">{sender.email}</td>
                                                <td className="p-4">
                                                    {sender.connected ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                                                            <span className="w-1 h-1 bg-emerald-500 rounded-full animate-pulse"></span> Connected
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                                            <span className="w-1 h-1 bg-amber-500 rounded-full animate-pulse"></span> Needs Auth
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-4 pr-6 text-right space-x-2">
                                                    {isSuperAdmin ? (
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button 
                                                                onClick={() => handleConnect(sender.email)}
                                                                className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all"
                                                            >
                                                                {sender.connected ? "Reconnect" : "Connect"}
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDelete(sender.email)}
                                                                className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all"
                                                                disabled={actionLoading === sender.email}
                                                                title="Delete Sender"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-slate-400 font-bold"><Lock size={12} className="inline mr-1" /> Locked</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* ADD SENDER FORM (ONLY SUPER ADMIN) */}
                    {isSuperAdmin && (
                        <form onSubmit={handleAddSender} className="p-6 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/80 rounded-3xl space-y-4 mt-auto">
                            <h4 className="font-extrabold text-sm text-slate-850 dark:text-slate-200 flex items-center gap-2">
                                <Plus size={16} /> Add Custom Email Integration
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500">Display Name / Name</label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. Booking Desk / Hairdresser Name"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold outline-none focus:border-purple-500 transition-colors"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-500">Google Account Email</label>
                                    <input 
                                        type="email" 
                                        placeholder="e.g. partner@gmail.com"
                                        value={newEmail}
                                        onChange={(e) => setNewEmail(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-semibold outline-none focus:border-purple-500 transition-colors"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end pt-2">
                                <button 
                                    type="submit"
                                    className="px-5 py-2.5 bg-[#6b38d4] hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-200 dark:shadow-none transition-all flex items-center gap-2 hover:scale-[1.02] active:scale-95"
                                >
                                    <Plus size={14} /> Authorize & Link Google Account
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
