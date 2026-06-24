import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { User } from "@/types";

function setTokenCookie(token: string) {
  if (typeof document === "undefined") return;
  document.cookie = `sw_token=${token}; max-age=${7 * 24 * 3600}; path=/; SameSite=Lax`;
}
function clearTokenCookie() {
  if (typeof document === "undefined") return;
  document.cookie = "sw_token=; max-age=0; path=/";
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: User) => void;
  updateUser: (user: User) => void;
  logout: () => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (token, user) => {
        setTokenCookie(token);
        set({ token, user, isAuthenticated: true });
      },
      updateUser: (user) => set({ user }),
      logout: () => {
        clearTokenCookie();
        set({ user: null, token: null, isAuthenticated: false });
      },
      clearAuth: () => {
        clearTokenCookie();
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          setTokenCookie(state.token);
          state.isAuthenticated = true;
        }
      },
    }
  )
);
