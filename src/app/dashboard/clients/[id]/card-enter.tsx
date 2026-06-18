"use client";

import { motion } from "motion/react";
import type { PropsWithChildren } from "react";

interface CardEnterProps {
  delay?: number;
  className?: string;
}

export function CardEnter({
  children,
  delay = 0,
  className,
}: PropsWithChildren<CardEnterProps>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut", delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
