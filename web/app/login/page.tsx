"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/src/hooks/useAuth";
import { signInUser, signInWithGoogle, signUpUser } from "@/src/lib/firebase/auth";
import { getDb } from "@/src/lib/firebase/client";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { Button, Input, Badge, Card } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { LogIn, Mail, Lock, AlertCircle, Loader2, Scissors, Chrome } from "lucide-react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isSignUp, setIsSignUp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const hasRedirected = React.useRef(false);
    const router = useRouter();
    const { user, role, roleLoading } = useAuth();
    const { showToast } = useToast();

    useEffect(() => {
        const safePush = async (url: string) => {
            try {
                await (router.push(url) as any);
            } catch (err: any) {
                if (err.name !== 'AbortError') throw err;
            }
        };

        if (user && !roleLoading && !hasRedirected.current) {
            hasRedirected.current = true;
            if (role === "owner" || role === "assistant") {
                safePush("/owner");
            } else {
                safePush("/");
                showToast("Logged in successfully", "success");
            }
        }
    }, [user, role, roleLoading, router, showToast]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (isSignUp && password !== confirmPassword) {
            setError("Passwords do not match.");
            setLoading(false);
            return;
        }

        try {
            if (isSignUp) {
                const cred = await signUpUser(email, password);
                // Initialize Firestore profile
                const db = getDb();
                await setDoc(doc(db, "users", cred.user.uid), {
                    email: email,
                    role: "client",
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
                showToast("Account created successfully!", "success");
            } else {
                await signInUser(email, password);
            }
            // Redirect handled by useEffect
        } catch (err: any) {
            if (err.name === 'AbortError') return; // Ignore router aborts
            console.error("Auth error:", err);
            let message = "An error occurred. Please try again.";
            if (err.code === "auth/invalid-credential") message = "Invalid email or password.";
            if (err.code === "auth/email-already-in-use") message = "An account with this email already exists.";
            if (err.code === "auth/weak-password") message = "Password should be at least 6 characters.";
            if (err.code === "auth/user-not-found") message = "No account found with this email.";
            if (err.code === "auth/wrong-password") message = "Incorrect password.";
            setError(message);
            showToast(message, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setLoading(true);
        setError(null);
        try {
            const cred = await signInWithGoogle();

            // Proactively initialize or check Firestore profile
            const db = getDb();
            const userRef = doc(db, "users", cred.user.uid);
            
            const userSnap = await getDoc(userRef);
            
            if (!userSnap.exists()) {
                await setDoc(userRef, {
                    email: cred.user.email,
                    role: "client",
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
            } else {
                await setDoc(userRef, {
                    email: cred.user.email,
                    updatedAt: serverTimestamp()
                }, { merge: true });
            }

            showToast("Signed in with Google", "success");
            // Redirect handled by useEffect
        } catch (err: any) {
            if (err.name === 'AbortError') return; // Ignore router aborts
            console.error("Google sign-in error:", err);
            if (err.code === "auth/account-exists-with-different-credential") {
                const message = "An account with this email already exists. Please sign in with your email and password instead.";
                setError(message);
                showToast(message, "error");
            } else if (err.code !== "auth/popup-closed-by-user") {
                const message = "Failed to sign in with Google. Please try again.";
                setError(message);
                showToast(message, "error");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen pt-32 pb-20 px-6 flex items-center justify-center bg-slate-50 dark:bg-slate-950">
            <div className="w-full max-w-md">
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-[#a319c5]/10 text-[#a319c5] mb-6 shadow-inner">
                        <Scissors size={32} />
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-3 italic uppercase tracking-tighter">
                        {isSignUp ? "Join Us" : "Welcome Back"}
                    </h1>
                    <p className="text-slate-500 font-medium">
                        {isSignUp ? "Create an account to manage your appointments." : "Sign in to manage your appointments and more."}
                    </p>
                </div>

                <Card className="p-8 sm:p-10 rounded-[3rem] border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl relative overflow-hidden">
                    {/* Subtle accent blur */}
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#a319c5]/5 blur-3xl rounded-full" />

                    <div className="space-y-6 relative z-10">
                        {error && (
                            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 flex items-center gap-3 text-red-600 dark:text-red-400 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                                <AlertCircle size={18} className="shrink-0" />
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-black uppercase tracking-widest text-slate-400 ml-1">
                                    Email Address
                                </label>
                                <div className="relative group">
                                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#a319c5] transition-colors">
                                        <Mail size={20} />
                                    </div>
                                    <Input
                                        type="email"
                                        placeholder="name@example.com"
                                        className="pl-14 h-16 rounded-2xl border-slate-100 dark:border-slate-800 focus:ring-4 focus:ring-[#a319c5]/10 focus:border-[#a319c5] transition-all bg-slate-50/50 dark:bg-slate-950/50"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center ml-1">
                                    <label className="text-sm font-black uppercase tracking-widest text-slate-400">
                                        Password
                                    </label>
                                </div>
                                <div className="relative group">
                                    <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#a319c5] transition-colors">
                                        <Lock size={20} />
                                    </div>
                                    <Input
                                        type="password"
                                        placeholder="••••••••"
                                        className="pl-14 h-16 rounded-2xl border-slate-100 dark:border-slate-800 focus:ring-4 focus:ring-[#a319c5]/10 focus:border-[#a319c5] transition-all bg-slate-50/50 dark:bg-slate-950/50"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            {isSignUp && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-300">
                                    <label className="text-sm font-black uppercase tracking-widest text-slate-400 ml-1">
                                        Confirm Password
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#a319c5] transition-colors">
                                            <Lock size={20} />
                                        </div>
                                        <Input
                                            type="password"
                                            placeholder="••••••••"
                                            className="pl-14 h-16 rounded-2xl border-slate-100 dark:border-slate-800 focus:ring-4 focus:ring-[#a319c5]/10 focus:border-[#a319c5] transition-all bg-slate-50/50 dark:bg-slate-950/50"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required={isSignUp}
                                        />
                                    </div>
                                </div>
                            )}

                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full h-16 rounded-2xl bg-[#a319c5] hover:bg-[#8b15a8] text-white font-black text-lg shadow-xl shadow-[#a319c5]/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
                            >
                                {loading ? (
                                    <div className="flex items-center gap-2">
                                        <Loader2 size={24} className="animate-spin" />
                                        {isSignUp ? "Creating Account..." : "Signing In..."}
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        {isSignUp ? <LogIn size={24} className="rotate-180" /> : <LogIn size={24} />}
                                        {isSignUp ? "Create Account" : "Sign In"}
                                    </div>
                                )}
                            </Button>
                        </form>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-slate-100 dark:border-slate-800"></span>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-white dark:bg-slate-900 px-4 text-slate-400 font-bold tracking-widest">Or continue with</span>
                            </div>
                        </div>

                        <Button
                            type="button"
                            variant="secondary"
                            onClick={handleGoogleSignIn}
                            disabled={loading}
                            className="w-full h-16 rounded-2xl border-2 border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white font-black text-lg bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all flex items-center justify-center gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-150"
                        >
                            <Chrome size={24} className="text-[#4285F4]" />
                            Google
                        </Button>
                    </div>
                </Card>

                <p className="text-center mt-10 text-slate-500 font-medium">
                    {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                    <button
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="text-[#a319c5] font-black hover:underline underline-offset-4"
                    >
                        {isSignUp ? "Sign In" : "Sign Up"}
                    </button>
                </p>

                <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800 text-center">
                    <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mb-4">Just need to book?</p>
                    <Link
                        href="/book"
                        className="inline-flex items-center gap-2 bg-white dark:bg-slate-900 text-[#a319c5] px-8 py-4 rounded-2xl font-black border-2 border-slate-100 dark:border-slate-800 hover:border-[#a319c5] transition-all shadow-sm active:scale-95"
                    >
                        <Scissors size={20} />
                        Book an Appointment
                    </Link>
                </div>
            </div>
        </main>
    );
}
