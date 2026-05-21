"use client";

import React, { useState, useEffect } from "react";
import { 
    subscribeToStyles, upsertStyle, deleteStyle, 
    subscribeToPresets, upsertPreset, deletePreset, 
    subscribeToAddons, upsertAddon, deleteAddon,
    uploadFile
} from "@/src/lib/firebase/ownerService";
import { Scissors, Plus, Trash2, Edit3, Save, X, Clock, DollarSign, Layers, Grid, Upload } from "lucide-react";
import { SizePreset, LengthPreset } from "@/src/constants/braidPresets";

type StyleRecord = {
    id: string;
    name?: string;
    description?: string;
    price?: number;
    priceCents?: number;
    duration?: number;
    imageUrl?: string;
    isActive?: boolean;
    image?: string;
};

const STYLE_IMAGE_FALLBACKS: Record<string, string> = {
    "Knotless Braids": "https://img1.wsimg.com/isteam/ip/bdf6ba35-495f-402b-9add-1d7fe5046011/web2.JPG",
    "Single Braids": "https://img1.wsimg.com/isteam/ip/bdf6ba35-495f-402b-9add-1d7fe5046011/single.JPG",
    "Bohemian Braids": "https://img1.wsimg.com/isteam/ip/bdf6ba35-495f-402b-9add-1d7fe5046011/web%20bohe.jpg",
    "Box Braids": "https://img1.wsimg.com/isteam/ip/bdf6ba35-495f-402b-9add-1d7fe5046011/web%20box.jpg",
    "Micro Braids": "https://img1.wsimg.com/isteam/ip/bdf6ba35-495f-402b-9add-1d7fe5046011/EliteHair-Braids-41-1.webp",
    "Cornrows": "https://img1.wsimg.com/isteam/ip/bdf6ba35-495f-402b-9add-1d7fe5046011/cornrow-Ponytail-with-Bangs.jpg",
    "Kinky Twist": "https://img1.wsimg.com/isteam/ip/bdf6ba35-495f-402b-9add-1d7fe5046011/kinky2.jpg",
    "Crochet": "https://img1.wsimg.com/isteam/ip/bdf6ba35-495f-402b-9add-1d7fe5046011/3-crochet-a-line-bob-CWCDfiKF8Y9.webp",
    "Kids Braids": "https://img1.wsimg.com/isteam/ip/bdf6ba35-495f-402b-9add-1d7fe5046011/kikid.jpg",
};

export default function StitchStyles() {
    const [styles, setStyles] = useState<StyleRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<"styles" | "presets" | "addons">("styles");
    
    // Style Editor State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<Partial<StyleRecord>>({});
    const [isAdding, setIsAdding] = useState(false);
    const [newStyle, setNewStyle] = useState({ name: "", description: "", price: 0, duration: 120 });
    const [imageFile, setImageFile] = useState<File | null>(null);
    
    // Modal state for details
    const [viewingStyle, setViewingStyle] = useState<StyleRecord | null>(null);
    
    // Presets Management State
    const [presets, setPresets] = useState<(SizePreset | LengthPreset)[]>([]);
    const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
    const [presetEditData, setPresetEditData] = useState<any>({});
    const [isAddingPreset, setIsAddingPreset] = useState(false);
    const [newPreset, setNewPreset] = useState<any>({ id: "", type: "size", label: "", priceAdjustment: 0, description: "", inches: "", priceGuidance: "" });

    // Addons Management State
    const [addons, setAddons] = useState<any[]>([]);
    const [editingAddonId, setEditingAddonId] = useState<string | null>(null);
    const [addonEditData, setAddonEditData] = useState<any>({});
    const [isAddingAddon, setIsAddingAddon] = useState(false);
    const [newAddon, setNewAddon] = useState({ id: "", name: "", price: 0, deposit: 0 });

    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const unsubStyles = subscribeToStyles((data) => {
            setStyles(data as StyleRecord[]);
            setLoading(false);
        });

        const unsubPresets = subscribeToPresets((data) => {
            setPresets(data as any[]);
        });

        const unsubAddons = subscribeToAddons((data) => {
            setAddons(data);
        });

        return () => {
            unsubStyles();
            unsubPresets();
            unsubAddons();
        };
    }, []);

    // Style Handlers
    const saveEdit = async () => {
        if (!editingId) return;
        setSaving(true);
        try { await upsertStyle({ ...editData, id: editingId }); setEditingId(null); }
        catch (err) { console.error(err); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this style?")) return;
        try { await deleteStyle(id); } catch (err) { console.error(err); }
    };

    const handleAdd = async () => {
        if (!newStyle.name) return;
        setSaving(true);
        try {
            const id = newStyle.name.toLowerCase().replace(/\s+/g, "-");
            let imageUrl = "";
            if (imageFile) {
                imageUrl = await uploadFile(imageFile, `styles/${id}_${Date.now()}`);
            }
            await upsertStyle({ 
                ...newStyle, 
                id, 
                priceCents: Math.round(newStyle.price * 100), 
                isActive: true,
                imageUrl: imageUrl || undefined
            });
            setIsAdding(false);
            setNewStyle({ name: "", description: "", price: 0, duration: 120 });
            setImageFile(null);
        } catch (err) { console.error(err); }
        finally { setSaving(false); }
    };

    // Preset Handlers
    const savePreset = async () => {
        if (!editingPresetId) return;
        setSaving(true);
        try { await upsertPreset({ ...presetEditData, id: editingPresetId }); setEditingPresetId(null); }
        catch (err) { console.error(err); }
        finally { setSaving(false); }
    };

    const deletePresetHandler = async (id: string) => {
        if (!confirm("Delete this preset?")) return;
        try { await deletePreset(id); } catch (err) { console.error(err); }
    };

    const addPreset = async () => {
        if (!newPreset.label || !newPreset.id) return;
        setSaving(true);
        try {
            await upsertPreset(newPreset);
            setIsAddingPreset(false);
            setNewPreset({ id: "", type: "size", label: "", priceAdjustment: 0, description: "", inches: "", priceGuidance: "" });
        } catch (err) { console.error(err); }
        finally { setSaving(false); }
    };

    // Addon Handlers
    const saveAddon = async () => {
        if (!editingAddonId) return;
        setSaving(true);
        try { await upsertAddon({ ...addonEditData, id: editingAddonId }); setEditingAddonId(null); }
        catch (err) { console.error(err); }
        finally { setSaving(false); }
    };

    const deleteAddonHandler = async (id: string) => {
        if (!confirm("Delete this addon?")) return;
        try { await deleteAddon(id); } catch (err) { console.error(err); }
    };

    const addAddon = async () => {
        if (!newAddon.name || !newAddon.id) return;
        setSaving(true);
        try {
            await upsertAddon(newAddon);
            setIsAddingAddon(false);
            setNewAddon({ id: "", name: "", price: 0, deposit: 0 });
        } catch (err) { console.error(err); }
        finally { setSaving(false); }
    };

    if (loading) return <div className="p-8 text-center text-slate-500 font-bold">Loading styles...</div>;

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold font-headline tracking-tight text-slate-900 dark:text-white">Service Management</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage styles, length/size presets, and add-on services.</p>
                </div>
                <div className="flex gap-2">
                    {activeTab === "styles" && (
                        <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#6b38d4] to-[#8455ef] text-white font-bold shadow-lg shadow-[#8455ef]/20 hover:scale-105 active:scale-95 transition-all">
                            <Plus size={18} />Add Style
                        </button>
                    )}
                    {activeTab === "presets" && (
                        <button onClick={() => setIsAddingPreset(true)} className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#6b38d4] to-[#8455ef] text-white font-bold shadow-lg shadow-[#8455ef]/20 hover:scale-105 active:scale-95 transition-all">
                            <Plus size={18} />Add Preset
                        </button>
                    )}
                    {activeTab === "addons" && (
                        <button onClick={() => setIsAddingAddon(true)} className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#6b38d4] to-[#8455ef] text-white font-bold shadow-lg shadow-[#8455ef]/20 hover:scale-105 active:scale-95 transition-all">
                            <Plus size={18} />Add Add-on
                        </button>
                    )}
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-2xl w-fit">
                <button 
                    onClick={() => setActiveTab("styles")}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${activeTab === "styles" ? "bg-white dark:bg-slate-700 text-[#6b38d4] dark:text-[#d0bcff] shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                >
                    <Scissors size={18} /> Styles
                </button>
                <button 
                    onClick={() => setActiveTab("presets")}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${activeTab === "presets" ? "bg-white dark:bg-slate-700 text-[#6b38d4] dark:text-[#d0bcff] shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                >
                    <Layers size={18} /> Presets
                </button>
                <button 
                    onClick={() => setActiveTab("addons")}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${activeTab === "addons" ? "bg-white dark:bg-slate-700 text-[#6b38d4] dark:text-[#d0bcff] shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                >
                    <Grid size={18} /> Add-ons
                </button>
            </div>

            {activeTab === "styles" && (
                <div className="space-y-8 animate-in fade-in duration-500">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-800">
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Total Styles</p>
                            <p className="text-3xl font-black font-headline text-slate-900 dark:text-white">{styles.length}</p>
                        </div>
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-800">
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Active</p>
                            <p className="text-3xl font-black font-headline text-emerald-600 dark:text-emerald-400">{styles.filter(s => s.isActive !== false).length}</p>
                        </div>
                        <div className="bg-[#e9ddff] dark:bg-slate-800 p-5 rounded-[1.5rem] border border-transparent">
                            <p className="text-xs font-bold uppercase tracking-widest text-[#6b38d4] dark:text-[#d0bcff] mb-1">Avg Price</p>
                            <p className="text-3xl font-black font-headline text-[#6b38d4] dark:text-[#d0bcff]">
                                ${styles.length > 0 ? Math.round(styles.reduce((acc, s) => acc + (Number(s.priceCents) / 100 || Number(s.price) || 0), 0) / styles.length) : 0}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {styles.map(style => {
                            const isEditing = editingId === style.id;
                            const price = Number(style.priceCents) / 100 || Number(style.price) || 0;
                            return (
                                <div key={style.id} onClick={() => !isEditing && setViewingStyle(style)} className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer">
                                    <div className="h-32 bg-gradient-to-br from-[#e9ddff] to-[#ffd9e4] dark:from-slate-800 dark:to-slate-700 flex items-center justify-center relative group-hover:scale-105 transition-transform duration-500 overflow-hidden">
                                        {style.imageUrl || style.image || (style.name && STYLE_IMAGE_FALLBACKS[style.name]) ? (
                                            <img 
                                                src={style.imageUrl || style.image || STYLE_IMAGE_FALLBACKS[style.name || ""]} 
                                                alt={style.name} 
                                                className="w-full h-full object-cover" 
                                            />
                                        ) : (
                                            <Scissors size={40} className="text-[#6b38d4]/30 dark:text-[#d0bcff]/30" />
                                        )}
                                        <div className="absolute top-3 right-3">
                                            <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide rounded-full ${style.isActive !== false ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                                                {style.isActive !== false ? "Active" : "Inactive"}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-6 space-y-4" onClick={e => e.stopPropagation()}>
                                        {isEditing ? (
                                            <div className="space-y-3">
                                                <input className="w-full rounded-xl py-2 px-3 bg-slate-50 dark:bg-slate-800 text-sm font-bold border-none focus:ring-2 focus:ring-[#6b38d4] text-slate-900 dark:text-white" value={editData.name || ""} onChange={e => setEditData(d => ({ ...d, name: e.target.value }))} placeholder="Style name" />
                                                <textarea className="w-full rounded-xl py-2 px-3 bg-slate-50 dark:bg-slate-800 text-sm border-none focus:ring-2 focus:ring-[#6b38d4] text-slate-900 dark:text-white resize-none" rows={2} value={editData.description || ""} onChange={e => setEditData(d => ({ ...d, description: e.target.value }))} placeholder="Description" />
                                                <div className="grid grid-cols-2 gap-3">
                                                    <input type="number" className="w-full rounded-xl py-2 px-3 bg-slate-50 dark:bg-slate-800 text-sm font-bold border-none focus:ring-2 focus:ring-[#6b38d4] text-slate-900 dark:text-white" value={editData.price || (editData.priceCents || 0) / 100} onChange={e => setEditData(d => ({ ...d, price: parseFloat(e.target.value), priceCents: Math.round(parseFloat(e.target.value) * 100) }))} placeholder="Price ($)" />
                                                    <input type="number" className="w-full rounded-xl py-2 px-3 bg-slate-50 dark:bg-slate-800 text-sm font-bold border-none focus:ring-2 focus:ring-[#6b38d4] text-slate-900 dark:text-white" value={editData.duration || 120} onChange={e => setEditData(d => ({ ...d, duration: parseInt(e.target.value) }))} placeholder="Duration (min)" />
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={saveEdit} disabled={saving} className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl bg-[#6b38d4] text-white text-xs font-bold disabled:opacity-50">
                                                        <Save size={14} />Save
                                                    </button>
                                                    <button onClick={() => setEditingId(null)} className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-bold">
                                                        <X size={14} />Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div>
                                                    <h3 className="font-bold text-lg text-slate-900 dark:text-white">{style.name || "Unnamed Style"}</h3>
                                                    {style.description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{style.description}</p>}
                                                </div>
                                                <div className="flex gap-4 text-sm">
                                                    <span className="flex items-center gap-1.5 text-[#6b38d4] dark:text-[#d0bcff] font-bold"><DollarSign size={14} />${price.toFixed(0)}</span>
                                                    <span className="flex items-center gap-1.5 text-slate-500 font-medium"><Clock size={14} />{style.duration || 120} min</span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => { setEditingId(style.id); setEditData({ ...style }); }} className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-[#e9ddff] hover:text-[#6b38d4] transition-colors">
                                                        <Edit3 size={14} />Edit
                                                    </button>
                                                    <button onClick={() => handleDelete(style.id)} className="flex items-center justify-center gap-1 py-2.5 px-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-400 text-xs font-bold hover:bg-red-100 transition-colors">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {styles.length === 0 && !isAdding && (
                            <div className="col-span-full py-20 text-center bg-white dark:bg-slate-900 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-700">
                                <Scissors size={48} className="mx-auto text-slate-300 mb-4" />
                                <p className="font-bold text-slate-500">No styles yet. Add your first braid style.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === "presets" && (
                <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Size Presets</h3>
                            <div className="space-y-4">
                                {presets.filter(p => (p as any).type === "size").map(p => {
                                    const isEditing = editingPresetId === p.id;
                                    return (
                                        <div key={p.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                            {isEditing ? (
                                                <div className="space-y-3">
                                                    <input className="w-full rounded-xl py-2 px-3 bg-slate-50 dark:bg-slate-800 text-sm font-bold border-none" value={presetEditData.label} onChange={e => setPresetEditData((d:any) => ({...d, label: e.target.value}))} />
                                                    <div className="flex gap-3">
                                                        <div className="flex-1 space-y-1">
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Description</label>
                                                            <input className="w-full rounded-xl py-2 px-3 bg-slate-50 dark:bg-slate-800 text-xs border-none" value={presetEditData.description} onChange={e => setPresetEditData((d:any) => ({...d, description: e.target.value}))} />
                                                        </div>
                                                        <div className="w-32 space-y-1">
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Price Adj ($)</label>
                                                            <input type="number" className="w-full rounded-xl py-2 px-3 bg-slate-50 dark:bg-slate-800 text-xs font-bold border-none" value={presetEditData.priceAdjustment} onChange={e => setPresetEditData((d:any) => ({...d, priceAdjustment: parseFloat(e.target.value)}))} />
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button onClick={savePreset} disabled={saving} className="flex-1 py-2 rounded-xl bg-[#6b38d4] text-white text-xs font-bold">Save</button>
                                                        <button onClick={() => setEditingPresetId(null)} className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-bold">Cancel</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-bold text-slate-900 dark:text-white">{p.label}</h4>
                                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-black uppercase tracking-widest">{p.id}</span>
                                                        </div>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{(p as any).description}</p>
                                                        <p className="text-xs font-bold text-[#6b38d4] dark:text-[#d0bcff] mt-2">Adjustment: {p.priceAdjustment >= 0 ? '+' : ''}${p.priceAdjustment}</p>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <button onClick={() => { setEditingPresetId(p.id); setPresetEditData({ ...p }); }} className="p-2 rounded-lg hover:bg-[#6b38d4]/10 text-slate-400 hover:text-[#6b38d4] transition-colors"><Edit3 size={16} /></button>
                                                        <button onClick={() => deletePresetHandler(p.id)} className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Length Presets</h3>
                            <div className="space-y-4">
                                {presets.filter(p => (p as any).type === "length").map(p => {
                                    const isEditing = editingPresetId === p.id;
                                    return (
                                        <div key={p.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                                            {isEditing ? (
                                                <div className="space-y-3">
                                                    <input className="w-full rounded-xl py-2 px-3 bg-slate-50 dark:bg-slate-800 text-sm font-bold border-none" value={presetEditData.label} onChange={e => setPresetEditData((d:any) => ({...d, label: e.target.value}))} />
                                                    <div className="flex gap-3">
                                                        <div className="flex-1 space-y-1">
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Inches/Desc</label>
                                                            <input className="w-full rounded-xl py-2 px-3 bg-slate-50 dark:bg-slate-800 text-xs border-none" value={(presetEditData as any).inches} onChange={e => setPresetEditData((d:any) => ({...d, inches: e.target.value}))} />
                                                        </div>
                                                        <div className="w-32 space-y-1">
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Price Adj ($)</label>
                                                            <input type="number" className="w-full rounded-xl py-2 px-3 bg-slate-50 dark:bg-slate-800 text-xs font-bold border-none" value={presetEditData.priceAdjustment} onChange={e => setPresetEditData((d:any) => ({...d, priceAdjustment: parseFloat(e.target.value)}))} />
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button onClick={savePreset} disabled={saving} className="flex-1 py-2 rounded-xl bg-[#6b38d4] text-white text-xs font-bold">Save</button>
                                                        <button onClick={() => setEditingPresetId(null)} className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-bold">Cancel</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="font-bold text-slate-900 dark:text-white">{p.label}</h4>
                                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-black uppercase tracking-widest">{p.id}</span>
                                                        </div>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{(p as any).inches}</p>
                                                        <p className="text-xs font-bold text-[#6b38d4] dark:text-[#d0bcff] mt-2">Adjustment: {p.priceAdjustment >= 0 ? '+' : ''}${p.priceAdjustment}</p>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <button onClick={() => { setEditingPresetId(p.id); setPresetEditData({ ...p }); }} className="p-2 rounded-lg hover:bg-[#6b38d4]/10 text-slate-400 hover:text-[#6b38d4] transition-colors"><Edit3 size={16} /></button>
                                                        <button onClick={() => deletePresetHandler(p.id)} className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "addons" && (
                <div className="animate-in slide-in-from-bottom-2 duration-500 max-w-2xl">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Add-on Services</h3>
                    <div className="space-y-4">
                        {addons.map(addon => {
                            const isEditing = editingAddonId === addon.id;
                            return (
                                <div key={addon.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    {isEditing ? (
                                        <div className="flex-1 space-y-3">
                                            <input className="w-full rounded-xl py-2 px-3 bg-slate-50 dark:bg-slate-800 text-sm font-bold border-none" value={addonEditData.name} onChange={e => setAddonEditData((d:any) => ({...d, name: e.target.value}))} />
                                            <div className="flex gap-3">
                                                <div className="flex-1 space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Price ($)</label>
                                                    <input type="number" className="w-full rounded-xl py-2 px-3 bg-slate-50 dark:bg-slate-800 text-xs font-bold border-none" value={addonEditData.price} onChange={e => setAddonEditData((d:any) => ({...d, price: parseFloat(e.target.value)}))} />
                                                </div>
                                                <div className="flex-1 space-y-1">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Deposit ($)</label>
                                                    <input type="number" className="w-full rounded-xl py-2 px-3 bg-slate-50 dark:bg-slate-800 text-xs font-bold border-none" value={addonEditData.deposit} onChange={e => setAddonEditData((d:any) => ({...d, deposit: parseFloat(e.target.value)}))} />
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={saveAddon} disabled={saving} className="flex-1 py-2 rounded-xl bg-[#6b38d4] text-white text-xs font-bold">Save</button>
                                                <button onClick={() => setEditingAddonId(null)} className="flex-1 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 text-xs font-bold">Cancel</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-bold text-slate-900 dark:text-white">{addon.name}</h4>
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 font-black uppercase tracking-widest">{addon.id}</span>
                                                </div>
                                                <div className="flex gap-4 mt-1">
                                                    <p className="text-xs font-bold text-[#6b38d4] dark:text-[#d0bcff]">Price: ${addon.price}</p>
                                                    <p className="text-xs text-slate-400">Deposit: ${addon.deposit}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => { setEditingAddonId(addon.id); setAddonEditData({ ...addon }); }} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-[#6b38d4] transition-all"><Edit3 size={18} /></button>
                                                <button onClick={() => deleteAddonHandler(addon.id)} className="p-2.5 rounded-xl bg-red-50 dark:bg-red-900/10 text-slate-400 hover:text-red-500 transition-all"><Trash2 size={18} /></button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Modals */}
            {isAdding && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="w-full max-w-lg bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl space-y-6 border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-300">
                        <div className="flex items-center justify-between">
                            <h3 className="text-2xl font-extrabold font-headline text-slate-900 dark:text-white">Add Style</h3>
                            <button onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-900 p-2 bg-slate-100 dark:bg-slate-800 rounded-full transition-colors"><X size={18} /></button>
                        </div>
                        {[
                            { label: "Style Name *", key: "name", type: "text", placeholder: "e.g. Knotless Braids" },
                            { label: "Description", key: "description", type: "text", placeholder: "Short description..." },
                            { label: "Price ($)", key: "price", type: "number", placeholder: "150" },
                            { label: "Duration (min)", key: "duration", type: "number", placeholder: "180" },
                        ].map(f => (
                            <div key={f.key} className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">{f.label}</label>
                                <input type={f.type} placeholder={f.placeholder} className="w-full rounded-2xl py-3.5 px-5 bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-[#6b38d4] text-slate-900 dark:text-white text-sm font-bold" value={(newStyle as any)[f.key]} onChange={e => setNewStyle(s => ({ ...s, [f.key]: f.type === "number" ? parseFloat(e.target.value) || 0 : e.target.value }))} />
                            </div>
                        ))}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Style Image</label>
                            <div className="flex items-center justify-center w-full">
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-350 dark:border-slate-700 rounded-2xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <Upload className="w-8 h-8 mb-2 text-slate-400" />
                                        <p className="text-xs text-slate-500 font-bold">{imageFile ? imageFile.name : "Click to upload style image"}</p>
                                    </div>
                                    <input type="file" className="hidden" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} />
                                </label>
                            </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setIsAdding(false)} className="flex-1 py-4 rounded-2xl font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200">Cancel</button>
                            <button onClick={handleAdd} disabled={saving || !newStyle.name} className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#6b38d4] text-white font-bold shadow-lg shadow-[#6b38d4]/20 disabled:opacity-50">
                                <Plus size={18} />Add Style
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {viewingStyle && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-300">
                        <div className="h-64 bg-slate-100 dark:bg-slate-800 relative">
                            {viewingStyle.imageUrl || viewingStyle.image || (viewingStyle.name && STYLE_IMAGE_FALLBACKS[viewingStyle.name]) ? (
                                <img 
                                    src={viewingStyle.imageUrl || viewingStyle.image || STYLE_IMAGE_FALLBACKS[viewingStyle.name || ""]} 
                                    alt={viewingStyle.name} 
                                    className="w-full h-full object-cover" 
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-purple-50 dark:bg-purple-900/20 text-[#6b38d4] dark:text-[#d0bcff]">
                                    <Scissors size={64} />
                                </div>
                            )}
                            <button onClick={() => setViewingStyle(null)} className="absolute top-4 right-4 p-2 bg-black/40 backdrop-blur-md text-white hover:bg-black/60 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div>
                                <div className="flex items-center gap-3">
                                    <h3 className="text-3xl font-extrabold font-headline text-slate-900 dark:text-white">{viewingStyle.name}</h3>
                                    <span className={`px-3 py-1 text-xs font-bold uppercase rounded-full ${viewingStyle.isActive !== false ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                                        {viewingStyle.isActive !== false ? "Active" : "Inactive"}
                                    </span>
                                </div>
                                <p className="text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">{viewingStyle.description || "No description provided for this braid style."}</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl">
                                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">Starting Price</span>
                                    <span className="text-2xl font-black text-[#6b38d4] dark:text-[#d0bcff] flex items-center gap-1">
                                        <DollarSign size={20} />{(Number(viewingStyle.priceCents) / 100 || Number(viewingStyle.price) || 0).toFixed(2)}
                                    </span>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl">
                                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">Service Duration</span>
                                    <span className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                                        <Clock size={20} className="text-slate-400" />{viewingStyle.duration || 120} min
                                    </span>
                                </div>
                            </div>
                            
                            <div className="flex gap-3">
                                <button onClick={() => { setEditingId(viewingStyle.id); setEditData({ ...viewingStyle }); setViewingStyle(null); }} className="flex-1 py-4 bg-[#6b38d4] hover:bg-[#8455ef] text-white font-bold rounded-2xl shadow-lg transition-colors flex items-center justify-center gap-2">
                                    <Edit3 size={18} /> Edit Style details
                                </button>
                                <button onClick={() => setViewingStyle(null)} className="px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold rounded-2xl hover:bg-slate-200">
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isAddingPreset && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="w-full max-w-lg bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl space-y-6 border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-300">
                        <div className="flex items-center justify-between">
                            <h3 className="text-2xl font-extrabold font-headline text-slate-900 dark:text-white">Add Preset</h3>
                            <button onClick={() => setIsAddingPreset(false)} className="text-slate-400 hover:text-slate-900 p-2 bg-slate-100 dark:bg-slate-800 rounded-full transition-colors"><X size={18} /></button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Type</label>
                                <select className="w-full rounded-2xl py-3.5 px-5 bg-slate-50 dark:bg-slate-800 border-none text-sm font-bold" value={newPreset.type} onChange={e => setNewPreset((s:any) => ({...s, type: e.target.value}))}>
                                    <option value="size">Size</option>
                                    <option value="length">Length</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">ID (slug)</label>
                                <input placeholder="size-small" className="w-full rounded-2xl py-3.5 px-5 bg-slate-50 dark:bg-slate-800 border-none text-sm font-bold" value={newPreset.id} onChange={e => setNewPreset((s:any) => ({...s, id: e.target.value}))} />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Label</label>
                            <input placeholder="Medium" className="w-full rounded-2xl py-3.5 px-5 bg-slate-50 dark:bg-slate-800 border-none text-sm font-bold" value={newPreset.label} onChange={e => setNewPreset((s:any) => ({...s, label: e.target.value}))} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-400">{newPreset.type === "size" ? "Description" : "Inches/Guidance"}</label>
                            <input className="w-full rounded-2xl py-3.5 px-5 bg-slate-50 dark:bg-slate-800 border-none text-sm" value={newPreset.type === "size" ? newPreset.description : newPreset.inches} onChange={e => setNewPreset((s:any) => ({...s, [newPreset.type === "size" ? "description" : "inches"]: e.target.value}))} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Price Adjustment ($)</label>
                            <input type="number" className="w-full rounded-2xl py-3.5 px-5 bg-slate-50 dark:bg-slate-800 border-none text-sm font-bold" value={newPreset.priceAdjustment} onChange={e => setNewPreset((s:any) => ({...s, priceAdjustment: parseFloat(e.target.value)}))} />
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setIsAddingPreset(false)} className="flex-1 py-4 rounded-2xl font-bold text-slate-500 bg-slate-100 dark:bg-slate-800">Cancel</button>
                            <button onClick={addPreset} disabled={saving || !newPreset.label || !newPreset.id} className="flex-1 py-4 rounded-2xl bg-[#6b38d4] text-white font-bold shadow-lg disabled:opacity-50">Add Preset</button>
                        </div>
                    </div>
                </div>
            )}

            {isAddingAddon && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="w-full max-w-lg bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl space-y-6 border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-300">
                        <div className="flex items-center justify-between">
                            <h3 className="text-2xl font-extrabold font-headline text-slate-900 dark:text-white">Add Add-on</h3>
                            <button onClick={() => setIsAddingAddon(false)} className="text-slate-400 hover:text-slate-900 p-2 bg-slate-100 dark:bg-slate-800 rounded-full transition-colors"><X size={18} /></button>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-400">ID (slug)</label>
                            <input placeholder="wash" className="w-full rounded-2xl py-3.5 px-5 bg-slate-50 dark:bg-slate-800 border-none text-sm font-bold" value={newAddon.id} onChange={e => setNewAddon(s => ({...s, id: e.target.value}))} />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Name</label>
                            <input placeholder="Washing Service" className="w-full rounded-2xl py-3.5 px-5 bg-slate-50 dark:bg-slate-800 border-none text-sm font-bold" value={newAddon.name} onChange={e => setNewAddon(s => ({...s, name: e.target.value}))} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Price ($)</label>
                                <input type="number" className="w-full rounded-2xl py-3.5 px-5 bg-slate-50 dark:bg-slate-800 border-none text-sm font-bold" value={newAddon.price} onChange={e => setNewAddon(s => ({...s, price: parseFloat(e.target.value)}))} />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Deposit ($)</label>
                                <input type="number" className="w-full rounded-2xl py-3.5 px-5 bg-slate-50 dark:bg-slate-800 border-none text-sm font-bold" value={newAddon.deposit} onChange={e => setNewAddon(s => ({...s, deposit: parseFloat(e.target.value)}))} />
                            </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setIsAddingAddon(false)} className="flex-1 py-4 rounded-2xl font-bold text-slate-500 bg-slate-100 dark:bg-slate-800">Cancel</button>
                            <button onClick={addAddon} disabled={saving || !newAddon.name || !newAddon.id} className="flex-1 py-4 rounded-2xl bg-[#6b38d4] text-white font-bold shadow-lg disabled:opacity-50">Add Add-on</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
