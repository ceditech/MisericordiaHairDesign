"use client";

import React, { useState, useEffect } from "react";
import { Users, Plus, Trash2, ShieldCheck, Mail, Search, AlertCircle } from "lucide-react";
import { useAuth } from "@/src/providers/AuthProvider";
import { subscribeToAssistants, updateUserRole, findUserByEmail } from "@/src/lib/firebase/ownerService";

export default function StitchAdminManagement() {
    const { isSuperAdmin } = useAuth();
    const [assistants, setAssistants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newEmail, setNewEmail] = useState("");
    const [newName, setNewName] = useState("");
    const [newPhone, setNewPhone] = useState("");
    const [adding, setAdding] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        if (!isSuperAdmin) return;
        
        const unsub = subscribeToAssistants((data) => {
            setAssistants(data);
            setLoading(false);
        });
        return () => unsub();
    }, [isSuperAdmin]);

    const handleAddAssistant = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEmail || !newName || !newPhone) {
            setError("All fields (Email, Name, Phone) are required.");
            return;
        }
        if (assistants.length >= 4) {
            setError("Maximum of 4 assistants reached.");
            return;
        }

        setAdding(true);
        setError(null);
        setSuccessMessage(null);
        try {
            const res = await fetch("/api/admin/add-assistant", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: newEmail,
                    name: newName,
                    phone: newPhone
                })
            });

            const data = await res.json();
            
            if (!data.success) {
                setError(data.error || "Failed to add assistant.");
                return;
            }
            
            setNewEmail("");
            setNewName("");
            setNewPhone("");

            if (data.emailStatus?.sent) {
                setSuccessMessage(`✓ ${newName} has been added! A welcome email has been sent to ${newEmail}.`);
            } else {
                setSuccessMessage(`✓ ${newName} has been added successfully. Note: Welcome email could not be sent — please notify them manually.`);
            }
        } catch (err) {
            console.error(err);
            setError("An error occurred while adding the assistant.");
        } finally {
            setAdding(false);
        }
    };

    const handleRemoveAssistant = async (uid: string) => {
        if (!confirm("Remove this assistant? They will lose dashboard access.")) return;
        try {
            await updateUserRole(uid, null);
        } catch (err) {
            console.error(err);
        }
    };

    if (!isSuperAdmin) {
        return (
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 p-8 rounded-[3rem] text-center">
                <AlertCircle className="mx-auto text-amber-500 mb-4" size={32} />
                <h2 className="text-xl font-bold text-amber-900 dark:text-amber-400">Access Restricted</h2>
                <p className="text-sm text-amber-700 dark:text-amber-600 mt-2 font-medium">Only the Super Admin can manage administrative roles.</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-8 animate-in slide-in-from-bottom-4 duration-700 delay-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 flex items-center justify-center">
                        <Users size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Admin Management</h2>
                        <p className="text-sm text-slate-500 font-medium">Manage sub-admins and their access levels.</p>
                    </div>
                </div>
                <div className="px-4 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">Quota</span>
                    <span className="text-lg font-black text-[#6b38d4] dark:text-[#d0bcff]">{assistants.length}/4 Assistants</span>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Active Assistants</h3>
                    {loading ? (
                        <div className="py-12 text-center text-slate-400 font-bold">Loading assistants...</div>
                    ) : assistants.length === 0 ? (
                        <div className="py-12 text-center bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                            <p className="font-bold text-slate-400">No assistants added yet.</p>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {assistants.map((assistant) => (
                                <div key={assistant.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-transparent hover:border-purple-100 dark:hover:border-purple-900/30 transition-all">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center text-purple-500 shadow-sm">
                                            <ShieldCheck size={20} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white">{assistant.name || "Unnamed Assistant"}</p>
                                            <p className="text-xs text-slate-500 font-medium">{assistant.email}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleRemoveAssistant(assistant.id)}
                                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="space-y-6">
                    <div className="p-6 bg-purple-50 dark:bg-purple-900/10 rounded-[2rem] border border-purple-100 dark:border-purple-900/30 space-y-4">
                        <div className="flex items-center gap-3 text-purple-600">
                            <Plus size={20} />
                            <h3 className="font-bold">Add Assistant</h3>
                        </div>
                        <p className="text-xs text-purple-700/70 dark:text-purple-400 font-medium leading-relaxed">
                            Enter the details below. If the user doesn't have an account, one will be created and they will receive a welcome email.
                        </p>
                        <form onSubmit={handleAddAssistant} className="space-y-3">
                            <div className="relative">
                                <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-purple-300 text-base">person</span>
                                <input 
                                    type="text"
                                    placeholder="Full Name"
                                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-slate-900 border-none focus:ring-2 focus:ring-purple-400 text-sm font-bold text-slate-900 dark:text-white shadow-sm"
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="relative">
                                <span className="material-icons absolute left-4 top-1/2 -translate-y-1/2 text-purple-300 text-base">phone</span>
                                <input 
                                    type="tel"
                                    placeholder="Phone Number"
                                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-slate-900 border-none focus:ring-2 focus:ring-purple-400 text-sm font-bold text-slate-900 dark:text-white shadow-sm"
                                    value={newPhone}
                                    onChange={e => setNewPhone(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-purple-300" size={16} />
                                <input 
                                    type="email"
                                    placeholder="email@example.com"
                                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-slate-900 border-none focus:ring-2 focus:ring-purple-400 text-sm font-bold text-slate-900 dark:text-white shadow-sm"
                                    value={newEmail}
                                    onChange={e => setNewEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <button 
                                type="submit"
                                disabled={adding || assistants.length >= 4}
                                className="w-full py-3 bg-[#6b38d4] text-white rounded-xl text-sm font-bold shadow-lg shadow-purple-200 dark:shadow-none hover:bg-purple-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                            >
                                {adding ? 'Searching...' : <><Search size={16} /> Authorize Assistant</>}
                            </button>
                        </form>
                        {error && (
                            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-xl">
                                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                                <p className="text-[10px] font-bold">{error}</p>
                            </div>
                        )}
                        {successMessage && (
                            <div className="flex items-start gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
                                <ShieldCheck size={14} className="mt-0.5 flex-shrink-0" />
                                <p className="text-[10px] font-bold">{successMessage}</p>
                            </div>
                        )}
                    </div>

                    <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-700">
                        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Permissions</h4>
                        <ul className="space-y-2">
                            {[
                                "View Dashboard Analytics",
                                "Manage Appointments",
                                "View Inventory & Styles",
                                "Edit Personal Profile ONLY",
                                "NO Settings Access"
                            ].map((p, i) => (
                                <li key={i} className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                                    <div className="w-1 h-1 rounded-full bg-slate-300" />
                                    {p}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
