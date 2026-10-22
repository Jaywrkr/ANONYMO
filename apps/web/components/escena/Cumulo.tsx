"use client";

import { agentePorId } from "@anonymo/agentes";
import { Agente3D } from "./Agente3D";
import { Vista } from "./Vista";

// El grupo del inicio: Atlas al centro, cuatro agentes alrededor.
const LUGARES: [string, [number, number, number], number][] = [
  ["atlas", [0.2, -0.1, 0], 1.25],
  ["verba", [-1.9, 1.25, -1.2], 0.72],
  ["lumen", [2.35, 1.05, -0.8], 0.82],
  ["chispa", [-1.55, -1.55, -0.4], 0.66],
  ["trofeo", [2.0, -1.6, -1.6], 0.6],
];

export function Cumulo({ className }: { className?: string }) {
  return (
    <Vista className={className} distancia={8.2} fov={36}>
      {LUGARES.map(([id, pos, s]) => {
        const a = agentePorId(id)!;
        return <Agente3D key={id} agente={a} posicion={pos} escala={s} />;
      })}
    </Vista>
  );
}
