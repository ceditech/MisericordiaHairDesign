"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BraidStyle } from "@/lib/styles";
import { SIZE_PRESETS, LENGTH_PRESETS, ADDON_WASHING } from "@/src/constants/braidPresets";
import { subscribeToStyles } from "@/src/lib/firebase/ownerService";
import { Skeleton } from "@/components/ui";

function StyleModal({ style, onClose }: { style: BraidStyle; onClose: () => void }) {
    const router = useRouter();
    const hasRedirected = useRef(false);

    // Lock background page scroll while modal is open
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    }, []);

    const handleBookNow = async () => {
        if (hasRedirected.current) return;
        hasRedirected.current = true;
        onClose();
        try {
            await (router.push(`/book?style=${style.id}`) as any);
        } catch (err: any) {
            if (err.name !== 'AbortError') throw err;
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />

            {/* Modal Card — max-h + flex-col so inner area can scroll, close button stays pinned */}
            <div className="relative z-10 bg-white dark:bg-[#1a0b13] rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl max-w-2xl w-full max-h-[90dvh] flex flex-col animate-in slide-in-from-bottom-4 sm:zoom-in-90 fade-in duration-300">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/40 transition-colors"
                    aria-label="Close modal"
                >
                    <span className="material-icons text-sm">close</span>
                </button>

                {/* Scrollable content — image + details */}
                <div className="overflow-y-auto flex-1 overscroll-contain">

                {/* Image */}
                <div className="relative aspect-[4/3] sm:aspect-[16/9] overflow-hidden">
                    <img
                        src={style.image}
                        alt={style.name}
                        className="w-full h-full object-cover"
                    />
                    {style.popular && (
                        <div className="absolute top-4 left-4">
                            <span className="bg-[#a319c5] text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest shadow-lg">
                                Most Popular
                            </span>
                        </div>
                    )}
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    <div className="absolute bottom-4 left-6">
                        <h2 className="text-2xl font-extrabold text-white">{style.name}</h2>
                    </div>
                </div>

                {/* Details */}
                <div className="p-8">
                    <p className="text-slate-600 dark:text-slate-300 text-base leading-relaxed mb-8">
                        {style.description}
                    </p>

                    <div className="mb-8 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                        <h4 className="font-bold text-slate-900 dark:text-white mb-4">Available Add-ons & Options</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-[#a319c5] mb-2">Sizes</p>
                                <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                                    {SIZE_PRESETS.map(s => <li key={s.id}>{s.label} ({s.priceGuidance})</li>)}
                                </ul>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-[#a319c5] mb-2">Lengths</p>
                                <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                                    {LENGTH_PRESETS.map(l => <li key={l.id}>{l.label} ({l.inches})</li>)}
                                </ul>
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-[#a319c5] mb-2">Optional Services</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                                {ADDON_WASHING.name} (+${ADDON_WASHING.price}) available at checkout.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-[#a319c5]/5 dark:bg-[#a319c5]/10 rounded-2xl p-5 text-center">
                            <span className="material-icons text-[#a319c5] text-2xl mb-1 block">payments</span>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Starting Price</p>
                            <p className="text-xl font-extrabold text-[#a319c5]">{style.price}</p>
                        </div>
                        <div className="bg-[#a319c5]/5 dark:bg-[#a319c5]/10 rounded-2xl p-5 text-center">
                            <span className="material-icons text-[#a319c5] text-2xl mb-1 block">schedule</span>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Duration</p>
                            <p className="text-xl font-extrabold text-slate-900 dark:text-white">{style.duration}</p>
                        </div>
                    </div>

                    <button
                        onClick={handleBookNow}
                        className="w-full py-5 rounded-2xl bg-[#a319c5] hover:bg-[#8b15a8] text-white font-bold text-lg transition-all duration-300 flex items-center justify-center gap-3 shadow-xl shadow-[#a319c5]/30 active:scale-95"
                    >
                        <span className="material-icons">calendar_today</span>
                        Book This Style
                        <span className="material-icons">arrow_forward</span>
                    </button>
                </div>

                </div>{/* end scrollable */}
            </div>
        </div>
    );
}

export default function OurStylesPage() {
    const [styles, setStyles] = useState<BraidStyle[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedStyle, setSelectedStyle] = useState<BraidStyle | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const unsubscribe = subscribeToStyles((data) => {
            setStyles(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!loading && styles.length > 0) {
            const params = new URLSearchParams(window.location.search);
            const styleId = params.get("style");
            if (styleId) {
                const found = styles.find(s => s.id === styleId);
                if (found) {
                    setSelectedStyle(found);
                }
            }
        }
    }, [loading, styles]);

    const scroll = (direction: "left" | "right") => {
        if (scrollContainerRef.current) {
            const scrollAmount = 400;
            scrollContainerRef.current.scrollBy({
                left: direction === "left" ? -scrollAmount : scrollAmount,
                behavior: "smooth"
            });
        }
    };

    return (
        <main className="min-h-screen bg-white dark:bg-[#0c0610]">
            {/* Hero */}
            <section className="relative py-20 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#a319c5]/8 via-transparent to-transparent" />
                <div className="absolute top-0 right-0 w-96 h-96 bg-[#a319c5]/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#a319c5]/10 text-[#a319c5] text-xs font-bold uppercase tracking-widest mb-6">
                            <span className="flex h-2 w-2 rounded-full bg-[#a319c5] animate-pulse" />
                            Explore Our Work
                        </div>
                        <h1 className="text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white leading-tight mb-5">
                            Our Braiding <span className="text-[#a319c5]">Styles</span>
                        </h1>
                        <p className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed">
                            Expertly crafted braids for every occasion. Tap any style to explore details and book your transformation.
                        </p>
                    </div>
                </div>
            </section>

            {/* Gallery Grid */}
            <section className="max-w-7xl mx-auto px-6 pb-24">
                {loading ? (
                    <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
                        {[1, 2, 3, 4, 5, 6].map(i => (
                            <Skeleton key={i} className={`w-full rounded-3xl ${i % 2 === 0 ? "aspect-[3/4]" : "aspect-square"}`} />
                        ))}
                    </div>
                ) : (
                    <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
                        {styles.map((style, index) => (
                            <div
                                key={style.id}
                                className="break-inside-avoid group relative overflow-hidden rounded-3xl cursor-pointer shadow-md hover:shadow-2xl hover:shadow-[#a319c5]/15 transition-all duration-500"
                                onClick={() => setSelectedStyle(style)}
                            >
                                {/* Image - alternating aspect ratios for visual interest */}
                                <img
                                    src={style.image}
                                    alt={style.name}
                                    className={`w-full object-cover transition-transform duration-700 group-hover:scale-110 ${index % 3 === 0 ? "aspect-[3/4]" : index % 3 === 1 ? "aspect-square" : "aspect-[4/5]"
                                        }`}
                                />

                                {/* Popular badge */}
                                {style.popular && (
                                    <div className="absolute top-4 left-4">
                                        <span className="bg-[#a319c5] text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest shadow-lg">
                                            Most Popular
                                        </span>
                                    </div>
                                )}

                                {/* Hover Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400 flex flex-col justify-end p-6">
                                    <h3 className="text-xl font-bold text-white mb-1 translate-y-4 group-hover:translate-y-0 transition-transform duration-400">
                                        {style.name}
                                    </h3>
                                    <p className="text-[#e899ff] font-semibold text-sm mb-3 translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                                        {style.price}
                                    </p>
                                    <div className="flex items-center gap-2 translate-y-4 group-hover:translate-y-0 transition-transform duration-600">
                                        <span className="text-white/80 text-xs font-medium flex items-center gap-1">
                                            <span className="material-icons text-sm">schedule</span>
                                            {style.duration}
                                        </span>
                                        <span className="ml-auto bg-white text-[#a319c5] text-xs font-bold px-4 py-1.5 rounded-full flex items-center gap-1">
                                            View Details
                                            <span className="material-icons text-xs">arrow_forward</span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Vertical Spacer */}
                <div className="h-24" />

                {/* Horizontal Customer Section */}
                <div className="relative pt-10">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#a319c5]/10 text-[#a319c5] text-[10px] font-bold uppercase tracking-widest mb-4">
                            <span className="material-icons text-sm">stars</span>
                            Customer Transformations
                        </div>
                        <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-6">
                            How We Make Our Customers <br />
                            <span className="text-[#a319c5]">Look and Feel</span>
                        </h2>
                        <p className="max-w-xl mx-auto text-slate-500 dark:text-slate-400">
                            Witness the magic of our expert braiding services. From subtle enhancements to bold transformations.
                        </p>
                    </div>

                    <div className="relative group max-w-6xl mx-auto">
                        {/* The Container with hide-scrollbar */}
                        <div
                            ref={scrollContainerRef}
                            className="flex items-center gap-8 overflow-x-auto pb-10 snap-x snap-mandatory scroll-smooth hide-scrollbar px-4"
                        >
                            {[
                                "1000153834.jpg", "1000153840.jpg", "1000156086.jpg", "1000127744.jpg",
                                "1000134862.jpg", "1000128959.jpg", "1000128971.jpg", "1000128962.jpg",
                                "1000129473.jpg", "1000129472.jpg", "1000141695.jpg", "1000140347.jpg",
                                "1000127730.jpg", "1000160210.jpg", "1000134085.jpg", "1000160273.jpg",
                                "1000127753.jpg"
                            ].map((img, i) => (
                                <div
                                    key={i}
                                    className="flex-shrink-0 w-[280px] md:w-[350px] aspect-[4/5] rounded-[2.5rem] overflow-hidden shadow-2xl snap-center ring-1 ring-black/5 dark:ring-white/5 relative group/item"
                                >
                                    <img
                                        src={`https://img1.wsimg.com/isteam/ip/bdf6ba35-495f-402b-9add-1d7fe5046011/${img}/:/cr=t:0%25,l:0%25,w:100%25,h:100%25/rs=w:800,cg:true`}
                                        alt={`Transformation ${i + 1}`}
                                        className="w-full h-full object-cover transition-transform duration-[1.5s] group-hover/item:scale-110"
                                        loading="lazy"
                                    />
                                    {/* Subtle overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity duration-500" />
                                </div>
                            ))}
                        </div>

                        {/* Elegant Navigation Arrows */}
                        <div className="absolute top-1/2 -left-8 -translate-y-1/2 z-20 hidden xl:block">
                            <button
                                onClick={() => scroll("left")}
                                className="w-16 h-16 rounded-full bg-white dark:bg-slate-900 shadow-2xl flex items-center justify-center text-[#a319c5] border border-slate-100 dark:border-white/10 hover:scale-110 active:scale-95 transition-all group"
                                aria-label="Previous images"
                            >
                                <span className="material-icons group-hover:-translate-x-1 transition-transform">arrow_back</span>
                            </button>
                        </div>
                        <div className="absolute top-1/2 -right-8 -translate-y-1/2 z-20 hidden xl:block">
                            <button
                                onClick={() => scroll("right")}
                                className="w-16 h-16 rounded-full bg-white dark:bg-slate-900 shadow-2xl flex items-center justify-center text-[#a319c5] border border-slate-100 dark:border-white/10 hover:scale-110 active:scale-95 transition-all group"
                                aria-label="Next images"
                            >
                                <span className="material-icons group-hover:translate-x-1 transition-transform">arrow_forward</span>
                            </button>
                        </div>

                        {/* Modern Progress Bar (Subtle) */}
                        <div className="max-w-xs mx-auto h-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden mt-4">
                            <div className="h-full bg-[#a319c5] w-1/3 rounded-full opacity-50" />
                        </div>
                    </div>
                </div>

                {/* Bottom CTA */}
                <div className="text-center mt-20">
                    <p className="text-slate-500 dark:text-slate-400 mb-6 text-lg">Ready to start your transformation?</p>
                    <Link
                        href="/book"
                        className="inline-flex items-center gap-3 bg-[#a319c5] hover:bg-[#8b15a8] text-white px-12 py-5 rounded-full font-bold text-lg transition-all duration-300 shadow-xl shadow-[#a319c5]/30 hover:scale-105 active:scale-95"
                    >
                        <span className="material-icons">calendar_today</span>
                        Book Your Appointment
                        <span className="material-icons">arrow_forward</span>
                    </Link>
                </div>
            </section>

            {/* Modal */}
            {selectedStyle && (
                <StyleModal style={selectedStyle} onClose={() => setSelectedStyle(null)} />
            )}
        </main>
    );
}
