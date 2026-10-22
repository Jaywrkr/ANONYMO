"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { PerformanceMonitor, View } from "@react-three/drei";
import { decidirCalidad, sin3D, type Calidad } from "@/lib/calidad";
import { mirarA } from "./Agente3D";

const TECHO: Record<Calidad, number> = { alta: 2, media: 1.5, baja: 1 };

// Un solo contexto WebGL para toda la web. Cada <Vista> pinta su escena en el hueco de su elemento.
// Se crea cuando el navegador está libre (o al primer gesto), para que el texto cargue primero.
// Si el equipo no da 45+ fps, baja la resolución antes de que se note.
export function Lienzo() {
  const [body, setBody] = useState<HTMLElement | null>(null);
  const [calidad, setCalidad] = useState<Calidad>("alta");
  const [dpr, setDpr] = useState(1);
  useEffect(() => {
    if (sin3D()) return;
    let hecho = false;
    const montar = () => {
      if (hecho) return;
      hecho = true;
      const c = decidirCalidad();
      setCalidad(c);
      setDpr(Math.min(TECHO[c], window.devicePixelRatio || 1));
      setBody(document.body);
    };
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    const id = ric ? ric(montar, { timeout: 1500 }) : window.setTimeout(montar, 600);
    const gesto = () => montar();
    window.addEventListener("pointermove", gesto, { once: true, passive: true });
    window.addEventListener("scroll", gesto, { once: true, passive: true });
    window.addEventListener("touchstart", gesto, { once: true, passive: true });
    return () => {
      if (!ric) clearTimeout(id);
      window.removeEventListener("pointermove", gesto);
      window.removeEventListener("scroll", gesto);
      window.removeEventListener("touchstart", gesto);
    };
  }, []);
  // Táctil: los agentes miran al dedo; al hacer scroll, miran hacia donde va la página.
  useEffect(() => {
    if (!body || !matchMedia("(pointer: coarse)").matches) return;
    const dedo = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) mirarA((t.clientX / innerWidth) * 2 - 1, -((t.clientY / innerHeight) * 2 - 1));
    };
    let ultimoY = scrollY;
    const scroll = () => {
      const dy = scrollY - ultimoY;
      ultimoY = scrollY;
      if (Math.abs(dy) > 2) mirarA(0, Math.max(-0.8, Math.min(0.8, -dy / 40)));
    };
    addEventListener("touchstart", dedo, { passive: true });
    addEventListener("touchmove", dedo, { passive: true });
    addEventListener("scroll", scroll, { passive: true });
    return () => {
      removeEventListener("touchstart", dedo);
      removeEventListener("touchmove", dedo);
      removeEventListener("scroll", scroll);
    };
  }, [body]);
  if (!body) return null;
  return (
    <Canvas
      eventSource={body}
      eventPrefix="client"
      style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1 }}
      dpr={dpr}
      gl={{ antialias: calidad === "alta", alpha: true, toneMapping: THREE.NoToneMapping, powerPreference: calidad === "baja" ? "low-power" : "high-performance" }}
      onCreated={() => document.documentElement.setAttribute("data-tresd", "1")}
    >
      <PerformanceMonitor
        bounds={() => [45, 58]}
        onDecline={() => setDpr((d) => Math.max(0.75, d - 0.25))}
        onIncline={() => setDpr((d) => Math.min(TECHO[calidad], window.devicePixelRatio || 1, d + 0.25))}
      />
      <View.Port />
    </Canvas>
  );
}
