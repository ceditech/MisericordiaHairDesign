import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: "class",
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    primary: "#a319c5",
                    secondary: "#8b15a8",
                    light: "#b84dd4",
                    accent: "#d084e8",
                    violet: "#7c3aed",
                },
                background: {
                    light: "#f8f6f7",
                    dark: "#221019",
                },
                surface: {
                    light: "#ffffff",
                    dark: "#1a0b13",
                },
                elevated: {
                    light: "#ffffff",
                    dark: "#2a1621",
                },
                text: {
                    primary: {
                        light: "#0f172a",
                        dark: "#f1f5f9",
                    },
                    muted: {
                        light: "#64748b",
                        dark: "#94a3b8",
                    },
                    inverse: {
                        light: "#ffffff",
                        dark: "#0f172a",
                    },
                },
                border: {
                    light: "#e2e8f0",
                    dark: "rgba(255, 255, 255, 0.05)",
                },
            },
            fontFamily: {
                display: ["var(--font-display)", "ui-sans-serif", "system-ui", "sans-serif"],
            },
            fontSize: {
                xs: ["0.75rem", { lineHeight: "1rem" }],
                sm: ["0.875rem", { lineHeight: "1.25rem" }],
                base: ["1rem", { lineHeight: "1.5rem" }],
                lg: ["1.125rem", { lineHeight: "1.75rem" }],
                xl: ["1.25rem", { lineHeight: "1.75rem" }],
                "2xl": ["1.5rem", { lineHeight: "2rem" }],
                "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
                "4xl": ["2.25rem", { lineHeight: "2.5rem" }],
                "5xl": ["3rem", { lineHeight: "1" }],
                "6xl": ["3.75rem", { lineHeight: "1" }],
                "7xl": ["4.5rem", { lineHeight: "1" }],
                "8xl": ["6rem", { lineHeight: "1" }],
                "9xl": ["8rem", { lineHeight: "1" }],
            },
            fontWeight: {
                thin: "100",
                extralight: "200",
                light: "300",
                normal: "400",
                medium: "500",
                semibold: "600",
                bold: "700",
                extrabold: "800",
                black: "900",
            },
            lineHeight: {
                none: "1",
                tight: "1.25",
                snug: "1.375",
                normal: "1.5",
                relaxed: "1.625",
                loose: "2",
            },
            spacing: {
                18: "4.5rem",
                112: "28rem",
                128: "32rem",
                144: "36rem",
            },
            borderRadius: {
                sm: "0.375rem",
                DEFAULT: "0.5rem",
                md: "0.75rem",
                lg: "1rem",
                xl: "1.5rem",
                "2xl": "2rem",
                "3xl": "3rem",
            },
            boxShadow: {
                sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
                DEFAULT: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
                md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
                lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
                xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
                "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)",
                brand: "0 10px 25px -5px rgba(163, 25, 197, 0.3)",
                "brand-lg": "0 20px 40px -10px rgba(163, 25, 197, 0.4)",
            },
            transitionDuration: {
                DEFAULT: "200ms",
                fast: "150ms",
                slow: "300ms",
            },
            transitionTimingFunction: {
                DEFAULT: "cubic-bezier(0.4, 0, 0.2, 1)",
                smooth: "cubic-bezier(0.4, 0, 0.1, 1)",
            },
        },
    },
    plugins: [],
};

export default config;
