import { BlogPost } from "../../data/blogPosts";

/**
 * Calculates reading time in minutes based on word count.
 * Average reading speed: 200 words per minute.
 */
export function computeReadingTime(text: string): number {
    const wordsPerMinute = 200;
    const numberOfWords = text.split(/\s/g).length;
    return Math.ceil(numberOfWords / wordsPerMinute);
}

interface FilterOptions {
    query?: string;
    tag?: string;
    category?: string;
}

/**
 * Filters posts based on search query, tag, or category.
 */
export function filterPosts(posts: BlogPost[], options: FilterOptions): BlogPost[] {
    const { query, tag, category } = options;

    return posts.filter(post => {
        const matchesQuery = query
            ? post.title.toLowerCase().includes(query.toLowerCase()) ||
            post.excerpt.toLowerCase().includes(query.toLowerCase())
            : true;

        const matchesTag = tag
            ? post.tags.includes(tag)
            : true;

        const matchesCategory = category
            ? post.category === category
            : true;

        return matchesQuery && matchesTag && matchesCategory;
    });
}

/**
 * Gets a list of related posts based on tags and category.
 * Excludes the current post.
 */
export function getRelatedPosts(posts: BlogPost[], currentSlug: string, limit: number = 3): BlogPost[] {
    const currentPost = posts.find(p => p.slug === currentSlug);
    if (!currentPost) return [];

    return posts
        .filter(p => p.slug !== currentSlug)
        .map(p => {
            let score = 0;
            if (p.category === currentPost.category) score += 2;
            const sharedTags = p.tags.filter(tag => currentPost.tags.includes(tag));
            score += sharedTags.length;
            return { post: p, score };
        })
        .filter(p => p.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(p => p.post);
}
