"use client";

import { useState } from "react";
import { useAuth } from "@/src/providers/AuthProvider";
import { getDb } from "@/src/lib/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";

export default function SetOwnerPage() {
    const { user, role, loading } = useAuth();
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [errorMsg, setErrorMsg] = useState("");

    const handleSetOwner = async () => {
        if (!user) return;
        setStatus("loading");
        setErrorMsg("");

        try {
            console.log(`[SetOwnerPage] Updating role to 'owner' for UID: ${user.uid}`);
            const db = getDb();
            const { setDoc } = await import("firebase/firestore"); // Import explicitly to avoid any tree-shaking issues in dev
            const userRef = doc(db, "users", user.uid);

            await setDoc(userRef, {
                role: "owner",
                updatedAt: serverTimestamp(),
            }, { merge: true });

            console.log("[SetOwnerPage] Role update successful!");
            setStatus("success");
            // Reload page to refresh auth context role
            setTimeout(() => window.location.reload(), 2000);
        } catch (err: any) {
            console.error("[SetOwnerPage] Role update failed:", err);
            setStatus("error");
            setErrorMsg(err.message || "Unknown error occurred.");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                <span className="material-icons animate-spin text-[#a319c5] text-4xl">autorenew</span>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50 dark:bg-slate-900 py-20 px-6">
            <div className="max-w-2xl mx-auto bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700">
                <div className="p-12">
                    <div className="w-16 h-16 rounded-2xl bg-[#a319c5]/10 flex items-center justify-center mb-8">
                        <span className="material-icons text-[#a319c5] text-3xl">admin_panel_settings</span>
                    </div>

                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
                        Owner Role Utility
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mb-10 leading-relaxed">
                        This utility allows you to promote your account to the <strong>Owner</strong> role.
                        Once assigned, you will have access to the dashboard and management tools.
                    </p>

                    {!user ? (
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-6 text-amber-800 dark:text-amber-300">
                            <p className="font-bold flex items-center gap-2 mb-2">
                                <span className="material-icons text-base">warning</span>
                                Not Logged In
                            </p>
                            <p className="text-sm">
                                Please sign in first to use this utility.
                            </p>
                            <a href="/login" className="mt-4 inline-block text-[#a319c5] font-bold text-sm hover:underline">
                                Go to Login →
                            </a>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">UID</p>
                                    <p className="text-xs font-mono text-slate-600 dark:text-slate-400 break-all">{user.uid}</p>
                                </div>
                                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Current Role</p>
                                    <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${role === "owner"
                                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                        : "bg-[#a319c5]/10 text-[#a319c5]"
                                        }`}>
                                        {role || "client"}
                                    </span>
                                </div>
                            </div>

                            {status === "success" && (
                                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-6 text-green-800 dark:text-green-400 animate-in zoom-in duration-300">
                                    <p className="font-bold flex items-center gap-2">
                                        <span className="material-icons">check_circle</span>
                                        Role Updated Successfully!
                                    </p>
                                    <p className="text-sm mt-2 opacity-80">
                                        Refreshing to apply changes...
                                    </p>
                                </div>
                            )}

                            {status === "error" && (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 text-red-800 dark:text-red-400">
                                    <p className="font-bold">Error updating role</p>
                                    <p className="text-sm mt-1">{errorMsg}</p>
                                </div>
                            )}

                            {role !== "owner" && status !== "success" && (
                                <button
                                    onClick={handleSetOwner}
                                    disabled={status === "loading"}
                                    className="w-full py-5 bg-[#a319c5] hover:bg-[#8b15a8] text-white font-bold rounded-2xl shadow-xl shadow-[#a319c5]/30 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3"
                                >
                                    {status === "loading" ? (
                                        <span className="material-icons animate-spin">autorenew</span>
                                    ) : (
                                        <span className="material-icons">verified_user</span>
                                    )}
                                    Become an Owner
                                </button>
                            )}

                            {role === "owner" && (
                                <div className="text-center pt-4">
                                    <p className="text-slate-400 text-sm italic mb-6">
                                        You already have owner privileges.
                                    </p>
                                    <a
                                        href="/owner"
                                        className="inline-flex items-center gap-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-4 rounded-xl font-bold transition-all hover:bg-black dark:hover:bg-slate-100 shadow-xl"
                                    >
                                        <span className="material-icons">dashboard</span>
                                        Go to Dashboard
                                    </a>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
