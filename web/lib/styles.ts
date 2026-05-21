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
        price: "$200 and up",
        image: "https://img1.wsimg.com/isteam/ip/bdf6ba35-495f-402b-9add-1d7fe5046011/web2.JPG/:/cr=t:9.98%25,l:0%25,w:100%25,h:80.04%25/rs=w:360,h:360,cg:true",
        description: "Natural-looking, tension-free braids starting at the root.",
        popular: true,
        prepChecklist: [...DEFAULT_PREP, "Hair must be at least 4 inches long for this style."]
    },
    {
        id: "single-braids",
        name: "Single Braids",
        duration: "6-8 hours",
        price: "$180 and up",
        image: "https://img1.wsimg.com/isteam/ip/bdf6ba35-495f-402b-9add-1d7fe5046011/single.JPG/:/cr=t:33.3%25,l:0%25,w:100%25,h:66.7%25/rs=w:360,h:360,cg:true",
        description: "Classic single braids for a versatile and long-lasting look.",
        prepChecklist: DEFAULT_PREP
    },
    {
        id: "bohemian-braids",
        name: "Bohemian Braids",
        duration: "5-6 hours",
        price: "$220 and up",
        image: "https://img1.wsimg.com/isteam/ip/bdf6ba35-495f-402b-9add-1d7fe5046011/web%20bohe.jpg/:/cr=t:0%25,l:5.66%25,w:94.34%25,h:76.49%25/rs=w:360,h:360,cg:true,m",
        description: "Soft, curly box braids for an effortless, boho aesthetic.",
        prepChecklist: [...DEFAULT_PREP, "Confirm desired curl pattern (Human or Synthetic hair provided)."]
    },
    {
        id: "box-braids",
        name: "Box Braids",
        duration: "5-7 hours",
        price: "$180 and up",
        image: "https://img1.wsimg.com/isteam/ip/bdf6ba35-495f-402b-9add-1d7fe5046011/web%20box.jpg/:/rs=w:360,h:360,cg:true,m/cr=w:360,h:360",
        description: "Timeless protective style with clean, square sections.",
        prepChecklist: DEFAULT_PREP
    },
    {
        id: "micro-braids",
        name: "Micro Braids",
        duration: "8-12 hours",
        price: "$180 and up",
        image: "https://img1.wsimg.com/isteam/ip/bdf6ba35-495f-402b-9add-1d7fe5046011/EliteHair-Braids-41-1.webp/:/cr=t:0%25,l:0%25,w:100%25,h:95.49%25/rs=w:360,h:360,cg:true",
        description: "Exquisite, tiny braids for maximum flow and styling options.",
        prepChecklist: [...DEFAULT_PREP, "Please bring snacks/entertainment for this long-duration style."]
    },
    {
        id: "cornrows",
        name: "Cornrows",
        duration: "2-4 hours",
        price: "$120 and up",
        image: "https://img1.wsimg.com/isteam/ip/bdf6ba35-495f-402b-9add-1d7fe5046011/cornrow-Ponytail-with-Bangs.jpg/:/cr=t:3.48%25,l:0%25,w:100%25,h:80.09%25/rs=w:360,h:360,cg:true",
        description: "Traditional scalp-braid designs, perfect for any occasion.",
        prepChecklist: DEFAULT_PREP
    },
    {
        id: "kinky-twist",
        name: "Kinky Twist",
        duration: "4-6 hours",
        price: "$160 and up",
        image: "https://img1.wsimg.com/isteam/ip/bdf6ba35-495f-402b-9add-1d7fe5046011/kinky2.jpg/:/cr=t:0%25,l:0%25,w:100%25,h:100%25/rs=w:360,h:360,cg:true",
        description: "Textured, natural-looking twists with a kinky finish.",
        prepChecklist: DEFAULT_PREP
    },
    {
        id: "crochet",
        name: "Crochet",
        duration: "2-3 hours",
        price: "$100 and up",
        image: "https://img1.wsimg.com/isteam/ip/bdf6ba35-495f-402b-9add-1d7fe5046011/3-crochet-a-line-bob-CWCDfiKF8Y9.webp/:/cr=t:0%25,l:0%25,w:100%25,h:98.09%25/rs=w:360,h:360,cg:true",
        description: "Quick and versatile install using a crochet hook method.",
        prepChecklist: DEFAULT_PREP
    },
    {
        id: "kids-braids",
        name: "Kids Braids",
        duration: "2-4 hours",
        price: "$100 and up",
        image: "https://img1.wsimg.com/isteam/ip/bdf6ba35-495f-402b-9add-1d7fe5046011/kikid.jpg/:/cr=t:0%25,l:0%25,w:100%25,h:100%25/rs=w:360,h:360,cg:true",
        description: "Gentle and beautiful braiding styles tailored for children.",
        prepChecklist: DEFAULT_PREP
    },
];
