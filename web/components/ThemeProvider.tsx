"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { useIsMounted } from "@/src/hooks/useIsMounted";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    resolvedTheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// The chosen theme lives in localStorage; this tiny store lets React read it without an effect.
const THEME_KEY = "theme";
const themeListeners = new Set<() => void>();

function subscribeToTheme(onChange: () => void) {
    themeListeners.add(onChange);
    window.addEventListener("storage", onChange);
    return () => {
        themeListeners.delete(onChange);
        window.removeEventListener("storage", onChange);
    };
}

function getStoredTheme(): Theme {
    const stored = localStorage.getItem(THEME_KEY);
    return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
}

const getServerTheme = (): Theme => "system";

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error("useTheme must be used within ThemeProvider");
    }
    return context;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const theme = useSyncExternalStore(subscribeToTheme, getStoredTheme, getServerTheme);
    const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
    const mounted = useIsMounted();

    // Update resolved theme based on theme setting
    useEffect(() => {
        const updateResolvedTheme = () => {
            if (theme === "system") {
                const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
                setResolvedTheme(systemTheme);
            } else {
                setResolvedTheme(theme);
            }
        };

        updateResolvedTheme();

        // Listen for system theme changes
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handler = () => {
            if (theme === "system") {
                updateResolvedTheme();
            }
        };

        mediaQuery.addEventListener("change", handler);
        return () => mediaQuery.removeEventListener("change", handler);
    }, [theme]);

    // Apply theme class to document
    useEffect(() => {
        if (!mounted) return;

        const root = document.documentElement;
        root.classList.remove("light", "dark");
        root.classList.add(resolvedTheme);
    }, [resolvedTheme, mounted]);

    const setTheme = (newTheme: Theme) => {
        localStorage.setItem(THEME_KEY, newTheme);
        themeListeners.forEach((notify) => notify());
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

// Pre-hydration script to prevent flash
export const themeScript = `
(function() {
  try {
    const stored = localStorage.getItem('theme');
    const theme = stored || 'system';
    let resolved = theme;
    
    if (theme === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    
    document.documentElement.classList.add(resolved);
  } catch (e) {
    console.error('Theme initialization error:', e);
  }
})();
`;
