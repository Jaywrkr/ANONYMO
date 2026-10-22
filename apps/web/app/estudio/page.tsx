import Link from "next/link";
import { PEDIDOS } from "@anonymo/agentes";
import { agentePorId, PEDIDOS as TIPOS } from "@anonymo/agentes";
import { buscar, leerEntrega, leerNota, listar, listarSolicitudes, PLANTILLAS } from "@anonymo/pipeline";
import { accionConvertirSolicitud, accionDescartarSolicitud } from "./acciones";
import { traerTodo } from "@/lib/nube";
import { sesionConfigurada } from "@/lib/sesion";
import { salir } from "../entrar/acciones";
import { campo, ESTADO_PROYECTO, etiqueta, exigirEstudio, lateral } from "@/lib/estudio";

export const dynamic = "force-dynamic";
// Las acciones que hacen trabajar a los agentes pueden tardar: hasta 5 minutos en línea.
export const maxDuration = 300;
export const metadata = { title: "Estudio — Anonymo", robots: { index: false } };

// Todos los proyectos: primero los que esperan una decisión.
export default async function Estudio({ searchParams }: { searchParams: Promise<{ q?: string; error?: string }> }) {
  const yo = await exigirEstudio();
  await traerTodo();
  const { q, error } = await searchParams;
  const solicitudes = listarSolicitudes();
  const hallazgos = q ? buscar(q) : [];
  const orden = { esperando: 0, "en-curso": 1, parado: 2, listo: 3 } as Record<string, number>;
  const proyectos = listar().sort((a, b) => (orden[a.estado] ?? 9) - (orden[b.estado] ?? 9) || b.actualizado.localeCompare(a.actualizado));
  return (
    <main className={`${lateral} pb-16`}>
      <div className="flex flex-wrap items-end justify-between gap-6 pb-8 pt-4">
        <h1 className="display text-[clamp(64px,10vw,160px)]">Estudio</h1>
        <p className="max-w-sm text-[17px] text-gris"><a href="/estudio/analitica" className="text-tinta underline underline-offset-4">Métricas de la web →</a><br />El panel de Jay y Luna. Aquí se aprueba, se pide cambios y se para. Solo para ustedes dos.</p>
        {sesionConfigurada() && (
          <form action={salir} className="flex items-center gap-3">
            <span className="font-mono text-[12px] uppercase tracking-[0.14em] text-gris">Hola, {yo === "luna" ? "Luna" : "Jay"}</span>
            <button className="min-h-11 rounded-full border border-tinta px-4 font-mono text-[12px] uppercase tracking-[0.12em]">Salir</button>
          </form>
        )}
      </div>
      <form role="search" className="mb-8 flex max-w-2xl gap-2">
        <input name="q" defaultValue={q} placeholder="Buscar en todas las entregas: paleta, WhatsApp, Cormorant…" className={campo} aria-label="Buscar en todas las entregas" />
        <button className="rounded-full bg-tinta px-5 font-mono text-[12px] uppercase tracking-[0.12em] text-hueso">Buscar</button>
      </form>
      {error && <p role="alert" className="mb-6 rounded-2xl bg-[#fde8e4] p-4 text-[#8a1c0c]">{error}</p>}
      {solicitudes.length > 0 && (
        <section aria-label="Solicitudes nuevas" className="mb-10">
          <p className={etiqueta}>Solicitudes desde la web · {solicitudes.length}</p>
          <ul className="mt-3 grid gap-3 md:grid-cols-2">
            {solicitudes.map((s) => (
              <li key={s.id} className="rounded-3xl border border-tinta p-5">
                <p className={etiqueta}>{TIPOS[s.tipo].nombre} · {s.fecha.slice(0, 10)}</p>
                <p className="display mt-1 text-4xl">{s.nombre}</p>
                <a href={`mailto:${s.correo}`} className="text-[15px] underline underline-offset-4">{s.correo}</a>
                <p className="mt-3 whitespace-pre-line text-[15px]">{s.mensaje}</p>
                <form action={accionConvertirSolicitud} className="mt-4 flex flex-wrap items-center gap-2">
                  <input type="hidden" name="solicitud" value={s.id} />
                  <select name="plantilla" aria-label="Plantilla" className="min-h-11 rounded-full border border-linea bg-papel px-3 text-[14px]" defaultValue="">
                    <option value="">Sin plantilla</option>
                    {PLANTILLAS.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                  <button className="inline-flex min-h-11 items-center rounded-full bg-tinta px-5 font-mono text-[12px] uppercase tracking-[0.12em] text-hueso">Crear proyecto</button>
                </form>
                <form action={accionDescartarSolicitud} className="mt-2">
                  <input type="hidden" name="solicitud" value={s.id} />
                  <button className="min-h-11 font-mono text-[12px] uppercase tracking-[0.12em] text-gris underline underline-offset-4">Descartar</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
      {q && (
        <section aria-label="Resultados" className="mb-10">
          <p className={etiqueta}>{hallazgos.length} resultado(s) para “{q}”</p>
          <ul className="mt-3 grid gap-2">
            {hallazgos.map((h) => (
              <li key={h.proyecto + h.tarea}>
                <Link href={`/estudio/${h.proyecto}/${h.tarea.replace(".", "-")}`} className="block rounded-2xl px-4 py-3 hover:bg-papel">
                  <span className={etiqueta}>{h.cliente} · {agentePorId(h.agente)?.nombre} · {h.titulo}</span>
                  <span className="mt-1 block text-[15px]">{h.fragmento}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {proyectos.length === 0 && <p className="text-xl font-light">No hay proyectos todavía. Llegan como solicitudes desde el formulario de la web (aparecen arriba) o se crean con <code>npm run pipeline -- nuevo</code>.</p>}
      <ul className="grid gap-3 md:grid-cols-2">
        {proyectos.map((p) => {
          const hechas = Object.values(p.tareas).filter((e) => e === "lista").length;
          const nota = leerNota(leerEntrega(p.pedido.id, "6.trofeo"));
          return (
            <li key={p.pedido.id}>
              <Link href={`/estudio/${p.pedido.id}`} className="block rounded-3xl bg-papel p-6 transition-transform hover:-translate-y-0.5">
                <p className={etiqueta}>{PEDIDOS[p.pedido.tipo].nombre} · {ESTADO_PROYECTO[p.estado]}</p>
                <p className="display mt-2 text-6xl">{p.pedido.cliente}</p>
                <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-linea">
                  <div className="h-full bg-tinta" style={{ width: `${(hechas / p.plan.tareas.length) * 100}%` }} />
                </div>
                <p className="mt-3 flex justify-between text-[15px] text-gris">
                  <span>{hechas}/{p.plan.tareas.length} tareas · fase {p.faseActual}</span>
                  {nota && <span>Jurado {String(nota.final).replace(".", ",")}</span>}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
