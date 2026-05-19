"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Shirt,
  Sparkles,
  Heart,
  Plane,
  Settings,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
} from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { useUIStore } from "@/lib/store/uiStore";
import { useThemeStore } from "@/lib/store/themeStore";

// ── Navigation structure ──────────────────────────────────────────────

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const PRIMARY_NAV: NavItem[] = [
  { href: "/dashboard",     label: "Dashboard",      icon: LayoutDashboard },
  { href: "/wardrobe",      label: "Wardrobe",        icon: Shirt           },
  { href: "/outfits",       label: "AI Outfits",      icon: Sparkles        },
  { href: "/saved-outfits", label: "Saved Outfits",   icon: Heart           },
  { href: "/travel",        label: "Travel Planner",  icon: Plane           },
];

const BOTTOM_NAV: NavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings },
];

// ── Sub-components ────────────────────────────────────────────────────

interface NavLinkProps {
  item: NavItem;
  collapsed: boolean;
  isActive: boolean;
}

function NavLink({ item, collapsed, isActive }: NavLinkProps) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      className={cn(
        "relative flex items-center gap-3 rounded-xl transition-all duration-200",
        "text-sm font-medium select-none",
        collapsed ? "justify-center px-0 py-2.5 mx-1" : "px-3 py-2.5",
        isActive
          ? "bg-card text-gold"
          : "text-text-sub hover:bg-card hover:text-text"
      )}
    >
      {/* Gold left-edge accent on active item */}
      {isActive && !collapsed && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-gold rounded-full" />
      )}

      <Icon
        size={17}
        className={cn(
          "shrink-0 transition-colors duration-200",
          isActive ? "text-gold" : "text-muted"
        )}
      />

      {!collapsed && (
        <span className="truncate flex-1 animate-fade-in">{item.label}</span>
      )}

      {/* Active indicator dot (expanded view) */}
      {isActive && !collapsed && (
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-gold shrink-0" />
      )}
    </Link>
  );
}

// ── Main Sidebar Component ────────────────────────────────────────────

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { theme, toggle: toggleTheme } = useThemeStore();
  const pathname = usePathname();

  const isDark = theme === "dark";

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-surface border-r border-border shrink-0",
        "sidebar-transition overflow-hidden",
        sidebarCollapsed ? "w-16" : "w-60"
      )}
    >
      {/* ── Brand Mark ─────────────────────────────────────────────── */}
      <div
        className={cn(
          "flex items-center h-[60px] border-b border-border shrink-0 px-4",
          sidebarCollapsed ? "justify-center" : "gap-3"
        )}
      >
        {/* Gold monogram badge */}
        <div className="w-7 h-7 rounded-lg bg-gold-gradient flex items-center justify-center shrink-0 shadow-card">
          <span className="text-[10px] font-black text-black tracking-tight">
            SW
          </span>
        </div>

        {!sidebarCollapsed && (
          <div className="overflow-hidden animate-fade-in">
            <p className="text-[11px] font-semibold tracking-[0.28em] text-gold uppercase leading-none">
              Smart Wardrobe
            </p>
            <p className="text-[10px] text-muted tracking-[0.2em] mt-0.5 uppercase">
              AI Platform
            </p>
          </div>
        )}
      </div>

      {/* ── Primary Navigation ─────────────────────────────────────── */}
      <nav
        className={cn(
          "flex-1 overflow-y-auto scrollbar-thin py-3 space-y-0.5",
          sidebarCollapsed ? "px-1" : "px-2"
        )}
      >
        {/* Section label — only when expanded */}
        {!sidebarCollapsed && (
          <p className="px-3 pb-2 text-[10px] font-semibold tracking-[0.2em] text-muted uppercase">
            Menu
          </p>
        )}

        {PRIMARY_NAV.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            collapsed={sidebarCollapsed}
            isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
          />
        ))}
      </nav>

      {/* ── Bottom Section ─────────────────────────────────────────── */}
      <div
        className={cn(
          "border-t border-border py-3 space-y-0.5 shrink-0",
          sidebarCollapsed ? "px-1" : "px-2"
        )}
      >
        {BOTTOM_NAV.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            collapsed={sidebarCollapsed}
            isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
          />
        ))}

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          className={cn(
            "flex items-center gap-3 w-full rounded-xl transition-all duration-200",
            "text-sm font-medium text-text-sub hover:bg-card hover:text-text",
            sidebarCollapsed ? "justify-center px-0 py-2.5 mx-1 w-auto" : "px-3 py-2.5"
          )}
        >
          {isDark ? (
            <Sun size={17} className="text-muted shrink-0" />
          ) : (
            <Moon size={17} className="text-muted shrink-0" />
          )}
          {!sidebarCollapsed && (
            <span className="animate-fade-in">
              {isDark ? "Light Mode" : "Dark Mode"}
            </span>
          )}
        </button>

        {/* Collapse / Expand Toggle */}
        <button
          onClick={toggleSidebar}
          title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex items-center gap-3 w-full rounded-xl transition-all duration-200",
            "text-sm font-medium text-muted hover:bg-card hover:text-text-sub",
            sidebarCollapsed ? "justify-center px-0 py-2.5 mx-1 w-auto" : "px-3 py-2.5"
          )}
        >
          {sidebarCollapsed ? (
            <ChevronRight size={17} className="shrink-0" />
          ) : (
            <>
              <ChevronLeft size={17} className="shrink-0" />
              <span className="animate-fade-in">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
