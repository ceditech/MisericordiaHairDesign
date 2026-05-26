"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { onAuthChanged, auth, signOutUser } from "@/src/lib/firebase/auth";
import { getDb } from "@/src/lib/firebase/client";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    isLoading: boolean;
    profile: any | null;
    profileLoading: boolean;
    role: string | null;
    roleLoading: boolean;
    isSuperAdmin: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    isLoading: true,
    profile: null,
    profileLoading: true,
    role: null,
    roleLoading: true,
    isSuperAdmin: false,
    signOut: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any | null>(null);
    const [profileLoading, setProfileLoading] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthChanged((currentUser) => {
            setUser(currentUser);
            setLoading(false);

            if (currentUser) {
                fetchUserProfile(currentUser.uid);
            } else {
                setProfile(null);
                setProfileLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const fetchUserProfile = async (uid: string) => {
        setProfileLoading(true);
        try {
            const db = getDb();
            const userDoc = await getDoc(doc(db, "users", uid));
            if (userDoc.exists()) {
                setProfile(userDoc.data() || null);
            } else {
                setProfile(null);
            }
        } catch (error) {
            console.error("Error fetching user profile:", error);
            setProfile(null);
        } finally {
            setProfileLoading(false);
        }
    };

    const signOut = async () => {
        // 1. Clear any saved booking drafts BEFORE signing out
        try {
            sessionStorage.removeItem("misericordia_booking_draft");
            localStorage.removeItem("misericordia_confirmed_booking");
        } catch (err) {
            console.error("Failed to clear booking storage", err);
        }

        // 2. Perform the actual logout
        await signOutUser();
        
        // 3. Force a full page load to the home page.
        // This is critical because React might still hold the draft in local component state.
        window.location.href = "/";
    };

    const role = profile?.role || null;
    const isSuperAdmin = user?.email === "sales@edxstore.com";
    const isLoading = loading || profileLoading;
    const roleLoading = profileLoading;

    return (
        <AuthContext.Provider value={{ user, loading, isLoading, profile, profileLoading, role, roleLoading, signOut, isSuperAdmin } as any}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
