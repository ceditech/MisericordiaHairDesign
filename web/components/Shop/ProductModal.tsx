"use client";

import React, { useState, useEffect } from "react";
import { Product } from "@/src/data/products";
import { useCart } from "@/src/lib/shop/cartStore";
import { Button, Input, Badge, useToast } from "@/components/ui";
import { X, ShoppingCart, Zap, Star, ShieldCheck } from "lucide-react";
import Image from "next/image";

interface ProductModalProps {
    product: Product | null;
    isOpen: boolean;
    onClose: () => void;
}

export function ProductModal({ product, isOpen, onClose }: ProductModalProps) {
    const { addToCart } = useCart();
    const { showToast } = useToast();
    const [quantity, setQuantity] = useState(1);
    const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
    const [mainImage, setMainImage] = useState<string>("");

    useEffect(() => {
        if (product) {
            setMainImage(product.images[0]);
            setQuantity(1);

            // Set default variants if any
            const defaults: Record<string, string> = {};
            product.variants?.forEach(v => {
                defaults[v.name] = v.options[0];
            });
            setSelectedOptions(defaults);
        }
    }, [product]);

    if (!product || !isOpen) return null;

    const handleAddToCart = () => {
        addToCart(product, quantity, selectedOptions);
        showToast(`${quantity}x ${product.name} added to your cart.`, "success");
    };

    const handleBuyNow = () => {
        addToCart(product, quantity, selectedOptions);
        window.location.href = "/cart"; // Simplified redirect
    };

    const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 lg:p-8">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl shadow-slate-950/20 animate-in zoom-in-95 duration-300">
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-brand-primary transition-colors z-10"
                >
                    <X size={24} />
                </button>

                <div className="grid lg:grid-cols-2 gap-0 overflow-hidden">
                    {/* Image Area */}
                    <div className="p-8 lg:p-12 bg-slate-50 dark:bg-slate-950/40">
                        <div className="relative aspect-square rounded-3xl overflow-hidden bg-white dark:bg-slate-900 shadow-xl border border-slate-100 dark:border-slate-800">
                            <img
                                src={mainImage}
                                alt={product.name}
                                className="w-full h-full object-cover"
                            />
                        </div>
                        {product.images.length > 1 && (
                            <div className="flex gap-4 mt-6 overflow-x-auto pb-2 scrollbar-hide">
                                {product.images.map((img, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setMainImage(img)}
                                        className={`relative w-24 aspect-square rounded-xl overflow-hidden border-2 transition-all ${mainImage === img ? 'border-[#9F2D5C]' : 'border-transparent opacity-60 hover:opacity-100'
                                            }`}
                                    >
                                        <img src={img} alt="" className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Content Area */}
                    <div className="p-8 lg:p-12 lg:pl-0">
                        <Badge className="mb-4 bg-[#9F2D5C]/10 text-[#9F2D5C] border-none px-4 py-1.5 uppercase tracking-widest text-xs font-bold">
                            {product.category}
                        </Badge>

                        <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mb-4 leading-tight">
                            {product.name}
                        </h2>

                        <div className="flex items-center gap-4 mb-8">
                            <span className="text-4xl font-black text-[#9F2D5C] italic">
                                {formatPrice(product.priceCents)}
                            </span>
                            {product.rating && (
                                <div className="flex items-center gap-1 bg-amber-500/10 text-amber-600 px-2 py-1 rounded-lg text-sm font-bold">
                                    <Star size={16} fill="currentColor" />
                                    {product.rating}
                                </div>
                            )}
                        </div>

                        <p className="text-slate-500 dark:text-slate-400 mb-10 leading-relaxed text-lg">
                            {product.fullDescription}
                        </p>

                        {/* Variants */}
                        {product.variants?.map((variant) => (
                            <div key={variant.name} className="mb-8">
                                <label className="block text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
                                    Select {variant.name}
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {variant.options.map((option) => (
                                        <button
                                            key={option}
                                            onClick={() => setSelectedOptions(prev => ({ ...prev, [variant.name]: option }))}
                                            className={`px-5 py-3 rounded-xl border-2 transition-all font-semibold ${selectedOptions[variant.name] === option
                                                ? 'border-[#9F2D5C] bg-[#9F2D5C]/5 text-[#9F2D5C]'
                                                : 'border-slate-100 dark:border-slate-800 text-slate-500 hover:border-slate-300'
                                                }`}
                                        >
                                            {option}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}

                        {/* Quantity */}
                        <div className="mb-10">
                            <label className="block text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
                                Quantity
                            </label>
                            <div className="flex items-center gap-3 w-fit bg-slate-50 dark:bg-slate-800 p-2 rounded-2xl border border-slate-100 dark:border-slate-700">
                                <button
                                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm disabled:opacity-50"
                                    disabled={quantity <= 1}
                                >
                                    -
                                </button>
                                <input
                                    type="number"
                                    value={quantity}
                                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="w-12 text-center bg-transparent font-bold text-lg outline-none"
                                />
                                <button
                                    onClick={() => setQuantity(q => q + 1)}
                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="grid sm:grid-cols-2 gap-4">
                            <Button
                                onClick={handleAddToCart}
                                size="lg"
                                variant="secondary"
                                className="w-full py-8 rounded-2xl gap-3 text-lg font-bold border-2 border-slate-100 dark:border-slate-800"
                            >
                                <ShoppingCart size={22} />
                                Add to Cart
                            </Button>
                            <Button
                                onClick={handleBuyNow}
                                size="lg"
                                className="w-full py-8 rounded-2xl gap-3 text-lg font-bold bg-[#9F2D5C] hover:bg-[#B8326A]"
                            >
                                <Zap size={22} fill="currentColor" />
                                Buy Now
                            </Button>
                        </div>

                        <div className="mt-8 flex items-center gap-6 text-xs text-slate-400 font-medium">
                            <div className="flex items-center gap-1.5">
                                <ShieldCheck size={16} />
                                Secure Checkout
                            </div>
                            <div className="flex items-center gap-1.5 uppercase tracking-widest text-[#9F2D5C]">
                                {product.stockStatus === 'in_stock' ? 'In Stock' : product.stockStatus.replace('_', ' ')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
