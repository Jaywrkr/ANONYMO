"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { View } from "@react-three/drei";

// Un solo contexto WebGL para toda la web. Cada <Vista> pinta su escena en el hueco de su elemento.
export function Lienzo() {
  const [body, setBody] = useState<HTMLElement | null>(null);
  useEffect(() => setBody(document.body), []);
  if (!body) return null;
  return (
    <Canvas
      eventSource={body}
      className="!fixed inset-0 !pointer-events-none"
      style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 1 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, toneMapping: THREE.NoToneMapping }}
    >
      <View.Port />
    </Canvas>
  );
}
