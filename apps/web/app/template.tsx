"use client";

import { motion } from "motion/react";
import { useQuieto } from "@/lib/movimiento";

// Cambio de página con peso: entra rápido desde abajo y frena seco.
export default function Plantilla({ children }: { children: React.ReactNode }) {
  const quieto = useQuieto();
  return (
    <motion.div initial={quieto ? false : { y: 28, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}>
      {children}
    </motion.div>
  );
}
