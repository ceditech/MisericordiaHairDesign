"use client";

import React, { useState, useEffect } from "react";
import { subscribeToStyles, upsertStyle, deleteStyle } from "@/src/lib/firebase/ownerService";
import { BraidStyle } from "@/lib/styles";
import { Button, Card, Input, Badge } from "@/components/ui";
import { Plus, Edit2, Trash2, Scissors, Save, X, Search, Clock, DollarSign } from "lucide-react";

export default function StylesTab() {
    const [styles, setStyles] = useState<BraidStyle[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editStyle, setEditStyle] = useState<Partial<BraidStyle> | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const unsubscribe = subscribeToStyles((data) => {
            setStyles(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleSave = async () => {
        if (!editStyle?.name || !editStyle?.id) {
            alert("Name and ID are required.");
            return;
        }
        try {
            await upsertStyle(editStyle);
            setIsEditing(false);
            setEditStyle(null);
        } catch (err) {
            console.error("Error saving style:", err);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this style? This might affect existing bookings referening this ID.")) {
            await deleteStyle(id);
        }
    };

    const filteredStyles = styles.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return <div className="p-8 text-center font-bold">Loading styles...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header / Search */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none outline-none focus:ring-2 focus:ring-[#a319c5] text-sm"
                        placeholder="Search styles..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Button 
                    onClick={() => {
                        setEditStyle({
                            id: `style_${Date.now()}`,
                            name: "",
                            duration: "4-6 hours",
                            price: "$200 and up",
                            image: "",
                            description: "",
                            popular: false,
                            prepChecklist: []
                        });
                        setIsEditing(true);
                    }}
                    className="rounded-xl font-bold bg-[#a319c5] text-white hover:bg-[#8e16ac] shadow-lg shadow-[#a319c5]/20 gap-2 px-6 w-full md:w-auto"
                >
                    <Plus size={18} />
                    Add New Style
                </Button>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredStyles.map((style) => (
                    <Card key={style.id} className="p-6 bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 rounded-[2.5rem] hover:shadow-xl transition-all group overflow-hidden relative">
                        <div className="flex gap-6">
                            <div className="w-24 h-24 rounded-2xl overflow-hidden shrink-0 border border-slate-100 dark:border-slate-800">
                                <img src={style.image} alt={style.name} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 space-y-2">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xl font-black italic uppercase tracking-tighter text-slate-900 dark:text-white">
                                        {style.name}
                                    </h4>
                                    {style.popular && <Badge className="bg-[#a319c5]/10 text-[#a319c5] border-none text-[10px]">Popular</Badge>}
                                </div>
                                <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    <span className="flex items-center gap-1"><Clock size={12} className="text-[#a319c5]" /> {style.duration}</span>
                                    <span className="flex items-center gap-1"><DollarSign size={12} className="text-[#a319c5]" /> {style.price}</span>
                                </div>
                                <p className="text-xs text-slate-500 line-clamp-2">{style.description}</p>
                                
                                <div className="flex gap-2 pt-2">
                                    <button 
                                        onClick={() => { setEditStyle(style); setIsEditing(true); }}
                                        className="text-[10px] font-bold uppercase tracking-widest text-[#a319c5] hover:underline"
                                    >
                                        Edit Details
                                    </button>
                                    <span className="text-slate-300">|</span>
                                    <button 
                                        onClick={() => handleDelete(style.id)}
                                        className="text-[10px] font-bold uppercase tracking-widest text-red-400 hover:underline"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Edit/Add Modal */}
            {isEditing && editStyle && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <Card className="w-full max-w-2xl bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-2xl space-y-8 max-h-[90vh] overflow-y-auto no-scrollbar">
                        <div className="flex items-center justify-between">
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white italic uppercase tracking-tighter">
                                {editStyle.name ? "Edit Style" : "New Style"}
                            </h3>
                            <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors p-2">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Style Name</label>
                                <Input 
                                    className="rounded-2xl py-6"
                                    value={editStyle.name}
                                    onChange={(e) => setEditStyle({...editStyle, name: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Duration (Guidance)</label>
                                <Input 
                                    className="rounded-2xl py-6"
                                    value={editStyle.duration}
                                    onChange={(e) => setEditStyle({...editStyle, duration: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Starting Price</label>
                                <Input 
                                    className="rounded-2xl py-6"
                                    value={editStyle.price}
                                    onChange={(e) => setEditStyle({...editStyle, price: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2 flex items-center pt-6 pl-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={editStyle.popular} 
                                        onChange={(e) => setEditStyle({...editStyle, popular: e.target.checked})}
                                        className="w-5 h-5 rounded border-slate-300 text-[#a319c5] focus:ring-[#a319c5]"
                                    />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400">Mark as Popular</span>
                                </label>
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Image URL</label>
                                <Input 
                                    className="rounded-2xl py-6"
                                    value={editStyle.image}
                                    onChange={(e) => setEditStyle({...editStyle, image: e.target.value})}
                                />
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Description</label>
                                <Input 
                                    className="rounded-2xl py-6"
                                    value={editStyle.description}
                                    onChange={(e) => setEditStyle({...editStyle, description: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="flex gap-4 pt-4">
                            <Button 
                                variant="secondary" 
                                className="flex-1 rounded-2xl py-6 font-bold"
                                onClick={() => setIsEditing(false)}
                            >
                                Cancel
                            </Button>
                            <Button 
                                className="flex-1 bg-[#a319c5] hover:bg-[#8e16ac] text-white rounded-2xl py-6 font-bold shadow-lg shadow-[#a319c5]/20 gap-2"
                                onClick={handleSave}
                            >
                                <Save size={18} />
                                Save Style
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
