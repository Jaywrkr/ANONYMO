"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { PerformanceMonitor, View } from "@react-three/drei";

// Un solo contexto WebGL para toda la web. Cada <Vista> pinta su escena en el hueco de su elemento.
// Si el equipo no da 50+ fps, baja la resolución antes de que se note.
export function Lienzo() {
  const [body, setBody] = useState<HTMLElement | null>(null);
  const [dpr, setDpr] = useState(1.75);
  useEffect(() => {
    setBody(document.body);
    setDpr(Math.min(2, window.devicePixelRatio || 1));
  }, []);
  if (!body) return null;
  return (
    <Canvas
      eventSource={body}
      eventPrefix="client"
      style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1 }}
      dpr={dpr}
      gl={{ antialias: true, alpha: true, toneMapping: THREE.NoToneMapping, powerPreference: "high-performance" }}
    >
      <PerformanceMonitor
        bounds={() => [45, 58]}
        onDecline={() => setDpr((d) => Math.max(1, d - 0.5))}
        onIncline={() => setDpr((d) => Math.min(Math.min(2, window.devicePixelRatio || 1), d + 0.25))}
      />
      <View.Port />
    </Canvas>
  );
}
