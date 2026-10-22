"use client";

import { PerspectiveCamera, View } from "@react-three/drei";
import type { ReactNode } from "react";

export function Vista({ children, className, distancia = 5.6, fov = 34 }: { children: ReactNode; className?: string; distancia?: number; fov?: number }) {
  return (
    <View className={className}>
      <PerspectiveCamera makeDefault position={[0, 0, distancia]} fov={fov} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[2.5, 4, 5]} intensity={1.6} />
      <directionalLight position={[-3, -1, 2]} intensity={0.35} />
      {children}
    </View>
  );
}
