export type BlogCategory = "Trends" | "Care Tips" | "Tutorials" | "Lifestyle";

export interface BlogPost {
    id: string;
    title: string;
    slug: string;
    dateISO: string;
    authorName: string;
    tags: string[];
    category: BlogCategory;
    excerpt: string;
    coverImage: string;
    content: string;
    readingTimeMins: number;
}

export const BLOG_POSTS: BlogPost[] = [
    {
        id: "1",
        title: "Top 5 Braiding Trends for the Summer Season",
        slug: "summer-braiding-trends-2024",
        dateISO: "2024-03-10T10:00:00Z",
        authorName: "MHDESIGNS",
        tags: ["Summer", "Trends", "Protective Styles"],
        category: "Trends",
        excerpt: "Discover the hottest braiding styles that will keep you cool and stylish all summer long. From bohemian vibes to sleek cornrows...",
        coverImage: "https://lh3.googleusercontent.com/aida-public/AB6AXuBILPKOcYhd2Fnm7BAoRGKAtESs_CT40jquvUJMAfFH5ipbZlhHCaDiTMgrijyVcJF0grj8wQUME7_YO5CKF-yNdoZCClg4AOg1lb9qnjjA6CXcehWjYcJAWO8adgGMSdM6PMtVluQrwvTPauDsVda9G5cRhvwA0NvM1nP3JdtmUMl9nmqJHi2Tr6ym9hK99QrnsDZ5_OIEUVCbxx2AdcN9KCbaQBKwSif_2RrBEAWeYqwmtXlREiDfZjt8IMsM2tea6_X_T6vcCA",
        readingTimeMins: 5,
        content: `
As summer approaches, it's time to refresh your look with the latest braiding trends. From bohemian vibes to sleek protective styles, this season offers something for everyone. Here are our top 5 picks for summer 2024.

## 1. Knotless Braids
Knotless braids continue to dominate as the go-to protective style. They're lighter, more natural-looking, and cause less tension on your scalp. Perfect for those long summer days!

## 2. Bohemian Box Braids
Add some texture and personality to your braids with curly extensions. This carefree style is perfect for beach days and summer festivals.

## 3. Fulani Braids
These tribal-inspired braids feature intricate patterns and often include beads or accessories. They're a stunning way to celebrate African heritage while staying stylish.

## 4. Goddess Locs
Soft, romantic, and effortlessly chic. Goddess locs give you that bohemian goddess vibe while protecting your natural hair.

## 5. Cornrow Updos
Keep cool with an elegant updo. Cornrow updos are versatile, practical, and absolutely stunning for formal summer events.
        `
    },
    {
        id: "2",
        title: "How to Care for Your Braids: A Complete Guide",
        slug: "braid-care-guide",
        dateISO: "2024-03-05T09:00:00Z",
        authorName: "MHDESIGNS",
        tags: ["Maintenance", "Hair Care", "Longevity"],
        category: "Care Tips",
        excerpt: "Learn the essential tips and tricks to maintain healthy, beautiful braids that last. From scalp hydration to nighttime routines...",
        coverImage: "https://lh3.googleusercontent.com/aida-public/AB6AXuD9W0FPV1RN_n7tTNLXcDKa3G4iAamGP2aO2jXo6jxkrL2FYopMM9vINapkUNI2Inuk8sibYvMLe4queNf-myrH66sCCiW-oop6sfum2sBYi6i84Ou3fgunEv1LjSL5yVuziW1Oo7Qhj96_8vUqTJziNAWnHTo1TvThUimKh9u56CyaY9l7-s6z8VLEJFUmF7pFcSen3BWqvSCXIuGCgn1h7Fi0yCy_yYsF5_POzmMf3Z2f3MPwVseOedYo779-zTUCeGIIx-7jEQ",
        readingTimeMins: 8,
        content: `
Proper care is the secret to making your braids look fresh for weeks while keeping your natural hair healthy underneath.

## Scalp Hydration
Your scalp needs moisture even when it's tucked away. Use a light oil or a specialized scalp spray twice a week to prevent dryness and itching.

## Washing Braids
Yes, you can and should wash your braids! Focus on the scalp using a diluted shampoo and rinse thoroughly. Pat dry—avoid rubbing.

## Nighttime Routine
Always wear a silk or satin bonnet or use a satin pillowcase. This prevents friction, which leads to frizz and breakage.

## Longevity Limits
Don't keep your braids in for longer than 6-8 weeks. Overextending the wear can lead to matting and hair loss at the roots.
        `
    },
    {
        id: "3",
        title: "Knotless vs Traditional Box Braids: Which is Right for You?",
        slug: "knotless-vs-traditional-braids",
        dateISO: "2024-02-28T14:30:00Z",
        authorName: "MHDESIGNS",
        tags: ["Comparison", "Box Braids", "Knotless"],
        category: "Lifestyle",
        excerpt: "Explore the differences between knotless and traditional box braids to find your perfect style match based on comfort and look...",
        coverImage: "https://lh3.googleusercontent.com/aida-public/AB6AXuBkzpglDAdtqXhrybUoW-2JBQJ9V3WlCNUIn9JaJGDyFlfmW7tB61-arPqm3eVn6Y2PmaZatZpshoHxz5V7zhvOWDz45nmE_w6CSOjQa_Pu90YhndWmsuV-AIAC1Jp2vL5NS8sIaKxPpMEzvaeahujRSM8kgzkQQydh6lp-rbxXpbWjMo0bwBe7CIjh7fXEOAzGWvdUD8pv6FK6cUR9wH8251NP3_SByqpCNRjDwNj_otANedI-qvF16EW7v4ZnbyO6Ucmz9oc5JA",
        readingTimeMins: 6,
        content: `
Choosing between traditional and knotless box braids depends on your hair type, scalp sensitivity, and the look you want to achieve.

## Traditional Box Braids
These are characterized by the small "knot" at the base where the extension hair is attached.
- **Pros**: Usually faster to install, very durable.
- **Cons**: Can be heavy and cause more initial tension on the scalp.

## Knotless Braids
Knotless braids start with your own hair and extensions are fed in gradually.
- **Pros**: Extremely lightweight, no immediate tension, looks more like your real hair growing from the root.
- **Cons**: Takes longer to install and may be slightly more expensive.

## Which to Choose?
If you have a sensitive scalp or fine hair, **Knotless** is the winner. If you want a classic, high-volume look and want to get out of the chair faster, **Traditional** might be for you.
        `
    },
    {
        id: "4",
        title: "5 Protective Styles for Working Out",
        slug: "protective-styles-for-gym",
        dateISO: "2024-02-15T08:00:00Z",
        authorName: "MHDESIGNS",
        tags: ["Fitness", "Protective Styles", "Lifestyle"],
        category: "Lifestyle",
        excerpt: "Keep your edges intact and your hair out of your face during intense workouts with these tried and tested styles...",
        coverImage: "https://images.unsplash.com/photo-1549476464-37392f717541?q=80\u0026w=1000\u0026auto=format",
        readingTimeMins: 4,
        content: `
Maintaining your hair while staying active shouldn't be a struggle. Here are the best styles for the gym.

## 1. Large Feed-in Braids
Secure, flat, and stays out of the way. Great for high-impact cardio.

## 2. Cornrowed Bun
Elegant and practical. No loose hair to worry about.

## 3. Passion Twists
Lightweight and easy to pull back into a high ponytail.

## 4. Flat Twists
Low tension and keeps your hair protected from sweat-induced frizz.

## 5. High Braided Ponytail
Classic and keeps your neck cool while you crush those reps.
        `
    },
    {
        id: "5",
        title: "How to Style Your Braids for a Wedding",
        slug: "styling-braids-for-weddings",
        dateISO: "2024-01-20T11:00:00Z",
        authorName: "MHDESIGNS",
        tags: ["Formal", "Wedding", "Styling"],
        category: "Trends",
        excerpt: "Turn heads at any formal event with these elegant braided updos and accessories tips...",
        coverImage: "https://images.unsplash.com/photo-1620331311520-246422fd82f9?q=80\u0026w=1000\u0026auto=format",
        readingTimeMins: 7,
        content: `
Braids are incredibly versatile and can be transformed into stunning formal looks for weddings or galas.

## The Halo Braid
A timeless, regal look that frames the face beautifully.

## Add accessories
Gold cuffs, pearls, or delicate flowers can instantly elevate a simple braid style for a wedding.

## Low Braided Chignon
Sophisticated and minimalist. Works perfectly with knotless or box braids.

## Half-Up, Half-Down with Curls
Incorporate curly pieces or barrel curls at the end of your braids for a romantic, flowing look.
        `
    }
];
