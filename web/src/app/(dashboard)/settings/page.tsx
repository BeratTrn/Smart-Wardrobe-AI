import type { Metadata } from "next";

export const metadata: Metadata = { title: "Settings" };

const TABS = ["Profile", "Body Profile", "Preferences", "Security", "Danger Zone"];

export default function SettingsPage() {
  return (
    <div className="space-y-6 animate-slide-up max-w-3xl">
      <div>
        <p className="text-[11px] font-semibold tracking-[0.3em] text-gold uppercase mb-1.5">
          Account
        </p>
        <h2 className="text-2xl font-semibold text-text tracking-tight">Settings</h2>
        <p className="text-sm text-text-sub mt-1">
          Manage your profile, preferences, and account security.
        </p>
      </div>

      {/* Tab bar skeleton */}
      <div className="flex gap-1 border-b border-border pb-0">
        {TABS.map((tab) => (
          <button
            key={tab}
            className="px-4 py-2.5 text-sm font-medium text-muted hover:text-text-sub border-b-2 border-transparent transition-colors -mb-px"
            disabled
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content area skeleton */}
      <div className="rounded-2xl bg-card border border-border p-6 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-3 w-24 skeleton rounded-md" />
            <div className="h-10 skeleton rounded-xl" />
          </div>
        ))}
        <div className="pt-2">
          <div className="h-10 w-28 skeleton rounded-xl" />
        </div>
      </div>
    </div>
  );
}
