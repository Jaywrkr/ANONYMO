"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { tocar } from "@/lib/sonido";
import { medir } from "@/lib/medir";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AGENTES, AREAS, FASES, agentePorId } from "@anonymo/agentes";
import { AgenteVista } from "@/components/escena/AgenteVista";
import { ESTADO_TEXTO } from "@/lib/proyecto";
import { ESTADO_TEXTO_EN, PROYECTO_EN } from "@/lib/proyecto-en";
import { area as nombreArea, enlace, fase as faseL, idiomaDeRuta, servicio } from "@/lib/idioma";
import { localizar } from "@anonymo/agentes";
import type { VistaProyecto } from "@/lib/proyectos";

const lateral = "px-[max(20px,env(safe-area-inset-left))] md:px-10";
const etiqueta = "font-mono text-[12px] uppercase tracking-[0.14em] text-gris";

// Los agentes de la fase pasan al escenario; el resto queda como una fila de puntos de color.
export function Sala({ proyectos }: { proyectos: VistaProyecto[] }) {
  // El estado vive en la URL: /sala?proyecto=…&fase=4&agente=orla se puede compartir.
  const params = useSearchParams();
  const router = useRouter();
  const ruta = usePathname();
  const [pid, setPid] = useState(() => (proyectos.some((p) => p.id === params.get("proyecto")) ? params.get("proyecto")! : proyectos[0].id));
  const idioma = idiomaDeRuta(ruta);
  const en = idioma === "en";
  const ESTADOS = en ? ESTADO_TEXTO_EN : ESTADO_TEXTO;
  const elegidoProyecto = proyectos.find((p) => p.id === pid) ?? proyectos[0];
  // Nuestra agencia en inglés; los proyectos de clientes quedan en su idioma.
  const proyecto = en && elegidoProyecto.id === "agencia" ? { ...elegidoProyecto, nombre: PROYECTO_EN.nombre, mensajes: PROYECTO_EN.mensajes } : elegidoProyecto;
  const [fase, setFase] = useState(() => Number(params.get("fase")) || 2);
  const [sel, setSel] = useState(() => params.get("agente") ?? "verba");
  const [copiado, setCopiado] = useState(false);
  const faseValida = proyecto.fases.includes(fase) ? fase : proyecto.fases[0];
  const f = faseL(faseValida, idioma);
  // En un cliente, solo pasan al frente los agentes que tienen tarea en su plan.
  const activos = f.agentes.filter((id) => pid === "agencia" || proyecto.mensajes[f.n]?.[id]);
  const elegido = activos.includes(sel) ? sel : activos[0];
  const agente = localizar(agentePorId(elegido)!, idioma);
  const msg = proyecto.mensajes[f.n]?.[elegido];
  const resto = useMemo(() => AGENTES.filter((a) => !activos.includes(a.id)), [activos]);

  useEffect(() => {
    const q = new URLSearchParams();
    if (pid !== proyectos[0].id) q.set("proyecto", pid);
    q.set("fase", String(f.n));
    q.set("agente", elegido);
    router.replace(`${ruta}?${q}`, { scroll: false });
    tocar("fase");
    medir("sala-agente", elegido);
    setCopiado(false);
  }, [pid, f.n, elegido, ruta, router, proyectos]);

  // Cuánto tiempo pasa la gente en la sala (lo lee Pulso).
  useEffect(() => {
    const inicio = Date.now();
    const salir = () => medir("sala-tiempo", Math.round((Date.now() - inicio) / 1000));
    const oculto = () => document.visibilityState === "hidden" && salir();
    document.addEventListener("visibilitychange", oculto);
    return () => {
      document.removeEventListener("visibilitychange", oculto);
      salir();
    };
  }, []);

  const compartir = async () => {
    medir("compartir", elegido);
    const url = window.location.href;
    const texto = en ? `${agente.nombre} in the Anonymo room` : `${agente.nombre} en la sala de Anonymo`;
    try {
      if (navigator.share && matchMedia("(pointer: coarse)").matches) await navigator.share({ title: texto, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopiado(true);
      }
    } catch {}
  };

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
        <h1 className="display text-[clamp(64px,10vw,160px)]">{en ? "The room" : "La sala"}</h1>
        <p className="max-w-sm text-[17px] text-gris">
          {en ? "Pick a project and a phase: its agents step forward and tell you what they did and what they need." : "Elige un proyecto y una fase: sus agentes pasan al frente y te cuentan qué hicieron y qué necesitan."}
        </p>
      </div>

      {proyectos.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 pb-4" role="group" aria-label="Proyectos">
          <span className={`${etiqueta} mr-2`}>{en ? "Project" : "Proyecto"}</span>
          {proyectos.map((p) => (
            <button
              key={p.id}
              onClick={() => cambiarProyecto(p.id)}
              aria-pressed={p.id === pid}
              className={`min-h-11 rounded-full border px-4 py-2 font-mono text-[12px] uppercase tracking-[0.12em] transition-colors ${p.id === pid ? "border-tinta bg-tinta text-hueso" : "border-linea text-gris hover:border-tinta hover:text-tinta"}`}
            >
              {en && p.id === "agencia" ? PROYECTO_EN.nombre : p.nombre}
              {p.nota !== undefined && <span className="ml-2 opacity-70">{String(p.nota).replace(".", ",")}</span>}
            </button>
          ))}
        </div>
      )}

      {proyecto.cliente && proyecto.cliente.length > 0 && (
        <section aria-label={en ? "What the client said" : "Lo que dijo el cliente"} className="mb-6 grid gap-3 border-t border-linea pt-4 md:grid-cols-[180px_1fr]">
          <p className={etiqueta}>{en ? "What the client said" : "Lo que dijo el cliente"}</p>
          <ul className="grid gap-3">
            {proyecto.cliente.map((n) => (
              <li key={n.fecha + n.texto} className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-4">
                <span className="text-xl font-light tracking-tight">“{n.texto}”</span>
                <span className={etiqueta}>
                  {n.fecha} · {en ? "handled by" : "lo atienden"} {n.agentes.map((a) => agentePorId(a)?.nombre).join(", ")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="relative border-y border-tinta">
        <div role="tablist" aria-label={en ? "Phases" : "Fases"} className="-mx-1 flex gap-1 overflow-x-auto py-2 pr-10">
          {FASES.map((x) => {
            const aplica = proyecto.fases.includes(x.n);
            return (
              <button
                key={x.n}
                role="tab"
                id={`tab-${x.n}`}
                aria-controls="panel-fase"
                tabIndex={x.n === f.n ? 0 : -1}
                onKeyDown={(e) => {
                  // Flechas, Inicio y Fin entre las fases que aplican.
                  const disponibles = FASES.map((y) => y.n).filter((n) => proyecto.fases.includes(n));
                  const i = disponibles.indexOf(f.n);
                  const destino =
                    e.key === "ArrowRight" ? disponibles[(i + 1) % disponibles.length]
                    : e.key === "ArrowLeft" ? disponibles[(i - 1 + disponibles.length) % disponibles.length]
                    : e.key === "Home" ? disponibles[0]
                    : e.key === "End" ? disponibles.at(-1)
                    : undefined;
                  if (destino === undefined) return;
                  e.preventDefault();
                  setFase(destino);
                  requestAnimationFrame(() => document.getElementById(`tab-${destino}`)?.focus());
                }}
                onClick={() => setFase(x.n)}
                disabled={!aplica}
                aria-selected={x.n === f.n}
                title={aplica ? undefined : en ? "Not part of this project" : "No aplica a este proyecto"}
                className={`min-h-11 shrink-0 rounded-full px-4 py-2 text-left font-mono text-[12px] uppercase tracking-[0.12em] transition-colors ${x.n === f.n ? "bg-tinta text-hueso" : aplica ? "text-gris hover:text-tinta" : "text-gris/60 line-through decoration-1"}`}
              >
                {String(x.n).padStart(2, "0")} · {faseL(x.n, idioma).nombre}
              </button>
            );
          })}
        </div>
        <span aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-hueso to-transparent md:hidden" />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section id="panel-fase" role="tabpanel" aria-labelledby={`tab-${f.n}`} className="lg:col-start-1 lg:row-start-1">
          <div className="flex items-baseline justify-between gap-4">
            <p className={etiqueta}>{en ? "Phase" : "Fase"} {String(f.n).padStart(2, "0")} · {f.objetivo}</p>
            <p className={`${etiqueta} hidden sm:block`}>{servicio(f.n, idioma).dura}</p>
          </div>
          <ul key={`${pid}-${f.n}`} className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {activos.map((id, i) => {
              const a = agentePorId(id)!;
              const solo = activos.length % 2 === 1 && i === 0;
              return (
                <motion.li
                  key={id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                  className={solo ? "col-span-2 mx-auto w-2/3 sm:col-span-1 sm:mx-0 sm:w-auto" : undefined}
                >
                  <button
                    onClick={() => setSel(id)}
                    aria-pressed={id === elegido}
                    className="relative block w-full rounded-3xl p-2 text-left transition-colors hover:bg-papel/60"
                  >
                    {/* El fondo de la tarjeta elegida se desliza de un agente a otro. */}
                    {id === elegido && <motion.span layoutId={`elegido-${pid}`} className="absolute inset-0 -z-0 rounded-3xl bg-papel" transition={{ type: "spring", stiffness: 420, damping: 38 }} />}
                    <AgenteVista agente={a} className="relative aspect-square w-full" distancia={5.4} />
                    <span className="relative flex flex-col gap-1 px-2 pb-1 sm:flex-row sm:items-baseline sm:justify-between">
                      <span className="display text-3xl">{a.nombre}</span>
                      <span className={etiqueta}>{ESTADOS[proyecto.mensajes[f.n]?.[id]?.estado ?? "por-empezar"]}</span>
                    </span>
                  </button>
                </motion.li>
              );
            })}
          </ul>

        </section>

        <aside className="lg:sticky lg:top-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start" aria-live="polite">
          <div className="overflow-hidden rounded-3xl bg-papel p-6">
            <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={`${pid}-${f.n}-${elegido}`}
              initial={{ opacity: 0, x: -28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 28 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
            <div className="flex items-center gap-4">
              <AgenteVista agente={agentePorId(elegido)!} className="aspect-square w-24 shrink-0" distancia={4.2} />
              <div>
                <p className={etiqueta}>{nombreArea(agente.area, idioma)} · {agente.rol}</p>
                <p className="display mt-1 text-7xl">{agente.nombre}</p>
              </div>
            </div>
            {msg && (
              <>
                <p className="mt-6 text-xl font-light leading-snug tracking-tight">“{msg.dice}”</p>
                <dl className="mt-6 grid grid-cols-[100px_1fr] gap-x-4 gap-y-3 border-t border-linea pt-4 text-[15px]">
                  <dt className={etiqueta}>{en ? "Status" : "Estado"}</dt>
                  <dd>{ESTADOS[msg.estado]}</dd>
                  <dt className={etiqueta}>{en ? "Delivers" : "Entrega"}</dt>
                  <dd>
                    {"tarea" in msg && msg.tarea ? (
                      <Link href={`/sala/${pid}/${String(msg.tarea).replace(".", "-")}`} className="underline underline-offset-4">
                        {msg.entrega} →
                      </Link>
                    ) : (
                      msg.entrega
                    )}
                  </dd>
                  <dt className={etiqueta}>{en ? "Needs" : "Necesita"}</dt>
                  <dd>{msg.necesita}</dd>
                </dl>
              </>
            )}
            <div className="mt-6 border-t border-linea pt-4">
              <p className={etiqueta}>{en ? "In this phase the client gets" : "En esta fase el cliente recibe"}</p>
              <ul className="mt-2 grid gap-1 text-[15px]">
                {servicio(f.n, idioma).entrega.map((e) => <li key={e}>{e}</li>)}
              </ul>
            </div>
            <button onClick={compartir} className="mr-6 mt-6 inline-flex min-h-11 items-center font-mono text-[12px] uppercase tracking-[0.14em] underline underline-offset-4">
              {copiado ? (en ? "Link copied ✓" : "Enlace copiado ✓") : en ? `Share what ${agente.nombre} said` : `Compartir lo que dijo ${agente.nombre}`}
            </button>
            <Link href={enlace(`/agentes/${agente.id}`, idioma)} className="mt-6 inline-flex min-h-11 items-center font-mono text-[12px] uppercase tracking-[0.14em] underline underline-offset-4">
              {en ? `Meet ${agente.nombre} →` : `Ficha de ${agente.nombre} →`}
            </Link>
            </motion.div>
            </AnimatePresence>
          </div>
        </aside>

        <details className="group border-t border-linea pt-4 lg:col-start-1 lg:row-start-2" open>
          <summary className={`${etiqueta} cursor-pointer list-none`}>
            {en ? "The rest of the team" : "El resto del equipo"} · {resto.length} <span className="ml-1 inline-block transition-transform group-open:rotate-90">→</span>
          </summary>
          <ul className="mt-4 flex flex-wrap gap-2">
            {resto.map((a) => {
              const ar = AREAS[a.area];
              return (
                <li key={a.id}>
                  <button
                    onClick={() => irA(a.id)}
                    title={`${a.nombre} · ${localizar(a, idioma).rol}`}
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
