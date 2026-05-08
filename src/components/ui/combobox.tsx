"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";
import type { SearchResult } from "@/lib/search";

interface ComboboxProps {
  options: string[] | SearchResult[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  className?: string;
  allowCustom?: boolean;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Search...",
  emptyText = "No results found. Type to add custom.",
  className,
  allowCustom = true,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || "");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Determine if options are SearchResult[] or string[]
  const isSearchResults =
    options.length > 0 && typeof options[0] === "object";

  const filtered = isSearchResults
    ? (options as SearchResult[])
    : (options as string[]).filter((opt) =>
        opt.toLowerCase().includes(inputValue.toLowerCase())
      );

  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    setHighlightIndex(0);
  }, [inputValue]);

  const selectOption = (opt: string) => {
    onChange(opt);
    setInputValue(opt);
    setOpen(false);
    inputRef.current?.blur();
  };

  const getOptionLabel = (opt: string | SearchResult): string =>
    typeof opt === "string" ? opt : opt.label;

  const getOptionSublabel = (opt: string | SearchResult): string | undefined =>
    typeof opt === "string" ? undefined : opt.sublabel;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        setOpen(true);
        e.preventDefault();
      }
      return;
    }

    const list = filtered as (string | SearchResult)[];
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightIndex((prev) => (prev < list.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightIndex((prev) => (prev > 0 ? prev - 1 : list.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (list.length > 0 && list[highlightIndex]) {
          selectOption(getOptionLabel(list[highlightIndex]));
        } else if (allowCustom) {
          const trimmed = inputValue.trim();
          if (trimmed) {
            onChange(trimmed);
            setOpen(false);
            inputRef.current?.blur();
          }
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
    }
  };

  const isSelected = (opt: string | SearchResult): boolean =>
    value.toLowerCase() === getOptionLabel(opt).toLowerCase();

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex h-9 w-full rounded-xl border border-input bg-transparent px-3 py-1 pr-8 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={open ? "combobox-listbox" : undefined}
        />
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
          tabIndex={-1}
        >
          <ChevronsUpDown className="h-4 w-4" />
        </button>
      </div>

      {open && (
        <div
          id="combobox-listbox"
          role="listbox"
          className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-xl border bg-popover p-1 shadow-md"
        >
          {(filtered as (string | SearchResult)[]).length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              {emptyText}
            </div>
          ) : (
            (filtered as (string | SearchResult)[]).map((opt, i) => (
              <button
                key={getOptionLabel(opt)}
                type="button"
                role="option"
                aria-selected={isSelected(opt)}
                onClick={() => selectOption(getOptionLabel(opt))}
                className={cn(
                  "flex w-full items-center rounded-lg px-3 py-1.5 text-left",
                  i === highlightIndex
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-accent/50"
                )}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4 shrink-0",
                    isSelected(opt) ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="min-w-0 flex-1">
                  <span className="text-sm">{getOptionLabel(opt)}</span>
                  {getOptionSublabel(opt) && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {getOptionSublabel(opt)}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
