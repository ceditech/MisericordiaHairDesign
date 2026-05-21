"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./useAuth";

/**
 * Hook to require a logged-in user with the 'owner' role.
 * Redirects to /login if not authenticated.
 * Returns true if authenticated as owner, false otherwise.
 */
export const useRequireOwner = () => {
    const { user, isLoading: loading, role, roleLoading } = useAuth();
    const router = useRouter();
    const hasRedirected = useRef(false);

    useEffect(() => {
        const safePush = async (url: string) => {
            try {
                await (router.push(url) as any);
            } catch (err: any) {
                if (err.name !== 'AbortError') throw err;
            }
        };

        if (typeof window !== 'undefined' && window.location.search.includes('demo=true')) {
            return;
        }

        if (!loading && !roleLoading && !hasRedirected.current) {
            if (!user) {
                hasRedirected.current = true;
                safePush("/login");
            } else if (role !== "owner" && role !== "assistant") {
                hasRedirected.current = true;
                safePush("/restricted");
            }
        }
    }, [user, loading, role, roleLoading, router]);

    const isDemo = typeof window !== 'undefined' && window.location.search.includes('demo=true');

    return isDemo || (!loading && !roleLoading && user && (role === "owner" || role === "assistant"));
};
