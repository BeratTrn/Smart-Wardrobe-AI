"use client";

import { useState } from "react";
import { User, Activity, Sliders, Shield } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useProfile } from "@/lib/hooks/useUsers";
import { ProfileTab }     from "@/components/settings/ProfileTab";
import { BodyTab }        from "@/components/settings/BodyTab";
import { PreferencesTab } from "@/components/settings/PreferencesTab";
import { SecurityTab }    from "@/components/settings/SecurityTab";

// ── Tab definitions ───────────────────────────────────────────────────────────
type Tab = "profile" | "body" | "preferences" | "security";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "profile",     label: "Profile",      icon: User },
  { id: "body",        label: "Body Profile", icon: Activity },
  { id: "preferences", label: "Preferences",  icon: Sliders },
  { id: "security",    label: "Security",     icon: Shield },
];

// ── Skeleton ──────────────────────────────────────────────────────────────────
function TabSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 rounded-2xl skeleton" />
        <div className="space-y-2">
          <div className="h-4 w-32 skeleton rounded" />
          <div className="h-3 w-48 skeleton rounded" />
        </div>
      </div>
      {[1, 2].map((i) => (
        <div key={i} className="space-y-1.5">
          <div className="h-3 w-20 skeleton rounded" />
          <div className="h-10 skeleton rounded-xl" />
        </div>
      ))}
      <div className="h-10 w-32 skeleton rounded-xl" />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const { data, isPending } = useProfile();

  const profile = data?.kullanici;

  return (
    <div className="max-w-3xl space-y-6">
      {/* Page header */}
      <div>
        <p className="text-[11px] font-semibold tracking-[0.3em] text-gold uppercase mb-1">
          Account
        </p>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted mt-0.5">
          Manage your profile, style preferences, and account security.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-white/10 overflow-x-auto scrollbar-none">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors",
              activeTab === id
                ? "border-gold text-gold"
                : "border-transparent text-muted hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5 flex-shrink-0" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="glass rounded-2xl p-6">
        {isPending || !profile ? (
          <TabSkeleton />
        ) : (
          <>
            {activeTab === "profile"     && <ProfileTab     profile={profile} />}
            {activeTab === "body"        && <BodyTab         profile={profile} />}
            {activeTab === "preferences" && <PreferencesTab  profile={profile} />}
            {activeTab === "security"    && <SecurityTab />}
          </>
        )}
      </div>
    </div>
  );
}
