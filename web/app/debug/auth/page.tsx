"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/src/hooks/useAuth";
import { Badge, Button, Card } from "@/components/ui";

export default function AuthDebugPage() {
    const { user, role, isLoading } = useAuth();
    const [isDev, setIsDev] = useState(false);

    useEffect(() => {
        setIsDev(process.env.NODE_ENV !== "production");
    }, []);

    if (!isDev) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6">
                <Card className="p-8 max-w-md text-center">
                    <h1 className="text-2xl font-bold text-red-600 mb-4 uppercase tracking-tighter">Access Denied</h1>
                    <p className="text-slate-500">This debug utility is only available in development mode.</p>
                    <div className="mt-6">
                        <Button onClick={() => window.location.href = "/"}>Go Home</Button>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <main className="min-h-screen pt-32 pb-20 px-6 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
            <div className="max-w-4xl mx-auto">
                <div className="mb-10 text-center">
                    <h1 className="text-5xl font-black italic uppercase tracking-tighter">Auth Health Check</h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card className="p-8">
                        <h2 className="text-xl font-black uppercase mb-6">Session Status</h2>
                        {isLoading ? (
                            <p>Loading...</p>
                        ) : user ? (
                            <div className="space-y-4">
                                <p><strong>UID:</strong> {user.uid}</p>
                                <p><strong>Email:</strong> {user.email}</p>
                                <p><strong>Role:</strong> <Badge>{role || "client"}</Badge></p>
                                <div className="flex gap-4 mt-6">
                                    <Button variant="secondary" onClick={() => window.location.reload()}>Refresh</Button>
                                    <Button onClick={() => window.location.href = "/"}>Go Home</Button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-6">
                                <p className="mb-4 text-amber-500">No session found</p>
                                <Button onClick={() => window.location.href = "/login"}>Sign In</Button>
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </main>
    );
}
