"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Shirt, Sparkles, BookOpen,
  Settings, X, Plus
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useUIStore } from "@/lib/store/uiStore";
import { useT } from "@/lib/i18n";

// Inline menu implementation

export function Sidebar() {
  const pathname = usePathname();
  const { mobileSidebarOpen, closeMobileSidebar, openModal } = useUIStore();
  const { t } = useT();

  const NavItem = ({
    href,
    label,
    icon: Icon,
  }: {
    href: string;
    label: string;
    icon: React.ElementType;
  }) => {
    const active = pathname === href || pathname.startsWith(href + "/");

    return (
      <Link
        href={href}
        onClick={closeMobileSidebar}
        className={cn(
          "group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all duration-200",
          active
            ? "text-black"
            : "text-muted hover:text-text hover:bg-white/5"
        )}
        style={
          active
            ? {
                background: "linear-gradient(135deg, var(--color-gold) 0%, var(--color-gold-light) 50%, var(--color-gold) 100%)",
                boxShadow: "0 4px 16px var(--color-gold-border)",
              }
            : undefined
        }
      >
        {/* Icon */}
        <span
          className={cn(
            "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl transition-all duration-200",
            active
              ? "bg-black/15"
              : "bg-transparent group-hover:bg-gold/10 group-hover:text-gold"
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>

        <span className="flex-1">{label}</span>

        {/* Hover glow ring */}
        {!active && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            style={{
              boxShadow: "inset 0 0 0 1px var(--color-gold-dim)",
            }}
          />
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={closeMobileSidebar}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex w-[240px] flex-col border-r transition-transform duration-300 lg:static lg:translate-x-0",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        {/* Logo */}
        <div
          className="flex h-[72px] flex-shrink-0 items-center gap-3 px-5 border-b"
          style={{ borderColor: "var(--color-border)" }}
        >
          <div className="h-12 w-12 flex items-center justify-center flex-shrink-0">
            <Image
              src="/SmartWardrobeAI_round_logo.png"
              alt="StyleX"
              width={48}
              height={48}
              className="h-full w-full object-contain"
              priority
            />
          </div>
          <span className="text-[15px] font-black tracking-tight text-text leading-none">
            StyleX
          </span>
          <button
            className="ml-auto lg:hidden p-1 rounded-lg text-muted hover:text-text hover:bg-white/5 transition-colors"
            onClick={closeMobileSidebar}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Main Nav */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin py-5 px-3 space-y-1">
          <p className="px-3 mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted/50">
            {t("web.sidebar.menu")}
          </p>
          <NavItem href="/dashboard" label={t("nav.home")} icon={LayoutDashboard} />
          <NavItem href="/wardrobe" label={t("nav.wardrobe")} icon={Shirt} />

          <NavItem href="/add-item" label={t("nav.add")} icon={Plus} />

          <NavItem href="/outfits" label={t("web.sidebar.ai_outfit")} icon={Sparkles} />
          <NavItem href="/saved-outfits" label={t("nav.archive")} icon={BookOpen} />
        </nav>

        {/* Bottom Nav */}
        <div
          className="flex-shrink-0 px-3 py-4 border-t space-y-1"
          style={{ borderColor: "var(--color-border)" }}
        >
          <NavItem href="/settings" label={t("web.sidebar.settings")} icon={Settings} />
        </div>
      </aside>
    </>
  );
}
