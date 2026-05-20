"use client";

import { useRef, useCallback } from "react";
import { cn } from "@/lib/utils/cn";

const OTP_LENGTH = 6;

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  disabled?: boolean;
}

/**
 * OtpInput — six individual digit boxes.
 *
 * Features:
 *   - Auto-advances focus to the next box on digit entry
 *   - Backspace on an empty box moves focus back
 *   - Paste of a numeric string fills all boxes at once
 *   - Filled boxes styled with gold border and text
 */
export function OtpInput({
  value,
  onChange,
  error = false,
  disabled = false,
}: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  // Normalise: only digits, max OTP_LENGTH
  const normalise = (raw: string) =>
    raw.replace(/\D/g, "").slice(0, OTP_LENGTH);

  const handleChange = useCallback(
    (index: number, raw: string) => {
      const char = normalise(raw).slice(-1); // take the last typed char
      const arr = value.padEnd(OTP_LENGTH, "").split("");
      arr[index] = char;
      const next = normalise(arr.join(""));
      onChange(next);
      // Advance focus
      if (char && index < OTP_LENGTH - 1) {
        refs.current[index + 1]?.focus();
      }
    },
    [value, onChange]
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace") {
        if (value[index]) {
          // Clear current cell
          const arr = value.split("");
          arr[index] = "";
          onChange(normalise(arr.join("")));
        } else if (index > 0) {
          // Move back to previous cell
          refs.current[index - 1]?.focus();
        }
      }
      if (e.key === "ArrowLeft" && index > 0) {
        refs.current[index - 1]?.focus();
      }
      if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
        refs.current[index + 1]?.focus();
      }
    },
    [value, onChange]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pasted = normalise(e.clipboardData.getData("text"));
      onChange(pasted);
      // Focus the cell after the last pasted digit
      const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
      refs.current[focusIndex]?.focus();
    },
    [onChange]
  );

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  return (
    <div
      className="flex gap-2.5 justify-center"
      onPaste={handlePaste}
      role="group"
      aria-label="One-time password"
    >
      {Array.from({ length: OTP_LENGTH }).map((_, i) => {
        const digit = value[i] ?? "";
        const isFilled = Boolean(digit);

        return (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digit}
            disabled={disabled}
            autoComplete="one-time-code"
            aria-label={`Digit ${i + 1}`}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onFocus={handleFocus}
            className={cn(
              // Layout
              "w-11 h-14 rounded-xl border",
              // Text
              "text-center text-xl font-semibold tabular-nums",
              // Colours
              "bg-card text-text",
              // Transitions + focus
              "transition-all duration-200",
              "focus:outline-none focus:ring-1",
              // States
              error
                ? "border-danger focus:border-danger focus:ring-danger/20"
                : isFilled
                  ? "border-gold/60 text-gold focus:border-gold focus:ring-gold/20"
                  : "border-border focus:border-gold focus:ring-gold/20",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          />
        );
      })}
    </div>
  );
}
