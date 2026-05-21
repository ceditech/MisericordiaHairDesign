"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { BLOG_POSTS, BlogCategory } from "@/data/blogPosts";
import { filterPosts } from "@/lib/blog/blogUtils";
import { Button, Input, Badge, Card, useToast } from "@/components/ui";

export default function BlogPage() {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<BlogCategory | "All">("All");
    const [visibleCount, setVisibleCount] = useState(6);
    const [newsletterEmail, setNewsletterEmail] = useState("");
    const [isSubmittingNewsletter, setIsSubmittingNewsletter] = useState(false);
    const { showToast } = useToast();

    const categories: (BlogCategory | "All")[] = ["All", "Trends", "Care Tips", "Tutorials", "Lifestyle"];

    const filteredPosts = useMemo(() => {
        return filterPosts(BLOG_POSTS, {
            query: searchQuery,
            category: selectedCategory === "All" ? undefined : selectedCategory
        });
    }, [searchQuery, selectedCategory]);

    const featuredPost = filteredPosts[0];
    const displayPosts = filteredPosts.slice(1, visibleCount);
    const hasMore = visibleCount < filteredPosts.length;

    const handleNewsletterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newsletterEmail || !newsletterEmail.includes("@")) {
            showToast("Please enter a valid email address.", "error");
            return;
        }

        setIsSubmittingNewsletter(true);
        setTimeout(() => {
            setIsSubmittingNewsletter(false);
            setNewsletterEmail("");
            showToast("You've successfully joined the Braid Diary newsletter.", "success");
        }, 1500);
    };

    return (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            {/* Header */}
            <div className="text-center mb-16">
                <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-4">The Braid Diary</h1>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                    Expert braiding tips, style inspiration, and professional secrets for flawless African American braiding.
                </p>
            </div>

            {/* Filters & Search */}
            <div className="mb-12 flex flex-col md:flex-row gap-6 items-center justify-between bg-surface p-6 rounded-2xl shadow-sm border border-border">
                <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${selectedCategory === cat
                                ? "bg-brand-primary text-white"
                                : "bg-slate-100 dark:bg-slate-800 text-text-secondary hover:bg-brand-primary/10"
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
                <div className="relative w-full md:w-80">
                    <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">search</span>
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search posts..."
                        className="pl-10 rounded-full"
                    />
                </div>
            </div>

            {filteredPosts.length === 0 ? (
                <div className="text-center py-20 bg-surface/50 rounded-3xl border-2 border-dashed border-border">
                    <span className="material-icons text-6xl text-text-muted mb-4">search_off</span>
                    <h2 className="text-2xl font-bold text-text-primary">No posts found</h2>
                    <p className="text-text-muted mt-2">Try adjusting your search or filters.</p>
                    <Button
                        variant="secondary"
                        onClick={() => { setSearchQuery(""); setSelectedCategory("All"); }}
                        className="mt-6"
                    >
                        Clear all filters
                    </Button>
                </div>
            ) : (
                <>
                    {/* Featured Post */}
                    {featuredPost && (
                        <div className="mb-16">
                            <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-all group">
                                <div className="grid md:grid-cols-2 gap-0">
                                    <div className="relative h-64 md:h-auto overflow-hidden">
                                        <img
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            alt={featuredPost.title}
                                            src={featuredPost.coverImage}
                                        />
                                        <div className="absolute top-4 left-4">
                                            <Badge variant="default" className="bg-brand-primary text-white">Featured</Badge>
                                        </div>
                                    </div>
                                    <div className="p-8 flex flex-col justify-center">
                                        <Badge variant="default" className="mb-3 w-fit">
                                            {featuredPost.category}
                                        </Badge>
                                        <h2 className="text-3xl font-bold text-text-primary mb-4 group-hover:text-brand-primary transition-colors line-clamp-2">
                                            {featuredPost.title}
                                        </h2>
                                        <p className="text-text-secondary mb-6 line-clamp-3">{featuredPost.excerpt}</p>
                                        <div className="flex items-center justify-between mt-auto">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-brand-primary/10 flex items-center justify-center text-brand-primary font-bold">
                                                    {featuredPost.authorName.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-text-primary">{featuredPost.authorName}</p>
                                                    <p className="text-xs text-text-muted">{new Date(featuredPost.dateISO).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <Link
                                                href={`/blog/${featuredPost.slug}`}
                                                className="text-brand-primary font-bold flex items-center gap-1 hover:gap-2 transition-all"
                                            >
                                                Read More <span className="material-icons text-sm">arrow_forward</span>
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* Blog Grid */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {displayPosts.map((post) => (
                            <Card
                                key={post.id}
                                className="overflow-hidden hover:shadow-xl transition-all group flex flex-col h-full"
                            >
                                <div className="relative h-48 overflow-hidden">
                                    <img
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        alt={post.title}
                                        src={post.coverImage}
                                    />
                                    <div className="absolute top-3 left-3">
                                        <Badge className="bg-surface/90 text-brand-primary backdrop-blur-sm">
                                            {post.category}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="p-6 flex flex-col flex-1">
                                    <h3 className="text-xl font-bold text-text-primary mb-3 group-hover:text-brand-primary transition-colors line-clamp-2">
                                        {post.title}
                                    </h3>
                                    <p className="text-text-secondary text-sm mb-4 line-clamp-3">
                                        {post.excerpt}
                                    </p>
                                    <div className="flex items-center justify-between pt-4 mt-auto border-t border-border">
                                        <div className="flex items-center gap-2 text-xs text-text-muted">
                                            <span className="material-icons text-xs">schedule</span>
                                            {post.readingTimeMins} min read
                                        </div>
                                        <Link
                                            href={`/blog/${post.slug}`}
                                            className="text-brand-primary text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all"
                                        >
                                            Read <span className="material-icons text-xs">arrow_forward</span>
                                        </Link>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>

                    {/* Load More */}
                    {hasMore && (
                        <div className="mt-16 text-center">
                            <Button
                                variant="secondary"
                                onClick={() => setVisibleCount(prev => prev + 3)}
                                className="px-12 py-6 rounded-2xl border-2 border-[#a319c5]/20 hover:border-[#a319c5]"
                            >
                                Load More Posts
                            </Button>
                        </div>
                    )}
                </>
            )}

            {/* Newsletter Section */}
            <div className="mt-24 bg-[#a319c5] rounded-3xl p-8 md:p-16 text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
                <div className="relative z-10 max-w-2xl mx-auto text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">Stay in the Loop</h2>
                    <p className="text-purple-100 mb-8">
                        Get the latest styling tips, hair care guides, and exclusive offers delivered straight to your inbox.
                    </p>
                    <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-4">
                        <Input
                            type="email"
                            placeholder="Enter your email"
                            value={newsletterEmail}
                            onChange={(e) => setNewsletterEmail(e.target.value)}
                            className="bg-white/20 border-white/30 text-white placeholder:text-purple-200 focus:bg-white focus:text-slate-900 rounded-2xl py-6 h-auto"
                            required
                        />
                        <Button
                            type="submit"
                            disabled={isSubmittingNewsletter}
                            className="bg-white text-[#a319c5] hover:bg-purple-50 rounded-2xl py-6 px-8 h-auto font-bold shadow-lg"
                        >
                            {isSubmittingNewsletter ? "Joining..." : "Join the Diary"}
                        </Button>
                    </form>
                    <p className="mt-4 text-xs text-purple-200">
                        By subscribing, you agree to our Privacy Policy. No spam, just beautiful hair.
                    </p>
                </div>
            </div>
        </main>
    );
}
