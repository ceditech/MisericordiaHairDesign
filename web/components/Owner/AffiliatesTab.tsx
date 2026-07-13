"use client";

import React, { useState, useEffect } from "react";
import { subscribeToAffiliates, createAffiliateProfile } from "@/src/lib/affiliate/affiliateService";
import { AffiliateProfile, AffiliateType } from "@/src/lib/affiliate/types";
import { Card, Button, Input, Badge } from "@/components/ui";
import { Users, UserPlus, Mail, Tag, Calendar, ShieldCheck, Plus, X } from "lucide-react";
import { format } from "date-fns";

export default function AffiliatesTab() {
    const [affiliates, setAffiliates] = useState<AffiliateProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [newAffiliate, setNewAffiliate] = useState({
        name: "",
        email: "",
        type: "individual" as AffiliateType
    });

    useEffect(() => {
        if (typeof window !== 'undefined' && window.location.search.includes('demo=true')) {
            setAffiliates([
                { 
                    id: 'aff_1', 
                    name: 'Sarah Johnson', 
                    email: 'sarah@example.com', 
                    type: 'individual' as AffiliateType, 
                    code: 'SARAH10',
                    createdAt: new Date().toISOString()
                },
                { 
                    id: 'aff_2', 
                    name: 'Elite Salon', 
                    email: 'contact@elitesalon.com', 
                    type: 'business' as AffiliateType, 
                    code: 'ELITE20',
                    createdAt: new Date().toISOString()
                }
            ]);
            setLoading(false);
            return;
        }

        const unsubscribe = subscribeToAffiliates((data) => {
            setAffiliates(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleAdd = async () => {
        if (!newAffiliate.name || !newAffiliate.email) {
            alert("Please fill in all fields.");
            return;
        }
        try {
            await createAffiliateProfile(newAffiliate);
            setIsAdding(false);
            setNewAffiliate({ name: "", email: "", type: "individual" as AffiliateType });
            alert("Affiliate added and code generated!");
        } catch (err) {
            console.error("Error adding affiliate:", err);
        }
    };

    if (loading) return <div className="p-8 text-center font-bold">Loading affiliates...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header / Actions */}
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white italic uppercase tracking-tighter">Affiliate Partners</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Manage your referral program</p>
                </div>
                <Button 
                    onClick={() => setIsAdding(true)}
                    className="rounded-xl font-bold bg-[#9F2D5C] text-white hover:bg-[#8e16ac] shadow-lg shadow-[#9F2D5C]/20 gap-2 px-6"
                >
                    <UserPlus size={18} />
                    Add Partner
                </Button>
            </div>

            {/* List */}
            <div className="grid gap-6">
                {affiliates.map((affiliate) => (
                    <Card key={affiliate.id} className="p-8 bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 rounded-[2.5rem] hover:shadow-xl transition-all group">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div className="flex items-center gap-6">
                                <div className="w-14 h-14 rounded-2xl bg-[#9F2D5C]/10 text-[#9F2D5C] flex items-center justify-center shrink-0">
                                    <Users size={28} />
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-xl font-black text-slate-900 dark:text-white italic uppercase tracking-tighter">
                                        {affiliate.name}
                                    </h4>
                                    <div className="flex flex-wrap gap-4 text-sm text-slate-500 font-bold uppercase tracking-widest text-[10px]">
                                        <span className="flex items-center gap-2"><Mail size={14} className="text-[#9F2D5C]" /> {affiliate.email}</span>
                                        <span className="flex items-center gap-2"><Calendar size={14} className="text-[#9F2D5C]" /> Joined {format(new Date(affiliate.createdAt), "MMM yyyy")}</span>
                                        <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-500 border-none px-2 py-0 h-5">
                                            {affiliate.type}
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-3xl border border-[#9F2D5C]/10">
                                <div className="text-right mr-4">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Referral Code</p>
                                    <p className="text-lg font-black text-[#9F2D5C] italic tracking-tight">{affiliate.code}</p>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                    <ShieldCheck size={20} />
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}

                {affiliates.length === 0 && (
                    <div className="py-20 text-center bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800">
                        <Users size={48} className="mx-auto text-slate-300 mb-6" />
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">No affiliate partners yet</h2>
                    </div>
                )}
            </div>

            {/* Add Modal */}
            {isAdding && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <Card className="w-full max-w-md bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-2xl space-y-8">
                        <div className="flex items-center justify-between">
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white italic uppercase tracking-tighter">
                                Add Partner
                            </h3>
                            <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors p-2">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Full Name</label>
                                <Input 
                                    className="rounded-2xl py-6"
                                    value={newAffiliate.name}
                                    onChange={(e) => setNewAffiliate({...newAffiliate, name: e.target.value})}
                                    placeholder="Jane Smith"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Email Address</label>
                                <Input 
                                    className="rounded-2xl py-6"
                                    value={newAffiliate.email}
                                    onChange={(e) => setNewAffiliate({...newAffiliate, email: e.target.value})}
                                    placeholder="jane@example.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Partner Type</label>
                                <select 
                                    className="w-full rounded-2xl py-4 px-4 bg-slate-50 dark:bg-slate-800 border-none outline-none text-sm font-bold text-slate-900 dark:text-white"
                                    value={newAffiliate.type}
                                    onChange={(e) => setNewAffiliate({...newAffiliate, type: e.target.value as AffiliateType})}
                                >
                                    <option value="individual">Individual</option>
                                    <option value="business">Business</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-4 pt-4">
                            <Button 
                                variant="secondary" 
                                className="flex-1 rounded-2xl py-6 font-bold"
                                onClick={() => setIsAdding(false)}
                            >
                                Cancel
                            </Button>
                            <Button 
                                className="flex-1 bg-[#9F2D5C] hover:bg-[#8e16ac] text-white rounded-2xl py-6 font-bold shadow-lg shadow-[#9F2D5C]/20 gap-2"
                                onClick={handleAdd}
                            >
                                <Plus size={18} />
                                Create Partner
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
