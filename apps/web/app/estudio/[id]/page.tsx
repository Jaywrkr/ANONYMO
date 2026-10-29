import Link from "next/link";
import { notFound } from "next/navigation";
import { AREAS, FASES, PEDIDOS, agentePorId } from "@anonymo/agentes";
import { contratoPorId, dependientes, repartir, esImagen, existe, listarArchivos, leerBitacora, leerEntrega, leerNota, leerProyecto, nombreTarea, type TareaId, calendario, sumar, PRECIOS, plantillaPorId, presupuestoVivo, responsable, nubeActiva } from "@anonymo/pipeline";
import { Calendario } from "@/components/estudio/Calendario";
import { PlanAtlas } from "@/components/estudio/PlanAtlas";
import { Oficina } from "@/components/estudio/Oficina";
import { Enviar } from "../nuevo/Enviar";
import type { ProyectoOficina } from "@/lib/oficina";
import { Anillo, Ficha, LineaFases, estadosDeFases, hace } from "@/components/estudio/piezas";
import { Confirmar } from "@/components/estudio/Confirmar";
import { ZonaArchivos } from "@/components/estudio/ZonaArchivos";
import { sesionConfigurada } from "@/lib/sesion";
import { traer } from "@/lib/nube";
import { boton, botonLleno, campo, ESTADO_PROYECTO, etiqueta, exigirEstudio, lateral } from "@/lib/estudio";
import { accionAPapelera, accionSacarDePapelera, accionAprobar, accionCambiar, accionDescartarPendiente, accionMandarCliente, accionParar, accionPausas, accionPortal, accionReanudar, accionResponder, accionResponsable, accionSeguir, accionSubir, accionVerReparto } from "../acciones";

export const dynamic = "force-dynamic";
// Las acciones que hacen trabajar a los agentes pueden tardar: hasta 5 minutos en línea.
export const maxDuration = 300;
export const metadata = { title: "Proyecto — Estudio", robots: { index: false } };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string; vista?: string; pendiente?: string }> };

const ESTADO_TAREA: Record<string, string> = { lista: "Lista", "en-curso": "En curso", "por-empezar": "Por empezar", rehacer: "Por rehacer" };

export default async function ProyectoEstudio({ params, searchParams }: Props) {
  const yo = await exigirEstudio();
  const conClaves = sesionConfigurada();
  const { id } = await params;
  await traer(id);
  const { ok, error, vista, pendiente } = await searchParams;
  if (!existe(id)) notFound();
  const p = leerProyecto(id);
  const nota = leerNota(leerEntrega(id, "6.trofeo"));
  const deFase = (f: number) => p.plan.tareas.filter((t) => t.startsWith(`${f}.`)) as TareaId[];
  const actuales = deFase(p.faseActual);
  // Vista previa del reparto de un comentario del cliente.
  const decision = vista ? await repartir(vista, p.plan) : undefined;
  const reparto = decision?.tareas ?? [];
  const arrastra = vista ? dependientes(reparto, p.plan.tareas) : [];
  const conTarea = [...new Set(p.plan.tareas.map((t) => t.split(".")[1]))];
  const comunes = (
    <>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="motor" value="" />
    </>
  );

  const nombreYo = yo === "luna" ? "Luna" : "Jay";
  const leToca = responsable(p, p.faseActual);
  const enLinea = nubeActiva();
  const oficina: ProyectoOficina[] = [{ id, nombre: p.pedido.cliente, estado: p.estado, faseActual: p.faseActual, tareas: p.tareas }];
  const b = presupuestoVivo(p);
  const costo = sumar(p);
  const archivos = listarArchivos(id);
  const hechas = Object.values(p.tareas).filter((e) => e === "lista").length;
  const conversacion = [
    ...(p.notasCliente ?? []).map((n) => ({ fecha: n.fecha, texto: n.texto, quien: n.quien, a: n.tareas.map(nombreTarea).join(", "), pendiente: false })),
    ...(p.pendientesCliente ?? []).map((n) => ({ fecha: n.fecha, texto: n.texto, quien: "cliente" as const, a: "", pendiente: true })),
  ].sort((x, y) => x.fecha.localeCompare(y.fecha));
  const linkSuave = "inline-flex min-h-11 items-center font-mono text-[12px] uppercase tracking-[0.12em] text-gris underline underline-offset-4";

  return (
    <main className={`${lateral} pb-16`}>
      <Link href="/estudio" className={`${etiqueta} inline-flex min-h-11 items-center underline underline-offset-4`}>← Estudio</Link>
      <div className="flex flex-wrap items-end justify-between gap-6 pb-4 pt-2">
        <div>
          <p className={etiqueta}>{PEDIDOS[p.pedido.tipo].nombre}{plantillaPorId(p.pedido.plantilla) ? ` · ${plantillaPorId(p.pedido.plantilla)!.nombre}` : ""} · {p.papelera ? "En la papelera" : ESTADO_PROYECTO[p.estado]}</p>
          <h1 className="display mt-2 text-[clamp(48px,7vw,112px)] leading-none">{p.pedido.cliente}</h1>
        </div>
        <div className="flex items-center gap-4">
          {nota && <div className="text-right"><p className={etiqueta}>Jurado</p><p className="display text-6xl leading-none">{String(nota.final).replace(".", ",")}</p></div>}
          <Anillo valor={hechas / Math.max(1, p.plan.tareas.length)} tam={64} grosor={5} etiqueta={`${hechas} de ${p.plan.tareas.length} entregas listas`} />
        </div>
      </div>
      <div className="mb-4 overflow-x-auto pb-1"><LineaFases fases={estadosDeFases(p)} estado={p.estado} /></div>
      {p.papelera && (
        <div role="alert" className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-[#fde8e4] p-5">
          <p className="text-[15px] text-[#8a1c0c]">Este proyecto está en la papelera desde {hace(p.papelera.fecha)}: no aparece ni trabaja.</p>
          <Confirmar accion={accionSacarDePapelera} campos={{ id }} disparador="Restaurar" claseDisparador={botonLleno} titulo="¿Restaurar el proyecto?" texto={`«${p.pedido.cliente}» vuelve al estudio tal como estaba.`} confirmar="Restaurar" />
        </div>
      )}
      <details className="max-w-3xl">
        <summary className={`${etiqueta} cursor-pointer`}>Lo que contaron del cliente</summary>
        <p className="mt-2 whitespace-pre-line text-[16px] font-light">{p.pedido.descripcion}</p>
      </details>


      {/* AHORA: lo único que hay que decidir en este momento. */}
      {p.estado === "plan" && <PlanAtlas p={p} conIA={!!process.env.ANTHROPIC_API_KEY} />}
      {p.estado === "esperando" && (
        <section aria-label="Te toca" className="mt-8 rounded-3xl border border-tinta p-6 md:p-8">
          <p className={etiqueta}>{p.esperaJurado ? "El jurado no llegó a 7 después de dos rondas" : `Terminó ${FASES.find((x) => x.n === p.faseActual)?.nombre}`} · {leToca === yo ? "te toca a ti" : `le toca a ${leToca === "luna" ? "Luna" : "Jay"}`}</p>
          <p className="display mt-1 text-[clamp(32px,4vw,52px)] leading-none">Revisa lo que entregaron y decide</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {actuales.map((t) => {
              const a = agentePorId(t.split(".")[1])!;
              return (
                <li key={t}>
                  <Link href={`/estudio/${id}/${t.replace(".", "-")}`} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-papel px-4 text-[15px] hover:bg-linea">
                    <i aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: AREAS[a.area].medio }} />
                    {a.nombre} · {contratoPorId(t)?.entrega} →
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <form action={accionAprobar} className="grid content-start gap-2">
              {comunes}
              {conClaves ? <input type="hidden" name="quien" value={yo} /> : (
                <select name="quien" className={campo} defaultValue={leToca} aria-label="Quién decide"><option value="jay">Jay</option><option value="luna">Luna</option></select>
              )}
              {leToca !== yo && conClaves && <input type="hidden" name="forzar" value="1" />}
              <input name="nota" placeholder="Nota para el equipo (opcional)" className={campo} />
              <Enviar className={botonLleno} texto={p.esperaJurado ? "Aceptar y cerrar" : "Aprobar y seguir"} trabajando="El equipo está trabajando… no cierres la página" />
              {leToca !== yo && <p className="text-[13px] text-gris">Esta fase la aprueba {leToca === "luna" ? "Luna" : "Jay"}; si apruebas tú, queda a tu nombre.</p>}
            </form>
            <form action={accionCambiar} className="grid content-start gap-2">
              {comunes}
              <input type="hidden" name="quien" value={yo} />
              <textarea name="nota" rows={3} required placeholder="Qué hay que cambiar (ej.: más elegante, menos texto)" className={campo} aria-label="Pedir cambios" />
              <select name="agente" className={campo} defaultValue="" aria-label="A quién">
                <option value="">A toda la fase</option>
                {actuales.map((t) => <option key={t} value={t.split(".")[1]}>Solo a {agentePorId(t.split(".")[1])?.nombre}</option>)}
              </select>
              <Enviar className={boton} texto="Pedir cambios" trabajando="Rehaciendo…" />
            </form>
          </div>
        </section>
      )}
      {p.estado === "en-curso" && (
        <form action={accionSeguir} className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-tinta p-6">
          {comunes}
          <div>
            <p className="display text-[clamp(28px,3.5vw,44px)] leading-none">El equipo quedó a medias</p>
            <p className="mt-1 text-[15px] text-gris">Pasa si se cortó por tiempo. Lo que ya terminaron está guardado: sigue desde ahí.</p>
          </div>
          <Enviar className={botonLleno} texto="Seguir" trabajando="El equipo está trabajando…" />
        </form>
      )}
      {p.estado === "parado" && (
        <form action={accionReanudar} className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-tinta p-6">
          {comunes}
          <p className="display text-[clamp(28px,3.5vw,44px)] leading-none">Proyecto parado</p>
          <button className={botonLleno}>Reanudar</button>
        </form>
      )}
      {p.estado === "listo" && (
        <div className="mt-8 rounded-3xl bg-[#e3f5e1] p-6">
          <p className="display text-[clamp(28px,3.5vw,44px)] leading-none">Proyecto listo</p>
          <p className="mt-1 text-[15px]">Todas las fases aprobadas{nota ? ` · nota del jurado ${String(nota.final).replace(".", ",")}` : ""}.</p>
        </div>
      )}

      <section aria-label="El equipo en este proyecto" className="mt-8">
        <p className={`${etiqueta} mb-3`}>El equipo en este proyecto</p>
        <Oficina proyectos={oficina} vivo={id} alto="h-[260px] sm:h-[360px] lg:h-[420px]" />
      </section>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="min-w-0">
          <section aria-label="Entregas">
            <p className={etiqueta}>Entregas por fase</p>
            {p.plan.fases.map((f) => {
              const fase = FASES.find((x) => x.n === f)!;
              return (
                <div key={f} className="border-t border-linea py-4">
                  <p className="text-[15px] font-medium">{String(f).padStart(2, "0")} · {fase.nombre} <span className="font-normal text-gris">· aprueba {responsable(p, f) === "luna" ? "Luna" : "Jay"}</span></p>
                  <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                    {deFase(f).map((t) => {
                      const c = contratoPorId(t)!;
                      const a = agentePorId(c.agente)!;
                      const e = leerEntrega(id, t);
                      const est = p.tareas[t];
                      return (
                        <li key={t}>
                          <Link href={`/estudio/${id}/${t.replace(".", "-")}`} className={`flex h-full flex-col gap-2 rounded-2xl border p-4 transition-transform hover:-translate-y-0.5 ${est === "lista" ? "border-linea bg-papel" : est === "en-curso" ? "border-[#2bb673] bg-hueso" : "border-dashed border-linea bg-transparent"}`}>
                            <span className="flex items-center gap-3">
                              <Ficha id={a.id} tam={30} apagado={est === "por-empezar"} />
                              <span className="flex-1 leading-tight"><span className="block font-medium">{a.nombre}</span><span className="block text-[13px] text-gris">{c.entrega}{e ? ` · v${e.version}` : ""}</span></span>
                              <span className={`rounded-full px-2 py-0.5 text-[11px] ${est === "lista" ? "bg-[#e3f5e1]" : est === "en-curso" ? "bg-[#2bb673] text-white" : est === "rehacer" ? "bg-[#fff1c2]" : "bg-linea/60 text-gris"}`}>{ESTADO_TAREA[est]}</span>
                            </span>
                            {e?.dice && <span className="line-clamp-3 text-[14px] leading-snug">“{e.dice}”</span>}
                            {e?.necesita && e.necesita !== "—" && <span className="line-clamp-2 text-[12px] text-gris">Necesita: {e.necesita}</span>}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </section>

          <section id="cliente" aria-label="Lo que dijo el cliente" className="mt-8 border-t border-tinta pt-4">
            <p className={etiqueta}>Lo que dijo el cliente</p>
            <p className="mt-1 text-[14px] text-gris">Lo que te diga por WhatsApp, llamada o en persona: Atlas lo manda a quien corresponde y todos lo leen desde ahora.</p>
            {conversacion.length > 0 && (
              <ol className="mt-4 grid gap-3">
                {conversacion.map((m) => {
                  const delCliente = m.quien === "cliente";
                  return (
                    <li key={m.fecha + m.texto} className={`flex ${delCliente ? "justify-start" : "justify-end"}`}>
                      <div className={`max-w-[85%] rounded-3xl px-4 py-3 ${m.pendiente ? "rounded-bl-md bg-[#fff1c2]" : delCliente ? "rounded-bl-md bg-papel" : "rounded-br-md bg-tinta text-hueso"}`}>
                        <p className={`text-[12px] ${delCliente || m.pendiente ? "text-gris" : "text-hueso/70"}`}>
                          {delCliente ? p.pedido.cliente : m.quien === "luna" ? "Luna anotó" : "Jay anotó"} · {hace(m.fecha)}{m.pendiente ? " · desde su portal, sin mandar al equipo" : ""}
                        </p>
                        <p className="mt-1 text-[16px] leading-snug">{m.texto}</p>
                        {m.a && <p className={`mt-1 text-[12px] ${delCliente ? "text-gris" : "text-hueso/70"}`}>→ {m.a}</p>}
                        {m.pendiente && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            <form action={accionVerReparto}>{comunes}<input type="hidden" name="texto" value={m.texto} /><input type="hidden" name="pendiente" value={m.fecha} /><button className={boton}>Revisar y mandar</button></form>
                            <form action={accionDescartarPendiente}>{comunes}<input type="hidden" name="pendiente" value={m.fecha} /><button className={linkSuave}>Descartar</button></form>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
            {vista ? (
              <form action={accionMandarCliente} className="mt-4 grid gap-3 rounded-3xl bg-papel p-5">
                {comunes}
                <input type="hidden" name="texto" value={vista} />
                {pendiente && <><input type="hidden" name="pendiente" value={pendiente} /><input type="hidden" name="origen" value="cliente" /></>}
                <p className="text-lg font-light">“{vista}”</p>
                <fieldset>
                  <legend className={etiqueta}>Atlas lo manda a (puedes cambiarlo)</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {conTarea.map((a) => (
                      <label key={a} className="flex min-h-11 items-center gap-2 rounded-full border border-linea px-3">
                        <input type="checkbox" name="agentes" value={a} defaultChecked={reparto.some((t) => t.endsWith(`.${a}`))} />
                        {agentePorId(a)?.nombre}
                      </label>
                    ))}
                  </div>
                </fieldset>
                {decision && <p className="text-[14px]">{decision.como === "ia" ? "Atlas (con IA): " : "Atlas (por palabras clave): "}{decision.razon}</p>}
                <p className="text-[14px] text-gris">Con este reparto se rehacen {arrastra.length} tareas: {arrastra.map(nombreTarea).join(", ")}.</p>
                <div className="flex flex-wrap gap-2">
                  <Enviar className={botonLleno} texto="Mandar al equipo" trabajando="El equipo está rehaciendo…" />
                  <a href={`/estudio/${id}#cliente`} className={linkSuave}>Cancelar</a>
                </div>
              </form>
            ) : (
              <form action={accionVerReparto} className="mt-4 grid gap-2">
                {comunes}
                <div className="flex items-end gap-2 rounded-3xl border border-linea bg-papel p-2 focus-within:border-tinta">
                  <textarea name="texto" rows={2} required placeholder="Lo que te dijo el cliente… (ej.: la de estética tiene que ser mucho más elegante)" className="flex-1 resize-none bg-transparent p-2 text-[15px] outline-none" aria-label="Lo que dijo el cliente" />
                  <button className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-tinta px-5 font-mono text-[12px] uppercase tracking-[0.12em] text-hueso">Ver a quién va</button>
                </div>
              </form>
            )}
          </section>
        </div>

        <aside className="grid content-start gap-6">
          <div className="rounded-3xl border border-linea p-6">
            <p className={etiqueta}>Archivos del cliente · {archivos.length}</p>
            {archivos.length > 0 && (
              <ul className="mt-3 grid grid-cols-3 gap-2">
                {archivos.map((a) => (
                  <li key={a.nombre}>
                    <a href={`/estudio/${id}/archivos/${encodeURIComponent(a.nombre)}`} target="_blank" rel="noreferrer" className="block" title={a.nota ?? a.nombre}>
                      {esImagen(a.nombre) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={`/estudio/${id}/archivos/${encodeURIComponent(a.nombre)}`} alt={a.nota ?? a.nombre} className="aspect-square w-full rounded-xl object-cover" />
                      ) : (
                        <span className="flex aspect-square w-full items-center justify-center rounded-xl bg-papel p-2 text-center font-mono text-[11px] break-all">{a.nombre}</span>
                      )}
                    </a>
                  </li>
                ))}
              </ul>
            )}
            <form action={accionSubir} className="mt-3 grid gap-2">
              {comunes}
              <ZonaArchivos limiteMB={enLinea ? 4 : undefined} />
              <input name="nota" placeholder="Qué es (ej.: fotos del consultorio)" className={campo} />
              <button className={boton}>Subir</button>
            </form>
          </div>

          <div className="rounded-3xl border border-linea p-6">
            <p className={etiqueta}>Portal del cliente</p>
            {p.portal ? (
              <>
                <a href={`/portal/${id}?t=${p.portal.token}`} target="_blank" rel="noreferrer" className="mt-2 block break-all text-[15px] underline underline-offset-4">Abrir su portal ↗</a>
                <p className="mt-2 text-[14px] text-gris">Copia ese enlace y mándaselo. Ve sus entregas (sin precios internos ni la nota del jurado), aprueba fases y comenta.</p>
                <form action={accionPortal} className="mt-2">{comunes}<input type="hidden" name="nuevo" value="1" /><button className={linkSuave}>Cambiar enlace</button></form>
              </>
            ) : (
              <form action={accionPortal} className="mt-3">{comunes}<button className={boton}>Crear enlace para el cliente</button></form>
            )}
          </div>

          {p.plan.preguntas.length > 0 && p.estado !== "plan" && (
            <form action={accionResponder} className="grid gap-3 rounded-3xl border border-linea p-6">
              {comunes}
              <input type="hidden" name="quien" value={yo} />
              <p className={etiqueta}>Lo que falta saber del cliente</p>
              {p.plan.preguntas.map((q, i) => (
                <label key={q} className="grid gap-1 text-[15px]">
                  {q}
                  <input name={`r${i}`} className={campo} placeholder="Lo que dijo el cliente" />
                </label>
              ))}
              <button className={boton}>Anotar respuestas</button>
            </form>
          )}
          {(p.pedido.contexto?.respuestas ?? []).length > 0 && (
            <div className="rounded-3xl border border-linea p-6">
              <p className={etiqueta}>Respuestas del cliente</p>
              <ul className="mt-2 grid gap-2 text-[15px]">
                {p.pedido.contexto!.respuestas!.map((r) => <li key={r.pregunta}><span className="text-gris">{r.pregunta}</span><br />{r.respuesta}</li>)}
              </ul>
            </div>
          )}

          <details className="rounded-3xl border border-linea p-6">
            <summary className={`${etiqueta} cursor-pointer`}>Números · IA US$ {costo.real.toFixed(2)}{b.total !== undefined ? ` · ${b.total} h` : ""}</summary>
            <div className="mt-4 grid gap-4 text-[14px]">
              <div>
                <p className="font-medium">Presupuesto vivo</p>
                <p className="text-gris">Base de Ledger: {b.base ?? "sin definir"} h · cambios por cobrar: +{b.extra} h{b.precio !== undefined ? ` · US$ ${b.precio.toLocaleString("es-EC")}` : b.tarifa ? "" : " · pon TARIFA_HORA para ver el precio"}</p>
                {b.ajustes.length > 0 && (
                  <ul className="mt-1 grid gap-1">{b.ajustes.map((a) => <li key={a.fecha + a.tarea}>+{a.horas} h {nombreTarea(a.tarea as TareaId)} <span className="text-gris">· {a.motivo}</span></li>)}</ul>
                )}
              </div>
              <div>
                <p className="font-medium">Gasto en IA: US$ {costo.real.toFixed(2)}</p>
                <ul className="mt-1 grid gap-1">{costo.tareas.slice(0, 8).map((t) => <li key={t.tarea} className="flex justify-between gap-3"><span>{nombreTarea(t.tarea)}{t.veces > 1 ? ` ×${t.veces}` : ""}</span><span>US$ {t.usd.toFixed(3)}</span></li>)}</ul>
                <p className="mt-1 text-[12px] text-gris">Precio por millón de tokens: entrada {PRECIOS.entrada} · salida {PRECIOS.salida}.</p>
              </div>
            </div>
          </details>

          <details className="rounded-3xl border border-linea p-6">
            <summary className={`${etiqueta} cursor-pointer`}>Calendario</summary>
            <div className="mt-4"><Calendario tramos={calendario(p)} /></div>
          </details>

          <details className="rounded-3xl border border-linea p-6">
            <summary className={`${etiqueta} cursor-pointer`}>Bitácora</summary>
            <ul className="mt-3 grid gap-1 text-[14px] text-gris">{leerBitacora(id, 20).map((l, i) => <li key={i}>{l}</li>)}</ul>
          </details>

          <details id="ajustes" className="rounded-3xl border border-linea p-6">
            <summary className={`${etiqueta} cursor-pointer`}>Ajustes</summary>
            <div className="mt-4 grid gap-6">
              <form action={accionPausas} className="grid gap-2">
                {comunes}
                <label className="grid gap-1">
                  <span className="text-[14px] font-medium">Dónde se detiene para que revisen</span>
                  <span className="text-[13px] text-gris">Ahora: {p.plan.pausas.length ? `al terminar ${p.plan.pausas.map((f) => FASES.find((x) => x.n === f)?.nombre).join(", ")}` : "solo al final"}</span>
                  <select name="pausas" className={campo} defaultValue="clave">
                    <option value="clave">Donde propone Atlas</option>
                    <option value="cada-fase">En cada fase</option>
                    <option value="nunca">Solo al final</option>
                    {p.plan.fases.map((f) => <option key={f} value={String(f)}>Solo en {FASES.find((x) => x.n === f)?.nombre}</option>)}
                  </select>
                </label>
                <div><button className={boton}>Guardar</button></div>
              </form>

              <div className="grid gap-2">
                <p className="text-[14px] font-medium">Quién aprueba cada fase</p>
                {p.plan.fases.map((f) => (
                  <form key={f} action={accionResponsable} className="flex items-center justify-between gap-2 text-[14px]">
                    {comunes}
                    <input type="hidden" name="fase" value={f} />
                    <label htmlFor={`socio-${f}`}>{FASES.find((x) => x.n === f)?.nombre}</label>
                    <span className="flex items-center gap-2">
                      <select id={`socio-${f}`} name="socio" defaultValue={responsable(p, f)} className="rounded-full border border-linea bg-papel px-3 py-1 text-[13px]">
                        <option value="jay">Jay</option><option value="luna">Luna</option>
                      </select>
                      <button className="font-mono text-[11px] uppercase tracking-[0.12em] text-gris underline underline-offset-4">Guardar</button>
                    </span>
                  </form>
                ))}
              </div>

              <div className="grid gap-1 text-[14px]">
                <p className="font-medium">PDF</p>
                {enLinea ? (
                  <p className="text-gris">Todavía se arma desde tu máquina: <code>npm run pipeline -- pdf {id}</code>.</p>
                ) : (
                  <p className="flex flex-wrap gap-4"><a href={`/estudio/${id}/pdf`} className={linkSuave}>Para el cliente ↓</a><a href={`/estudio/${id}/pdf?internas=1`} className={linkSuave}>Interno ↓</a></p>
                )}
              </div>

              <div className="flex flex-wrap gap-4 border-t border-linea pt-4">
                {p.estado !== "parado" && p.estado !== "listo" && (
                  <Confirmar accion={accionParar} campos={{ id, motor: "" }} disparador="Parar el proyecto" titulo="¿Parar el proyecto?" texto="El equipo deja de trabajar en él hasta que lo reanudes. No se pierde nada." confirmar="Parar" />
                )}
                {!p.papelera && (
                  <Confirmar accion={accionAPapelera} campos={{ id }} disparador="Mandar a la papelera" titulo="¿Mandar a la papelera?" texto={`«${p.pedido.cliente}» deja de aparecer y de trabajar. Lo puedes restaurar desde la papelera durante 30 días; después se borra solo.`} confirmar="Mandar a la papelera" peligro />
                )}
              </div>
            </div>
          </details>
        </aside>
      </div>
    </main>
  );
}
