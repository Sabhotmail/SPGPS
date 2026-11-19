"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

type PageTransitionProps = {
  className?: string;
  children: React.ReactNode;
};

export function PageTransition({ className, children }: PageTransitionProps) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={cn("flex h-full min-h-0 flex-col", className)}
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.2, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
