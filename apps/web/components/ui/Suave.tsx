"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { useQuieto } from "@/lib/movimiento";

// Scroll con inercia corta. Se apaga con movimiento reducido.
export function Suave() {
  const quieto = useQuieto();
  // El estudio, su entrada y el portal se usan para trabajar: scroll nativo, sin inercia (sistema/32).
  const interna = /^\/(estudio|entrar|portal)(\/|$)/.test(usePathname() ?? "");
  useEffect(() => {
    if (quieto || interna) return;
    const lenis = new Lenis({ duration: 1.05, easing: (t) => 1 - Math.pow(1 - t, 4), anchors: true });
    let raf = 0;
    const loop = (t: number) => { lenis.raf(t); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); lenis.destroy(); };
  }, [quieto, interna]);
  return null;
}
