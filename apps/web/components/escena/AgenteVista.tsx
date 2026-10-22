"use client";

import { useState } from "react";
import type { Agente } from "@anonymo/agentes";
import { Agente3D } from "./Agente3D";
import { Vista } from "./Vista";

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
      className={className}
      onPointerEnter={() => setPropio(true)}
      onPointerLeave={() => setPropio(false)}
      onPointerDown={() => setToque((n) => n + 1)}
    >
      <Vista className="h-full w-full" distancia={distancia ?? 5.6}>
        <Agente3D agente={agente} apagado={apagado} conProp={conProp} encima={encima ?? propio} toque={toque} />
      </Vista>
    </div>
  );
}
