"use client";

import { motion } from "motion/react";
import type { PropsWithChildren, ReactNode } from "react";

interface ChartCardProps {
  title: string;
  description?: string;
  delay?: number;
  empty?: boolean;
  emptyText?: string;
  action?: ReactNode;
  children: ReactNode;
}

export function ChartCard({
  title,
  description,
  delay = 0,
  empty,
  emptyText = "No data yet",
  action,
  children,
}: PropsWithChildren<ChartCardProps>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: "easeOut", delay }}
      className="rounded-xl border border-border bg-card text-card-foreground shadow-sm"
    >
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-2">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            {title}
          </h3>
          {description ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="px-5 pb-5">
        {empty ? (
          <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
            {emptyText}
          </div>
        ) : (
          children
        )}
      </div>
    </motion.div>
  );
}
