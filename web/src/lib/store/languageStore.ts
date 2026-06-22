"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Language } from "@/types";

interface LanguageState {
  language: Language;
  setLanguage: (language: Language) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: "tr",
      setLanguage: (language) => set({ language }),
    }),
    {
      name: "sw-language",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
