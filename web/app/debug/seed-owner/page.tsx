"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/src/hooks/useAuth";
import { getDb } from "@/src/lib/firebase/client";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { Button, Card, Badge } from "@/components/ui";
import { ShieldCheck, Loader2, AlertTriangle, UserCheck } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export default function SeedOwnerPage() {
    const { user, role, roleLoading } = useAuth();
    const [loading, setLoading] = useState(false);
    const { showToast } = useToast();

    if (process.env.NODE_ENV === "production") return null;

    const handleSeed = async () => {
        if (!user) return;
        setLoading(true);

        try {
            const db = getDb();
            await setDoc(doc(db, "users", user.uid), {
                role: "owner",
                email: user.email,
                updatedAt: serverTimestamp(),
            }, { merge: true });

            showToast("Owner role assigned successfully! Please refresh or wait for state sync.", "success");
            // Force refresh of role in some environments or just wait for Firestore listener if implemented
        } catch (err: any) {
            console.error("Seeding error:", err);
            showToast("Failed to seed owner role: " + err.message, "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen pt-32 pb-20 px-6 max-w-2xl mx-auto">
            <div className="text-center mb-12">
                <Badge className="mb-4 bg-amber-500/10 text-amber-600 border-none uppercase tracking-widest text-xs font-black">
                    Development Only Tool
                </Badge>
                <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-4 italic uppercase tracking-tighter">
                    Owner Role Seeder
                </h1>
                <p className="text-slate-500 font-medium italic">
                    Use this to grant your account administrative access in the dev environment.
                </p>
            </div>

            <Card className="p-10 rounded-[3rem] border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl">
                {!user ? (
                    <div className="text-center py-10">
                        <AlertTriangle className="mx-auto text-amber-500 mb-4" size={48} />
                        <h2 className="text-xl font-bold mb-2">Not Logged In</h2>
                        <p className="text-slate-500 mb-6">Please log in first to seed your role.</p>
                        <Link href="/login">
                            <Button className="bg-[#a319c5]">Go to Login</Button>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-8">
                        <div className="flex items-center gap-4 p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                            <div className="w-12 h-12 rounded-xl bg-[#a319c5]/10 text-[#a319c5] flex items-center justify-center">
                                <UserCheck size={24} />
                            </div>
                            <div>
                                <p className="text-sm font-black uppercase text-slate-400">Target User</p>
                                <p className="font-bold text-slate-900 dark:text-white truncate max-w-xs">{user.email}</p>
                                <div className="mt-1">
                                    <Badge className="text-[10px] uppercase font-black">UID: {user.uid.slice(0, 8)}...</Badge>
                                    {role === "owner" && (
                                        <Badge className="ml-2 bg-emerald-500 text-white border-none text-[10px] uppercase font-black">Currently Owner</Badge>
                                    )}
                                </div>
                            </div>
                        </div>

                        <Button
                            onClick={handleSeed}
                            disabled={loading || role === "owner"}
                            className="w-full h-16 rounded-2xl bg-[#a319c5] hover:bg-[#8b15a8] text-white font-black text-lg gap-2 shadow-xl shadow-[#a319c5]/30 active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            {loading ? (
                                <Loader2 size={24} className="animate-spin" />
                            ) : (
                                <ShieldCheck size={24} />
                            )}
                            {role === "owner" ? "User is Already Owner" : "Set My Role to Owner"}
                        </Button>

                        <p className="text-xs text-slate-400 text-center uppercase font-bold tracking-tight">
                            ⚠️ Warning: This directly writes to the "users" collection in Firestore.
                        </p>
                    </div>
                )}
            </Card>
        </main>
    );
}
