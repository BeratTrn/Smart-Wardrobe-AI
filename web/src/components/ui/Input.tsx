"use client";

import { forwardRef, useId } from "react";
import { cn } from "@/lib/utils/cn";

// ── Types ─────────────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  /** Shown in red below the input, replaces hint */
  error?: string;
  /** Secondary helper text shown below the input */
  hint?: string;
  leftIcon?: React.ReactNode;
  /** Any node rendered inside the right edge (e.g. password toggle) */
  rightElement?: React.ReactNode;
}

// ── Component ─────────────────────────────────────────────────────────

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { label, error, hint, leftIcon, rightElement, className, id, ...props },
    ref
  ) => {
    const autoId = useId();
    const inputId = id ?? autoId;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-text-sub tracking-wide"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {/* Left icon */}
          {leftIcon && (
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            className={cn(
              // Layout
              "w-full h-11 rounded-xl border",
              // Colours
              "bg-card text-text placeholder:text-muted",
              // Typography
              "text-sm",
              // Spacing
              leftIcon ? "pl-10" : "pl-3.5",
              rightElement ? "pr-10" : "pr-3.5",
              // Transitions + focus
              "transition-all duration-200",
              "focus:outline-none focus:ring-1",
              // Normal / error border states
              error
                ? "border-danger focus:border-danger focus:ring-danger/20"
                : "border-border focus:border-gold focus:ring-gold/20",
              // Disabled
              "disabled:opacity-50 disabled:cursor-not-allowed",
              className
            )}
            {...props}
          />

          {/* Right element (e.g. password visibility toggle) */}
          {rightElement && (
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2">
              {rightElement}
            </span>
          )}
        </div>

        {/* Error or hint */}
        {error ? (
          <p className="flex items-center gap-1.5 text-xs text-danger">
            <span className="inline-block w-1 h-1 rounded-full bg-danger shrink-0" />
            {error}
          </p>
        ) : hint ? (
          <p className="text-xs text-muted">{hint}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
