"use client";

import { useState } from "react";
import { AREAS, type Agente } from "@anonymo/agentes";
import dynamic from "next/dynamic";

const AgenteEscena = dynamic(() => import("./AgenteEscena"), { ssr: false });

interface Props {
  agente: Agente;
  apagado?: boolean;
  className?: string;
  conProp?: boolean;
  distancia?: number;
  /** Si el padre controla el hover (por ejemplo, toda la tarjeta). */
  encima?: boolean;
}

export function AgenteVista({ agente, apagado, className, conProp = true, distancia, encima }: Props) {
  const [propio, setPropio] = useState(false);
  const [toque, setToque] = useState(0);
  return (
    <div
      className={`relative ${className ?? ""}`}
      onPointerEnter={() => setPropio(true)}
      onPointerLeave={() => setPropio(false)}
      onPointerDown={() => setToque((n) => n + 1)}
    >
      {/* Respaldo mientras carga el 3D (o si no hay WebGL / ahorro de datos): el mismo óvalo, plano. */}
      <i
        aria-hidden
        className="blob-respaldo pointer-events-none absolute left-1/2 top-1/2 block h-[46%] w-[40%] -translate-x-1/2 -translate-y-1/2 rounded-[50%]"
        style={{ background: `radial-gradient(circle at 38% 30%, ${(agente.tono ?? AREAS[agente.area]).luz}, ${(agente.tono ?? AREAS[agente.area]).medio} 50%, ${(agente.tono ?? AREAS[agente.area]).sombra})` }}
      />
      <AgenteEscena agente={agente} apagado={apagado} conProp={conProp} distancia={distancia} encima={encima ?? propio} toque={toque} />
    </div>
  );
}
