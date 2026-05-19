import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Smart Wardrobe AI",
    template: "%s · Smart Wardrobe AI",
  },
  description: "Your intelligent wardrobe, styled by AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    /*
     * suppressHydrationWarning is required here because the inline <script>
     * in <head> sets data-theme before React hydrates, which would otherwise
     * cause a hydration mismatch warning. Safe to suppress on <html>.
     */
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        {/*
         * Flash-of-Wrong-Theme prevention.
         * Runs synchronously before first paint — reads persisted Zustand
         * state from localStorage and sets data-theme on <html> immediately.
         * No visible dark→light flash for light-mode users.
         */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var stored = JSON.parse(localStorage.getItem('sw-theme') || '{}');
                var theme = stored?.state?.theme;
                if (theme === 'light') {
                  document.documentElement.dataset.theme = 'light';
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
