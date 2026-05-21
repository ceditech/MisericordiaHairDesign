"use client";

import React, { useState } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

import { subscribeToReviews } from "@/src/lib/firebase/ownerService";
import { Review, REVIEWS } from "@/src/data/reviews";
import { Skeleton } from "@/components/ui";

const GoogleIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={cn("w-5 h-5", className)} xmlns="http://www.w3.org/2000/svg">
        <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
        />
        <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
        />
        <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
            fill="#FBBC05"
        />
        <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
        />
    </svg>
);

const StarIcon = ({ filled }: { filled: boolean }) => (
    <svg
        viewBox="0 0 24 24"
        className={cn("w-4 h-4", filled ? "text-[#fbbc05] fill-[#fbbc05]" : "text-slate-300 fill-slate-300")}
        xmlns="http://www.w3.org/2000/svg"
    >
        <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
);

export default function Reviews() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);

    // Subscribe to reviews
    React.useEffect(() => {
        const unsubscribe = subscribeToReviews((data) => {
            setReviews(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const displayReviews = reviews.length > 0 ? reviews : REVIEWS;
    const carouselRef = React.useRef<HTMLDivElement>(null);

    // Auto-play
    React.useEffect(() => {
        const timer = setInterval(() => {
            if (carouselRef.current) {
                const cardWidth = carouselRef.current.firstElementChild?.clientWidth || 300;
                // If we've reached the end, loop back
                if (carouselRef.current.scrollLeft + carouselRef.current.clientWidth >= carouselRef.current.scrollWidth - 10) {
                    carouselRef.current.scrollTo({ left: 0, behavior: 'smooth' });
                } else {
                    carouselRef.current.scrollBy({ left: cardWidth + 24, behavior: 'smooth' }); // 24 is gap-6
                }
            }
        }, 5000);
        return () => clearInterval(timer);
    }, []);

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
        <section className="py-24 text-white overflow-hidden relative min-h-[800px] flex items-center">
            {/* Background Image with Overlay */}
            <div
                className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: 'url("/images/dedesbraids-salon-bg.jpeg")' }}
            >
                <div className="absolute inset-0 bg-black/50 backdrop-blur-[3px]" />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
                <div className="text-center mb-16">
                    <h2 className="text-5xl lg:text-6xl font-extrabold mb-10 tracking-tight text-white drop-shadow-sm">
                        Reviews
                    </h2>

                    {/* Google Rating Badge */}
                    <a
                        href="https://www.google.com/maps?cid=10361914258646800053"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-4 bg-white/10 backdrop-blur-md rounded-full px-6 py-4 border border-white/20 shadow-xl mx-auto hover:bg-white/20 transition-all active:scale-95 group/badge"
                    >
                        <div className="flex items-center justify-center w-12 h-12 bg-white rounded-full transition-transform group-hover/badge:scale-110">
                            <GoogleIcon className="w-6 h-6" />
                        </div>
                        <div className="flex flex-col items-start leading-tight">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl font-bold">4.8</span>
                                <div className="flex">
                                    {[...Array(5)].map((_, i) => (
                                        <StarIcon key={i} filled={true} />
                                    ))}
                                </div>
                            </div>
                            <div className="flex flex-col items-start">
                                <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Dede's Braids</span>
                                <span className="text-[10px] font-medium opacity-60">77 Reviews</span>
                            </div>
                        </div>
                    </a>
                </div>

                <div className="relative group">
                    {/* Navigation Arrows */}
                    <button
                        onClick={scrollPrev}
                        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 lg:-translate-x-12 z-20 p-2 text-white/50 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-full"
                        aria-label="Previous review"
                    >
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    <button
                        onClick={scrollNext}
                        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 lg:translate-x-12 z-20 p-2 text-white/50 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-full"
                        aria-label="Next review"
                    >
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>

                    {/* Reviews Slider Container */}
                    <div className="relative -mx-4 sm:mx-0">
                        <div
                            ref={carouselRef}
                            className="flex overflow-x-auto snap-x snap-mandatory px-4 sm:px-0 gap-6 no-scrollbar pb-8 pt-4 -mt-4"
                        >
                            {displayReviews.map((review) => (
                                <div
                                    key={review.id}
                                    className="bg-surface rounded-[2rem] p-8 flex flex-col items-center text-center shadow-2xl transition-transform hover:-translate-y-1 shrink-0 snap-start w-[85vw] sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]"
                                >
                                    {/* Avatar */}
                                    <div className={cn("w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-white mb-6", review.avatarColor)}>
                                        {review.initial}
                                    </div>

                                    {/* Stars */}
                                    <div className="flex gap-1 mb-6">
                                        {[...Array(5)].map((_, i) => (
                                            <StarIcon key={i} filled={i < review.rating} />
                                        ))}
                                    </div>

                                    {/* Review Text */}
                                    <p className="text-text-secondary text-sm italic leading-relaxed mb-6 flex-grow">
                                        "{review.text}"
                                    </p>

                                    {/* Read more */}
                                    <button className="text-text-primary text-xs font-bold flex items-center gap-1 mb-8 hover:opacity-70 transition-opacity">
                                        Read full review <span className="text-[10px]">›</span>
                                    </button>

                                    {/* Footer */}
                                    <div className="flex items-center gap-2 justify-center w-full">
                                        <GoogleIcon className="w-4 h-4" />
                                        <span className="text-[11px] font-bold text-text-primary">{review.name} – {review.date}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-center gap-2 mt-4 sm:mt-12">
                        {/* We've removed the manual dot pagination in favor of native scroll-snap which is much smoother on mobile */}
                    </div>
                </div>
            </div>
        </section>
    );
}
