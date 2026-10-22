"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AGENTES, AREAS, FASES, agentePorId } from "@anonymo/agentes";
import { AgenteVista } from "@/components/escena/AgenteVista";
import { PROYECTO, ESTADO_TEXTO } from "@/lib/proyecto";

const lateral = "px-[max(20px,env(safe-area-inset-left))] md:px-10";

export function Sala() {
  const [fase, setFase] = useState(2);
  const activos = useMemo(() => FASES.find((f) => f.n === fase)?.agentes ?? [], [fase]);
  const [sel, setSel] = useState("verba");
  const elegido = activos.includes(sel) ? sel : activos[0];
  const agente = agentePorId(elegido)!;
  const msg = PROYECTO.mensajes[fase]?.[elegido];
  const orden = [...activos, ...AGENTES.map((a) => a.id).filter((id) => !activos.includes(id))];
  const f = FASES.find((x) => x.n === fase)!;

  return (
    <main className={`${lateral} pb-10`}>
      <div className="flex flex-wrap items-end justify-between gap-6 pb-8 pt-4">
        <h1 className="display text-[clamp(64px,10vw,160px)]">La sala</h1>
        <p className="max-w-sm text-gris">
          Proyecto: <span className="text-tinta">{PROYECTO.nombre}</span>. Elige una fase: sus agentes pasan al frente y te cuentan qué hicieron y qué necesitan.
        </p>
      </div>

      <div role="group" aria-label="Fases" className="-mx-1 flex gap-1 overflow-x-auto border-y border-tinta py-2">
        {FASES.map((x) => (
          <button
            key={x.n}
            onClick={() => setFase(x.n)}
            aria-pressed={x.n === fase}
            className={`shrink-0 rounded-full px-4 py-2 text-left font-mono text-[11px] uppercase tracking-[0.12em] transition-colors ${x.n === fase ? "bg-tinta text-hueso" : "text-gris hover:text-tinta"}`}
          >
            {String(x.n).padStart(2, "0")} · {x.nombre}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <ul className="grid grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-4 xl:grid-cols-6">
          {orden.map((id) => {
            const a = agentePorId(id)!;
            const on = activos.includes(id);
            return (
              <li key={id} style={{ order: orden.indexOf(id) }}>
                <button
                  onClick={() => on && setSel(id)}
                  disabled={!on}
                  className={`group block w-full rounded-2xl p-1 text-left transition-colors ${id === elegido ? "bg-papel" : ""} ${on ? "cursor-pointer" : "cursor-default"}`}
                  aria-label={`${a.nombre}, ${a.rol}`}
                >
                  <AgenteVista agente={a} apagado={!on} conProp={on} className="aspect-square w-full" distancia={5.8} />
                  <span className={`block px-1 font-mono text-[10px] uppercase tracking-[0.12em] ${on ? "text-tinta" : "text-linea"}`}>{a.nombre}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-3xl bg-papel p-6">
            <div className="flex items-center gap-4">
              <AgenteVista agente={agente} className="h-36 w-36 shrink-0" distancia={5.4} />
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-gris">{AREAS[agente.area].nombre} · {agente.rol}</p>
                <p className="display mt-1 text-6xl">{agente.nombre}</p>
              </div>
            </div>
            {msg && (
              <>
                <p className="mt-6 text-xl font-light leading-snug tracking-tight">“{msg.dice}”</p>
                <dl className="mt-6 grid grid-cols-[100px_1fr] gap-x-4 gap-y-3 border-t border-linea pt-4 text-sm">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-gris">Estado</dt>
                  <dd>{ESTADO_TEXTO[msg.estado]}</dd>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-gris">Entrega</dt>
                  <dd>{msg.entrega}</dd>
                  <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-gris">Necesita</dt>
                  <dd>{msg.necesita}</dd>
                </dl>
              </>
            )}
            <Link href={`/agentes/${agente.id}`} className="mt-6 inline-block font-mono text-[11px] uppercase tracking-[0.14em] underline underline-offset-4">
              Ficha de {agente.nombre} →
            </Link>
          </div>
          <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-gris">
            Fase {String(f.n).padStart(2, "0")} · {f.objetivo}
          </p>
        </aside>
      </div>
    </main>
  );
}
