"use client";

import { useUIStore } from "@/lib/store/uiStore";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { cn } from "@/lib/utils/cn";

interface AppShellProps {
  children: React.ReactNode;
}

/**
 * AppShell — the root SaaS layout wrapper.
 *
 * DESKTOP (lg+):
 *   Sidebar is a flex sibling — it pushes the main content area.
 *   Collapsing the sidebar transitions it from 240px → 64px.
 *
 * MOBILE (< lg):
 *   Sidebar is position:fixed, slides in as an overlay from the left.
 *   A semi-transparent backdrop closes it on click.
 *   Main content always occupies the full width.
 */
export function AppShell({ children }: AppShellProps) {
  const { mobileSidebarOpen, closeMobileSidebar } = useUIStore();

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {/* ── Mobile backdrop ────────────────────────────────────────── */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={closeMobileSidebar}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ────────────────────────────────────────────────── */}
      {/*
       * Desktop: participates in normal flex flow (no fixed positioning).
       * Mobile:  fixed overlay, slides in from left when mobileSidebarOpen.
       */}
      <div
        className={cn(
          // Mobile: fixed overlay behavior
          "fixed top-0 left-0 h-full z-40",
          "transition-transform duration-280 ease-[cubic-bezier(0.4,0,0.2,1)]",
          "lg:relative lg:z-auto lg:translate-x-0 lg:transition-none",
          // Slide in/out on mobile
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <Sidebar />
      </div>

      {/* ── Main Content Area ──────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar />

        <main
          className={cn(
            "flex-1 overflow-y-auto scrollbar-thin",
            "p-5 sm:p-6 lg:p-8",
            "animate-fade-in"
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
