"use client";

import type { Agente } from "@anonymo/agentes";
import { Agente3D } from "./Agente3D";
import { Vista } from "./Vista";

// La parte 3D de un agente. Se carga aparte (dynamic) para que three.js no frene la primera pintura.
export default function AgenteEscena(props: { agente: Agente; apagado?: boolean; conProp?: boolean; distancia?: number; encima: boolean; toque: number }) {
  return (
    <Vista className="h-full w-full" distancia={props.distancia ?? 5.6}>
      <Agente3D agente={props.agente} apagado={props.apagado} conProp={props.conProp} encima={props.encima} toque={props.toque} />
    </Vista>
  );
}
