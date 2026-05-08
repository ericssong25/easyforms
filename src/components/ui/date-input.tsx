"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

function formatToDisplay(isoDate: string): string {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  if (!y || !m || !d) return isoDate;
  return `${m}/${d}/${y}`;
}

function parseFromDisplay(display: string): string | null {
  const digits = display.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  const m = parseInt(digits.slice(0, 2));
  const d = parseInt(digits.slice(2, 4));
  const y = parseInt(digits.slice(4, 8));
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 2100) return null;
  return `${digits.slice(4, 8)}-${digits.slice(0, 2)}-${digits.slice(2, 4)}`;
}

function maskDate(input: string): string {
  const digits = input.replace(/\D/g, "").slice(0, 8);
  let result = "";
  for (let i = 0; i < digits.length; i++) {
    if (i === 2 || i === 4) result += "/";
    result += digits[i];
  }
  return result;
}

export function DateInput({
  value,
  onChange,
  placeholder = "MM/DD/YYYY",
  className,
  id,
}: DateInputProps) {
  const [display, setDisplay] = useState(formatToDisplay(value));

  useEffect(() => {
    setDisplay(formatToDisplay(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskDate(e.target.value);
    setDisplay(masked);

    if (masked.replace(/\D/g, "").length === 8) {
      const parsed = parseFromDisplay(masked);
      if (parsed) onChange(parsed);
    }
  };

  const handleBlur = () => {
    const parsed = parseFromDisplay(display);
    if (parsed) {
      onChange(parsed);
      setDisplay(formatToDisplay(parsed));
    }
  };

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      value={display}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      maxLength={10}
      autoComplete="off"
      className={cn(
        "flex h-9 w-full rounded-xl border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    />
  );
}
