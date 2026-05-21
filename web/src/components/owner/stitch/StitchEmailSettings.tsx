"use client";

import React, { useState, useEffect } from "react";
import { Mail, Settings, AlertCircle, CheckCircle2, Lock } from "lucide-react";
import { getDb } from "@/src/lib/firebase/client";
import { doc, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/src/providers/AuthProvider";

export default function StitchEmailSettings() {
    const { isSuperAdmin } = useAuth();
    const [connectedEmail, setConnectedEmail] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // We listen to the emailSenders/primary_gmail document to see if an email is connected.
        // The user must be an owner for this to succeed (handled by firestore rules).
        const db = getDb();
        const unsub = onSnapshot(doc(db, "emailSenders", "primary_gmail"), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setConnectedEmail(data.email || "Connected Account");
            } else {
                setConnectedEmail(null);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching email settings:", error);
            setLoading(false);
        });

        return () => unsub();
    }, []);

    const handleConnect = () => {
        // Redirect to the API route that starts the Google OAuth flow
        window.location.href = "/api/admin/email/auth";
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-in fade-in duration-700">
            <div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-2">Global Integrations</h2>
                <p className="text-slate-500 font-medium">System-wide configurations managed by the Super Admin.</p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 flex items-center justify-center">
                        <Mail size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Email Integration</h2>
                        <p className="text-sm text-slate-500 font-medium">Connect your Gmail account to send booking confirmations automatically.</p>
                    </div>
                </div>

                {loading ? (
                    <div className="py-8 text-center text-slate-400 font-bold">Checking connection status...</div>
                ) : connectedEmail ? (
                    <div className="p-6 border border-emerald-100 bg-emerald-50 dark:bg-emerald-900/10 dark:border-emerald-800/50 rounded-3xl flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <CheckCircle2 size={24} className="text-emerald-500" />
                            <div>
                                <h3 className="font-bold text-emerald-900 dark:text-emerald-400">Successfully Connected</h3>
                                <p className="text-sm text-emerald-700 dark:text-emerald-600 font-medium">Sending emails as: <strong>{connectedEmail}</strong></p>
                            </div>
                        </div>
                        {isSuperAdmin ? (
                            <button 
                                onClick={handleConnect}
                                className="px-4 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-50 transition-colors"
                            >
                                Reconnect
                            </button>
                        ) : (
                            <div className="flex items-center gap-2 text-slate-400 font-bold text-xs">
                                <Lock size={14} /> Locked
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-6 border border-amber-100 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800/50 rounded-3xl flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <AlertCircle size={24} className="text-amber-500" />
                            <div>
                                <h3 className="font-bold text-amber-900 dark:text-amber-400">Not Connected</h3>
                                <p className="text-sm text-amber-700 dark:text-amber-600 font-medium">Your application cannot send emails until an account is linked.</p>
                            </div>
                        </div>
                        {isSuperAdmin ? (
                            <button 
                                onClick={handleConnect}
                                className="px-6 py-2 bg-[#6b38d4] hover:bg-purple-700 text-white rounded-xl text-sm font-bold shadow-md shadow-purple-200 transition-all"
                            >
                                Connect Gmail
                            </button>
                        ) : (
                            <div className="flex items-center gap-2 text-slate-400 font-bold text-xs">
                                <Lock size={14} /> Only Super Admin can connect
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
