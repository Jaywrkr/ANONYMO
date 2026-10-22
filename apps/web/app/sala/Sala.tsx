"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AGENTES, AREAS, FASES, agentePorId } from "@anonymo/agentes";
import { AgenteVista } from "@/components/escena/AgenteVista";
import { ESTADO_TEXTO } from "@/lib/proyecto";
import type { VistaProyecto } from "@/lib/proyectos";
import { SERVICIO } from "@/lib/servicio";

const lateral = "px-[max(20px,env(safe-area-inset-left))] md:px-10";
const etiqueta = "font-mono text-[12px] uppercase tracking-[0.14em] text-gris";

// Los agentes de la fase pasan al escenario; el resto queda como una fila de puntos de color.
export function Sala({ proyectos }: { proyectos: VistaProyecto[] }) {
  const [pid, setPid] = useState(proyectos[0].id);
  const proyecto = proyectos.find((p) => p.id === pid) ?? proyectos[0];
  const [fase, setFase] = useState(2);
  const [sel, setSel] = useState("verba");
  const faseValida = proyecto.fases.includes(fase) ? fase : proyecto.fases[0];
  const f = FASES.find((x) => x.n === faseValida)!;
  // En un cliente, solo pasan al frente los agentes que tienen tarea en su plan.
  const activos = f.agentes.filter((id) => pid === "agencia" || proyecto.mensajes[f.n]?.[id]);
  const elegido = activos.includes(sel) ? sel : activos[0];
  const agente = agentePorId(elegido)!;
  const msg = proyecto.mensajes[f.n]?.[elegido];
  const resto = useMemo(() => AGENTES.filter((a) => !activos.includes(a.id)), [activos]);

  const irA = (id: string) => {
    const destino = FASES.find((x) => proyecto.fases.includes(x.n) && x.agentes.includes(id) && (pid === "agencia" || proyecto.mensajes[x.n]?.[id]));
    if (destino) { setFase(destino.n); setSel(id); }
  };
  const cambiarProyecto = (id: string) => {
    setPid(id);
    const p = proyectos.find((x) => x.id === id)!;
    setFase(p.fases[0]);
  };

  return (
    <main className={`${lateral} pb-10`}>
      <div className="flex flex-wrap items-end justify-between gap-6 pb-8 pt-4">
        <h1 className="display text-[clamp(64px,10vw,160px)]">La sala</h1>
        <p className="max-w-sm text-[17px] text-gris">
          Elige un proyecto y una fase: sus agentes pasan al frente y te cuentan qué hicieron y qué necesitan.
        </p>
      </div>

      {proyectos.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 pb-4" role="group" aria-label="Proyectos">
          <span className={`${etiqueta} mr-2`}>Proyecto</span>
          {proyectos.map((p) => (
            <button
              key={p.id}
              onClick={() => cambiarProyecto(p.id)}
              aria-pressed={p.id === pid}
              className={`min-h-11 rounded-full border px-4 py-2 font-mono text-[12px] uppercase tracking-[0.12em] transition-colors ${p.id === pid ? "border-tinta bg-tinta text-hueso" : "border-linea text-gris hover:border-tinta hover:text-tinta"}`}
            >
              {p.nombre}
              {p.nota !== undefined && <span className="ml-2 opacity-70">{String(p.nota).replace(".", ",")}</span>}
            </button>
          ))}
        </div>
      )}

      <div className="relative border-y border-tinta">
        <div role="tablist" aria-label="Fases" className="-mx-1 flex gap-1 overflow-x-auto py-2 pr-10">
          {FASES.map((x) => {
            const aplica = proyecto.fases.includes(x.n);
            return (
              <button
                key={x.n}
                role="tab"
                onClick={() => setFase(x.n)}
                disabled={!aplica}
                aria-selected={x.n === f.n}
                title={aplica ? undefined : "No aplica a este proyecto"}
                className={`min-h-11 shrink-0 rounded-full px-4 py-2 text-left font-mono text-[12px] uppercase tracking-[0.12em] transition-colors ${x.n === f.n ? "bg-tinta text-hueso" : aplica ? "text-gris hover:text-tinta" : "text-gris/60 line-through decoration-1"}`}
              >
                {String(x.n).padStart(2, "0")} · {x.nombre}
              </button>
            );
          })}
        </div>
        <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-hueso to-transparent md:hidden" />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section aria-label={`Escenario de la fase ${f.nombre}`} className="lg:col-start-1 lg:row-start-1">
          <div className="flex items-baseline justify-between gap-4">
            <p className={etiqueta}>Fase {String(f.n).padStart(2, "0")} · {f.objetivo}</p>
            <p className={`${etiqueta} hidden sm:block`}>{SERVICIO[f.n].dura}</p>
          </div>
          <ul key={`${pid}-${f.n}`} className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {activos.map((id, i) => {
              const a = agentePorId(id)!;
              const solo = activos.length % 2 === 1 && i === 0;
              return (
                <li key={id} className={solo ? "col-span-2 mx-auto w-2/3 sm:col-span-1 sm:mx-0 sm:w-auto" : undefined}>
                  <button
                    onClick={() => setSel(id)}
                    aria-pressed={id === elegido}
                    className={`block w-full rounded-3xl p-2 text-left transition-colors ${id === elegido ? "bg-papel" : "hover:bg-papel/60"}`}
                  >
                    <AgenteVista agente={a} className="aspect-square w-full" distancia={5.4} />
                    <span className="flex flex-col gap-1 px-2 pb-1 sm:flex-row sm:items-baseline sm:justify-between">
                      <span className="display text-3xl">{a.nombre}</span>
                      <span className={etiqueta}>{ESTADO_TEXTO[proyecto.mensajes[f.n]?.[id]?.estado ?? "por-empezar"]}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

        </section>

        <aside className="lg:sticky lg:top-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start" aria-live="polite">
          <div className="rounded-3xl bg-papel p-6">
            <p className={etiqueta}>{AREAS[agente.area].nombre} · {agente.rol}</p>
            <p className="display mt-1 text-7xl">{agente.nombre}</p>
            {msg && (
              <>
                <p className="mt-6 text-xl font-light leading-snug tracking-tight">“{msg.dice}”</p>
                <dl className="mt-6 grid grid-cols-[100px_1fr] gap-x-4 gap-y-3 border-t border-linea pt-4 text-[15px]">
                  <dt className={etiqueta}>Estado</dt>
                  <dd>{ESTADO_TEXTO[msg.estado]}</dd>
                  <dt className={etiqueta}>Entrega</dt>
                  <dd>
                    {"tarea" in msg && msg.tarea ? (
                      <Link href={`/sala/${pid}/${String(msg.tarea).replace(".", "-")}`} className="underline underline-offset-4">
                        {msg.entrega} →
                      </Link>
                    ) : (
                      msg.entrega
                    )}
                  </dd>
                  <dt className={etiqueta}>Necesita</dt>
                  <dd>{msg.necesita}</dd>
                </dl>
              </>
            )}
            <div className="mt-6 border-t border-linea pt-4">
              <p className={etiqueta}>En esta fase el cliente recibe</p>
              <ul className="mt-2 grid gap-1 text-[15px]">
                {SERVICIO[f.n].entrega.map((e) => <li key={e}>{e}</li>)}
              </ul>
            </div>
            <Link href={`/agentes/${agente.id}`} className="mt-6 inline-flex min-h-11 items-center font-mono text-[12px] uppercase tracking-[0.14em] underline underline-offset-4">
              Ficha de {agente.nombre} →
            </Link>
          </div>
        </aside>

        <details className="group border-t border-linea pt-4 lg:col-start-1 lg:row-start-2" open>
          <summary className={`${etiqueta} cursor-pointer list-none`}>
            El resto del equipo · {resto.length} <span className="ml-1 inline-block transition-transform group-open:rotate-90">→</span>
          </summary>
          <ul className="mt-4 flex flex-wrap gap-2">
            {resto.map((a) => {
              const ar = AREAS[a.area];
              return (
                <li key={a.id}>
                  <button
                    onClick={() => irA(a.id)}
                    title={`${a.nombre} · ${a.rol}`}
                    className="group/punto flex min-h-11 items-center gap-2 rounded-full border border-linea py-1.5 pl-1.5 pr-3 transition-colors hover:border-tinta"
                  >
                    <i className="block h-8 w-8 rounded-full" style={{ background: `radial-gradient(circle at 35% 28%, ${ar.luz}, ${ar.medio} 48%, ${ar.sombra})` }} />
                    <span className="font-mono text-[12px] uppercase tracking-[0.12em]">{a.nombre}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </details>
      </div>
    </main>
  );
}
