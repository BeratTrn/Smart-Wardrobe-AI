import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s | Smart Wardrobe AI",
    default: "Smart Wardrobe AI",
  },
};

/**
 * Auth layout — full-screen centred card with ambient gold orbs.
 * No AppShell here; the sidebar/topbar live only in (dashboard).
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-bg px-4 py-12">
      {/* ── Decorative ambient orbs ───────────────────────────────── */}
      <div
        aria-hidden="true"
        className="pointer-events-none select-none absolute inset-0"
      >
        {/* Top-left large orb */}
        <div
          className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full opacity-[0.07]"
          style={{
            background:
              "radial-gradient(circle, var(--color-gold) 0%, transparent 70%)",
          }}
        />
        {/* Bottom-right medium orb */}
        <div
          className="absolute -bottom-32 -right-32 w-[480px] h-[480px] rounded-full opacity-[0.05]"
          style={{
            background:
              "radial-gradient(circle, var(--color-gold-light) 0%, transparent 70%)",
          }}
        />
        {/* Centre faint glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full opacity-[0.03]"
          style={{
            background:
              "radial-gradient(ellipse, var(--color-gold) 0%, transparent 65%)",
          }}
        />
      </div>

      {/* ── Card container ───────────────────────────────────────── */}
      <main className="relative z-10 w-full max-w-md">{children}</main>
    </div>
  );
}
