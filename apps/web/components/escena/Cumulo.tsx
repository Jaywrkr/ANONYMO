"use client";

import { useState } from "react";
import { agentePorId } from "@anonymo/agentes";
import { Agente3D } from "./Agente3D";
import { Vista } from "./Vista";

// El grupo del inicio: Atlas al centro, cuatro agentes alrededor. Cada uno reacciona al cursor y al clic.
const LUGARES: [string, [number, number, number], number][] = [
  ["atlas", [0.2, -0.1, 0], 1.25],
  ["verba", [-1.9, 1.25, -1.2], 0.72],
  ["lumen", [2.35, 1.05, -0.8], 0.82],
  ["chispa", [-1.55, -1.55, -0.4], 0.66],
  ["trofeo", [2.0, -1.6, -1.6], 0.6],
];

function Miembro({ id, pos, s }: { id: string; pos: [number, number, number]; s: number }) {
  const [encima, setEncima] = useState(false);
  const [toque, setToque] = useState(0);
  const a = agentePorId(id)!;
  return (
    <group
      onPointerOver={(e) => { e.stopPropagation(); setEncima(true); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { setEncima(false); document.body.style.cursor = ""; }}
      onPointerDown={(e) => { e.stopPropagation(); setToque((n) => n + 1); }}
    >
      <Agente3D agente={a} posicion={pos} escala={s} encima={encima} toque={toque} sombra={false} />
    </group>
  );
}

export function Cumulo({ className }: { className?: string }) {
  return (
    <Vista className={className} distancia={8.2} fov={36}>
      {LUGARES.map(([id, pos, s]) => (
        <Miembro key={id} id={id} pos={pos} s={s} />
      ))}
    </Vista>
  );
}
