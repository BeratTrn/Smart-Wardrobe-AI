"use client";

import { Menu } from "lucide-react";
import { useUIStore } from "@/lib/store/uiStore";
import { useAuthStore } from "@/lib/store/authStore";
import { useThemeStore } from "@/lib/store/themeStore";

export function Topbar() {
  const { openMobileSidebar } = useUIStore();
  const { user } = useAuthStore();
  const { theme, toggle } = useThemeStore();

  const initials = user
    ? `${user.ad[0] ?? ""}${user.soyad[0] ?? ""}`.toUpperCase()
    : "SW";

  return (
    <header className="flex h-16 items-center gap-4 px-4 md:px-6 border-b border-white/10 glass">
      <button
        className="lg:hidden text-muted hover:text-foreground"
        onClick={openMobileSidebar}
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex-1" />

      {/* Theme toggle */}
      <button
        onClick={toggle}
        className="h-8 w-8 rounded-lg glass flex items-center justify-center text-muted hover:text-foreground text-xs"
        title="Toggle theme"
      >
        {theme === "dark" ? "☀️" : "🌙"}
      </button>

      {/* Avatar */}
      <button className="flex items-center gap-2.5 rounded-lg glass px-3 py-1.5 hover:bg-white/5 transition-colors">
        <div className="h-7 w-7 rounded-full bg-gold-gradient flex items-center justify-center text-[11px] font-bold text-black">
          {initials}
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-[13px] font-medium leading-none">{user?.ad} {user?.soyad}</p>
          <p className="text-[11px] text-muted mt-0.5 leading-none">{user?.email}</p>
        </div>
      </button>
    </header>
  );
}
