"use client";

import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

// ── Types ─────────────────────────────────────────────────────────────

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner and disables the button */
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

// ── Variant styles ────────────────────────────────────────────────────

const VARIANT: Record<ButtonVariant, string> = {
  primary: [
    "bg-gold-gradient text-black shadow-card font-semibold",
    "hover:opacity-90 hover:shadow-card-lg active:scale-[0.98]",
  ].join(" "),

  secondary: [
    "border border-border text-text-sub bg-transparent",
    "hover:bg-card hover:text-text",
  ].join(" "),

  ghost: [
    "text-text-sub bg-transparent",
    "hover:bg-card hover:text-text",
  ].join(" "),

  danger: [
    "bg-danger/10 text-danger border border-danger/20",
    "hover:bg-danger/20",
  ].join(" "),
};

const SIZE: Record<ButtonSize, string> = {
  sm: "h-8  px-3  text-xs  gap-1.5 rounded-lg",
  md: "h-11 px-5  text-sm  gap-2   rounded-xl",
  lg: "h-12 px-6  text-base gap-2   rounded-xl",
};

// ── Component ─────────────────────────────────────────────────────────

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      children,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={cn(
          "relative inline-flex items-center justify-center",
          "font-medium transition-all duration-200 select-none",
          "focus-visible:outline-none focus-visible:ring-2",
          "focus-visible:ring-gold focus-visible:ring-offset-2",
          "focus-visible:ring-offset-bg",
          SIZE[size],
          VARIANT[variant],
          isDisabled && "opacity-50 cursor-not-allowed pointer-events-none",
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        {children}
        {!loading && rightIcon && (
          <span className="shrink-0">{rightIcon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
