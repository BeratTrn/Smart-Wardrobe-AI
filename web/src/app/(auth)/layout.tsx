import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | StyleX",
    default: "StyleX — Smart Wardrobe AI",
  },
};

/**
 * Auth layout — full-screen split with ambient gold orbs.
 * No AppShell — sidebar/topbar live only in (dashboard).
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 py-12"
      style={{ background: "var(--color-bg)" }}
    >
      {/* ── Ambient gold orbs ── */}
      <div aria-hidden className="pointer-events-none select-none absolute inset-0">
        {/* Top-left large orb */}
        <div
          className="absolute -top-60 -left-60 w-[700px] h-[700px] rounded-full"
          style={{
            background: "radial-gradient(circle, var(--color-gold-dim) 0%, transparent 65%)",
          }}
        />
        {/* Bottom-right orb */}
        <div
          className="absolute -bottom-40 -right-40 w-[550px] h-[550px] rounded-full"
          style={{
            background: "radial-gradient(circle, var(--color-gold-dim) 0%, transparent 65%)",
          }}
        />
        {/* Centre faint glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] rounded-full"
          style={{
            background: "radial-gradient(ellipse, var(--color-gold-dim) 0%, transparent 65%)",
          }}
        />
      </div>

      {/* ── Card container ── */}
      <main className="relative z-10 w-full max-w-md animate-slide-up">
        {children}
      </main>
    </div>
  );
}
