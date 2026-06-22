"use client";

import tr from "@/locales/tr.json";
import en from "@/locales/en.json";
import de from "@/locales/de.json";
import fr from "@/locales/fr.json";
import { useLanguageStore } from "@/lib/store/languageStore";
import type { Language } from "@/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Dict = Record<string, any>;

const DICTS: Record<Language, Dict> = { tr, en, de, fr };

function lookup(dict: Dict, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in (acc as Dict)) {
      return (acc as Dict)[part];
    }
    return undefined;
  }, dict);
}

/**
 * Translate a dot-path key (e.g. "login.welcome_back") in the given language,
 * with optional {placeholder} interpolation. Falls back to Turkish, then to
 * the raw key, if a translation is missing in the requested language.
 */
export function translate(
  language: Language,
  key: string,
  vars?: Record<string, string | number>
): string {
  let value = lookup(DICTS[language], key);
  if (typeof value !== "string") value = lookup(DICTS.tr, key);
  if (typeof value !== "string") return key;

  if (!vars) return value;
  return value.replace(/\{(\w+)\}/g, (match, name) =>
    name in vars ? String(vars[name]) : match
  );
}

/** Client-side hook: returns t() bound to the currently active language. */
export function useT() {
  const language = useLanguageStore((s) => s.language);
  const t = (key: string, vars?: Record<string, string | number>) =>
    translate(language, key, vars);
  return { t, language };
}

export const LANGUAGES: { value: Language; label: string; flag: string }[] = [
  { value: "tr", label: "Türkçe", flag: "🇹🇷" },
  { value: "en", label: "English", flag: "🇬🇧" },
  { value: "de", label: "Deutsch", flag: "🇩🇪" },
  { value: "fr", label: "Français", flag: "🇫🇷" },
];
