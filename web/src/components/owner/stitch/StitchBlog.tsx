"use client";

import React, { useState, useEffect } from "react";
import { 
    subscribeToBlogPosts, upsertBlogPost, deleteBlogPost, getBlogStats, uploadFile,
    type BlogPost 
} from "@/src/lib/firebase/ownerService";
import { 
    FileText, Plus, Trash2, Edit3, Save, X, Calendar, User, Eye, 
    MessageSquare, TrendingUp, Search, Filter, Image as ImageIcon,
    Upload
} from "lucide-react";

export default function StitchBlog() {
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalPosts: 0, totalViews: 0, draftCount: 0, publishedCount: 0 });
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState<"all" | "published" | "draft">("all");

    // Editor state
    const [isAdding, setIsAdding] = useState(false);
    const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
    const [viewingPost, setViewingPost] = useState<BlogPost | null>(null);
    const [formData, setFormData] = useState<Partial<BlogPost>>({
        title: "", content: "", author: "Dede", status: "draft", category: "Styling Tips", views: 0, reads: 0
    });
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const unsub = subscribeToBlogPosts((data) => {
            setPosts(data);
            setLoading(false);
            
            // Calculate stats locally or fetch from service
            const s = data.reduce((acc: any, p: any) => ({
                totalPosts: acc.totalPosts + 1,
                totalViews: acc.totalViews + (p.views || 0),
                draftCount: acc.draftCount + (p.status === "draft" ? 1 : 0),
                publishedCount: acc.publishedCount + (p.status === "published" ? 1 : 0)
            }), { totalPosts: 0, totalViews: 0, draftCount: 0, publishedCount: 0 });
            setStats(s);
        });

        return () => unsub();
    }, []);

    const handleSave = async () => {
        if (!formData.title || !formData.content) return;
        setSaving(true);
        try {
            const id = editingPost?.id || `blog_${Date.now()}`;
            let imageUrl = formData.imageUrl;
            
            if (imageFile) {
                imageUrl = await uploadFile(imageFile, `blog/${id}_${Date.now()}`);
            }

            const slug = formData.slug || formData.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

            const postData: Partial<BlogPost> = {
                ...formData,
                id,
                slug,
                imageUrl,
                excerpt: formData.excerpt || formData.content?.substring(0, 150) + "..."
            };

            await upsertBlogPost(postData as BlogPost);
            setIsAdding(false);
            setEditingPost(null);
            setFormData({ title: "", content: "", author: "Dede", status: "draft", category: "Styling Tips", views: 0, reads: 0 });
            setImageFile(null);
        } catch (err) {
            console.error("Error saving blog post:", err);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this post? This action cannot be undone.")) return;
        try {
            await deleteBlogPost(id);
        } catch (err) {
            console.error("Error deleting blog post:", err);
        }
    };

    const filteredPosts = posts.filter(p => {
        const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             p.author.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filterStatus === "all" || p.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    if (loading) return <div className="p-8 text-center text-slate-500 font-bold">Loading blog management...</div>;

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-extrabold font-headline tracking-tight text-slate-900 dark:text-white">Blog Management</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Create and manage your shop's content, styling tips, and updates.</p>
                </div>
                <button 
                    onClick={() => { setIsAdding(true); setFormData({ title: "", content: "", author: "Dede", status: "draft", category: "Styling Tips" }); }}
                    className="flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#6b38d4] to-[#8455ef] text-white font-bold shadow-lg shadow-[#8455ef]/20 hover:scale-105 active:scale-95 transition-all w-fit"
                >
                    <Plus size={18} /> New Blog Post
                </button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Total Posts", value: stats.totalPosts, icon: <FileText size={20} />, color: "text-blue-600" },
                    { label: "Published", value: stats.publishedCount, icon: <Eye size={20} />, color: "text-emerald-600" },
                    { label: "Drafts", value: stats.draftCount, icon: <Save size={20} />, color: "text-amber-600" },
                    { label: "Total Views", value: stats.totalViews, icon: <TrendingUp size={20} />, color: "text-purple-600" }
                ].map((stat, i) => (
                    <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 rounded-xl bg-slate-50 dark:bg-slate-800 ${stat.color}`}>{stat.icon}</div>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{stat.label}</p>
                        </div>
                        <p className="text-3xl font-black font-headline text-slate-900 dark:text-white">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800">
                <div className="relative w-full sm:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search posts..." 
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-[#6b38d4]"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Filter size={18} className="text-slate-400 mr-1" />
                    <div className="flex bg-slate-50 dark:bg-slate-800 p-1 rounded-xl">
                        {(["all", "published", "draft"] as const).map(s => (
                            <button
                                key={s}
                                onClick={() => setFilterStatus(s)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${filterStatus === s ? "bg-white dark:bg-slate-700 text-[#6b38d4] shadow-sm" : "text-slate-500"}`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Posts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPosts.map(post => (
                    <div key={post.id} className="group bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col">
                        <div className="h-48 bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                            {post.imageUrl ? (
                                <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                    <ImageIcon size={48} />
                                </div>
                            )}
                            <div className="absolute top-4 left-4">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${post.status === "published" ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"}`}>
                                    {post.status}
                                </span>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                                <button 
                                    onClick={() => setViewingPost(post)}
                                    className="w-full py-2.5 bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-white/30"
                                >
                                    <Eye size={14} /> Quick View
                                </button>
                            </div>
                        </div>
                        <div className="p-6 flex-1 flex flex-col space-y-4">
                            <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    <span>{post.category || "General"}</span>
                                    <span>•</span>
                                    <span>{post.createdAt?.toDate ? post.createdAt.toDate().toLocaleDateString() : new Date(post.createdAt as any).toLocaleDateString()}</span>
                                </div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white line-clamp-2 group-hover:text-[#6b38d4] transition-colors">
                                    {post.title}
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                                    {post.excerpt || post.content.substring(0, 100) + "..."}
                                </p>
                            </div>
                            
                            <div className="pt-4 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
                                <div className="flex items-center gap-4 text-slate-400">
                                    <span className="flex items-center gap-1 text-xs"><Eye size={14} /> {post.views || 0}</span>
                                    <span className="flex items-center gap-1 text-xs"><MessageSquare size={14} /> {post.reads || 0}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => { setEditingPost(post); setFormData({ ...post }); setIsAdding(true); }}
                                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-[#6b38d4] transition-all"
                                    >
                                        <Edit3 size={18} />
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(post.id)}
                                        className="p-2.5 rounded-xl bg-red-50 dark:bg-red-900/10 text-slate-400 hover:text-red-500 transition-all"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                
                {filteredPosts.length === 0 && (
                    <div className="col-span-full py-24 text-center bg-white dark:bg-slate-900 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-700">
                        <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                            <FileText size={40} className="text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">No posts found</h3>
                        <p className="text-slate-500 dark:text-slate-400 mt-2">Start creating content to engage with your customers.</p>
                        <button 
                            onClick={() => setIsAdding(true)}
                            className="mt-8 px-8 py-3 bg-[#6b38d4] text-white font-bold rounded-full shadow-lg hover:bg-[#8455ef] transition-all"
                        >
                            Create First Post
                        </button>
                    </div>
                )}
            </div>

            {/* Editor Modal */}
            {(isAdding || editingPost) && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                            <div>
                                <h3 className="text-2xl font-extrabold font-headline text-slate-900 dark:text-white">
                                    {editingPost ? "Edit Blog Post" : "Create New Post"}
                                </h3>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                                    {editingPost ? `Editing: ${editingPost.id}` : "Drafting a new entry"}
                                </p>
                            </div>
                            <button onClick={() => { setIsAdding(false); setEditingPost(null); }} className="text-slate-400 hover:text-slate-900 p-3 bg-white dark:bg-slate-700 rounded-2xl shadow-sm transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Post Title *</label>
                                        <input 
                                            type="text" 
                                            placeholder="e.g. 5 Tips for Long-Lasting Braids" 
                                            className="w-full rounded-2xl py-3.5 px-5 bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-[#6b38d4] text-slate-900 dark:text-white text-base font-bold"
                                            value={formData.title}
                                            onChange={(e) => setFormData(d => ({ ...d, title: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Slug (URL Path)</label>
                                        <input 
                                            type="text" 
                                            placeholder="e.g. 5-tips-for-longevity" 
                                            className="w-full rounded-2xl py-3 px-5 bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-[#6b38d4] text-slate-900 dark:text-white text-sm"
                                            value={formData.slug}
                                            onChange={(e) => setFormData(d => ({ ...d, slug: e.target.value }))}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Category</label>
                                            <select 
                                                className="w-full rounded-2xl py-3.5 px-5 bg-slate-50 dark:bg-slate-800 border-none text-sm font-bold focus:ring-2 focus:ring-[#6b38d4]"
                                                value={formData.category}
                                                onChange={(e) => setFormData(d => ({ ...d, category: e.target.value }))}
                                            >
                                                <option>Styling Tips</option>
                                                <option>Hair Care</option>
                                                <option>Shop News</option>
                                                <option>Tutorials</option>
                                                <option>Trends</option>
                                                <option>Care Tips</option>
                                                <option>Lifestyle</option>
                                                <option>Maintenance</option>
                                                <option>Products</option>
                                                <option>Customer Stories</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Status</label>
                                            <select 
                                                className="w-full rounded-2xl py-3.5 px-5 bg-slate-50 dark:bg-slate-800 border-none text-sm font-bold focus:ring-2 focus:ring-[#6b38d4]"
                                                value={formData.status}
                                                onChange={(e) => setFormData(d => ({ ...d, status: e.target.value as any }))}
                                            >
                                                <option value="draft">Draft</option>
                                                <option value="published">Published</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Featured Image</label>
                                        <div className="flex items-center justify-center w-full">
                                            <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[2rem] cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all overflow-hidden group">
                                                {imageFile ? (
                                                    <div className="w-full h-full relative">
                                                        <img src={URL.createObjectURL(imageFile)} className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <p className="text-white font-bold text-xs">Change Image</p>
                                                        </div>
                                                    </div>
                                                ) : formData.imageUrl ? (
                                                    <div className="w-full h-full relative">
                                                        <img src={formData.imageUrl} className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <p className="text-white font-bold text-xs">Change Image</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                        <Upload className="w-10 h-10 mb-3 text-slate-300" />
                                                        <p className="text-sm text-slate-500 font-bold">Drop your image here</p>
                                                        <p className="text-xs text-slate-400 mt-1">PNG, JPG or WEBP (MAX. 5MB)</p>
                                                    </div>
                                                )}
                                                <input type="file" className="hidden" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                                            </label>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Tags (Comma separated)</label>
                                        <input 
                                            type="text" 
                                            placeholder="e.g. Summer, Braid Care, New Arrival" 
                                            className="w-full rounded-2xl py-3.5 px-5 bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-[#6b38d4] text-slate-900 dark:text-white text-sm"
                                            value={formData.tags?.join(", ")}
                                            onChange={(e) => setFormData(d => ({ ...d, tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean) }))}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-4 flex flex-col">
                                    <div className="space-y-1.5 flex-1 flex flex-col">
                                        <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Content *</label>
                                        <textarea 
                                            placeholder="Write your blog post content here..." 
                                            className="w-full flex-1 rounded-2xl py-4 px-5 bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-[#6b38d4] text-slate-900 dark:text-white text-sm font-medium leading-relaxed resize-none"
                                            value={formData.content}
                                            onChange={(e) => setFormData(d => ({ ...d, content: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Excerpt (Optional)</label>
                                        <textarea 
                                            placeholder="A short summary for previews..." 
                                            className="w-full h-24 rounded-2xl py-3 px-5 bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-[#6b38d4] text-slate-900 dark:text-white text-sm resize-none"
                                            value={formData.excerpt}
                                            onChange={(e) => setFormData(d => ({ ...d, excerpt: e.target.value }))}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-end gap-3">
                            <button 
                                onClick={() => { setIsAdding(false); setEditingPost(null); }}
                                className="px-8 py-3.5 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSave}
                                disabled={saving || !formData.title || !formData.content}
                                className="px-10 py-3.5 bg-[#6b38d4] text-white font-bold rounded-2xl shadow-lg hover:bg-[#8455ef] disabled:opacity-50 transition-all flex items-center gap-2"
                            >
                                {saving ? "Saving..." : (editingPost ? "Update Post" : "Publish Entry")}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick View Modal */}
            {viewingPost && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="w-full max-w-3xl max-h-[85vh] bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                        <div className="h-72 bg-slate-200 relative">
                            {viewingPost.imageUrl ? (
                                <img src={viewingPost.imageUrl} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-100 to-indigo-100 text-[#6b38d4]">
                                    <ImageIcon size={80} />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-10">
                                <span className="px-4 py-1.5 bg-white/20 backdrop-blur-md text-white rounded-full text-[10px] font-black uppercase tracking-widest w-fit mb-4 border border-white/30">
                                    {viewingPost.category}
                                </span>
                                <h3 className="text-4xl font-black text-white font-headline leading-tight">
                                    {viewingPost.title}
                                </h3>
                            </div>
                            <button onClick={() => setViewingPost(null)} className="absolute top-6 right-6 p-3 bg-black/40 backdrop-blur-md text-white hover:bg-black/60 rounded-2xl transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-10">
                            <div className="flex items-center gap-6 mb-8 text-slate-400">
                                <div className="flex items-center gap-2 font-bold text-xs">
                                    <User size={16} className="text-[#6b38d4]" /> {viewingPost.author}
                                </div>
                                <div className="flex items-center gap-2 font-bold text-xs">
                                    <Calendar size={16} className="text-[#6b38d4]" /> {viewingPost.createdAt?.toDate ? viewingPost.createdAt.toDate().toLocaleDateString(undefined, { dateStyle: 'long' }) : new Date(viewingPost.createdAt as any).toLocaleDateString()}
                                </div>
                                <div className="flex items-center gap-2 font-bold text-xs">
                                    <Eye size={16} className="text-[#6b38d4]" /> {viewingPost.views || 0} views
                                </div>
                            </div>
                            
                            <div className="prose prose-slate dark:prose-invert max-w-none">
                                {viewingPost.content.split('\n').map((para, i) => (
                                    <p key={i} className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed mb-4">
                                        {para}
                                    </p>
                                ))}
                            </div>
                        </div>
                        
                        <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                            <button 
                                onClick={() => { setEditingPost(viewingPost); setFormData({ ...viewingPost }); setViewingPost(null); }}
                                className="flex items-center gap-2 font-bold text-[#6b38d4] hover:underline"
                            >
                                <Edit3 size={18} /> Edit this post
                            </button>
                            <button 
                                onClick={() => setViewingPost(null)}
                                className="px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-2xl shadow-lg transition-transform hover:scale-105"
                            >
                                Close Preview
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
