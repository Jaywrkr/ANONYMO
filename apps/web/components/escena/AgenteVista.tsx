"use client";

import type { Agente } from "@anonymo/agentes";
import { Agente3D } from "./Agente3D";
import { Vista } from "./Vista";

export function AgenteVista({ agente, apagado, className, conProp = true, distancia }: { agente: Agente; apagado?: boolean; className?: string; conProp?: boolean; distancia?: number }) {
  return (
    <Vista className={className} distancia={distancia ?? 5.6}>
      <Agente3D agente={agente} apagado={apagado} conProp={conProp} />
    </Vista>
  );
}
