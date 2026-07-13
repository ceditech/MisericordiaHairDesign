export interface BraidStyle {
    id: string;
    name: string;
    duration: string;
    price: string;
    image: string;
    description: string;
    popular?: boolean;
    prepChecklist?: string[];
}

const DEFAULT_PREP = [
    "Arrive with hair washed, detangled, and blow-dried straight.",
    "Do not apply any heavy oils, grease, or leave-in conditioners.",
    "Ensure your scalp is clean and free of any build-up.",
    "Allow at least the estimated duration for your appointment."
];

export const BRAID_STYLES: BraidStyle[] = [
    {
        id: "knotless-braids",
        name: "Knotless Braids",
        duration: "4-6 hours",
        price: "$220 and up",
        image: "https://storage.googleapis.com/misericordiahairdesign.firebasestorage.app/styles/Knotless-Braids.png",
        description: "Natural-looking, tension-free braids starting at the root.",
        popular: true,
        prepChecklist: [...DEFAULT_PREP, "Hair must be at least 4 inches long for this style."]
    },
    {
        id: "single-braids",
        name: "Single Braids",
        duration: "6-8 hours",
        price: "$195 and up",
        image: "https://storage.googleapis.com/misericordiahairdesign.firebasestorage.app/styles/Single-Braids.png",
        description: "Classic single braids for a versatile and long-lasting look.",
        prepChecklist: DEFAULT_PREP
    },
    {
        id: "bohemian-braids",
        name: "Bohemian Braids",
        duration: "5-6 hours",
        price: "$260 and up",
        image: "https://storage.googleapis.com/misericordiahairdesign.firebasestorage.app/styles/Boho.png",
        description: "Soft, curly box braids for an effortless, boho aesthetic.",
        prepChecklist: [...DEFAULT_PREP, "Confirm desired curl pattern (Human or Synthetic hair provided)."]
    },
    {
        id: "box-braids",
        name: "Box Braids",
        duration: "5-7 hours",
        price: "$195 and up",
        image: "https://storage.googleapis.com/misericordiahairdesign.firebasestorage.app/styles/Box-braids-style.png",
        description: "Timeless protective style with clean, square sections.",
        prepChecklist: DEFAULT_PREP
    },
    {
        id: "micro-braids",
        name: "Micro Braids",
        duration: "8-12 hours",
        price: "$320 and up",
        image: "https://storage.googleapis.com/misericordiahairdesign.firebasestorage.app/styles/Micro-Braids.png",
        description: "Exquisite, tiny braids for maximum flow and styling options.",
        prepChecklist: [...DEFAULT_PREP, "Please bring snacks/entertainment for this long-duration style."]
    },
    {
        id: "cornrows",
        name: "Cornrows",
        duration: "2-4 hours",
        price: "$95 and up",
        image: "https://storage.googleapis.com/misericordiahairdesign.firebasestorage.app/styles/Cornrows-Braids.png",
        description: "Traditional scalp-braid designs, perfect for any occasion.",
        prepChecklist: DEFAULT_PREP
    },
    {
        id: "kinky-twist",
        name: "Kinky Twist",
        duration: "4-6 hours",
        price: "$205 and up",
        image: "https://storage.googleapis.com/misericordiahairdesign.firebasestorage.app/styles/Kinky-Twist.png",
        description: "Textured, natural-looking twists with a kinky finish.",
        prepChecklist: DEFAULT_PREP
    },
    {
        id: "crochet",
        name: "Crochet",
        duration: "2-3 hours",
        price: "$125 and up",
        image: "https://storage.googleapis.com/misericordiahairdesign.firebasestorage.app/styles/Crochet-Braids.png",
        description: "Quick and versatile install using a crochet hook method.",
        prepChecklist: DEFAULT_PREP
    },
    {
        id: "kids-braids",
        name: "Kids Braids",
        duration: "2-4 hours",
        price: "$85 and up",
        image: "https://storage.googleapis.com/misericordiahairdesign.firebasestorage.app/styles/Kids-Braids.png",
        description: "Gentle and beautiful braiding styles tailored for children.",
        prepChecklist: DEFAULT_PREP
    },
];
