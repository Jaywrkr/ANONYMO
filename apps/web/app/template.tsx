"use client";

import { motion, useReducedMotion } from "motion/react";

// Cambio de página con peso: entra rápido desde abajo y frena seco.
export default function Plantilla({ children }: { children: React.ReactNode }) {
  const quieto = useReducedMotion();
  return (
    <motion.div initial={quieto ? false : { y: 28, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </motion.div>
  );
}
