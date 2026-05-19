"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { User } from "@/types";

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;

  /** Called after a successful login / register / Google auth response */
  setAuth: (token: string, user: User) => void;

  /** Patch the cached user without a full re-auth (e.g. after profile update) */
  updateUser: (updates: Partial<User>) => void;

  /** Clears all auth state and removes the persisted entry */
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      setAuth: (token, user) =>
        set({ token, user, isAuthenticated: true }),

      updateUser: (updates) => {
        const current = get().user;
        if (!current) return;
        set({ user: { ...current, ...updates } });
      },

      logout: () =>
        set({ token: null, user: null, isAuthenticated: false }),
    }),
    {
      name: "sw-auth",
      storage: createJSONStorage(() => localStorage),
      // Only persist data fields — never persist action functions
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
