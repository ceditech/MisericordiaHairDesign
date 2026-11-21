import { collection, query, orderBy, onSnapshot, doc, deleteDoc, setDoc, serverTimestamp, getDocs, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getDb, getStorageInstance } from "../client";
import type { Review } from "@/src/data/reviews";

const db = getDb();
const storage = getStorageInstance();

export interface BlogPost {
    id: string;
    title: string;
    slug: string;
    content: string;
    excerpt?: string;
    category: string;
    imageUrl?: string;
    author: string;
    tags?: string[];
    status: 'draft' | 'published';
    views: number;
    reads: number;
    publishedAt?: Timestamp;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// --- Reviews ---

export function subscribeToReviews(callback: (reviews: Review[]) => void) {
    const q = query(collection(db, "reviews"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
        const reviews = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }) as Review);
        callback(reviews);
    }, (error) => {
        console.error("Error subscribing to reviews:", error);
        callback([]); // Fallback to empty array
    });
}

export async function upsertReview(review: Partial<Review> & { createdAt?: unknown }) {
    const reviewRef = doc(db, "reviews", review.id ? String(review.id) : doc(collection(db, "reviews")).id);
    await setDoc(reviewRef, {
        ...review,
        updatedAt: serverTimestamp(),
        createdAt: review.createdAt || serverTimestamp()
    }, { merge: true });
}

export async function deleteReview(reviewId: string) {
    const reviewRef = doc(db, "reviews", reviewId);
    await deleteDoc(reviewRef);
}

// --- Blog ---

export function subscribeToBlogPosts(callback: (posts: BlogPost[]) => void) {
    const q = query(collection(db, "blogPosts"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
        const posts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as BlogPost[];
        callback(posts);
    }, (error) => {
        console.error("Error subscribing to blogPosts:", error);
    });
}

export async function upsertBlogPost(post: Partial<BlogPost> & { id?: string }) {
    const isNew = !post.id;
    const blogRef = isNew 
        ? doc(collection(db, "blogPosts")) 
        : doc(db, "blogPosts", post.id!);
    
    const data = {
        ...post,
        id: blogRef.id,
        updatedAt: serverTimestamp(),
        createdAt: post.createdAt || serverTimestamp()
    };
    
    if (post.status === 'published' && !post.publishedAt) {
        (data as Record<string, unknown>).publishedAt = serverTimestamp();
    }

    await setDoc(blogRef, data, { merge: true });
    return blogRef.id;
}

export async function deleteBlogPost(postId: string) {
    await deleteDoc(doc(db, "blogPosts", postId));
}

export async function getBlogStats() {
    const coll = collection(db, "blogPosts");
    const snapshot = await getDocs(coll);
    const posts = snapshot.docs.map(d => d.data() as BlogPost);
    
    const categories = new Set(posts.map(p => p.category));
    const totalViews = posts.reduce((sum, p) => sum + (p.views || 0), 0);
    const totalReads = posts.reduce((sum, p) => sum + (p.reads || 0), 0);
    
    return {
        totalPosts: posts.length,
        publishedPosts: posts.filter(p => p.status === 'published').length,
        categoriesCount: categories.size,
        totalViews,
        totalReads
    };
}

// --- Storage / Upload ---

export async function uploadFile(file: File, path: string): Promise<string> {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    return getDownloadURL(snapshot.ref);
}
