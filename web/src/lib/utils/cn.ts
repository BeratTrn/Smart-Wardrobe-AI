import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * cn — class name utility
 * Combines clsx conditional logic with tailwind-merge conflict resolution.
 *
 * @example
 * cn("px-4 py-2", isActive && "bg-card text-gold", "rounded-xl")
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
