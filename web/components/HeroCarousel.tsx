"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BRAID_STYLES, BraidStyle } from "@/lib/styles";
import { subscribeToStyles } from "@/src/lib/firebase/ownerService";

interface HeroItem {
    id: string;
    name: string;
    description: string;
    image: string;
    link: string;
}

export default function HeroCarousel() {
    const [styles, setStyles] = useState<BraidStyle[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    useEffect(() => {
        const unsubscribe = subscribeToStyles((data) => {
            setStyles(data);
        });
        return () => unsubscribe();
    }, []);

    const displayStyles = styles.length > 0 ? styles : BRAID_STYLES;

    // Combine main Hero image + 9 styles
    const heroItems: HeroItem[] = [
        {
            id: "featured-hero",
            name: "Featured Style: Long Knotless",
            description: "Natural-looking, tension-free braids starting at the root. Our signature style.",
            image: "https://storage.googleapis.com/misericordiahairdesign.firebasestorage.app/hero/Hero-Section-Braids.png",
            link: "/our-styles?style=knotless-braids"
        },
        ...displayStyles.map(style => ({
            id: style.id,
            name: style.name,
            description: style.description,
            image: style.image,
            link: `/our-styles?style=${style.id}`
        }))
    ];

    useEffect(() => {
        if (isPaused) return;

        const interval = setInterval(() => {
            setCurrentIndex((prevIndex) => (prevIndex + 1) % heroItems.length);
        }, 5000); // 5 seconds rotation interval

        return () => clearInterval(interval);
    }, [isPaused, heroItems.length]);

    const handlePrev = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setCurrentIndex((prev) => (prev - 1 + heroItems.length) % heroItems.length);
    };

    const handleNext = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setCurrentIndex((prev) => (prev + 1) % heroItems.length);
    };

    return (
        <div 
            className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-surface aspect-[4/5] w-full select-none group/carousel"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            {/* Slides */}
            <div className="relative w-full h-full bg-slate-900">
                {heroItems.map((item, index) => {
                    const isActive = index === currentIndex;
                    return (
                        <Link
                            key={item.id}
                            href={item.link}
                            className={`absolute inset-0 block transition-all duration-1000 ease-in-out ${
                                isActive ? "opacity-100 z-10 pointer-events-auto scale-100" : "opacity-0 z-0 pointer-events-none scale-95"
                            }`}
                        >
                            <img
                                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                                alt={item.name}
                                src={item.image}
                            />
                            {/* Slide Overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent flex flex-col justify-end p-6 md:p-8">
                                <span className="bg-brand-primary text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest shadow-lg self-start mb-3">
                                    {index === 0 ? "Featured Style" : "Style Showcase"}
                                </span>
                                <h3 className="text-2xl md:text-3xl font-extrabold text-white mb-2 leading-tight">
                                    {item.name}
                                </h3>
                                <p className="text-sm md:text-base text-white/80 line-clamp-2 leading-relaxed">
                                    {item.description}
                                </p>
                                <span className="mt-4 text-brand-primary text-xs font-bold flex items-center gap-1">
                                    Click to view details <span className="material-icons text-xs">arrow_forward</span>
                                </span>
                            </div>
                        </Link>
                    );
                })}
            </div>

            {/* Manual Controls */}
            <button
                onClick={handlePrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-all opacity-0 group-hover/carousel:opacity-100"
                aria-label="Previous image"
            >
                <span className="material-icons">chevron_left</span>
            </button>
            <button
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-all opacity-0 group-hover/carousel:opacity-100"
                aria-label="Next image"
            >
                <span className="material-icons">chevron_right</span>
            </button>

            {/* Slide Indicators */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
                {heroItems.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => setCurrentIndex(index)}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${
                            index === currentIndex ? "bg-brand-primary w-5" : "bg-white/50 hover:bg-white/80"
                        }`}
                        aria-label={`Go to slide ${index + 1}`}
                    />
                ))}
            </div>
        </div>
    );
}
