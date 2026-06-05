"use client";

import React, { useState, useEffect } from "react";
import { subscribeToProducts, upsertProduct, deleteProduct } from "@/src/lib/firebase/ownerService";
import { STORE_PRODUCTS, Product } from "@/src/data/products";
import { Button, Card, Input, Badge } from "@/components/ui";
import { Plus, Edit2, Trash2, Package, Save, X, Search, Database } from "lucide-react";

export default function ProductsTab() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editProduct, setEditProduct] = useState<Partial<Product> | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const unsubscribe = subscribeToProducts((data) => {
            setProducts(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleSave = async () => {
        if (!editProduct?.name || !editProduct?.id) {
            alert("Name and ID are required.");
            return;
        }
        try {
            await upsertProduct(editProduct as any);
            setIsEditing(false);
            setEditProduct(null);
        } catch (err) {
            console.error("Error saving product:", err);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this product?")) {
            await deleteProduct(id);
        }
    };


    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return <div className="p-8 text-center font-bold">Loading products...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header / Search */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none outline-none focus:ring-2 focus:ring-[#9F2D5C] text-sm"
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <Button 
                        onClick={() => {
                            setEditProduct({
                                id: `prod_${Date.now()}`,
                                name: "",
                                category: "Hair Care",
                                priceCents: 0,
                                currency: "USD",
                                images: [""],
                                shortDescription: "",
                                fullDescription: "",
                                tags: [],
                                stockStatus: "in_stock"
                            });
                            setIsEditing(true);
                        }}
                        className="rounded-xl font-bold bg-[#9F2D5C] text-white hover:bg-[#8e16ac] shadow-lg shadow-[#9F2D5C]/20 gap-2 px-6"
                    >
                        <Plus size={18} />
                        Add Product
                    </Button>
                </div>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product) => (
                    <Card key={product.id} className="overflow-hidden bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 rounded-[2.5rem] hover:shadow-2xl transition-all duration-500 flex flex-col group">
                        <div className="relative aspect-video bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <img 
                                src={product.images[0] || "https://images.unsplash.com/photo-1560064060-1f0124ad9a99?w=800&q=80"} 
                                alt={product.name}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                            <div className="absolute top-4 left-4">
                                <Badge className="bg-white/95 backdrop-blur-sm text-slate-900 text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider border border-slate-100 shadow-sm">
                                    {product.category}
                                </Badge>
                            </div>
                        </div>
                        <div className="p-6 flex flex-col flex-1">
                            <h4 className="text-xl font-black text-slate-900 dark:text-white mb-2 leading-tight group-hover:text-[#9F2D5C] transition-colors line-clamp-1 italic uppercase tracking-tighter">
                                {product.name}
                            </h4>
                            <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50 dark:border-slate-800">
                                <span className="text-2xl font-black text-slate-900 dark:text-white italic">
                                    ${(product.priceCents / 100).toFixed(2)}
                                </span>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => { setEditProduct(product); setIsEditing(true); }}
                                        className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center hover:bg-[#9F2D5C] hover:text-white transition-all shadow-sm"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(product.id)}
                                        className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Edit/Add Modal */}
            {isEditing && editProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <Card className="w-full max-w-2xl bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-2xl space-y-8 max-h-[90vh] overflow-y-auto no-scrollbar">
                        <div className="flex items-center justify-between">
                            <h3 className="text-3xl font-black text-slate-900 dark:text-white italic uppercase tracking-tighter">
                                {editProduct.name ? "Edit Product" : "New Product"}
                            </h3>
                            <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors p-2">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Product Name</label>
                                <Input 
                                    className="rounded-2xl py-6"
                                    value={editProduct.name}
                                    onChange={(e) => setEditProduct({...editProduct, name: e.target.value})}
                                    placeholder="e.g. Braid Seen Spray"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Category</label>
                                <select 
                                    className="w-full rounded-2xl py-4 px-4 bg-slate-50 dark:bg-slate-800 border-none outline-none text-sm font-bold text-slate-900 dark:text-white"
                                    value={editProduct.category}
                                    onChange={(e) => setEditProduct({...editProduct, category: e.target.value as any})}
                                >
                                    <option>Hair Care</option>
                                    <option>Edge Control</option>
                                    <option>Gels & Edge Control</option>
                                    <option>Braiding Hair</option>
                                    <option>Hardware</option>
                                    <option>Accessories</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Price (In Cents)</label>
                                <Input 
                                    type="number"
                                    className="rounded-2xl py-6"
                                    value={editProduct.priceCents}
                                    onChange={(e) => setEditProduct({...editProduct, priceCents: parseInt(e.target.value)})}
                                    placeholder="1500 = $15.00"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Stock Status</label>
                                <select 
                                    className="w-full rounded-2xl py-4 px-4 bg-slate-50 dark:bg-slate-800 border-none outline-none text-sm font-bold text-slate-900 dark:text-white"
                                    value={editProduct.stockStatus}
                                    onChange={(e) => setEditProduct({...editProduct, stockStatus: e.target.value as any})}
                                >
                                    <option value="in_stock">In Stock</option>
                                    <option value="low_stock">Low Stock</option>
                                    <option value="out_of_stock">Out of Stock</option>
                                </select>
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Image URL</label>
                                <Input 
                                    className="rounded-2xl py-6"
                                    value={editProduct.images?.[0]}
                                    onChange={(e) => setEditProduct({...editProduct, images: [e.target.value]})}
                                    placeholder="https://images.unsplash..."
                                />
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Short Description</label>
                                <Input 
                                    className="rounded-2xl py-6"
                                    value={editProduct.shortDescription}
                                    onChange={(e) => setEditProduct({...editProduct, shortDescription: e.target.value})}
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
                                className="flex-1 bg-[#9F2D5C] hover:bg-[#8e16ac] text-white rounded-2xl py-6 font-bold shadow-lg shadow-[#9F2D5C]/20 gap-2"
                                onClick={handleSave}
                            >
                                <Save size={18} />
                                Save Product
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
