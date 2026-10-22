"use client";

import { useState } from "react";
import { AREAS, AGENTES, type AreaId } from "@anonymo/agentes";
import { Equipo } from "@/components/ui/Equipo";

export function Indice() {
  const [area, setArea] = useState<AreaId | null>(null);
  const areas = Object.values(AREAS);
  return (
    <>
      <div role="group" aria-label="Filtrar por área" className="mb-10 flex flex-wrap gap-2">
        {[{ id: null, nombre: "Todos", n: AGENTES.length }, ...areas.map((a) => ({ id: a.id, nombre: a.nombre, n: AGENTES.filter((x) => x.area === a.id).length }))].map((a) => (
          <button
            key={a.nombre}
            onClick={() => setArea(a.id as AreaId | null)}
            aria-pressed={area === a.id}
            className={`rounded-full border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors ${area === a.id ? "border-tinta bg-tinta text-hueso" : "border-linea text-gris hover:border-tinta hover:text-tinta"}`}
          >
            {a.nombre} <span className="opacity-60">{a.n}</span>
          </button>
        ))}
      </div>
      <Equipo area={area} />
    </>
  );
}
