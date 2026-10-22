"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { AREAS, type Agente } from "@anonymo/agentes";
import { crearMaterialEsfera, factorForma, FORMA_AREA } from "./material";
import { Prop } from "./Prop";

function semilla(id: string) {
  let h = 2166136261;
  for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return ((h >>> 0) % 1000) / 100;
}

/** Cómo se mueve cada uno cuando nadie lo toca. */
interface Caracter {
  flota: number; // altura del vaivén
  ritmo: number; // velocidad del vaivén
  salto: number; // saltitos periódicos (0 = nunca)
  balanceo: number; // inclinación lateral
}
const CARACTER: Record<string, Partial<Caracter>> = {
  atlas: { flota: 0.025, ritmo: 0.55 },
  ledger: { flota: 0.015, ritmo: 0.45 },
  kine: { salto: 0.16, ritmo: 1.4 },
  chispa: { salto: 0.12, ritmo: 1.2 },
  eco: { balanceo: 0.12, ritmo: 0.7 },
  lumen: { flota: 0.08, ritmo: 0.6 },
  escena: { balanceo: 0.08, salto: 0.06 },
  trofeo: { flota: 0.05, ritmo: 0.5 },
  corte: { salto: 0.05, ritmo: 1.6 },
};
const BASE: Caracter = { flota: 0.04, ritmo: 0.8, salto: 0, balanceo: 0.02 };

/** Proporción base por área: Mando alto, Estrategia achatado, Producto redondo. */
const PROPORCION: Record<string, [number, number]> = {
  mando: [0.9, 1.24],
  estrategia: [1.12, 0.92],
  marca: [1.0, 1.12],
  producto: [1.0, 1.0],
  comunicacion: [0.98, 1.08],
  crecimiento: [1.0, 1.1],
};

type Ojo = "punto" | "media" | "entre" | "grande";
const OJOS: Record<string, Ojo> = {
  ledger: "entre", sonda: "entre", vector: "entre", prisma: "entre", lente: "entre", pulso: "entre",
  verba: "media", rhea: "media", eco: "media", chispa: "media", escena: "media",
  nova: "grande", lumen: "grande", kine: "grande", faro: "grande", trofeo: "grande",
};

// Geometrías compartidas por todos los agentes.
let GEO_MEDIA: THREE.TorusGeometry | null = null;
let GEO_CUERPO: THREE.SphereGeometry | null = null;
let GEO_OJO: THREE.SphereGeometry | null = null;
let TEX_SOMBRA: THREE.CanvasTexture | null = null;
function recursos() {
  if (!GEO_CUERPO) GEO_CUERPO = new THREE.SphereGeometry(1, 56, 56);
  if (!GEO_OJO) GEO_OJO = new THREE.SphereGeometry(0.05, 20, 20);
  if (!GEO_MEDIA) GEO_MEDIA = new THREE.TorusGeometry(0.055, 0.016, 8, 20, Math.PI);
  if (!TEX_SOMBRA) {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d")!;
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, "rgba(20,18,16,0.55)");
    gr.addColorStop(0.55, "rgba(20,18,16,0.18)");
    gr.addColorStop(1, "rgba(20,18,16,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
    TEX_SOMBRA = new THREE.CanvasTexture(c);
  }
  return { cuerpo: GEO_CUERPO, ojo: GEO_OJO, media: GEO_MEDIA!, sombra: TEX_SOMBRA };
}

// Mirada compartida: si el cursor no se mueve en 3 s, los agentes miran a su alrededor solos.
const mirada = { x: 0, y: 0, ultimo: 0 };

interface Props {
  agente: Agente;
  apagado?: boolean;
  conProp?: boolean;
  escala?: number;
  posicion?: [number, number, number];
  /** 0–1: el cursor está encima. */
  encima?: boolean;
  /** Cambia en cada clic para disparar el rebote. */
  toque?: number;
  sombra?: boolean;
}

// Óvalo de degradado con dos puntos por ojos (referencia: la grilla de 9 óvalos).
export function Agente3D({ agente, apagado = false, conProp = true, escala = 1, posicion = [0, 0, 0], encima = false, toque = 0, sombra = true }: Props) {
  const area = AREAS[agente.area];
  const seed = useMemo(() => semilla(agente.id), [agente.id]);
  const material = useMemo(() => crearMaterialEsfera(area, seed, agente.tono), [area, seed, agente.tono]);
  useEffect(() => () => material.dispose(), [material]);
  const { cuerpo: geoCuerpo, ojo: geoOjo, media: geoMedia, sombra: texSombra } = useMemo(recursos, []);
  const tipoOjo: Ojo = OJOS[agente.id] ?? "punto";
  const silueta = FORMA_AREA[agente.area];
  const car = { ...BASE, ...CARACTER[agente.id] };

  const grupo = useRef<THREE.Group>(null);
  const cuerpo = useRef<THREE.Group>(null);
  const ojos = useRef<THREE.Group>(null);
  const prop = useRef<THREE.Group>(null);
  const sombraRef = useRef<THREE.Mesh>(null);
  const est = useRef({ dim: apagado ? 1 : 0, hover: 0, rebote: 0, ultimoToque: toque, px: 0, py: 0, entra: 0 });

  const forma = useMemo(() => {
    const r = (n: number) => ((Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
    const [pa, pb] = PROPORCION[agente.area];
    return { ancho: pa + (r(1) - 0.5) * 0.08, alto: pb + (r(2) - 0.5) * 0.08, fase: r(3) * 10 };
  }, [seed, agente.area]);

  useFrame((state, delta) => {
    const e = est.current;
    const reloj = state.clock.elapsedTime;
    const t = reloj + forma.fase;
    const dt = Math.min(delta, 0.05);

    // Mirada: cursor real o paseo automático.
    if (state.pointer.x !== e.px || state.pointer.y !== e.py) {
      e.px = state.pointer.x; e.py = state.pointer.y; mirada.ultimo = reloj;
      mirada.x = state.pointer.x; mirada.y = state.pointer.y;
    } else if (reloj - mirada.ultimo > 3) {
      const k = Math.min(1, (reloj - mirada.ultimo - 3) / 2);
      mirada.x = Math.sin(reloj * 0.35) * 0.35 * k;
      mirada.y = Math.sin(reloj * 0.23 + 1) * 0.2 * k;
    }

    if (toque !== e.ultimoToque) { e.ultimoToque = toque; e.rebote = 1; }
    e.rebote = Math.max(0, e.rebote - dt * 1.8);
    e.dim = THREE.MathUtils.damp(e.dim, apagado ? 1 : 0, 6, dt);
    e.entra = Math.min(1, e.entra + dt * 1.6);
    // Entrada con rebote: llega desde abajo y se asienta.
    const c1 = 1.70158, c3 = c1 + 1, u = e.entra - 1;
    const entrada = 1 + c3 * u * u * u + c1 * u * u;
    e.hover = THREE.MathUtils.damp(e.hover, encima && !apagado ? 1 : 0, 9, dt);
    material.uniforms.uTime.value = reloj;
    material.uniforms.uDim.value = e.dim;

    // Rebote amortiguado tras un clic.
    const rb = e.rebote > 0 ? Math.sin((1 - e.rebote) * Math.PI * 3) * e.rebote : 0;
    const salto = car.salto ? Math.max(0, Math.sin(t * car.ritmo * 2.2)) ** 6 * car.salto : 0;
    const y = Math.sin(t * car.ritmo) * car.flota + salto + e.hover * 0.12 + Math.max(0, rb) * 0.25;

    if (grupo.current) {
      const s = escala * (1 - e.dim * 0.22) * (1 + e.hover * 0.06) * Math.max(0.001, entrada);
      grupo.current.scale.setScalar(s);
      grupo.current.position.set(0, y * escala, 0);
      grupo.current.rotation.y = THREE.MathUtils.damp(grupo.current.rotation.y, THREE.MathUtils.clamp(mirada.x, -1, 1) * 0.36 * (1 - e.dim), 4, dt);
      grupo.current.rotation.x = THREE.MathUtils.damp(grupo.current.rotation.x, -mirada.y * 0.24 * (1 - e.dim), 4, dt);
      grupo.current.rotation.z = Math.sin(t * car.ritmo * 0.8) * car.balanceo;
    }
    if (cuerpo.current) {
      const resp = Math.sin(t * 1.3) * 0.015;
      const squash = rb * 0.12 + salto * 0.35;
      cuerpo.current.scale.set(forma.ancho + resp + squash, forma.alto - resp - squash, forma.ancho + resp + squash);
    }
    if (ojos.current) {
      const parpadeo = t % 4.6 > 4.45 ? 0.12 : 1;
      const sorpresa = 1 + e.hover * 0.35;
      ojos.current.scale.set(sorpresa, parpadeo * sorpresa, 1);
      ojos.current.position.x = THREE.MathUtils.damp(ojos.current.position.x, mirada.x * 0.06, 6, dt);
      ojos.current.position.y = THREE.MathUtils.damp(ojos.current.position.y, 0.16 * forma.alto + mirada.y * 0.05, 6, dt);
    }
    if (prop.current) {
      prop.current.rotation.y = Math.sin(t * 0.9) * 0.05 + e.hover * Math.sin(reloj * 6) * 0.06;
      prop.current.position.y = e.hover * 0.06;
    }
    if (sombraRef.current) {
      const k = 1 - Math.min(1, y * 2.2);
      sombraRef.current.scale.set(1.5 * k * forma.ancho, 0.3 * k, 1);
      (sombraRef.current.material as THREE.MeshBasicMaterial).opacity = (0.75 * k) * (1 - e.dim * 0.6);
    }
  });

  return (
    <group position={posicion}>
      {sombra && (
        <mesh ref={sombraRef} position={[0, -1.32 * escala, -0.4]} scale={[1.5, 0.3, 1]}>
          <planeGeometry args={[escala * 1.2, escala * 1.2]} />
          <meshBasicMaterial map={texSombra} transparent depthWrite={false} />
        </mesh>
      )}
      <group ref={grupo}>
        <group ref={cuerpo}>
          <mesh geometry={geoCuerpo} material={material} />
        </group>
        <group ref={ojos} position={[0, 0.16 * forma.alto, 0]}>
          {[-0.2, 0.2].map((x) => {
            const f = factorForma(silueta, 0.17);
            const z = Math.sqrt(Math.max(0, 1 - x * x - 0.03)) * forma.ancho * f + 0.045;
            const px = x * f + (silueta === 2 ? 0.035 : 0);
            const color = <meshBasicMaterial color={apagado ? "#5a5a5a" : "#111114"} />;
            if (tipoOjo === "media")
              return (
                <mesh key={x} geometry={geoMedia} position={[px, -0.02, z]}>
                  {color}
                </mesh>
              );
            const esc: [number, number, number] = tipoOjo === "entre" ? [1.15, 0.42, 0.45] : tipoOjo === "grande" ? [1.35, 1.6, 0.5] : [1, 1.25, 0.45];
            return (
              <mesh key={x} geometry={geoOjo} position={[px, 0, z]} scale={esc}>
                {color}
              </mesh>
            );
          })}
        </group>
        {conProp && (
          <group ref={prop} scale={[forma.ancho, forma.alto, forma.ancho]}>
            <Prop tipo={agente.prop} />
          </group>
        )}
      </group>
    </group>
  );
}
