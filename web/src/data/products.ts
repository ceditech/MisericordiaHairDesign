export interface ProductVariant {
    name: string;
    options: string[];
}

export interface Product {
    id: string;
    name: string;
    category: 'Hair Bundles' | 'Braiding Hair' | 'Wigs' | 'Gels & Edge Control' | 'Hair Care' | 'Accessories' | 'Beauty';
    priceCents: number;
    currency: string;
    images: string[];
    shortDescription: string;
    fullDescription: string;
    tags: string[];
    rating?: number;
    stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
    variants?: ProductVariant[];
    featured?: boolean;
}

export const STORE_PRODUCTS: Product[] = [
    // --- Gels & Edge Control ---
    {
        id: "dedes-edge-control",
        name: "Dede's Maximum Hold Edge Control",
        category: "Gels & Edge Control",
        priceCents: 1500,
        currency: "USD",
        images: ["https://images.unsplash.com/photo-1629367469317-0d5bfa7a4ea3?w=800&q=80"],
        shortDescription: "Maximum hold edge control for flawless braids.",
        fullDescription: "Our signature edge control formula provides a long-lasting, non-greasy hold that keeps your baby hairs laid all day without flaking or buildup. Perfect for all hair types.",
        tags: ["edges", "hold", "styling"],
        rating: 4.9,
        stockStatus: "in_stock",
        featured: true
    },
    {
        id: "professional-braid-gel",
        name: "Professional Braid & Parting Gel",
        category: "Gels & Edge Control",
        priceCents: 1800,
        currency: "USD",
        images: ["https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=800&q=80"],
        shortDescription: "Smooth, non-flaking gel for neat parts.",
        fullDescription: "Create sharp, clean parts and smooth down flyaways with our professional-grade braiding gel. Designed to provide grip without leaving a sticky residue.",
        tags: ["parting", "braiding", "grip"],
        rating: 4.8,
        stockStatus: "in_stock"
    },

    // --- Hair Bundles / Braiding Hair ---
    {
        id: "kanekalon-pre-stretched",
        name: "Pre-Stretched Kanekalon Braiding Hair",
        category: "Braiding Hair",
        priceCents: 800,
        currency: "USD",
        images: ["https://images.unsplash.com/photo-1595475038784-bbe439ff41e6?w=800&q=80"],
        shortDescription: "Soft, itch-free, pre-stretched braiding hair.",
        fullDescription: "Professional quality pre-stretched hair that's ready to use. Itch-free, hot water set compatible, and extremely light on the head.",
        tags: ["kanekalon", "braiding", "synthetic"],
        stockStatus: "in_stock",
        variants: [
            { name: "Color", options: ["1 (Jet Black)", "1B (Off Black)", "2 (Dark Brown)", "4 (Medium Brown)", "27 (Honey Blonde)", "30 (Medium Auburn)", "T1B/27", "T1B/Bug"] }
        ]
    },
    {
        id: "human-hair-bundles-straight",
        name: "10A Grade Prime Straight Bundles",
        category: "Hair Bundles",
        priceCents: 8500,
        currency: "USD",
        images: ["https://images.unsplash.com/photo-1596489398869-7c4be51c6b30?w=800&q=80"],
        shortDescription: "100% Virgin Human Hair bundles.",
        fullDescription: "High-quality 10A grade virgin human hair. Can be dyed, bleached, and styled. Minimal shedding and tangle-free. Price shown is per bundle.",
        tags: ["human hair", "bundles", "straight"],
        stockStatus: "in_stock",
        variants: [
            { name: "Length", options: ["12\"", "14\"", "16\"", "18\"", "20\"", "22\"", "24\"", "26\""] }
        ],
        featured: true
    },

    // --- Wigs ---
    {
        id: "bob-lace-closure-wig",
        name: "Sleek Bob Lace Closure Wig",
        category: "Wigs",
        priceCents: 12000,
        currency: "USD",
        images: ["https://images.unsplash.com/photo-1563178430-319ae3980c51?w=800&q=80"],
        shortDescription: "Pre-plucked bob wig with 4x4 lace closure.",
        fullDescription: "A ready-to-wear sleek bob wig. Features a 4x4 lace closure for a natural-looking part, pre-plucked hairline, and adjustable straps for a secure fit.",
        tags: ["wig", "bob", "closure"],
        stockStatus: "low_stock"
    },

    // --- Hair Care ---
    {
        id: "growth-oil-scalp",
        name: "Dede's Scalp & Growth Luxury Oil",
        category: "Hair Care",
        priceCents: 2200,
        currency: "USD",
        images: ["https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800&q=80"],
        shortDescription: "Infused with biotin and peppermint.",
        fullDescription: "Stimulate your scalp and promote healthy hair growth with our custom oil blend. Formulated to soothe tension from braiding and keep your natural hair hydrated.",
        tags: ["oil", "growth", "scalp"],
        rating: 5.0,
        stockStatus: "in_stock",
        featured: true
    },
    {
        id: "braid-sheen-spray",
        name: "Moisturizing Braid Sheen Spray",
        category: "Hair Care",
        priceCents: 1200,
        currency: "USD",
        images: ["https://images.unsplash.com/photo-1556228720-195a672e8a03?w=800&q=80"],
        shortDescription: "Instant shine and itch relief.",
        fullDescription: "Keep your braids looking fresh and your scalp comfortable with our moisturizing sheen spray. Helps prevent dryness and adds a beautiful, healthy glow.",
        tags: ["spray", "moisture", "shine"],
        stockStatus: "in_stock"
    },

    // --- Accessories ---
    {
        id: "satin-lined-bonnet-xl",
        name: "Extra Large Satin-Lined Bonnet",
        category: "Accessories",
        priceCents: 1500,
        currency: "USD",
        images: ["https://images.unsplash.com/photo-1614032126206-8dce28987481?w=800&q=80"],
        shortDescription: "Perfect for long braids and dreadlocks.",
        fullDescription: "Protect your investment while you sleep. Our extra-large satin bonnets are designed specifically to fit thick braids, locs, and long extensions.",
        tags: ["bonnet", "protection", "satin"],
        stockStatus: "in_stock",
        variants: [
            { name: "Color", options: ["Midnight Black", "Royal Purple", "Rose Gold", "Emerald Green"] }
        ]
    },

    // --- Beauty ---
    {
        id: "organic-body-glimmer-oil",
        name: "Organic Sun-Kissed Body Glimmer Oil",
        category: "Beauty",
        priceCents: 2800,
        currency: "USD",
        images: ["https://images.unsplash.com/photo-1583209814683-c023dd293cc6?w=800&q=80"],
        shortDescription: "Get that effortless golden glow.",
        fullDescription: "A lightweight, organic body oil that leaves your skin feeling silky and looking luminous. Infused with a delicate floral scent.",
        tags: ["skin", "oil", "glow"],
        stockStatus: "in_stock"
    }
];
