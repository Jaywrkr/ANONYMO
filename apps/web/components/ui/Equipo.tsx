"use client";

import Link from "next/link";
import { AGENTES, AREAS } from "@anonymo/agentes";
import { AgenteVista } from "@/components/escena/AgenteVista";

export function Equipo() {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {AGENTES.map((a) => (
        <li key={a.id}>
          <Link href={`/agentes/${a.id}`} className="group block">
            <AgenteVista agente={a} className="aspect-square w-full transition-transform duration-500 group-hover:-translate-y-1" />
            <span className="mt-1 flex items-baseline justify-between gap-2 border-t border-linea pt-2">
              <span className="display text-3xl">{a.nombre}</span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-gris">{AREAS[a.area].nombre}</span>
            </span>
            <span className="text-sm text-gris">{a.rol}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
