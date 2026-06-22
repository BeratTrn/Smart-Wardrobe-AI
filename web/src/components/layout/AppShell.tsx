"use client";

import { useEffect } from "react";
import { useUIStore } from "@/lib/store/uiStore";
import { useSaveFcmToken } from "@/lib/hooks/useUsers";
import { refreshTokenIfPermitted, listenForForegroundMessages } from "@/lib/firebase";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { closeMobileSidebar, activeModal, closeModal } = useUIStore();
  const saveFcmToken = useSaveFcmToken();

  // Close sidebar on route change
  useEffect(() => { closeMobileSidebar(); }, []); // eslint-disable-line

  // Bildirim izni bu cihazda zaten verilmişse, hangi sayfada/sekmede olursa
  // olsun token'ı sessizce tazele — sadece Ayarlar > Görünüm & Dil sekmesine
  // bağlı kalmasın (mobil uygulamanın açılışta yaptığı gibi).
  useEffect(() => {
    refreshTokenIfPermitted().then((result) => {
      if (result?.ok) saveFcmToken.mutate(result.token);
    });
  }, []); // eslint-disable-line

  // Sekme açık/odaklıyken (foreground) Firebase bildirimi otomatik
  // göstermez — service worker sadece sekme arka plandayken/kapalıyken
  // devreye girer. Bu yüzden foreground mesajları burada elle bir
  // sistem bildirimi olarak gösteriyoruz.
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    listenForForegroundMessages(({ title, body }) => {
      if (typeof window === "undefined" || !("Notification" in window)) return;
      if (Notification.permission !== "granted") return;
      new Notification(title ?? "StyleX", { body, icon: "/SmartWardrobeAI_round_logo.png" });
    }).then((unsub) => { unsubscribe = unsub; });
    return () => unsubscribe?.();
  }, []); // eslint-disable-line

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--color-bg)" }}>
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden" style={{ background: "var(--color-bg)" }}>
        <Topbar />
        <main className="flex-1 overflow-y-auto scrollbar-thin p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
