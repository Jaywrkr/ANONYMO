"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

// Entrada con peso: la línea sube rápido y frena seco, como una repetición.
export function Linea({ children, i = 0, className }: { children: ReactNode; i?: number; className?: string }) {
  const quieto = useReducedMotion();
  return (
    <span className={`block overflow-hidden ${className ?? ""}`}>
      <motion.span
        className="block"
        initial={quieto ? false : { y: "105%" }}
        animate={{ y: "0%" }}
        transition={{ duration: 0.9, delay: 0.08 * i, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.span>
    </span>
  );
}
