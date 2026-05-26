"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Product } from "@/src/data/products";

export interface CartItem {
    productId: string;
    variantId?: string; // Optional variant selection
    name: string;
    priceCents: number;
    quantity: number;
    image: string;
    selectedOptions?: Record<string, string>;
}

interface CartContextType {
    cart: CartItem[];
    addToCart: (product: Product, quantity?: number, options?: Record<string, string>) => void;
    removeFromCart: (productId: string, variantId?: string) => void;
    updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
    clearCart: () => void;
    cartCount: number;
    cartTotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "misericordia_hair_designs_shop_cart";

export function CartProvider({ children }: { children: ReactNode }) {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    // Initial load from localStorage
    useEffect(() => {
        const savedCart = localStorage.getItem(CART_STORAGE_KEY);
        if (savedCart) {
            try {
                setCart(JSON.parse(savedCart));
            } catch (e) {
                console.error("Failed to parse cart from storage", e);
            }
        }
        setIsLoaded(true);
    }, []);

    // Save to localStorage whenever cart changes
    useEffect(() => {
        if (isLoaded) {
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
        }
    }, [cart, isLoaded]);

    const addToCart = (product: Product, quantity: number = 1, options?: Record<string, string>) => {
        setCart((prevCart) => {
            // Create a unique key for the item based on product ID and options (variants)
            const variantId = options ? JSON.stringify(options) : undefined;

            const existingItemIndex = prevCart.findIndex(
                (item) => item.productId === product.id && item.variantId === variantId
            );

            if (existingItemIndex > -1) {
                const updatedCart = [...prevCart];
                updatedCart[existingItemIndex].quantity += quantity;
                return updatedCart;
            }

            const newItem: CartItem = {
                productId: product.id,
                variantId,
                name: product.name,
                priceCents: product.priceCents,
                quantity,
                image: product.images[0],
                selectedOptions: options,
            };

            return [...prevCart, newItem];
        });
    };

    const removeFromCart = (productId: string, variantId?: string) => {
        setCart((prevCart) => prevCart.filter(
            (item) => !(item.productId === productId && item.variantId === variantId)
        ));
    };

    const updateQuantity = (productId: string, quantity: number, variantId?: string) => {
        if (quantity <= 0) {
            removeFromCart(productId, variantId);
            return;
        }

        setCart((prevCart) => {
            return prevCart.map((item) => {
                if (item.productId === productId && item.variantId === variantId) {
                    return { ...item, quantity };
                }
                return item;
            });
        });
    };

    const clearCart = () => {
        setCart([]);
    };

    const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
    const cartTotal = cart.reduce((total, item) => total + item.priceCents * item.quantity, 0);

    return (
        <CartContext.Provider
            value={{
                cart,
                addToCart,
                removeFromCart,
                updateQuantity,
                clearCart,
                cartCount,
                cartTotal,
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (context === undefined) {
        throw new Error("useCart must be used within a CartProvider");
    }
    return context;
}
