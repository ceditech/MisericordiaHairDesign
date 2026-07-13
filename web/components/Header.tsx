"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useTheme } from "./ThemeProvider";
import { Button, Drawer, Tooltip } from "./ui";
import { useCart } from "@/src/lib/shop/cartStore";

import { useAuth } from "@/src/hooks/useAuth";

export default function Header() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [currentHash, setCurrentHash] = useState("");
    const [mounted, setMounted] = useState(false);
    const pathname = usePathname();
    const { theme, setTheme, resolvedTheme } = useTheme();
    const { cartCount } = useCart();
    const { user, role, signOut } = useAuth();

    // Set mounted to true after initial hydration
    useEffect(() => {
        setMounted(true);
    }, []);

    // Track hash changes for anchor link highlighting
    useEffect(() => {
        const updateHash = () => setCurrentHash(window.location.hash);
        updateHash();
        window.addEventListener("hashchange", updateHash);
        return () => window.removeEventListener("hashchange", updateHash);
    }, []);

    // Close mobile menu on route change
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [pathname]);

    const isActiveLink = (href: string) => {
        if (href.startsWith("/#")) {
            // Anchor link
            return currentHash === href.substring(1);
        }
        // Route link
        return pathname === href;
    };

    const navLinks = [
        { href: "/", label: "Home" },
        { href: "/blog", label: "Blog" },
        { href: "/#services", label: "Services" },
        { href: "/our-styles", label: "Our Styles" },
        { href: "/products", label: "Products" },
        ...(mounted && role === "owner" ? [{ href: "/owner", label: "Dashboard" }] : [{ href: "/affiliate", label: "Affiliates" }]),
        { href: "/contact", label: "Contact" },
    ];

    const toggleTheme = () => {
        setTheme(resolvedTheme === "dark" ? "light" : "dark");
    };

    const getThemeIcon = () => {
        if (!mounted) return "brightness_6"; // Placeholder during hydration
        if (theme === "system") return "brightness_auto";
        return theme === "dark" ? "dark_mode" : "light_mode";
    };

    const Logo = () => (
        <Link href="/" className="text-2xl font-extrabold tracking-tighter text-brand-primary">
            MHDESIGNS
        </Link>
    );

    const ThemeToggle = () => (
        <Tooltip content="Toggle Dark Theme" position="bottom">
            <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-brand-primary/10 transition-colors text-text-secondary hover:text-text-primary focus-visible:ring-2 focus-visible:ring-brand-primary outline-none"
                aria-label="Toggle theme"
            >
                <span className="material-icons text-xl">{getThemeIcon()}</span>
            </button>
        </Tooltip>
    );

    const AuthButton = () => {
        if (!mounted) return (
            <div className="text-sm font-bold text-text-secondary flex items-center gap-1 opacity-0">
                <span className="material-icons text-lg">login</span>
                Login
            </div>
        );

        return user ? (
            <button
                onClick={() => signOut()}
                className="text-sm font-bold text-text-secondary hover:text-red-500 transition-colors flex items-center gap-1"
            >
                <span className="material-icons text-lg">logout</span>
                Logout
            </button>
        ) : (
            <Link
                href="/login"
                className="text-sm font-bold text-text-secondary hover:text-brand-primary transition-colors flex items-center gap-1"
            >
                <span className="material-icons text-lg">login</span>
                Login
            </Link>
        );
    };

    return (
        <nav className="sticky top-0 z-50 w-full bg-surface/80 backdrop-blur-md border-b border-border">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20">
                    {/* Logo */}
                    <div className="flex items-center gap-2">
                        <Logo />
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden lg:flex items-center space-x-6">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`text-sm font-semibold transition-colors ${isActiveLink(link.href)
                                    ? "text-brand-primary"
                                    : "text-text-secondary hover:text-text-primary"
                                    }`}
                            >
                                {link.label}
                            </Link>
                        ))}

                        <div className="h-6 w-px bg-border mx-2" />

                        <AuthButton />

                        <ThemeToggle />

                        {/* Cart Icon */}
                        <Tooltip content="View Cart" position="bottom">
                            <Link href="/cart" className="relative p-2 text-text-secondary hover:text-brand-primary transition-colors">
                                <span className="material-icons text-2xl">shopping_cart</span>
                                {cartCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-brand-secondary text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-lg border-2 border-surface">
                                        {cartCount}
                                    </span>
                                )}
                            </Link>
                        </Tooltip>

                        {/* Book Now CTA */}
                        <Link href="/book">
                            <Button variant="primary" size="md">
                                Book Now
                            </Button>
                        </Link>
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="lg:hidden flex items-center gap-2">
                        {/* Cart Icon (Mobile) */}
                        <Link href="/cart" className="relative p-2 text-text-secondary hover:text-brand-primary transition-colors">
                            <span className="material-icons text-2xl">shopping_cart</span>
                            {cartCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-brand-secondary text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full shadow-lg border-2 border-surface">
                                    {cartCount}
                                </span>
                            )}
                        </Link>
                        <ThemeToggle />
                        <button
                            onClick={() => setMobileMenuOpen(true)}
                            className="text-text-secondary p-2 hover:text-brand-primary transition-colors focus-visible:ring-2 focus-visible:ring-brand-primary outline-none"
                            aria-label="Open menu"
                        >
                            <span className="material-icons text-2xl">menu</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Drawer */}
            <Drawer
                isOpen={mobileMenuOpen}
                onClose={() => setMobileMenuOpen(false)}
            >
                {/* Drawer Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <span className="text-xl font-extrabold tracking-tighter text-brand-primary">
                        MHDESIGNS
                    </span>
                    {/* The close button is handled by the Drawer component */}
                </div>

                {/* Drawer Navigation */}
                <nav className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-4">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setMobileMenuOpen(false)}
                                className={`block px-4 py-3 rounded-lg text-lg font-semibold transition-colors ${isActiveLink(link.href)
                                    ? "bg-brand-primary/10 text-brand-primary"
                                    : "hover:bg-brand-primary/5"
                                    }`}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>
                </nav>

                {/* Drawer Footer with CTA */}
                <div className="p-6 border-t border-border">
                    <Link href="/book" onClick={() => setMobileMenuOpen(false)} className="block">
                        <Button variant="primary" size="lg" className="w-full">
                            <span className="material-icons">calendar_today</span>
                            Book Now
                        </Button>
                    </Link>
                </div>
            </Drawer>
        </nav>
    );
}
