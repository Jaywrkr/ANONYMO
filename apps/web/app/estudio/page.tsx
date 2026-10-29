import Link from "next/link";
import { AGENTES, agentePorId, PEDIDOS as TIPOS } from "@anonymo/agentes";
import { leerEntrega, listar, listarSolicitudes, PLANTILLAS, responsable, type Proyecto, type TareaId } from "@anonymo/pipeline";
import { Cara, fechaLarga, hace, saludo } from "@/components/estudio/piezas";
import { FilaProyecto } from "@/components/estudio/FilaProyecto";
import { Confirmar } from "@/components/estudio/Confirmar";
import { Enviar } from "./nuevo/Enviar";
import { accionConvertirSolicitud, accionDescartarSolicitud } from "./acciones";
import { traerTodo } from "@/lib/nube";
import { puestos } from "@/lib/oficina";
import { momento, nombreSocio, type Momento } from "@/lib/camino";
import { espacio } from "@/lib/espacio";
import { botonLleno, exigirEstudio, serif } from "@/lib/estudio";

export const dynamic = "force-dynamic";
// Las acciones que hacen trabajar a los agentes pueden tardar: hasta 5 minutos en línea.
export const maxDuration = 300;
export const metadata = { title: "Estudio — Anonymo", robots: { index: false } };

function Grupo({ id, titulo, ayuda, cuenta, children }: { id: string; titulo: string; ayuda: string; cuenta: number; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`t-${id}`} className="scroll-mt-6">
      <div className="flex items-baseline gap-3">
        <h2 id={`t-${id}`} className={`${serif} text-[28px] leading-none`}>{titulo}</h2>
        <span className="text-[13px] text-suave">{cuenta}</span>
      </div>
      <p className="mt-1 text-[13px] text-suave">{ayuda}</p>
      <div className="mt-4 grid gap-2.5">{children}</div>
    </section>
  );
}

// El inicio es una lista de trabajo (sistema/33): primero lo que te toca, después lo que hace el equipo.
export default async function Estudio() {
  const yo = await exigirEstudio();
  let errorNube = "";
  try { await traerTodo(); } catch (e) { errorNube = (e as Error).message; }
  const nombreYo = nombreSocio(yo);
  const otro = yo === "jay" ? "luna" : "jay";

  const proyectos = listar().sort((a, b) => b.actualizado.localeCompare(a.actualizado));
  const solicitudes = listarSolicitudes();
  const filas = proyectos.map((p) => {
    const m = momento(p, yo, responsable(p, p.faseActual));
    const destino = p.estado === "esperando" && m.teToca ? `/estudio/${p.pedido.id}/revisar` : `/estudio/${p.pedido.id}`;
    const caras = m.trabajando.length ? m.trabajando : p.estado === "esperando" ? Object.keys(p.tareas).filter((t) => t.startsWith(`${p.faseActual}.`)).map((t) => t.split(".")[1]) : p.estado === "plan" ? ["atlas"] : [];
    return { p, m, destino, caras };
  });
  const de = (f: (m: Momento) => boolean) => filas.filter((x) => f(x.m));
  const teToca = de((m) => m.teToca);
  const alOtro = de((m) => m.tono === "otro");
  const trabajando = de((m) => m.tono === "vivo");
  const enPausa = de((m) => m.tono === "pausa");
  const listos = de((m) => m.tono === "listo");
  const delPortal = proyectos.flatMap((p) => (p.pendientesCliente ?? []).map((n) => ({ p, n })));
  const pendientes = teToca.length + solicitudes.length + delPortal.length;

  // Columna de al lado: la oficina, lo último y el mes.
  const oficina = puestos(proyectos.filter((p) => p.estado !== "listo").map((p) => ({ id: p.pedido.id, nombre: p.pedido.cliente, estado: p.estado, faseActual: p.faseActual, tareas: p.tareas })));
  const ultimas = proyectos
    .flatMap((p) => Object.entries(p.tareas).filter(([, e]) => e === "lista").map(([t]) => ({ p, e: leerEntrega(p.pedido.id, t as TareaId) })))
    .filter((x): x is { p: Proyecto; e: NonNullable<ReturnType<typeof leerEntrega>> } => !!x.e)
    .sort((a, b) => b.e.creado.localeCompare(a.e.creado))
    .slice(0, 5);
  const mes = new Date().toISOString().slice(0, 7);
  const gastoMes = proyectos.reduce((s, p) => s + Object.values(p.costos ?? {}).flat().filter((u) => !u.estimado && u.fecha.startsWith(mes)).reduce((a, u) => a + u.usd, 0), 0);

  // Cada día un agente distinto dice su frase.
  const dia = Math.floor((Date.now() - 5 * 3600_000) / 86400_000);
  const delDia = AGENTES[dia % AGENTES.length];
  const resumen = pendientes
    ? `Tienes ${pendientes === 1 ? "una cosa" : `${pendientes} cosas`} por decidir.`
    : trabajando.length ? `El equipo está trabajando en ${trabajando.length === 1 ? "un proyecto" : `${trabajando.length} proyectos`}.`
    : proyectos.length ? "Estás al día." : "Empecemos.";

  return (
    <div className="px-5 pb-16 pt-7 md:px-10 md:pt-9">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0">
          <p className="text-[13px] text-suave">{fechaLarga()}</p>
          <h1 className={`${serif} mt-1 text-[clamp(34px,4.2vw,54px)] leading-[1.02]`}>{saludo(nombreYo)} <span className="text-[#b3ab9f]">{resumen}</span></h1>
          <p className="mt-3 flex items-center gap-2 text-[14px] text-medio">
            <Cara id={delDia.id} tam={26} />
            <span>Hoy habla {delDia.nombre}: <span className="font-serif text-[17px] italic text-tinta">«{delDia.frase}»</span></span>
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/estudio/biblioteca?buscar=1" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 text-[13px] font-medium shadow-[inset_0_0_0_1px_var(--color-borde)]">Buscar <kbd className="font-mono text-[10px] text-suave">Ctrl K</kbd></Link>
          <Link href="/estudio/nuevo" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-tinta px-5 text-[13px] font-medium text-white hover:bg-black">+ Nuevo pedido</Link>
        </div>
      </div>

      {errorNube && <p role="alert" className="mt-6 rounded-2xl bg-[#fde8e4] p-4 text-[14px] text-[#8a1c0c]">No se pudo leer la nube: {errorNube}. Lo que ves puede no estar al día; recarga en un momento.</p>}

      {proyectos.length === 0 && solicitudes.length === 0 ? (
        <section className="mt-10 rounded-[22px] bg-white p-8 shadow-[0_0_0_1px_rgba(26,24,22,.05)] md:p-12">
          <Cara id="atlas" tam={80} flota />
          <p className={`${serif} mt-5 text-[36px] leading-[1.05]`}>Así funciona el estudio.</p>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">
            {[["1", "Cuéntale el pedido a Atlas", "Lo que hablaste con el cliente, en tus palabras. Pega enlaces y suelta fotos."], ["2", "Revisa su plan", "Atlas decide quién trabaja y cuánto cuesta. Tú dices «que empiecen»."], ["3", "Revisa cada fase", "El equipo trabaja y se detiene para que apruebes o pidas cambios."]].map(([n, t, d]) => (
              <li key={n} className="rounded-2xl bg-[#f6f3ee] p-5"><span className="font-mono text-[12px] text-suave">{n}</span><p className="mt-1 text-[16px] font-medium">{t}</p><p className="mt-1 text-[14px] text-medio">{d}</p></li>
            ))}
          </ol>
          <Link href="/estudio/nuevo" className={`${botonLleno} mt-7`}>Contar el primer pedido</Link>
        </section>
      ) : (
        <div className="mt-9 grid gap-10 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="grid content-start gap-10">
            <Grupo id="te-toca" titulo="Te toca" cuenta={pendientes} ayuda="Lo que espera una decisión tuya. Lo más nuevo arriba.">
              {pendientes === 0 && (
                <div className="flex items-center gap-4 rounded-[18px] border border-dashed border-borde p-5">
                  <Cara id="ledger" tam={40} />
                  <p className="text-[15px] text-medio">Nada espera tu decisión. Cuando el equipo termine una fase, aparece aquí.</p>
                </div>
              )}
              {teToca.map(({ p, m, destino, caras }) => <FilaProyecto key={p.pedido.id} cuando={p.actualizado} id={p.pedido.id} cliente={p.pedido.cliente} tipo={p.pedido.tipo} m={m} destino={destino} caras={caras} />)}
              {delPortal.map(({ p, n }) => (
                <Link key={p.pedido.id + n.fecha} href={`/estudio/${p.pedido.id}?ver=cliente`} className="group grid items-center gap-x-6 gap-y-3 rounded-[18px] bg-[#fff6ec] p-4 pl-5 shadow-[0_0_0_1px_rgba(255,90,31,.15)] transition hover:-translate-y-0.5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto]">
                  <span className="flex min-w-0 items-center gap-3">
                    <i aria-hidden className="h-9 w-1.5 shrink-0 rounded-full" style={{ background: espacio(p.pedido.id).punto }} />
                    <span className="min-w-0"><span className="block truncate font-serif text-[24px] leading-[1.05]">{p.pedido.cliente}</span><span className="text-[12px] text-suave">Escribió en su portal · {hace(n.fecha)}</span></span>
                  </span>
                  <span className="line-clamp-2 font-serif text-[19px] leading-snug">“{n.texto}”</span>
                  <span className="inline-flex min-h-10 items-center rounded-full bg-tinta px-4 text-[13px] font-medium text-white md:justify-self-end">Pasárselo al equipo →</span>
                </Link>
              ))}
              {solicitudes.map((s) => (
                <article key={s.id} className="rounded-[18px] bg-white p-5 shadow-[0_0_0_1px_rgba(26,24,22,.05),0_6px_18px_-12px_rgba(40,30,20,.2)] ring-1 ring-urgente/25">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="font-serif text-[24px] leading-[1.05]">{s.nombre}</span>
                    <span className="text-[12px] text-suave">Pedido desde la web · {TIPOS[s.tipo].nombre} · {hace(s.fecha)} · <a href={`mailto:${s.correo}`} className="underline underline-offset-2">{s.correo}</a></span>
                  </div>
                  <p className="mt-2 line-clamp-3 whitespace-pre-line text-[14px] leading-snug text-medio">{s.mensaje}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <form action={accionConvertirSolicitud} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="solicitud" value={s.id} />
                      <label className="sr-only" htmlFor={`plantilla-${s.id}`}>Plantilla</label>
                      <select id={`plantilla-${s.id}`} name="plantilla" defaultValue="" className="min-h-10 rounded-full bg-[#f1ede6] px-3 text-[13px] outline-none">
                        <option value="">Sin plantilla</option>
                        {PLANTILLAS.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                      </select>
                      <Enviar className="inline-flex min-h-10 items-center rounded-full bg-tinta px-4 text-[13px] font-medium text-white" texto="Que Atlas arme el plan →" trabajando="Atlas está leyendo el pedido…" largo />
                    </form>
                    <Confirmar accion={accionDescartarSolicitud} campos={{ solicitud: s.id }} disparador="Descartar" titulo="¿Descartar este pedido?" texto={`El pedido de ${s.nombre} sale de la lista. No se crea ningún proyecto.`} confirmar="Descartar" />
                  </div>
                </article>
              ))}
            </Grupo>

            {alOtro.length > 0 && (
              <Grupo id="al-otro" titulo={`Le toca a ${nombreSocio(otro)}`} cuenta={alOtro.length} ayuda={`Fases que aprueba ${nombreSocio(otro)}. Si decides tú, queda a tu nombre.`}>
                {alOtro.map(({ p, m, caras }) => <FilaProyecto key={p.pedido.id} cuando={p.actualizado} id={p.pedido.id} cliente={p.pedido.cliente} tipo={p.pedido.tipo} m={m} destino={`/estudio/${p.pedido.id}`} caras={caras} />)}
              </Grupo>
            )}

            <Grupo id="trabajando" titulo="El equipo está trabajando" cuenta={trabajando.length} ayuda="No tienes que hacer nada: te avisa cuando termine la fase.">
              {trabajando.length === 0 && <p className="text-[14px] text-suave">Nadie está trabajando ahora.</p>}
              {trabajando.map(({ p, m, caras }) => <FilaProyecto key={p.pedido.id} cuando={p.actualizado} id={p.pedido.id} cliente={p.pedido.cliente} tipo={p.pedido.tipo} m={m} destino={`/estudio/${p.pedido.id}`} caras={caras} />)}
            </Grupo>

            {enPausa.length > 0 && (
              <Grupo id="pausa" titulo="En pausa" cuenta={enPausa.length} ayuda="Nadie trabaja en estos hasta que los reanudes.">
                {enPausa.map(({ p, m, caras }) => <FilaProyecto key={p.pedido.id} cuando={p.actualizado} id={p.pedido.id} cliente={p.pedido.cliente} tipo={p.pedido.tipo} m={m} destino={`/estudio/${p.pedido.id}`} caras={caras} />)}
              </Grupo>
            )}

            {listos.length > 0 && (
              <details className="group">
                <summary className="flex min-h-11 cursor-pointer list-none items-baseline gap-3">
                  <span className={`${serif} text-[28px] leading-none`}>Terminados</span>
                  <span className="text-[13px] text-suave">{listos.length} · <span className="group-open:hidden">ver</span><span className="hidden group-open:inline">ocultar</span></span>
                </summary>
                <div className="mt-4 grid gap-2.5">
                  {listos.map(({ p, m }) => <FilaProyecto key={p.pedido.id} cuando={p.actualizado} id={p.pedido.id} cliente={p.pedido.cliente} tipo={p.pedido.tipo} m={m} destino={`/estudio/${p.pedido.id}`} caras={[]} />)}
                </div>
              </details>
            )}
          </div>

          <aside className="grid content-start gap-4">
            <Link href="/estudio/oficina" className="block rounded-[18px] bg-[#f6f3ee] p-5 shadow-[0_0_0_1px_rgba(26,24,22,.04)] transition hover:-translate-y-0.5">
              <span className="flex items-center gap-2 text-[12px] text-suave"><i className={`h-1.5 w-1.5 rounded-full ${trabajando.length ? "late bg-vivo" : "bg-suave"}`} /> La oficina ahora</span>
              <span className="mt-3 flex flex-wrap gap-0.5">
                {Object.entries(oficina).map(([id, x]) => <Cara key={id} id={id} tam={28} apagado={x.estado === "libre"} className={x.estado === "trabajando" ? "flota" : ""} />)}
              </span>
              <span className="mt-3 block text-[13px] text-medio">{Object.values(oficina).filter((x) => x.estado === "trabajando").length} trabajando · {Object.values(oficina).filter((x) => x.estado === "libre").length} libres · ver la oficina →</span>
            </Link>

            <div className="rounded-[18px] bg-white p-5 shadow-[0_0_0_1px_rgba(26,24,22,.05)]">
              <p className="text-[12px] text-suave">Lo último que entregaron</p>
              {ultimas.length === 0 ? <p className="mt-2 text-[14px] text-medio">Todavía nada.</p> : (
                <ul className="mt-2 grid">
                  {ultimas.map(({ p, e }) => (
                    <li key={p.pedido.id + e.tarea}>
                      <Link href={`/estudio/${p.pedido.id}/${e.tarea.replace(".", "-")}`} className="flex min-h-11 items-center gap-3 rounded-xl px-1 py-1.5 transition hover:bg-[#f6f3ee]">
                        <Cara id={e.agente} tam={24} titulo={false} />
                        <span className="min-w-0 flex-1 leading-tight"><span className="block truncate text-[13px] font-medium">{e.titulo}</span><span className="block truncate text-[12px] text-suave">{agentePorId(e.agente)?.nombre} · {p.pedido.cliente}</span></span>
                        <span className="shrink-0 text-[11px] text-suave">{hace(e.creado)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/estudio/biblioteca" className="mt-2 inline-flex min-h-9 items-center text-[13px] text-medio hover:text-tinta">Ver todo en la biblioteca →</Link>
            </div>

            <div className="rounded-[18px] bg-white p-5 shadow-[0_0_0_1px_rgba(26,24,22,.05)]">
              <p className="text-[12px] text-suave">Gastado en IA este mes</p>
              <p className={`${serif} mt-1 text-[44px] leading-none`}>${gastoMes.toFixed(2)}</p>
              <p className="mt-1 text-[12px] text-suave">{proyectos.filter((p) => p.estado !== "listo").length} proyectos activos</p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
