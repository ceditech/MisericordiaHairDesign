"use client";

import React, { useState, useEffect } from "react";
import { User, Phone, Camera, Save, UserCheck } from "lucide-react";
import { useAuth } from "@/src/providers/AuthProvider";
import { updateMyProfile, uploadFile } from "@/src/lib/firebase/ownerService";

export default function StitchProfileSettings() {
    const { user, profile } = useAuth();
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
    });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        if (profile) {
            setFormData({
                name: profile.name || "",
                phone: profile.phone || "",
            });
        }
    }, [profile]);

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        setMessage(null);
        try {
            let imageUrl = profile?.imageUrl;
            if (imageFile) {
                imageUrl = await uploadFile(imageFile, `profiles/${user.uid}_${Date.now()}`);
            }
            
            await updateMyProfile(user.uid, {
                ...formData,
                imageUrl: imageUrl || undefined,
                email: user.email || undefined
            });
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
        } catch (err: any) {
            console.error(err);
            setMessage({ type: 'error', text: `Failed to update profile: ${err.message || 'Unknown error'}` });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-8 animate-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center">
                    <User size={24} />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">My Profile</h2>
                    <p className="text-sm text-slate-500 font-medium">Manage your personal information and account details.</p>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Full Name</label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text"
                                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-[#6b38d4] text-slate-900 dark:text-white font-bold"
                                value={formData.name}
                                onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                                placeholder="Enter your full name"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Phone Number</label>
                        <div className="relative">
                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="tel"
                                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-[#6b38d4] text-slate-900 dark:text-white font-bold"
                                value={formData.phone}
                                onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                                placeholder="(555) 000-0000"
                            />
                        </div>
                    </div>

                    <div className="pt-4">
                        <button 
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-[#6b38d4] text-white font-bold shadow-lg shadow-purple-200 dark:shadow-none hover:bg-purple-700 active:scale-95 transition-all disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : <><Save size={18} /> Save Profile Changes</>}
                        </button>
                        {message && (
                            <p className={`mt-3 text-sm font-bold ${message.type === 'success' ? 'text-emerald-500' : 'text-red-500'}`}>
                                {message.text}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex flex-col items-center justify-center space-y-4 border-l border-slate-100 dark:border-slate-800 pl-8">
                    <div className="relative group">
                        <div className="w-32 h-32 rounded-[2.5rem] bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 overflow-hidden border-4 border-white dark:border-slate-950 shadow-xl">
                            {profile?.imageUrl ? (
                                <img src={profile.imageUrl} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <User size={48} />
                            )}
                        </div>
                        <label className="absolute bottom-0 right-0 w-10 h-10 bg-[#6b38d4] text-white rounded-2xl flex items-center justify-center shadow-lg cursor-pointer hover:scale-110 active:scale-90 transition-all border-4 border-white dark:border-slate-950">
                            <Camera size={18} />
                            <input type="file" className="hidden" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} />
                        </label>
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{user?.email}</p>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 text-[10px] font-black uppercase tracking-widest mt-2">
                            <UserCheck size={10} /> {profile?.role || (user?.email === "sales@edxstore.com" ? "Super Admin" : "User")}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
