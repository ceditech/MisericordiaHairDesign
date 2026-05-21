"use client";

import React, { useState, useEffect } from "react";
import { subscribeToProducts, upsertProduct, deleteProduct, uploadFile } from "@/src/lib/firebase/ownerService";
import { ShoppingBag, Plus, Trash2, Edit3, Save, X, Package, DollarSign, TrendingDown, Upload } from "lucide-react";

type Product = {
    id: string;
    name?: string;
    description?: string;
    shortDescription?: string;
    fullDescription?: string;
    price?: number;
    priceCents?: number;
    stock?: number;
    imageUrl?: string;
    images?: string[];
    category?: string;
    isActive?: boolean;
    stockStatus?: string;
};

export default function StitchInventory() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<Partial<Product>>({});
    const [isAdding, setIsAdding] = useState(false);
    const [newProd, setNewProd] = useState({ name: "", description: "", price: 0, stock: 10, category: "" });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);
    const [viewingProduct, setViewingProduct] = useState<Product | null>(null);

    useEffect(() => {
        const unsub = subscribeToProducts((data) => {
            setProducts(data as Product[]);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const saveEdit = async () => {
        if (!editingId) return;
        setSaving(true);
        try { await upsertProduct({ ...editData, id: editingId } as any); setEditingId(null); }
        catch (err) { console.error(err); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this product?")) return;
        try { await deleteProduct(id); } catch (err) { console.error(err); }
    };

    const handleAdd = async () => {
        if (!newProd.name) return;
        setSaving(true);
        try {
            const id = `prod_${Date.now()}`;
            let imageUrl = "";
            if (imageFile) {
                imageUrl = await uploadFile(imageFile, `products/${id}_${Date.now()}`);
            }
            await upsertProduct({ 
                ...newProd, 
                id, 
                priceCents: Math.round(newProd.price * 100), 
                isActive: true,
                imageUrl: imageUrl || undefined
            } as any);
            setIsAdding(false);
            setNewProd({ name: "", description: "", price: 0, stock: 10, category: "" });
            setImageFile(null);
        } catch (err) { console.error(err); }
        finally { setSaving(false); }
    };

    const lowStock = products.filter(p => (p.stock || 0) < 5).length;

    if (loading) return <div className="p-8 text-center text-slate-500 font-bold">Loading inventory...</div>;

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold font-headline tracking-tight text-slate-900 dark:text-white">Inventory</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your shop products, pricing, and stock levels.</p>
                </div>
                <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#6b38d4] to-[#8455ef] text-white font-bold shadow-lg shadow-[#8455ef]/20 hover:scale-105 active:scale-95 transition-all self-start md:self-auto">
                    <Plus size={18} />Add Product
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Total Products</p>
                    <p className="text-3xl font-black font-headline text-slate-900 dark:text-white">{products.length}</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-800">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">In Stock</p>
                    <p className="text-3xl font-black font-headline text-emerald-600 dark:text-emerald-400">{products.filter(p => (p.stock || 0) > 0).length}</p>
                </div>
                <div className={`p-5 rounded-[1.5rem] border ${lowStock > 0 ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800" : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800"}`}>
                    <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${lowStock > 0 ? "text-amber-600" : "text-slate-400"}`}>Low Stock</p>
                    <p className={`text-3xl font-black font-headline ${lowStock > 0 ? "text-amber-600" : "text-slate-900 dark:text-white"}`}>{lowStock}</p>
                </div>
                <div className="bg-[#e9ddff] dark:bg-slate-800 p-5 rounded-[1.5rem] border border-transparent">
                    <p className="text-xs font-bold uppercase tracking-widest text-[#6b38d4] dark:text-[#d0bcff] mb-1">Total Units</p>
                    <p className="text-3xl font-black font-headline text-[#6b38d4] dark:text-[#d0bcff]">{products.reduce((acc, p) => acc + (p.stock || 0), 0)}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {products.map(product => {
                    const isEditing = editingId === product.id;
                    const price = product.price || (product.priceCents || 0) / 100;
                    const isLowStock = (product.stock || 0) < 5 || product.stockStatus === 'low_stock';
                    const mainImage = product.imageUrl || (product.images && product.images[0]);

                        return (
                            <div key={product.id} onClick={() => !isEditing && setViewingProduct(product)} className={`bg-white dark:bg-slate-900 rounded-[2rem] border overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer ${isLowStock ? "border-amber-200 dark:border-amber-800" : "border-slate-100 dark:border-slate-800"}`}>
                                <div className="h-40 bg-gradient-to-br from-[#e9ddff] to-[#ffd9e4] dark:from-slate-800 dark:to-slate-700 flex items-center justify-center relative">
                                    {mainImage ? <img src={mainImage} alt={product.name} className="w-full h-full object-cover" /> : <ShoppingBag size={48} className="text-[#6b38d4]/30 dark:text-[#d0bcff]/30" />}
                                    <div className="absolute top-3 right-3 flex gap-2">
                                        {isLowStock && <span className="px-2.5 py-1 text-[10px] font-bold uppercase rounded-full bg-amber-100 text-amber-700 flex items-center gap-1"><TrendingDown size={10} />Low</span>}
                                    </div>
                                </div>
                                <div className="p-6 space-y-4" onClick={e => e.stopPropagation()}>
                                    {isEditing ? (
                                        <div className="space-y-3">
                                            <input className="w-full rounded-xl py-2 px-3 bg-slate-50 dark:bg-slate-800 text-sm font-bold border-none focus:ring-2 focus:ring-[#6b38d4] text-slate-900 dark:text-white" value={editData.name || ""} onChange={e => setEditData(d => ({ ...d, name: e.target.value }))} placeholder="Product name" />
                                            <textarea className="w-full rounded-xl py-2 px-3 bg-slate-50 dark:bg-slate-800 text-sm border-none focus:ring-2 focus:ring-[#6b38d4] text-slate-900 dark:text-white resize-none" rows={2} value={editData.description || ""} onChange={e => setEditData(d => ({ ...d, description: e.target.value }))} placeholder="Description" />
                                            <div className="grid grid-cols-2 gap-3">
                                                <input type="number" className="w-full rounded-xl py-2 px-3 bg-slate-50 dark:bg-slate-800 text-sm font-bold border-none focus:ring-2 focus:ring-[#6b38d4] text-slate-900 dark:text-white" value={editData.price || (editData.priceCents || 0) / 100} onChange={e => setEditData(d => ({ ...d, price: parseFloat(e.target.value), priceCents: Math.round(parseFloat(e.target.value) * 100) }))} placeholder="Price ($)" />
                                                <input type="number" className="w-full rounded-xl py-2 px-3 bg-slate-50 dark:bg-slate-800 text-sm font-bold border-none focus:ring-2 focus:ring-[#6b38d4] text-slate-900 dark:text-white" value={editData.stock ?? 0} onChange={e => setEditData(d => ({ ...d, stock: parseInt(e.target.value) || 0 }))} placeholder="Stock qty" />
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
                                                <h3 className="font-bold text-lg text-slate-900 dark:text-white">{product.name || "Unnamed Product"}</h3>
                                                {product.category && <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{product.category}</span>}
                                                {(product.description || product.shortDescription) && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{product.description || product.shortDescription}</p>}
                                            </div>
                                            <div className="flex gap-4 text-sm">
                                                <span className="flex items-center gap-1.5 text-[#6b38d4] dark:text-[#d0bcff] font-bold"><DollarSign size={14} />${price.toFixed(2)}</span>
                                                <span className={`flex items-center gap-1.5 font-bold ${isLowStock ? "text-amber-600" : "text-slate-500"}`}>
                                                    <Package size={14} />{product.stock ?? 0} in stock
                                                </span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => { setEditingId(product.id); setEditData({ ...product }); }} className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-[#e9ddff] hover:text-[#6b38d4] transition-colors">
                                                    <Edit3 size={14} />Edit
                                                </button>
                                                <button onClick={() => handleDelete(product.id)} className="flex items-center justify-center gap-1 py-2.5 px-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-400 text-xs font-bold hover:bg-red-100 transition-colors">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                })}
                {products.length === 0 && !isAdding && (
                    <div className="col-span-full py-20 text-center bg-white dark:bg-slate-900 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-700">
                        <ShoppingBag size={48} className="mx-auto text-slate-300 mb-4" />
                        <p className="font-bold text-slate-500">No products yet. Add your first product.</p>
                    </div>
                )}
            </div>

            {isAdding && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-md bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl space-y-5 border border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                            <h3 className="text-2xl font-extrabold font-headline text-slate-900 dark:text-white">Add Product</h3>
                            <button onClick={() => setIsAdding(false)} className="text-slate-400 p-2 bg-slate-100 dark:bg-slate-800 rounded-full transition-colors"><X size={18} /></button>
                        </div>
                        {[
                            { label: "Product Name *", key: "name", type: "text", placeholder: "e.g. Silk Bonnet" },
                            { label: "Description", key: "description", type: "text", placeholder: "Short description..." },
                            { label: "Category", key: "category", type: "text", placeholder: "e.g. Accessories" },
                            { label: "Price ($)", key: "price", type: "number", placeholder: "45" },
                            { label: "Stock Quantity", key: "stock", type: "number", placeholder: "20" },
                        ].map(f => (
                            <div key={f.key} className="space-y-1.5">
                                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">{f.label}</label>
                                <input type={f.type} placeholder={f.placeholder} className="w-full rounded-2xl py-3.5 px-5 bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-[#6b38d4] text-slate-900 dark:text-white text-sm font-bold" value={(newProd as any)[f.key]} onChange={e => setNewProd(s => ({ ...s, [f.key]: f.type === "number" ? parseFloat(e.target.value) || 0 : e.target.value }))} />
                            </div>
                        ))}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Product Image</label>
                            <div className="flex items-center justify-center w-full">
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-350 dark:border-slate-700 rounded-2xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <Upload className="w-8 h-8 mb-2 text-slate-400" />
                                        <p className="text-xs text-slate-500 font-bold">{imageFile ? imageFile.name : "Click to upload product image"}</p>
                                    </div>
                                    <input type="file" className="hidden" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} />
                                </label>
                            </div>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button onClick={() => setIsAdding(false)} className="flex-1 py-4 rounded-2xl font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200">Cancel</button>
                            <button onClick={handleAdd} disabled={saving || !newProd.name} className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#6b38d4] text-white font-bold shadow-lg shadow-[#6b38d4]/20 disabled:opacity-50">
                                <Plus size={18} />Add Product
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {viewingProduct && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-300">
                        <div className="h-64 bg-slate-100 dark:bg-slate-800 relative">
                            {viewingProduct.imageUrl || (viewingProduct.images && viewingProduct.images[0]) ? (
                                <img src={viewingProduct.imageUrl || viewingProduct.images![0]} alt={viewingProduct.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-purple-50 dark:bg-purple-900/20 text-[#6b38d4] dark:text-[#d0bcff]">
                                    <ShoppingBag size={64} />
                                </div>
                            )}
                            <button onClick={() => setViewingProduct(null)} className="absolute top-4 right-4 p-2 bg-black/40 backdrop-blur-md text-white hover:bg-black/60 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div>
                                <div className="flex items-center gap-3">
                                    <h3 className="text-3xl font-extrabold font-headline text-slate-900 dark:text-white">{viewingProduct.name}</h3>
                                    {viewingProduct.category && (
                                        <span className="px-3 py-1 text-xs font-bold uppercase rounded-full bg-purple-100 text-[#6b38d4]">
                                            {viewingProduct.category}
                                        </span>
                                    )}
                                </div>
                                <p className="text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">{viewingProduct.fullDescription || viewingProduct.description || "No description provided for this product."}</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl">
                                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">Product Price</span>
                                    <span className="text-2xl font-black text-[#6b38d4] dark:text-[#d0bcff] flex items-center gap-1">
                                        <DollarSign size={20} />{(viewingProduct.price || (viewingProduct.priceCents || 0) / 100).toFixed(2)}
                                    </span>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl">
                                    <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">Current Stock</span>
                                    <span className={`text-2xl font-black flex items-center gap-1.5 ${(viewingProduct.stock || 0) < 5 ? "text-amber-600 animate-pulse" : "text-slate-900 dark:text-white"}`}>
                                        <Package size={20} className="text-slate-400" />{viewingProduct.stock ?? 0} units
                                    </span>
                                </div>
                            </div>
                            
                            <div className="flex gap-3">
                                <button onClick={() => { setEditingId(viewingProduct.id); setEditData({ ...viewingProduct }); setViewingProduct(null); }} className="flex-1 py-4 bg-[#6b38d4] hover:bg-[#8455ef] text-white font-bold rounded-2xl shadow-lg transition-colors flex items-center justify-center gap-2">
                                    <Edit3 size={18} /> Edit Product details
                                </button>
                                <button onClick={() => setViewingProduct(null)} className="px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold rounded-2xl hover:bg-slate-200">
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
