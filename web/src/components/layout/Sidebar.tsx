"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Shirt, Sparkles, Bookmark, Plane, Settings, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useUIStore } from "@/lib/store/uiStore";

const NAV = [
  { href: "/dashboard",    label: "Dashboard", icon: LayoutDashboard },
  { href: "/wardrobe",     label: "Wardrobe",  icon: Shirt },
  { href: "/outfits",      label: "Outfits",   icon: Sparkles },
  { href: "/saved-outfits",label: "Saved",     icon: Bookmark },
  { href: "/travel",       label: "Travel",    icon: Plane },
  { href: "/settings",     label: "Settings",  icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { mobileSidebarOpen, closeMobileSidebar } = useUIStore();

  return (
    <aside className={cn(
      "fixed inset-y-0 left-0 z-30 flex w-64 flex-col glass border-r border-white/10 transition-transform duration-300 lg:static lg:translate-x-0",
      mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      <div className="flex h-16 items-center gap-3 px-5 border-b border-white/10">
        <div className="h-8 w-8 rounded-lg bg-gold-gradient flex items-center justify-center">
          <Shirt className="h-4 w-4 text-black" />
        </div>
        <span className="font-semibold text-sm tracking-wide">Smart Wardrobe</span>
        <button className="ml-auto lg:hidden text-muted hover:text-foreground" onClick={closeMobileSidebar}>
          <ChevronLeft className="h-5 w-5" />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link key={href} href={href} className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "bg-gold/10 text-gold" : "text-muted hover:bg-white/5 hover:text-foreground"
            )}>
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
