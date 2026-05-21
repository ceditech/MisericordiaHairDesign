"use client";

import { useEffect, useState } from "react";
import { Badge, Card } from "@/components/ui";
import { getFirebaseApp } from "@/src/lib/firebase/client";
import { ShieldCheck, AlertCircle, Terminal } from "lucide-react";

export default function FirebaseDebugPage() {
    const [isClient, setIsClient] = useState(false);
    const [initStatus, setInitStatus] = useState<"pending" | "success" | "error">("pending");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setIsClient(true);
        if (process.env.NODE_ENV === "production") return;

        try {
            const app = getFirebaseApp();
            if (app) {
                setInitStatus("success");
            }
        } catch (err: any) {
            setInitStatus("error");
            setError(err.message || "Unknown error during initialization");
        }
    }, []);

    if (!isClient || process.env.NODE_ENV === "production") {
        return null;
    }

    return (
        <main className="min-h-screen pt-32 pb-20 px-6 max-w-4xl mx-auto">
            <div className="text-center mb-16">
                <Badge className="mb-4 bg-amber-500/10 text-amber-600 border-none uppercase tracking-widest text-xs font-black">
                    Development Debug
                </Badge>
                <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-6 italic uppercase tracking-tighter">
                    Firebase Connectivity Check
                </h1>
            </div>

            <Card className="p-8 sm:p-12 rounded-[3rem] border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl relative overflow-hidden">
                <div className="flex flex-col items-center gap-8 text-center">
                    {initStatus === "pending" && (
                        <div className="w-16 h-16 border-4 border-[#a319c5] border-t-transparent rounded-full animate-spin"></div>
                    )}

                    {initStatus === "success" && (
                        <>
                            <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shadow-lg">
                                <ShieldCheck size={40} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Firebase Initialized</h2>
                                <p className="text-slate-500 font-medium">The client-side SDK is successfully loaded.</p>
                            </div>
                            <div className="w-full bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 text-left">
                                <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-400 mb-4">
                                    <Terminal size={14} />
                                    Environment Config
                                </div>
                                <pre className="text-xs font-mono text-slate-600 dark:text-slate-300 overflow-x-auto">
                                    {JSON.stringify({
                                        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                                        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
                                        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.slice(0, 20) + "...",
                                        useEmulators: process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true"
                                    }, null, 2)}
                                </pre>
                            </div>
                        </>
                    )}

                    {initStatus === "error" && (
                        <>
                            <div className="w-20 h-20 rounded-3xl bg-red-500/10 text-red-500 flex items-center justify-center shadow-lg">
                                <AlertCircle size={40} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Initialization Failed</h2>
                                <p className="text-red-500 font-medium">{error}</p>
                            </div>
                        </>
                    )}
                </div>
            </Card>
        </main>
    );
}
