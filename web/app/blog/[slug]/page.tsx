"use client";

import { use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BLOG_POSTS } from "@/data/blogPosts";
import { getRelatedPosts } from "@/lib/blog/blogUtils";
import { Button, Badge, Card, useToast } from "@/components/ui";

export default function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    const post = BLOG_POSTS.find((p) => p.slug === slug);
    const { showToast } = useToast();

    if (!post) {
        notFound();
    }

    const relatedPosts = getRelatedPosts(BLOG_POSTS, slug, 3);

    const handleCopyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        showToast("Link copied to clipboard!", "success");
    };

    return (
        <main className="max-w-4xl mx-auto px-4 py-16">
            {/* Header */}
            <div className="mb-12">
                <Link
                    href="/blog"
                    className="text-[#a319c5] font-semibold flex items-center gap-1 mb-8 w-fit hover:gap-2 transition-all group"
                >
                    <span className="material-icons text-sm group-hover:-translate-x-1 transition-transform">arrow_back</span>
                    Back to Blog
                </Link>

                <Badge className="mb-4 bg-[#a319c5] text-white">
                    {post.category}
                </Badge>

                <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 dark:text-white my-6 leading-tight">
                    {post.title}
                </h1>

                <div className="flex flex-wrap items-center gap-6 text-slate-500 border-b border-slate-100 dark:border-slate-800 pb-8 mt-10">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-[#a319c5]/10 flex items-center justify-center text-[#a319c5] font-bold text-xl">
                            {post.authorName.charAt(0)}
                        </div>
                        <div>
                            <p className="text-slate-900 dark:text-white font-bold">{post.authorName}</p>
                            <p className="text-sm">Expert Stylist</p>
                        </div>
                    </div>
                    <div className="hidden sm:block h-8 w-px bg-slate-200 dark:bg-slate-800"></div>
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                            <span className="material-icons text-sm">calendar_today</span>
                            {new Date(post.dateISO).toLocaleDateString("en-US", {
                                month: "long",
                                day: "numeric",
                                year: "numeric"
                            })}
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <span className="material-icons text-sm">schedule</span>
                            {post.readingTimeMins} min read
                        </div>
                    </div>

                    <div className="ml-auto flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={handleCopyLink} className="rounded-full text-[#a319c5]">
                            <span className="material-icons text-lg">share</span>
                            Share
                        </Button>
                    </div>
                </div>
            </div>

            {/* Featured Image */}
            <div className="mb-12">
                <img
                    className="w-full h-[400px] md:h-[500px] object-cover rounded-3xl shadow-2xl"
                    alt={post.title}
                    src={post.coverImage}
                />
            </div>

            {/* Content */}
            <div className="prose prose-lg dark:prose-invert max-w-none">
                {post.content.split('\n').map((line, i) => {
                    const trimmed = line.trim();
                    if (!trimmed) return <br key={i} />;
                    if (trimmed.startsWith('##')) {
                        return <h2 key={i} className="text-3xl font-bold text-slate-900 dark:text-white mt-12 mb-6">{trimmed.replace('##', '').trim()}</h2>;
                    }
                    return <p key={i} className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed mb-6">{trimmed}</p>;
                })}
            </div>

            {/* Tags */}
            <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800">
                <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                        <span key={tag} className="px-4 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-sm rounded-full font-medium">
                            #{tag}
                        </span>
                    ))}
                </div>
            </div>

            {/* CTA */}
            <div className="mt-16 bg-[#a319c5] rounded-3xl p-8 md:p-12 text-center text-white relative overflow-hidden">
                <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-2xl"></div>
                <h3 className="text-2xl md:text-3xl font-bold mb-4 relative z-10">
                    Ready to Try This Look?
                </h3>
                <p className="text-purple-100 mb-8 relative z-10 max-w-lg mx-auto">
                    Book your appointment with our expert stylists today and get the professional touch your hair deserves.
                </p>
                <Link
                    href="/book"
                    className="inline-flex items-center gap-2 bg-white text-[#a319c5] px-10 py-4 rounded-2xl font-bold hover:bg-purple-50 transition-all shadow-xl hover:-translate-y-1"
                >
                    Book Your Session
                    <span className="material-icons text-sm">arrow_forward</span>
                </Link>
            </div>

            {/* Related Posts */}
            {relatedPosts.length > 0 && (
                <div className="mt-24">
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 flex items-center gap-3">
                        <span className="w-1.5 h-8 bg-[#a319c5] rounded-full"></span>
                        Related Stories
                    </h3>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {relatedPosts.map((rp) => (
                            <Link key={rp.id} href={`/blog/${rp.slug}`} className="group h-full">
                                <Card className="overflow-hidden border-none shadow-sm group-hover:shadow-md transition-all h-full flex flex-col">
                                    <div className="relative h-40 overflow-hidden">
                                        <img
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            alt={rp.title}
                                            src={rp.coverImage}
                                        />
                                    </div>
                                    <div className="p-4 flex flex-col flex-1">
                                        <Badge className="mb-2 w-fit bg-[#a319c5]/5 text-[#a319c5] lowercase tracking-normal">
                                            {rp.category}
                                        </Badge>
                                        <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-[#a319c5] transition-colors line-clamp-2">
                                            {rp.title}
                                        </h4>
                                    </div>
                                </Card>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </main>
    );
}
