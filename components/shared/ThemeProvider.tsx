"use client";

import { useEffect } from "react";

/**
 * Reads localStorage on mount and applies dark class to <html>
 * preventing flash of wrong theme on page load.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (stored === "dark" || (!stored && prefersDark)) {
      document.documentElement.classList.add("dark");
    }
  }, []);

  return <>{children}</>;
}
