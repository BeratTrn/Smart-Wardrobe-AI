"use client";

import { useEffect } from "react";
import { useUIStore } from "@/lib/store/uiStore";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { mobileSidebarOpen, closeMobileSidebar } = useUIStore();

  useEffect(() => { closeMobileSidebar(); }, []); // eslint-disable-line

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/40 backdrop-blur-sm lg:hidden" onClick={closeMobileSidebar} />
      )}
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
