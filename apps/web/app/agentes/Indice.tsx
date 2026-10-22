"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { AREAS, AGENTES, type AreaId } from "@anonymo/agentes";
import { area as nombreArea, idiomaDeRuta } from "@/lib/idioma";
import { T } from "@/lib/textos";
import { Equipo } from "@/components/ui/Equipo";
import { buscarAgentes } from "@/lib/buscar-equipo";

export function Indice() {
  const [area, setArea] = useState<AreaId | null>(null);
  const [q, setQ] = useState("");
  const areas = Object.values(AREAS);
  const idioma = idiomaDeRuta(usePathname());
  const t = T[idioma].agentes;
  const en = idioma === "en";
  const encontrados = q.trim() ? buscarAgentes(q).filter((a) => !area || a.area === area) : undefined;
  return (
    <>
      <div className="mb-6 max-w-xl">
        <label htmlFor="buscar-agente" className="font-mono text-[12px] uppercase tracking-[0.14em] text-gris">{en ? "Who does what?" : "¿Quién hace qué?"}</label>
        <input
          id="buscar-agente"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={en ? "logos, video, price, 3D…" : "logos, video, precios, 3D…"}
          className="mt-1 w-full border-b border-tinta bg-transparent py-3 text-2xl font-light tracking-tight outline-none placeholder:text-gris/55 focus:border-b-2"
        />
        <p role="status" className="mt-2 min-h-5 text-[14px] text-gris">
          {encontrados && (encontrados.length ? (en ? `${encontrados.length} agent(s)` : `${encontrados.length} agente(s)`) : en ? "Nobody yet. Try another word: logo, web, events…" : "Nadie todavía. Prueba otra palabra: logo, web, eventos…")}
        </p>
      </div>
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
      <Equipo area={area} lista={encontrados} />
    </>
  );
}
