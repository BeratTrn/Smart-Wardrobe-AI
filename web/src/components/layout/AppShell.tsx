"use client";

import { useEffect } from "react";
import { useUIStore } from "@/lib/store/uiStore";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { closeMobileSidebar, activeModal, closeModal } = useUIStore();

  // Close sidebar on route change
  useEffect(() => { closeMobileSidebar(); }, []); // eslint-disable-line

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#0A0A0A" }}>
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden" style={{ background: "#0F0F0F" }}>
        <Topbar />
        <main className="flex-1 overflow-y-auto scrollbar-thin p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
