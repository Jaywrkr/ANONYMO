"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AGENTES, localizar, type Agente, type AreaId } from "@anonymo/agentes";
import { area as nombreArea, enlace, idiomaDeRuta } from "@/lib/idioma";
import { AgenteVista } from "@/components/escena/AgenteVista";

export function Equipo({ area, lista: dada }: { area?: AreaId | null; lista?: Agente[] }) {
  const idioma = idiomaDeRuta(usePathname());
  const lista = (dada ?? (area ? AGENTES.filter((a) => a.area === area) : AGENTES)).map((a) => localizar(a, idioma));
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {lista.map((a) => (
        <li key={a.id}>
          <Link href={enlace(`/agentes/${a.id}`, idioma)} className="group block">
            <AgenteVista agente={a} className="aspect-square w-full" />
            <span className="mt-1 flex items-baseline justify-between gap-2 border-t border-linea pt-2">
              <span className="display text-3xl">{a.nombre}</span>
              <span className="font-mono text-[12px] uppercase tracking-widest text-gris">{nombreArea(a.area, idioma)}</span>
            </span>
            <span className="text-sm text-gris">{a.rol}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
