"use client";

import { create } from "zustand";

type ActiveModal = "addItem" | "editItem" | null;

interface UIState {
  /** Desktop sidebar: false = 240px expanded, true = 64px icon-only */
  sidebarCollapsed: boolean;

  /** Mobile sidebar: controls the slide-in overlay */
  mobileSidebarOpen: boolean;

  /** Which modal is currently mounted */
  activeModal: ActiveModal;

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  openMobileSidebar: () => void;
  closeMobileSidebar: () => void;
  openModal: (id: ActiveModal) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  activeModal: null,

  toggleSidebar: () =>
    set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  setSidebarCollapsed: (collapsed) =>
    set({ sidebarCollapsed: collapsed }),

  openMobileSidebar: () =>
    set({ mobileSidebarOpen: true }),

  closeMobileSidebar: () =>
    set({ mobileSidebarOpen: false }),

  openModal: (id) => set({ activeModal: id }),
  closeModal: () => set({ activeModal: null }),
}));
