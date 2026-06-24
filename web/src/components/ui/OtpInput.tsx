"use client";

import { useRef, KeyboardEvent, ClipboardEvent } from "react";
import { cn } from "@/lib/utils/cn";

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  disabled?: boolean;
}

export function OtpInput({ length = 6, value, onChange, error, disabled }: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.split("").slice(0, length);
  while (digits.length < length) digits.push("");

  const update = (idx: number, char: string) => {
    const next = [...digits]; next[idx] = char.slice(-1); onChange(next.join(""));
    if (char && idx < length - 1) refs.current[idx + 1]?.focus();
  };
  const onKey = (idx: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) refs.current[idx - 1]?.focus();
  };
  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    onChange(pasted.padEnd(length, "").slice(0, length));
    refs.current[Math.min(pasted.length, length - 1)]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text" inputMode="numeric" maxLength={1} value={d} disabled={disabled}
          onChange={(e) => update(i, e.target.value.replace(/\D/g, ""))}
          onKeyDown={(e) => onKey(i, e)}
          onPaste={onPaste}
          className={cn(
            "h-12 w-10 rounded-lg border text-center text-lg font-semibold bg-white/5 transition-colors outline-none focus:ring-2 disabled:opacity-50",
            error ? "border-danger focus:border-danger focus:ring-danger/20"
                  : "border-border focus:border-gold focus:ring-gold/20"
          )}
        />
      ))}
    </div>
  );
}
