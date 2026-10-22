"use client";

import { motion } from "motion/react";
import { useQuieto } from "@/lib/movimiento";
import type { ReactNode } from "react";

// Entrada con peso: la línea sube rápido y frena seco, como una repetición.
export function Linea({ children, i = 0, className }: { children: ReactNode; i?: number; className?: string }) {
  const quieto = useQuieto();
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
