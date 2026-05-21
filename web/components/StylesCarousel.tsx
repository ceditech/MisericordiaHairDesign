"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { BRAID_STYLES, BraidStyle } from "@/lib/styles";
import { subscribeToStyles } from "@/src/lib/firebase/ownerService";

export default function StylesCarousel() {
    const [styles, setStyles] = useState<BraidStyle[]>([]);
    const carouselRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const unsubscribe = subscribeToStyles((data) => {
            setStyles(data);
        });
        return () => unsubscribe();
    }, []);

    const displayStyles = styles.length > 0 ? styles : BRAID_STYLES;

    const scrollPrev = () => {
        if (carouselRef.current) {
            const cardWidth = carouselRef.current.firstElementChild?.clientWidth || 300;
            carouselRef.current.scrollBy({ left: -(cardWidth + 24), behavior: 'smooth' });
        }
    };
    
    const scrollNext = () => {
        if (carouselRef.current) {
            const cardWidth = carouselRef.current.firstElementChild?.clientWidth || 300;
            carouselRef.current.scrollBy({ left: cardWidth + 24, behavior: 'smooth' });
        }
    };

    return (
        <div className="relative">
            {/* Carousel Track */}
            <div className="relative -mx-4 sm:mx-0">
                <div
                    ref={carouselRef}
                    className="flex gap-4 sm:gap-6 lg:gap-8 overflow-x-auto snap-x snap-mandatory px-4 sm:px-0 pb-8 pt-4 -mt-4 no-scrollbar"
                >
                    {displayStyles.map((style) => (
                        <div
                            key={style.id}
                            className="group flex-shrink-0 w-[85vw] sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-21px)] snap-start bg-surface rounded-3xl overflow-hidden shadow-sm border border-border/50 transition-all duration-300 hover:shadow-2xl hover:shadow-brand-primary/10 hover:-translate-y-2"
                        >
                            <div className="relative overflow-hidden aspect-[4/5]">
                                <img
                                    src={style.image}
                                    alt={style.name}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                                {style.popular && (
                                    <div className="absolute top-4 left-4">
                                        <span className="bg-brand-primary text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest shadow-lg">
                                            Most Popular
                                        </span>
                                    </div>
                                )}
                                {/* Gradient overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            </div>
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-xl font-bold text-text-primary group-hover:text-brand-primary transition-colors">
                                        {style.name}
                                    </h3>
                                    <span className="text-brand-primary font-bold text-sm">{style.price}</span>
                                </div>
                                <p className="text-sm text-text-secondary mb-6 leading-relaxed">
                                    {style.description}
                                </p>
                                <div className="flex items-center justify-between pt-5 border-t border-border/50">
                                    <span className="flex items-center gap-1 text-xs font-semibold text-text-muted">
                                        <span className="material-icons text-sm">schedule</span>
                                        {style.duration}
                                    </span>
                                    <Link
                                        href={`/book?style=${style.id}`}
                                        className="text-brand-primary text-sm font-bold flex items-center gap-1 group-hover:gap-2 transition-all duration-200"
                                    >
                                        Book Now <span className="material-icons text-sm">arrow_forward</span>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Nav Controls */}
            <div className="flex items-center justify-end mt-4 sm:mt-10 pr-4 sm:pr-0">
                {/* Arrow Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={scrollPrev}
                        aria-label="Previous styles"
                        className="w-12 h-12 rounded-full border-2 border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white flex items-center justify-center transition-all duration-200"
                    >
                        <span className="material-icons text-sm">chevron_left</span>
                    </button>
                    <button
                        onClick={scrollNext}
                        aria-label="Next styles"
                        className="w-12 h-12 rounded-full border-2 border-brand-primary text-brand-primary hover:bg-brand-primary hover:text-white flex items-center justify-center transition-all duration-200"
                    >
                        <span className="material-icons text-sm">chevron_right</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
