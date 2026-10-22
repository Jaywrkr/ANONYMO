"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { AREAS, AGENTES, type AreaId } from "@anonymo/agentes";
import { area as nombreArea, idiomaDeRuta } from "@/lib/idioma";
import { T } from "@/lib/textos";
import { Equipo } from "@/components/ui/Equipo";

export function Indice() {
  const [area, setArea] = useState<AreaId | null>(null);
  const areas = Object.values(AREAS);
  const idioma = idiomaDeRuta(usePathname());
  const t = T[idioma].agentes;
  return (
    <>
      <div role="group" aria-label={t.filtrar} className="mb-10 flex flex-wrap gap-2">
        {[{ id: null, nombre: t.todos, n: AGENTES.length }, ...areas.map((a) => ({ id: a.id, nombre: nombreArea(a.id, idioma), n: AGENTES.filter((x) => x.area === a.id).length }))].map((a) => (
          <button
            key={a.nombre}
            onClick={() => setArea(a.id as AreaId | null)}
            aria-pressed={area === a.id}
            className={`rounded-full border px-4 py-2 font-mono text-[12px] uppercase tracking-[0.12em] transition-colors ${area === a.id ? "border-tinta bg-tinta text-hueso" : "border-linea text-gris hover:border-tinta hover:text-tinta"}`}
          >
            {a.nombre} <span className="opacity-60">{a.n}</span>
          </button>
        ))}
      </div>
      <Equipo area={area} />
    </>
  );
}
