"use client";

import { MotionConfig } from "motion/react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cambiarQuieto, useQuieto } from "@/lib/movimiento";
import { idiomaDeRuta } from "@/lib/idioma";

/** Toda la web anima o no según la preferencia (sistema o interruptor). */
export function Movimiento({ children }: { children: ReactNode }) {
  const quieto = useQuieto();
  return <MotionConfig reducedMotion={quieto ? "always" : "never"}>{children}</MotionConfig>;
}

export function InterruptorMovimiento() {
  const quieto = useQuieto();
  const en = idiomaDeRuta(usePathname()) === "en";
  return (
    <button onClick={() => cambiarQuieto(!quieto)} aria-pressed={quieto} className="uppercase hover:text-tinta">
      {en ? (quieto ? "Motion: reduced" : "Motion: on") : quieto ? "Movimiento: reducido" : "Movimiento: activado"}
    </button>
  );
}
