"use client";

import Link from "next/link";
import { ShieldAlert, Home, Mail } from "lucide-react";
import { Button, Card } from "@/components/ui";

export default function RestrictedPage() {
    return (
        <main className="min-h-screen pt-32 pb-20 px-6 flex items-center justify-center bg-slate-50 dark:bg-slate-950">
            <div className="w-full max-w-xl text-center">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-[2rem] bg-red-500/10 text-red-500 mb-8 shadow-inner">
                    <ShieldAlert size={48} />
                </div>

                <h1 className="text-5xl font-black text-slate-900 dark:text-white mb-6 italic uppercase tracking-tighter">
                    Access Restricted
                </h1>

                <p className="text-xl text-slate-500 font-medium mb-12 max-w-md mx-auto leading-relaxed">
                    This area is reserved for the management team. If you believe this is an error, please contact support.
                </p>

                <Card className="p-8 rounded-[3rem] border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl flex flex-col sm:flex-row gap-4">
                    <Link href="/" className="flex-1">
                        <Button variant="secondary" className="w-full h-16 rounded-2xl gap-2 font-black border-2">
                            <Home size={20} />
                            Return Home
                        </Button>
                    </Link>
                    <Link href="/contact" className="flex-1">
                        <Button className="w-full h-16 rounded-2xl gap-2 font-black bg-[#a319c5] hover:bg-[#8b15a8]">
                            <Mail size={20} />
                            Contact Us
                        </Button>
                    </Link>
                </Card>
            </div>
        </main>
    );
}
