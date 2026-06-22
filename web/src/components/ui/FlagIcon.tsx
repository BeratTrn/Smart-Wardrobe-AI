import type { Language } from "@/types";

/**
 * Small, crisp flag glyphs rendered as inline SVG instead of emoji.
 * Emoji flags ("🇹🇷" etc.) fall back to plain two-letter text on Windows
 * (no regional-indicator glyphs in most system fonts), so we draw the
 * flags ourselves to guarantee they always look like flags everywhere.
 */
export function FlagIcon({ code, className = "h-4 w-5" }: { code: Language; className?: string }) {
  const common = "rounded-[2px] overflow-hidden flex-shrink-0 ring-1 ring-black/10";

  switch (code) {
    case "tr":
      return (
        <svg viewBox="0 0 30 20" className={`${common} ${className}`} aria-hidden>
          <rect width="30" height="20" fill="#E30A17" />
          <circle cx="12" cy="10" r="5" fill="#fff" />
          <circle cx="13.2" cy="10" r="4" fill="#E30A17" />
          <path
            fill="#fff"
            d="M19.5 6.8l1.2 3.3 3.5.1-2.8 2.1 1 3.4-2.9-2-2.9 2 1-3.4-2.8-2.1 3.5-.1z"
          />
        </svg>
      );
    case "de":
      return (
        <svg viewBox="0 0 30 20" className={`${common} ${className}`} aria-hidden>
          <rect width="30" height="20" fill="#FFCE00" />
          <rect width="30" height="13.33" fill="#000" />
          <rect width="30" height="6.67" fill="#D00" />
        </svg>
      );
    case "fr":
      return (
        <svg viewBox="0 0 30 20" className={`${common} ${className}`} aria-hidden>
          <rect width="30" height="20" fill="#fff" />
          <rect width="10" height="20" fill="#0055A4" />
          <rect x="20" width="10" height="20" fill="#EF4135" />
        </svg>
      );
    case "en":
    default:
      return (
        <svg viewBox="0 0 30 20" className={`${common} ${className}`} aria-hidden>
          <rect width="30" height="20" fill="#012169" />
          <path d="M0 0L30 20M30 0L0 20" stroke="#fff" strokeWidth="3" />
          <path d="M0 0L30 20M30 0L0 20" stroke="#C8102E" strokeWidth="1.2" />
          <path d="M15 0V20M0 10H30" stroke="#fff" strokeWidth="5" />
          <path d="M15 0V20M0 10H30" stroke="#C8102E" strokeWidth="2.4" />
        </svg>
      );
  }
}
