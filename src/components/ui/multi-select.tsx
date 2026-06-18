"use client";

import * as React from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  emptyText?: string;
  className?: string;
  // Cap how many selected chips are shown before collapsing to "+N more".
  maxChips?: number;
  disabled?: boolean;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  emptyText = "No options",
  className,
  maxChips = 2,
  disabled = false,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const selectedSet = React.useMemo(() => new Set(value), [value]);

  const toggle = (v: string) => {
    const next = new Set(selectedSet);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    onChange(Array.from(next));
  };

  const clear = (
    e?: React.MouseEvent<HTMLElement> | React.PointerEvent<HTMLElement>
  ) => {
    // Radix's DropdownMenuTrigger toggles the menu on `onPointerDown`,
    // not on `onClick`. The X is rendered inside the trigger so we must
    // stop the pointer event too — `stopPropagation` on a click alone is
    // too late (the toggle has already happened). preventDefault suppresses
    // the focus side-effect of the inner click.
    e?.stopPropagation();
    e?.preventDefault();
    onChange([]);
  };

  const stopTriggerToggle = (
    e: React.PointerEvent<HTMLElement> | React.MouseEvent<HTMLElement>
  ) => {
    e.stopPropagation();
    e.preventDefault();
  };

  const visibleChips = value.slice(0, maxChips);
  const overflow = value.length - visibleChips.length;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-10 w-full justify-between gap-2 rounded-xl border-input px-3 font-normal",
            value.length === 0 && "text-muted-foreground",
            className
          )}
        >
          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 text-left">
            {value.length === 0 ? (
              <span className="truncate">{placeholder}</span>
            ) : (
              <>
                {visibleChips.map((v) => {
                  const opt = options.find((o) => o.value === v);
                  return (
                    <span
                      key={v}
                      className="inline-flex max-w-[10rem] items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary"
                    >
                      <span className="truncate">{opt?.label ?? v}</span>
                      <button
                        type="button"
                        aria-label={`Remove ${opt?.label ?? v}`}
                        // Must intercept the pointerdown that Radix's
                        // trigger listens for, otherwise the trigger will
                        // toggle the menu when this X is clicked.
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          toggle(v);
                        }}
                        className="rounded-sm text-primary/70 transition-colors hover:bg-primary/20 hover:text-primary"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  );
                })}
                {overflow > 0 && (
                  <span className="inline-flex items-center rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                    +{overflow} more
                  </span>
                )}
              </>
            )}
          </span>
          <span className="flex shrink-0 items-center gap-1">
            {value.length > 0 && (
              <button
                type="button"
                aria-label="Clear selection"
                // Stop both pointerdown (Radix trigger) and click so the
                // X clears this filter only and never toggles the menu.
                onPointerDown={stopTriggerToggle}
                onClick={clear}
                className="rounded-sm p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="max-h-72 min-w-[var(--radix-dropdown-menu-trigger-width)] overflow-auto p-1"
      >
        {options.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">
            {emptyText}
          </div>
        ) : (
          options.map((opt) => {
            const checked = selectedSet.has(opt.value);
            return (
              <DropdownMenuItem
                key={opt.value}
                onSelect={(e) => {
                  e.preventDefault();
                  toggle(opt.value);
                }}
                className="flex cursor-pointer items-center gap-2 rounded-lg py-1.5"
              >
                <Checkbox
                  checked={checked}
                  className="pointer-events-none"
                  tabIndex={-1}
                  aria-hidden
                />
                <span className="flex-1 truncate text-sm">{opt.label}</span>
                {checked && <Check className="h-4 w-4 text-primary" />}
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
