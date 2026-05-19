"use client";

import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useThemeStore } from "@/lib/store/themeStore";

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        retry: (failureCount, error: unknown) => {
          const status = (error as { response?: { status?: number } })
            ?.response?.status;
          if (status && status >= 400 && status < 500) return false;
          return failureCount < 1;
        },
        refetchOnWindowFocus: false,
      },
    },
  });
}

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
 * All client-side context providers for the application.
 *
 * QueryClient is created once per browser session using useState so
 * it persists across navigations without leaking between server renders.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => makeQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeSync />
      {children}
    </QueryClientProvider>
  );
}
