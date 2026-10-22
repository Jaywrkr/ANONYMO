import Link from "next/link";
import { notFound } from "next/navigation";
import { AREAS, FASES, PEDIDOS, agentePorId } from "@anonymo/agentes";
import { contratoPorId, existe, leerBitacora, leerEntrega, leerNota, leerProyecto, type TareaId } from "@anonymo/pipeline";
import { boton, botonLleno, campo, ESTADO_PROYECTO, etiqueta, exigirEstudio, lateral } from "@/lib/estudio";
import { accionAprobar, accionCambiar, accionParar, accionPausas, accionPortal, accionReanudar, accionSeguir } from "../acciones";

export const dynamic = "force-dynamic";
export const metadata = { title: "Proyecto — Estudio", robots: { index: false } };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> };

const ESTADO_TAREA: Record<string, string> = { lista: "Lista", "en-curso": "En curso", "por-empezar": "Por empezar", rehacer: "Por rehacer" };

export default async function ProyectoEstudio({ params, searchParams }: Props) {
  exigirEstudio();
  const { id } = await params;
  const { ok, error } = await searchParams;
  if (!existe(id)) notFound();
  const p = leerProyecto(id);
  const nota = leerNota(leerEntrega(id, "6.trofeo"));
  const deFase = (f: number) => p.plan.tareas.filter((t) => t.startsWith(`${f}.`)) as TareaId[];
  const actuales = deFase(p.faseActual);
  const comunes = (
    <>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="motor" value="" />
    </>
  );

  return (
    <main className={`${lateral} pb-16`}>
      <Link href="/estudio" className={`${etiqueta} inline-flex min-h-11 items-center underline underline-offset-4`}>← Estudio</Link>
      <div className="flex flex-wrap items-end justify-between gap-6 pb-6 pt-2">
        <div>
          <p className={etiqueta}>{PEDIDOS[p.pedido.tipo].nombre} · {ESTADO_PROYECTO[p.estado]}</p>
          <h1 className="display mt-2 text-[clamp(56px,8vw,128px)]">{p.pedido.cliente}</h1>
        </div>
        {nota && <p className="display text-7xl">{String(nota.final).replace(".", ",")}</p>}
      </div>
      <p className="max-w-3xl text-lg font-light">{p.pedido.descripcion}</p>

      {(ok || error) && (
        <p role="status" className={`mt-6 rounded-2xl p-4 text-[15px] ${error ? "bg-[#fde8e4] text-[#8a1c0c]" : "bg-papel"}`}>{error ?? ok}</p>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section aria-label="Plan">
          {p.plan.fases.map((f) => {
            const fase = FASES.find((x) => x.n === f)!;
            return (
              <div key={f} className="border-t border-tinta py-4">
                <p className={etiqueta}>{String(f).padStart(2, "0")} · {fase.nombre}{p.plan.pausas.includes(f) ? " · con pausa" : ""}</p>
                <ul className="mt-3 grid gap-2">
                  {deFase(f).map((t) => {
                    const c = contratoPorId(t)!;
                    const a = agentePorId(c.agente)!;
                    const e = leerEntrega(id, t);
                    return (
                      <li key={t}>
                        <Link href={`/estudio/${id}/${t.replace(".", "-")}`} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-2xl px-3 py-2 hover:bg-papel">
                          <i aria-hidden className="block h-3 w-3 shrink-0 rounded-full" style={{ background: AREAS[a.area].medio }} />
                          <span className="w-20 font-medium">{a.nombre}</span>
                          <span className="flex-1">{c.entrega}{e ? ` · v${e.version}` : ""}</span>
                          <span className={etiqueta}>{ESTADO_TAREA[p.tareas[t]]}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </section>

        <aside className="grid content-start gap-6 lg:sticky lg:top-6">
          {p.estado === "esperando" && (
            <div className="rounded-3xl bg-papel p-6">
              <p className={etiqueta}>{p.esperaJurado ? "El Jurado no llegó a 7" : `Terminó ${FASES.find((x) => x.n === p.faseActual)?.nombre}`}</p>
              <p className="display mt-1 text-5xl">Tu decisión</p>
              <form action={accionAprobar} className="mt-4 grid gap-2">
                {comunes}
                <label className="grid gap-1">
                  <span className={etiqueta}>Quién decide</span>
                  <select name="quien" className={campo} defaultValue="jay"><option value="jay">Jay</option><option value="luna">Luna</option></select>
                </label>
                <input name="nota" placeholder="Nota (opcional)" className={campo} />
                <button className={botonLleno}>Aprobar y seguir</button>
              </form>
              <form action={accionCambiar} className="mt-6 grid gap-2 border-t border-linea pt-4">
                {comunes}
                <input type="hidden" name="quien" value="jay" />
                <label className="grid gap-1">
                  <span className={etiqueta}>Pedir cambios</span>
                  <textarea name="nota" rows={3} required placeholder="Qué hay que cambiar" className={campo} />
                </label>
                <select name="agente" className={campo} defaultValue="" aria-label="A quién">
                  <option value="">Toda la fase</option>
                  {actuales.map((t) => <option key={t} value={t.split(".")[1]}>{agentePorId(t.split(".")[1])?.nombre}</option>)}
                </select>
                <button className={boton}>Rehacer</button>
              </form>
              <form action={accionParar} className="mt-4">
                {comunes}
                <button className="font-mono text-[12px] uppercase tracking-[0.12em] text-gris underline underline-offset-4">Parar el proyecto</button>
              </form>
            </div>
          )}
          {p.estado === "parado" && (
            <form action={accionReanudar} className="rounded-3xl bg-papel p-6">
              {comunes}
              <p className="display text-5xl">Parado</p>
              <button className={`${botonLleno} mt-4`}>Reanudar</button>
            </form>
          )}
          {p.estado === "en-curso" && (
            <form action={accionSeguir} className="rounded-3xl bg-papel p-6">
              {comunes}
              <p className="text-[15px]">Quedó a medias (por ejemplo, se cortó una ejecución).</p>
              <button className={`${botonLleno} mt-4`}>Seguir</button>
            </form>
          )}

          <form action={accionPausas} className="grid gap-2 rounded-3xl border border-linea p-6">
            {comunes}
            <label className="grid gap-1">
              <span className={etiqueta}>Pausas · ahora en {p.plan.pausas.join(", ") || "ninguna"}</span>
              <select name="pausas" className={campo} defaultValue="clave">
                <option value="clave">Las que propone Atlas</option>
                <option value="cada-fase">Cada fase</option>
                <option value="nunca">Nunca</option>
                {p.plan.fases.map((f) => <option key={f} value={String(f)}>Solo la fase {f}</option>)}
              </select>
            </label>
            <button className={boton}>Cambiar pausas</button>
          </form>

          <div className="rounded-3xl border border-linea p-6">
            <p className={etiqueta}>Portal del cliente</p>
            {p.portal ? (
              <>
                <a href={`/portal/${id}?t=${p.portal.token}`} target="_blank" rel="noreferrer" className="mt-2 block break-all text-[15px] underline underline-offset-4">/portal/{id}?t={p.portal.token}</a>
                <p className="mt-2 text-[14px] text-gris">Mándale este enlace. Ve sus entregas (sin precios internos ni la nota del jurado), aprueba fases y comenta.</p>
                <form action={accionPortal} className="mt-3">{comunes}<input type="hidden" name="nuevo" value="1" /><button className="font-mono text-[12px] uppercase tracking-[0.12em] text-gris underline underline-offset-4">Cambiar enlace</button></form>
              </>
            ) : (
              <form action={accionPortal} className="mt-3">{comunes}<button className={boton}>Crear enlace</button></form>
            )}
          </div>

          {p.plan.preguntas.length > 0 && (
            <div className="rounded-3xl border border-linea p-6">
              <p className={etiqueta}>Atlas necesita saber</p>
              <ul className="mt-2 grid list-disc gap-1 pl-5 text-[15px]">{p.plan.preguntas.map((q) => <li key={q}>{q}</li>)}</ul>
            </div>
          )}

          <div className="rounded-3xl border border-linea p-6">
            <p className={etiqueta}>Bitácora</p>
            <ul className="mt-2 grid gap-1 text-[14px] text-gris">{leerBitacora(id, 12).map((l, i) => <li key={i}>{l}</li>)}</ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
