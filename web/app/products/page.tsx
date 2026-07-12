"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Product } from "@/src/data/products";
import { ProductModal } from "@/components/Shop/ProductModal";
import { Button, Card, Badge, Input, Skeleton } from "@/components/ui";
import { Search, ShoppingCart, Info, Filter, ArrowUpDown } from "lucide-react";
import { subscribeToProducts } from "@/src/lib/firebase/ownerService";

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeCategory, setActiveCategory] = useState<string>("All");
    const [sortBy, setSortBy] = useState<"featured" | "price-low" | "price-high">("featured");
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const unsubscribe = subscribeToProducts((data) => {
            setProducts(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const categories = useMemo(() => ["All", ...Array.from(new Set(products.map(p => p.category)))], [products]);

    const filteredProducts = useMemo(() => {
        let result = products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.shortDescription.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = activeCategory === "All" || p.category === activeCategory;
            return matchesSearch && matchesCategory;
        });

        if (sortBy === "price-low") {
            result.sort((a, b) => a.priceCents - b.priceCents);
        } else if (sortBy === "price-high") {
            result.sort((a, b) => b.priceCents - a.priceCents);
        } else if (sortBy === "featured") {
            result.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
        }

        return result;
    }, [products, searchQuery, activeCategory, sortBy]);

    const openProduct = (product: Product) => {
        setSelectedProduct(product);
        setIsModalOpen(true);
    };

    const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

    return (
        <main className="min-h-screen pt-32 pb-20 px-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="text-center max-w-3xl mx-auto mb-16">
                <Badge className="mb-4 bg-[#9F2D5C]/10 text-[#9F2D5C] border-none px-4 py-1 uppercase tracking-widest text-xs font-bold">
                    Professional Beauty Shop
                </Badge>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white mb-6 leading-tight">
                    Shop Our <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#9F2D5C] to-emerald-500">Stylist Essentials</span>
                </h1>
                <p className="text-lg text-slate-500 dark:text-slate-400">
                    Premium braiding hair, wigs, professional gels, and beauty essentials—available for everyone. Get the MHDESIGNS&apos;s Braids look at home.
                </p>
            </div>

            {/* Controls */}
            <div className="flex flex-col lg:flex-row gap-6 mb-12 items-center justify-between bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                {/* Search */}
                <div className="relative w-full lg:max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <Input
                        placeholder="Search products..."
                        className="pl-12 py-6 rounded-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-[#9F2D5C]"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2 items-center justify-center">
                    <Filter size={16} className="text-slate-400 mr-2 hidden sm:block" />
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeCategory === cat
                                    ? 'bg-[#9F2D5C] text-white shadow-lg shadow-[#9F2D5C]/20'
                                    : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Sort */}
                <div className="flex items-center gap-3 min-w-fit">
                    <ArrowUpDown size={16} className="text-slate-400" />
                    <select
                        className="bg-transparent font-semibold text-sm outline-none text-slate-900 dark:text-white cursor-pointer"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                    >
                        <option value="featured">Featured First</option>
                        <option value="price-low">Price: Low to High</option>
                        <option value="price-high">Price: High to Low</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                        <div key={i} className="space-y-4">
                            <Skeleton className="aspect-square rounded-[2rem]" />
                            <Skeleton className="h-6 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                        </div>
                    ))}
                </div>
            ) : filteredProducts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {filteredProducts.map((product) => (
                        <Card
                            key={product.id}
                            className="overflow-hidden group hover:shadow-2xl transition-all duration-500 border-none bg-white dark:bg-slate-900 rounded-[2rem] flex flex-col h-full"
                        >
                            <div
                                className="relative aspect-square overflow-hidden bg-slate-100 dark:bg-slate-800 cursor-pointer"
                                onClick={() => openProduct(product)}
                            >
                                <img
                                    src={product.images[0]}
                                    alt={product.name}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                                <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                                    <span className="bg-white/95 backdrop-blur-sm text-slate-900 text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider shadow-sm border border-slate-100">
                                        {product.category}
                                    </span>
                                    {product.featured && (
                                        <span className="bg-[#9F2D5C] text-white text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider shadow-lg shadow-[#9F2D5C]/20">
                                            Top Pick
                                        </span>
                                    )}
                                </div>
                                {/* Quick view overlay */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                                    <Button variant="secondary" className="rounded-xl font-bold gap-2">
                                        <Info size={18} />
                                        View Details
                                    </Button>
                                </div>
                            </div>
                            <div className="p-6 flex flex-col flex-1">
                                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 leading-tight group-hover:text-[#9F2D5C] transition-colors">
                                    {product.name}
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 line-clamp-2">
                                    {product.shortDescription}
                                </p>
                                <div className="flex items-center justify-between mt-auto">
                                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                                        {formatPrice(product.priceCents)}
                                    </span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openProduct(product);
                                        }}
                                        className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white flex items-center justify-center hover:bg-[#9F2D5C] hover:text-white transition-all duration-300 shadow-sm overflow-hidden"
                                    >
                                        <ShoppingCart size={20} />
                                    </button>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="py-20 text-center bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800">
                    <Search size={48} className="mx-auto text-slate-300 mb-6" />
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">No products found</h2>
                    <p className="text-slate-500">Try adjusting your search or filters.</p>
                    <Button
                        variant="secondary"
                        className="mt-6 rounded-xl"
                        onClick={() => { setSearchQuery(""); setActiveCategory("All"); }}
                    >
                        Clear All Filters
                    </Button>
                </div>
            )}

            {/* Information Section */}
            <div className="mt-32 grid md:grid-cols-2 gap-8">
                <div className="bg-[#9F2D5C]/5 rounded-[3rem] p-10 border border-[#9F2D5C]/10 flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-2xl bg-[#9F2D5C]/10 text-[#9F2D5C] flex items-center justify-center mb-6">
                        <ShoppingCart size={32} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4">Shop Online</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-0 leading-relaxed">
                        Securely purchase your professional beauty supplies through our newly upgraded shop. We accept all major credit cards and PayPal.
                    </p>
                </div>
                <div className="bg-emerald-500/5 rounded-[3rem] p-10 border border-emerald-500/10 flex flex-col items-center text-center">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-6">
                        <Info size={32} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-4">In-Studio Pickup</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-0 leading-relaxed">
                        Currently, all online orders are for in-studio pickup at our Manor, TX location. Shipping options are coming soon!
                    </p>
                </div>
            </div>

            <ProductModal
                product={selectedProduct}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </main>
    );
}
