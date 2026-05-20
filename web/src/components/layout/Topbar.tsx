"use client";

import { usePathname } from "next/navigation";
import { Bell, Menu, Search } from "lucide-react";
import Image from "next/image";

import { cn } from "@/lib/utils/cn";
import { useAuthStore } from "@/lib/store/authStore";
import { useUIStore } from "@/lib/store/uiStore";

// ── Page title resolution ─────────────────────────────────────────────

const ROUTE_TITLES: [string, string][] = [
  ["/dashboard",     "Dashboard"],
  ["/wardrobe",      "My Wardrobe"],
  ["/outfits",       "AI Outfits"],
  ["/saved-outfits", "Saved Outfits"],
  ["/travel",        "Travel Planner"],
  ["/settings",      "Settings"],
];

function resolvePageTitle(pathname: string): string {
  for (const [path, title] of ROUTE_TITLES) {
    if (pathname === path || pathname.startsWith(path + "/")) return title;
  }
  return "Smart Wardrobe AI";
}

// ── Avatar ────────────────────────────────────────────────────────────

interface AvatarProps {
  src?: string;
  name?: string;
  size?: number;
}

function Avatar({ src, name = "SW", size = 32 }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover border border-border"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="rounded-full bg-gold-gradient flex items-center justify-center shrink-0 shadow-card"
      style={{ width: size, height: size }}
    >
      <span
        className="font-bold text-black leading-none"
        style={{ fontSize: size * 0.34 }}
      >
        {initials}
      </span>
    </div>
  );
}

// ── Topbar Component ──────────────────────────────────────────────────

export function Topbar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { openMobileSidebar } = useUIStore();

  const pageTitle = resolvePageTitle(pathname);

  return (
    <header
      className={cn(
        "h-[60px] flex items-center justify-between px-4 sm:px-6 shrink-0",
        "glass border-b border-border sticky top-0 z-20"
      )}
    >
      {/* ── Left: Mobile menu + page title ─────────────────────────── */}
      <div className="flex items-center gap-3">
        {/* Hamburger — only visible on mobile (lg:hidden handled in AppShell) */}
        <button
          onClick={openMobileSidebar}
          className={cn(
            "lg:hidden p-2 rounded-xl",
            "text-text-sub hover:text-text hover:bg-card",
            "transition-colors duration-200"
          )}
          aria-label="Open navigation"
        >
          <Menu size={18} />
        </button>

        <h1 className="text-[15px] font-semibold text-text tracking-tight">
          {pageTitle}
        </h1>
      </div>

      {/* ── Right: Search + Bell + User ────────────────────────────── */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Search trigger (wired in Phase 2) */}
        <button
          className={cn(
            "hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl",
            "text-xs text-muted border border-border",
            "hover:border-gold hover:text-text-sub",
            "transition-all duration-200 cursor-pointer"
          )}
          aria-label="Search"
        >
          <Search size={13} />
          <span className="hidden md:block">Search...</span>
          <kbd className="hidden md:block text-[10px] px-1.5 py-0.5 rounded bg-card border border-border font-mono">
            K
          </kbd>
        </button>

        {/* Notification bell */}
        <button
          className={cn(
            "relative p-2 rounded-xl",
            "text-text-sub hover:text-text hover:bg-card",
            "transition-colors duration-200"
          )}
          aria-label="Notifications"
        >
          <Bell size={17} />
          {/* Unread indicator */}
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-gold ring-1 ring-surface" />
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-border mx-1" />

        {/* User identity */}
        <button
          className={cn(
            "flex items-center gap-2.5 pl-2 rounded-xl",
            "hover:bg-card transition-colors duration-200 py-1 pr-2"
          )}
        >
          <Avatar
            src={user?.profilFoto || undefined}
            name={user?.kullaniciAdi || "Smart Wardrobe"}
            size={30}
          />
          <div className="hidden sm:block text-left">
            <p className="text-[13px] font-medium text-text leading-none">
              {user?.kullaniciAdi ?? "Welcome"}
            </p>
            <p className="text-[11px] text-muted mt-0.5 leading-none">
              {user?.email}
            </p>
          </div>
        </button>
      </div>
    </header>
  );
}
