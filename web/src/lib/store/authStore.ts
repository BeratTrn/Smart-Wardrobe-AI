"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { User } from "@/types";

// Cookie helpers
// The JWT is stored in BOTH localStorage (via Zustand persist, for
// the Axios interceptor) AND a plain cookie (for the edge middleware,
// which cannot read localStorage).

const COOKIE_NAME = "sw_token";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

function setTokenCookie(token: string): void {
  if (typeof document === "undefined") return;
  document.cookie = [
    `${COOKIE_NAME}=${token}`,
    "path=/",
    `max-age=${COOKIE_MAX_AGE}`,
    "SameSite=Lax",
  ].join("; ");
}

function clearTokenCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}

// Store interface

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;

  /** Called after a successful login / register / Google auth response */
  setAuth: (token: string, user: User) => void;

  /** Patch the cached user without a full re-auth (e.g. after profile update) */
  updateUser: (updates: Partial<User>) => void;

  /** Clears all auth state, localStorage entry, and cookie */
  logout: () => void;
}

// Store

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      setAuth: (token, user) => {
        set({ token, user, isAuthenticated: true });
        setTokenCookie(token);
      },

      updateUser: (updates) => {
        const current = get().user;
        if (!current) return;
        set({ user: { ...current, ...updates } });
      },

      logout: () => {
        set({ token: null, user: null, isAuthenticated: false });
        clearTokenCookie();
      },
    }),
    {
      name: "sw-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Re-sync cookie after hydration (covers hard refresh scenarios)
        if (state?.token) {
          setTokenCookie(state.token);
        }
      },
    }
  )
);
