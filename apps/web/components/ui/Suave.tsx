"use client";

import { useEffect } from "react";
import Lenis from "lenis";

// Scroll con inercia corta. Se apaga con movimiento reducido.
export function Suave() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ duration: 1.05, easing: (t) => 1 - Math.pow(1 - t, 4), anchors: true });
    let raf = 0;
    const loop = (t: number) => { lenis.raf(t); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); lenis.destroy(); };
  }, []);
  return null;
}
