"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Shirt, Sparkles, BookOpen,
  Settings, X, Plus
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useUIStore } from "@/lib/store/uiStore";

// Inline menu implementation

const NAV_BOTTOM = [
  { href: "/settings", label: "Ayarlar", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { mobileSidebarOpen, closeMobileSidebar, openModal } = useUIStore();

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
                background: "linear-gradient(135deg, #C9A84C 0%, #E8C97A 50%, #C9A84C 100%)",
                boxShadow: "0 4px 16px rgba(201,168,76,0.25)",
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
              boxShadow: "inset 0 0 0 1px rgba(201,168,76,0.15)",
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
        style={{ background: "#0D0D0D", borderColor: "#1A1A15" }}
      >
        {/* Logo */}
        <div
          className="flex h-[72px] flex-shrink-0 items-center gap-3 px-5 border-b"
          style={{ borderColor: "#1A1A15" }}
        >
          <div
            className="h-9 w-9 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #C9A84C 0%, #E8C97A 100%)",
            }}
          >
            <Shirt className="h-4.5 w-4.5 text-black" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-[15px] font-black tracking-tight text-text">StyleX</span>
            <span className="text-[10px] text-muted tracking-[0.15em] uppercase mt-0.5">
              Smart Wardrobe
            </span>
          </div>
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
            Menü
          </p>
          <NavItem href="/dashboard" label="Ana Sayfa" icon={LayoutDashboard} />
          <NavItem href="/wardrobe" label="Dolabım" icon={Shirt} />
          
          <NavItem href="/add-item" label="Kıyafet Ekle" icon={Plus} />

          <NavItem href="/outfits" label="AI Kombin" icon={Sparkles} />
          <NavItem href="/saved-outfits" label="Stil Arşivim" icon={BookOpen} />
        </nav>

        {/* Bottom Nav */}
        <div
          className="flex-shrink-0 px-3 py-4 border-t space-y-1"
          style={{ borderColor: "#1A1A15" }}
        >
          {NAV_BOTTOM.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}
        </div>
      </aside>
    </>
  );
}
