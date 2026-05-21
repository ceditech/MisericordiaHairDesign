"use client";

import { useAuth as useAuthProvider } from "@/src/providers/AuthProvider";

/**
 * Convenience hook to access the authentication state.
 */
export const useAuth = () => {
    const context = useAuthProvider();
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
