"use client";

// La oficina del estudio en 3D isométrico (sistema/30): una sala por área, un escritorio por agente.
// Quien trabaja rebota y su pantalla se enciende; quien espera revisión levanta un aviso; quien está libre se apaga.
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { Html, OrthographicCamera, View } from "@react-three/drei";
import { AGENTES, AREAS, type AreaId } from "@anonymo/agentes";
import { Agente3D } from "@/components/escena/Agente3D";
import type { EstadoAgente, Puesto } from "@/lib/oficina";

// Dos filas de salas. Cada sala pone a sus agentes en dos filas de escritorios.
const FILAS: AreaId[][] = [
  ["mando", "producto", "estrategia"],
  ["marca", "comunicacion", "crecimiento"],
];
const PASO_X = 1.6;
const PASO_Z = 1.9;
const MARGEN = 0.4;
const HUECO = 0.35;

interface Sala { area: AreaId; x: number; z: number; ancho: number; fondo: number; agentes: { id: string; x: number; z: number }[] }

function plano(): { salas: Sala[]; ancho: number; fondo: number } {
  const salas: Sala[] = [];
  let z = 0;
  let ancho = 0;
  for (const fila of FILAS) {
    let x = 0;
    let fondoFila = 0;
    for (const area of fila) {
      const ids = AGENTES.filter((a) => a.area === area).map((a) => a.id);
      const cols = Math.ceil(ids.length / 2);
      const filas = ids.length > 1 ? 2 : 1;
      const w = cols * PASO_X + MARGEN * 2;
      const d = filas * PASO_Z + MARGEN * 2;
      salas.push({
        area, x, z, ancho: w, fondo: d,
        agentes: ids.map((id, i) => ({ id, x: x + MARGEN + PASO_X * ((i % cols) + 0.5), z: z + MARGEN + PASO_Z * (Math.floor(i / cols) + 0.5) })),
      });
      x += w + HUECO;
      fondoFila = Math.max(fondoFila, d);
    }
    ancho = Math.max(ancho, x - HUECO);
    z += fondoFila + HUECO;
  }
  const fondo = z - HUECO;
  // Centrado en el origen.
  for (const s of salas) {
    s.x -= ancho / 2;
    s.z -= fondo / 2;
    for (const a of s.agentes) { a.x -= ancho / 2; a.z -= fondo / 2; }
  }
  return { salas, ancho, fondo };
}

const PISO = "#efe9df";
const MUEBLE = "#fbf8f2";
const PATA = "#2b2824";

/** Cámara isométrica que encuadra toda la oficina en el ancho disponible. */
function Camara({ ancho, fondo }: { ancho: number; fondo: number }) {
  const { size, camera } = useThree();
  useEffect(() => {
    const cam = camera as THREE.OrthographicCamera;
    // La diagonal de la planta en pantalla isométrica.
    const diag = (ancho + fondo) * 0.7;
    cam.zoom = Math.min(size.width / diag, size.height / (diag * 0.62));
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();
  }, [size.width, size.height, camera, ancho, fondo]);
  return <OrthographicCamera makeDefault position={[12, 11, 12]} near={0.1} far={100} />;
}

function Escritorio({ x, z, color, estado }: { x: number; z: number; color: string; estado: EstadoAgente }) {
  const pantalla = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(({ clock }) => {
    if (!pantalla.current) return;
    const t = clock.getElapsedTime();
    pantalla.current.emissiveIntensity = estado === "trabajando" ? 0.75 + Math.sin(t * 6 + x) * 0.25 : estado === "revisar" ? 0.55 : 0.05;
  });
  return (
    <group position={[x, 0, z + 0.45]}>
      <mesh position={[0, 0.52, 0]} castShadow>
        <boxGeometry args={[0.92, 0.06, 0.5]} />
        <meshStandardMaterial color={MUEBLE} />
      </mesh>
      {[[-0.42, -0.2], [0.42, -0.2], [-0.42, 0.2], [0.42, 0.2]].map(([px, pz], i) => (
        <mesh key={i} position={[px, 0.25, pz]}>
          <boxGeometry args={[0.04, 0.5, 0.04]} />
          <meshStandardMaterial color={PATA} />
        </mesh>
      ))}
      {/* Pantalla girada hacia el agente y hacia la cámara. */}
      <group position={[0.26, 0.72, -0.02]} rotation={[0, -0.6, 0]}>
        <mesh>
          <boxGeometry args={[0.42, 0.28, 0.035]} />
          <meshStandardMaterial color={PATA} />
        </mesh>
        <mesh position={[0, 0, 0.02]}>
          <planeGeometry args={[0.37, 0.22]} />
          <meshStandardMaterial ref={pantalla} color={estado === "libre" ? "#4a4743" : color} emissive={color} emissiveIntensity={0.05} />
        </mesh>
      </group>
    </group>
  );
}

function Aviso({ estado }: { estado: EstadoAgente }) {
  if (estado === "trabajando")
    return <span className="flex items-center gap-1 rounded-full bg-tinta px-1.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-hueso shadow sm:px-2 sm:py-0.5"><i className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#8fe07e]" /><span className="hidden sm:inline">trabajando</span></span>;
  if (estado === "revisar")
    return <span className="rounded-full bg-[#ffd43d] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-tinta shadow sm:px-2">!<span className="hidden sm:inline"> revisar</span></span>;
  return null;
}

function Puesto3D({ id, x, z, puesto, elegido, onElegir, capa }: { id: string; x: number; z: number; puesto: Puesto; elegido: boolean; onElegir: (id: string) => void; capa: Capa }) {
  const a = AGENTES.find((g) => g.id === id)!;
  const area = AREAS[a.area];
  const [encima, setEncima] = useState(false);
  const [toque, setToque] = useState(0);
  // Quien trabaja rebota cada tanto, como tecleando.
  useEffect(() => {
    if (puesto.estado !== "trabajando") return;
    const t = setInterval(() => setToque((n) => n + 1), 1300 + (id.charCodeAt(0) % 5) * 120);
    return () => clearInterval(t);
  }, [puesto.estado, id]);
  return (
    <group
      onPointerOver={(e) => { e.stopPropagation(); setEncima(true); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { setEncima(false); document.body.style.cursor = ""; }}
      onClick={(e) => { e.stopPropagation(); setToque((n) => n + 1); onElegir(id); }}
    >
      <Escritorio x={x} z={z} color={area.medio} estado={puesto.estado} />
      <Agente3D agente={a} posicion={[x - 0.1, 0.98, z - 0.12]} escala={0.44} apagado={puesto.estado === "libre"} encima={encima || elegido} toque={toque} conProp sombra={false} />
      <Html portal={capa} position={[x - 0.1, 1.78, z - 0.12]} center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
        <div className="flex flex-col items-center gap-1 whitespace-nowrap">
          <Aviso estado={puesto.estado} />
          {(encima || elegido) && <span className="rounded-full bg-hueso/95 px-2 py-0.5 text-[12px] font-medium shadow">{a.nombre}</span>}
        </div>
      </Html>
    </group>
  );
}

function SalaMesh({ s, borde, capa }: { s: Sala; borde: { fondo: boolean; izq: boolean }; capa: Capa }) {
  const area = AREAS[s.area];
  // Paredes altas solo hacia afuera de la planta; por dentro, divisores bajos para no tapar a nadie.
  const alto = { fondo: borde.fondo ? 1.0 : 0.22, izq: borde.izq ? 1.0 : 0.22 };
  const cx = s.x + s.ancho / 2;
  const cz = s.z + s.fondo / 2;
  return (
    <group>
      <mesh position={[cx, -0.05, cz]} receiveShadow>
        <boxGeometry args={[s.ancho, 0.1, s.fondo]} />
        <meshStandardMaterial color={area.luz} />
      </mesh>
      {/* Paredes del fondo y de la izquierda: la vista isométrica clásica. */}
      <mesh position={[cx, alto.fondo / 2, s.z + 0.05]}>
        <boxGeometry args={[s.ancho, alto.fondo, 0.1]} />
        <meshStandardMaterial color="#f7f3ec" />
      </mesh>
      <mesh position={[s.x + 0.05, alto.izq / 2, cz]}>
        <boxGeometry args={[0.1, alto.izq, s.fondo]} />
        <meshStandardMaterial color="#f1ece3" />
      </mesh>
      {/* Franja del color del área en la pared. */}
      <mesh position={[cx, alto.fondo - 0.07, s.z + 0.11]}>
        <boxGeometry args={[s.ancho, 0.1, 0.02]} />
        <meshStandardMaterial color={area.medio} />
      </mesh>
      <Html portal={capa} position={[s.x + 0.25, 0.02, s.z + s.fondo - 0.15]} zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
        <span className="hidden whitespace-nowrap rounded-full bg-hueso/80 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] sm:inline" style={{ color: area.sombra }}>{area.nombre}</span>
      </Html>
    </group>
  );
}

/** Capa propia para los letreros: así viven y mueren con su oficina, no en el lienzo compartido de la web. */
type Capa = React.RefObject<HTMLElement>;

export default function OficinaEscena({ puestos, elegido, onElegir, className, capa }: { puestos: Record<string, Puesto>; elegido?: string; onElegir: (id: string) => void; className?: string; capa: Capa }) {
  const { salas, ancho, fondo } = useMemo(plano, []);
  const minZ = Math.min(...salas.map((s) => s.z));
  const minX = Math.min(...salas.map((s) => s.x));
  return (
    <View className={className}>
      <Camara ancho={ancho} fondo={fondo} />
      <ambientLight intensity={1.05} />
      <directionalLight position={[6, 10, 4]} intensity={1.3} />
      <directionalLight position={[-4, 3, -2]} intensity={0.3} />
      {/* Un poco hacia abajo: las paredes y los agentes sobresalen por arriba. */}
      <group position={[0, -0.8, 0]}>
      <mesh position={[0, -0.12, 0]} onClick={() => onElegir("")}>
        <boxGeometry args={[ancho + 1.2, 0.04, fondo + 1.2]} />
        <meshStandardMaterial color={PISO} />
      </mesh>
      {salas.map((s) => (
        <group key={s.area}>
          <SalaMesh capa={capa} s={s} borde={{ fondo: s.z <= minZ + 0.01, izq: s.x <= minX + 0.01 }} />
          {s.agentes.map((g) => (
            <Puesto3D capa={capa} key={g.id} id={g.id} x={g.x} z={g.z} puesto={puestos[g.id] ?? { estado: "libre", trabajos: [] }} elegido={elegido === g.id} onElegir={onElegir} />
          ))}
        </group>
      ))}
      </group>
    </View>
  );
}
