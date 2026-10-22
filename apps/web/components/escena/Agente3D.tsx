"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { AREAS, type Agente } from "@anonymo/agentes";
import { crearMaterialEsfera } from "./material";
import { Prop } from "./Prop";

function semilla(id: string) {
  let h = 2166136261;
  for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return ((h >>> 0) % 1000) / 100;
}

interface Props {
  agente: Agente;
  /** 0 = presente, 1 = apagado (otra fase). */
  apagado?: boolean;
  conProp?: boolean;
  escala?: number;
  posicion?: [number, number, number];
}

// Óvalo de degradado con dos puntos por ojos (referencia: la grilla de 9 óvalos de tu MyMind).
export function Agente3D({ agente, apagado = false, conProp = true, escala = 1, posicion = [0, 0, 0] }: Props) {
  const area = AREAS[agente.area];
  const seed = useMemo(() => semilla(agente.id), [agente.id]);
  const material = useMemo(() => crearMaterialEsfera(area, seed), [area, seed]);
  useEffect(() => () => material.dispose(), [material]);

  const grupo = useRef<THREE.Group>(null);
  const cuerpo = useRef<THREE.Group>(null);
  const ojos = useRef<THREE.Group>(null);
  const dim = useRef(apagado ? 1 : 0);
  const forma = useMemo(() => {
    const r = (n: number) => ((Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
    return { ancho: 0.94 + r(1) * 0.12, alto: 1.06 + r(2) * 0.14, fase: r(3) * 10 };
  }, [seed]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime + forma.fase;
    material.uniforms.uTime.value = state.clock.elapsedTime;
    dim.current = THREE.MathUtils.damp(dim.current, apagado ? 1 : 0, 6, delta);
    material.uniforms.uDim.value = dim.current;
    if (grupo.current) {
      const s = escala * (1 - dim.current * 0.22);
      grupo.current.scale.setScalar(s);
      grupo.current.position.y = posicion[1] + Math.sin(t * 0.8) * 0.04;
      const mx = state.pointer.x, my = state.pointer.y;
      grupo.current.rotation.y = THREE.MathUtils.damp(grupo.current.rotation.y, mx * 0.38, 4, delta);
      grupo.current.rotation.x = THREE.MathUtils.damp(grupo.current.rotation.x, -my * 0.22, 4, delta);
    }
    if (cuerpo.current) {
      const b = Math.sin(t * 1.3) * 0.015;
      cuerpo.current.scale.set(forma.ancho + b, forma.alto - b, forma.ancho + b);
    }
    if (ojos.current) {
      const ciclo = t % 4.6;
      ojos.current.scale.y = ciclo > 4.45 ? 0.15 : 1;
    }
  });

  return (
    <group ref={grupo} position={posicion}>
      <group ref={cuerpo}>
        <mesh material={material}>
          <sphereGeometry args={[1, 96, 96]} />
        </mesh>
      </group>
      <group ref={ojos} position={[0, 0.16 * forma.alto, 0]}>
        {[-0.2, 0.2].map((x) => (
          <mesh key={x} position={[x, 0, Math.sqrt(1 - x * x - 0.03) * forma.ancho + 0.005]} scale={[1, 1.25, 0.45]}>
            <sphereGeometry args={[0.05, 20, 20]} />
            <meshBasicMaterial color={apagado ? "#5a5a5a" : "#111114"} />
          </mesh>
        ))}
      </group>
      {conProp && (
        <group scale={[forma.ancho, forma.alto, forma.ancho]}>
          <Prop tipo={agente.prop} />
        </group>
      )}
    </group>
  );
}
