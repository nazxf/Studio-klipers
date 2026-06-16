"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

import { pageTransition } from "@/lib/motion";

export function AnimatedPage({ children }: { children: ReactNode }) {
  return (
    <motion.div initial="hidden" animate="visible" variants={pageTransition}>
      {children}
    </motion.div>
  );
}
