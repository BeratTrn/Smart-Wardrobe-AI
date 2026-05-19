"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/lib/store/themeStore";

/**
 * ThemeSync — subscribes to Zustand themeStore and reflects
 * the active theme onto the <html> data-theme attribute.
 * The inline script in layout.tsx already sets the initial value
 * before hydration, so this component only handles runtime toggles.
 */
function ThemeSync() {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    const html = document.documentElement;
    if (theme === "light") {
      html.dataset.theme = "light";
    } else {
      delete html.dataset.theme;
    }
  }, [theme]);

  return null;
}

/**
 * Providers — the single client-boundary wrapper for the root layout.
 * Add TanStack Query, toast providers, etc. here in future phases.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ThemeSync />
      {children}
    </>
  );
}
