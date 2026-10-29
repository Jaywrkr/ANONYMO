import Link from "next/link";
import { agentePorId, PEDIDOS as TIPOS } from "@anonymo/agentes";
import { buscar, leerBitacora, listar, listarPapelera, listarSolicitudes, PLANTILLAS, responsable } from "@anonymo/pipeline";
import { Anillo, Cifra, LineaFases, estadosDeFases, hace } from "@/components/estudio/piezas";
import { accionConvertirSolicitud, accionDescartarSolicitud } from "./acciones";
import { traerTodo } from "@/lib/nube";
import { Oficina } from "@/components/estudio/Oficina";
import { nombreFase, type ProyectoOficina } from "@/lib/oficina";
import { sesionConfigurada } from "@/lib/sesion";
import { salir } from "../entrar/acciones";
import { campo, ESTADO_PROYECTO, etiqueta, exigirEstudio, lateral } from "@/lib/estudio";

export const dynamic = "force-dynamic";
// Las acciones que hacen trabajar a los agentes pueden tardar: hasta 5 minutos en línea.
export const maxDuration = 300;
export const metadata = { title: "Estudio — Anonymo", robots: { index: false } };

// Todos los proyectos: primero los que esperan una decisión.
export default async function Estudio({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const yo = await exigirEstudio();
  await traerTodo();
  const { q } = await searchParams;
  const solicitudes = listarSolicitudes();
  const hallazgos = q ? buscar(q) : [];
  const orden = { plan: 0, esperando: 0, "en-curso": 1, parado: 2, listo: 3 } as Record<string, number>;
  const proyectos = listar().sort((a, b) => (orden[a.estado] ?? 9) - (orden[b.estado] ?? 9) || b.actualizado.localeCompare(a.actualizado));
  const activos = proyectos.filter((p) => p.estado !== "listo");
  const oficina: ProyectoOficina[] = activos.map((p) => ({ id: p.pedido.id, nombre: p.pedido.cliente, estado: p.estado, faseActual: p.faseActual, tareas: p.tareas }));
  // Lo que espera una decisión: primero lo que le toca a quien entró.
  const pendientes = proyectos
    .filter((p) => p.estado === "plan" || p.estado === "esperando")
    .map((p) => {
      const quien = p.estado === "plan" ? yo : responsable(p, p.faseActual);
      const que = p.estado === "plan" ? "Revisar el plan de Atlas y decir «que empiecen»" : p.esperaJurado ? "El jurado no llegó a 7: decidir qué hacer" : `Revisar ${nombreFase(p.faseActual)} y aprobar o pedir cambios`;
      return { p, quien, que };
    })
    .sort((a, b) => Number(b.quien === yo) - Number(a.quien === yo));
  const nombreYo = yo === "luna" ? "Luna" : "Jay";
  const mes = new Date().toISOString().slice(0, 7);
  const gastoMes = proyectos.reduce((s, p) => s + Object.values(p.costos ?? {}).flat().filter((u) => !u.estimado && u.fecha.startsWith(mes)).reduce((a, u) => a + u.usd, 0), 0);
  const semana = Date.now() - 7 * 86400_000;
  const entregasSemana = proyectos.reduce((s, p) => s + Object.entries(p.costos ?? {}).filter(([, l]) => l.some((u) => Date.parse(u.fecha) >= semana)).length, 0);
  const actividad = activos
    .flatMap((p) => leerBitacora(p.pedido.id, 6).map((l) => {
      const [fecha, ...resto] = l.split(" · ");
      return { fecha, texto: resto.join(" · "), id: p.pedido.id, cliente: p.pedido.cliente };
    }))
    .filter((a) => a.texto)
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .slice(0, 8);
  const enPapelera = listarPapelera().length;
  return (
    <main className={`${lateral} pb-16`}>
      <div className="flex flex-wrap items-end justify-between gap-4 pb-6 pt-4">
        <h1 className="display text-[clamp(52px,7vw,112px)] leading-none">Estudio</h1>
        <div className="flex flex-wrap items-center gap-3">
          <a href="/estudio/analitica" className="min-h-11 content-center font-mono text-[12px] uppercase tracking-[0.12em] text-gris underline underline-offset-4">Métricas de la web</a>
          {sesionConfigurada() && (
            <form action={salir} className="flex items-center gap-3">
              <span className="font-mono text-[12px] uppercase tracking-[0.14em] text-gris">Hola, {nombreYo}</span>
              <button className="min-h-11 rounded-full border border-tinta px-4 font-mono text-[12px] uppercase tracking-[0.12em]">Salir</button>
            </form>
          )}
        </div>
      </div>

      <section aria-label="El estudio en cifras" className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Cifra nombre="Te toca" valor={pendientes.filter((x) => x.quien === yo).length} detalle={pendientes.length ? "decisiones esperando" : "nada pendiente"} tono={pendientes.some((x) => x.quien === yo) ? "alerta" : undefined} />
        <Cifra nombre="Proyectos activos" valor={activos.length} detalle={`${proyectos.filter((p) => p.estado === "listo").length} terminados`} />
        <Cifra nombre="Entregas · 7 días" valor={entregasSemana} detalle="hechas por el equipo" />
        <Cifra nombre="IA este mes" valor={`$${gastoMes.toFixed(2)}`} detalle="gasto real en Anthropic" />
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-label="La oficina" className="min-w-0">
          <Oficina proyectos={oficina} />
        </section>

        <aside className="grid content-start gap-6">
          <a href="/estudio/nuevo" className="flex min-h-14 items-center justify-center rounded-full bg-tinta px-7 font-mono text-[13px] uppercase tracking-[0.12em] text-hueso transition-transform hover:-translate-y-0.5">+ Nuevo proyecto</a>

          <section aria-label="Te toca">
            <p className={etiqueta}>Te toca · {pendientes.filter((x) => x.quien === yo).length}</p>
            {pendientes.length === 0 ? (
              <p className="mt-2 text-[15px] text-gris">Nada esperando tu decisión. El equipo está al día.</p>
            ) : (
              <ul className="mt-2 grid gap-2">
                {pendientes.map(({ p, quien, que }) => (
                  <li key={p.pedido.id}>
                    <Link href={`/estudio/${p.pedido.id}`} className={`block rounded-2xl p-4 transition-transform hover:-translate-y-0.5 ${quien === yo ? "bg-[#fff1c2]" : "bg-papel"}`}>
                      <span className="block text-[17px] font-medium leading-tight">{p.pedido.cliente}</span>
                      <span className="mt-1 block text-[14px]">{que}</span>
                      <span className="mt-1 block text-[12px] text-gris">{quien === yo ? "Te toca a ti" : `Le toca a ${quien === "luna" ? "Luna" : "Jay"}`}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Proyectos">
            <p className={etiqueta}>Proyectos · {proyectos.length}</p>
            {proyectos.length === 0 && <p className="mt-2 text-[15px] text-gris">Todavía no hay. Después de hablar con un cliente, dale a «Nuevo proyecto».</p>}
            <ul className="mt-2 grid gap-1">
              {proyectos.map((p) => {
                const hechas = Object.values(p.tareas).filter((e) => e === "lista").length;
                return (
                  <li key={p.pedido.id}>
                    <Link href={`/estudio/${p.pedido.id}`} className="flex items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-papel">
                      <Anillo valor={hechas / Math.max(1, p.plan.tareas.length)} tam={38} grosor={3.5} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="truncate text-[15px] font-medium">{p.pedido.cliente}</span>
                          <span className="shrink-0 text-[12px] text-gris">{ESTADO_PROYECTO[p.estado]}</span>
                        </span>
                        <span className="mt-1.5 block"><LineaFases fases={estadosDeFases(p)} estado={p.estado} compacta /></span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {enPapelera > 0 && <Link href="/estudio/papelera" className="mt-2 inline-flex min-h-11 items-center px-3 text-[13px] text-gris underline underline-offset-4">Papelera · {enPapelera}</Link>}
          </section>

          {actividad.length > 0 && (
            <section aria-label="Actividad reciente">
              <p className={etiqueta}>Actividad reciente</p>
              <ol className="mt-2 grid gap-3 border-l border-linea pl-4">
                {actividad.map((a, i) => (
                  <li key={i} className="relative">
                    <i aria-hidden className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-hueso bg-tinta" />
                    <Link href={`/estudio/${a.id}`} className="block text-[14px] leading-snug hover:underline">
                      <span className="font-medium">{a.cliente}</span> · {a.texto}
                    </Link>
                    <span className="text-[12px] text-gris">{hace(a.fecha)}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </aside>
      </div>

      <div className="mt-12 border-t border-linea pt-8">
      <form role="search" className="mb-8 flex max-w-2xl gap-2">
        <input name="q" defaultValue={q} placeholder="Buscar en todas las entregas: paleta, WhatsApp, Cormorant…" className={campo} aria-label="Buscar en todas las entregas" />
        <button className="rounded-full bg-tinta px-5 font-mono text-[12px] uppercase tracking-[0.12em] text-hueso">Buscar</button>
      </form>
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
      </div>
    </main>
  );
}
