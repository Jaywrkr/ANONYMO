// La ficha de un cliente (sistema/70): todo lo suyo en un lugar, con su historia y lo que escribes a mano.
import Link from "next/link";
import { notFound } from "next/navigation";
import { DATOS, GRUPOS_SABER, NOMBRE_FUENTE, NOMBRE_FUENTE_LEIDA, CLAVES_SABER, ORDEN_TAREAS_SABER, esAnonymo, esNoAplica, estadoTareas, fuentesDe, idMuestra, numeroInternacional, puntuar, resumenFicha, saberDe, type ClaveSaber, type PropuestaDato, type TareaSaber, type Ficha as FichaCliente } from "@anonymo/pipeline";
import { Cara } from "@/components/estudio/piezas";
import { AbrirAtlas } from "@/components/estudio/AbrirAtlas";
import { BuscarSolo } from "@/components/estudio/clientes/BuscarSolo";
import { exigirEstudio, serif, campo, boton, botonLleno, titulo } from "@/lib/estudio";
import { cartera } from "@/lib/cartera";
import { accionBuscarDatos, accionGuardarFicha, accionGuardarSaber } from "../acciones";

export const dynamic = "force-dynamic";
// Leer su web e Instagram puede tardar (sistema/93).
export const maxDuration = 60;

const tarjeta = "rounded-[18px] bg-white p-5 shadow-[0_0_0_1px_rgba(26,24,22,.05),0_6px_18px_-12px_rgba(40,30,20,.2)]";
const fecha = (iso: string) => (iso ? new Date(iso).toLocaleString("es-EC", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Guayaquil" }) : "");
const ESTADO: Record<string, string> = { plan: "Con plan de Atlas", "en-curso": "En trabajo", esperando: "Espera una decisión", parado: "En pausa", listo: "Terminado" };
const TIPO: Record<string, string> = { web: "Una web", marca: "Una marca", lanzamiento: "Un lanzamiento", todo: "Todo, desde cero" };

const ORDEN: TareaSaber[] = ORDEN_TAREAS_SABER;
/** La cara de quien hace la tarea: «Orla y Vector» → Orla. */
const caraDe = (quien: string) => quien.split(/\s+/)[0]!.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** El botón de cada tarea lista (sistema/109): todas tienen uno. Las de Atlas dejan el pedido escrito en su caja. */
function accionTarea(t: TareaSaber, f: FichaCliente, id: string): { texto: string; href?: string; atlas?: string } | undefined {
  const pedido = (q: string) => `/estudio/nuevo?${new URLSearchParams({ cliente: f.nombre, ficha: f.id, q })}`;
  switch (t) {
    case "muestra": return f.prospecto ? { texto: "Ver su muestra", href: `/m/${idMuestra(f.prospecto)}` } : { texto: "Pedir su muestra", atlas: `/muestra @${id} ` };
    case "mensaje": return { texto: "Preparar el mensaje", atlas: `/mensaje @${id} ` };
    case "guion": return { texto: "Escribir un guion", atlas: `/guion @${id} ` };
    case "contenido": return { texto: "Armar su mes", href: `/estudio/contenido?cliente=${id}` };
    case "web": return { texto: "Pedir su web", href: pedido(`Una web estándar para ${f.nombre}.`) };
    case "web-a-mano": return { texto: "Pedir su web a mano", href: pedido(`Una web hecha a mano para ${f.nombre}.`) };
    case "asistente": return { texto: "Pedir el asistente", href: pedido(`El asistente de la web de ${f.nombre}: responde preguntas y agenda por WhatsApp.`) };
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return { title: `Cliente ${(await params).id} — Estudio`, robots: { index: false } };
}

export default async function Ficha({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ campo?: string }> }) {
  await exigirEstudio();
  const { id } = await params;
  const campo_ = (await searchParams).campo;
  const { fichas, fallas } = await cartera();
  const f = fichas.find((x) => x.id === id);
  if (!f) notFound();
  const g = f.guardada;
  const x = f.prospecto;
  const tel = numeroInternacional(f.contacto.telefono);
  const nuevoPedido = `/estudio/nuevo?${new URLSearchParams({ cliente: f.nombre, ficha: f.id })}`;
  const subirVideo = `/estudio/video?${new URLSearchParams({ cliente: f.nombre })}`;
  // Lo que se sabe del cliente y lo que se puede hacer con eso (sistema/92).
  const saber = saberDe(f);
  const tareas = estadoTareas(saber);
  const ORIGEN = { mano: "escrito a mano", maps: "de Google Maps", web: "de su web", marca: "de su kit de marca", cliente: "lo eligió el negocio en su muestra" } as const;
  const sabidos = CLAVES_SABER.filter((k) => saber[k]).length;
  // Su web y su Instagram, y lo último que se leyó de ahí (sistema/93).
  const fuentes = fuentesDe(saber, g?.web ?? f.contacto.web);
  const lectura = g?.lectura;
  // Lo encontrado, por campo: se muestra dentro del mismo campo, en su orden de siempre (sistema/109).
  const propuestas = new Map<ClaveSaber, PropuestaDato>((lectura?.propuestas ?? []).map((p) => [p.clave, p]));
  const abrirSaber = propuestas.size > 0 || !!campo_ || sabidos < 6;
  // Con web y sin haberla leído nunca, la ficha la lee sola una vez (no gasta: se lee como texto).
  const buscarSolo = !esAnonymo(f.id) && !!fuentes.web && !g?.leidoEl && !lectura;

  return (
    <div className="px-5 pb-20 pt-7 md:px-10">
      <p className="text-[13px]"><Link href="/estudio/clientes" className="text-medio underline-offset-4 hover:underline">← Clientes</Link></p>
      <div className="mt-3 flex items-center gap-4">
        <span aria-hidden className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-[16px] font-medium" style={{ background: f.kits[0]?.color ?? "#e9e4dc", color: f.kits[0]?.color ? "#fff" : "#5d5a55" }}>{f.nombre.split(/\s+/).filter((w) => w.length > 2).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || f.nombre.slice(0, 1).toUpperCase()}</span>
        <div className="min-w-0">
          <h1 className={`${titulo}`}>{f.nombre}</h1>
          <p className="mt-1 text-[14px] text-medio">{resumenFicha(f)}</p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link href={nuevoPedido} className={botonLleno}>Nuevo pedido</Link>
        <Link href={subirVideo} className={boton}>Subir un video suyo</Link>
        {tel && <a href={`https://wa.me/${tel}`} target="_blank" rel="noreferrer" className={boton}>WhatsApp</a>}
        {f.contacto.web && <a href={f.contacto.web} target="_blank" rel="noreferrer" className={boton}>Su web</a>}
      </div>
      {fallas.length > 0 && <p role="alert" className="mt-4 rounded-2xl bg-[#fde8e4] p-4 text-[14px] text-[#8a1c0c]">Una parte no respondió y puede faltar algo: {fallas.join(" · ")}</p>}

      {/* Qué se puede hacer y qué falta (sistema/92, más visual en sistema/109): cara de quien la hace, cuadritos de
          avance, una línea concreta y los datos que faltan como chips que llevan a su campo. La más cerca de estar lista, primero. */}
      <section id="saber" className={`${tarjeta} mt-8 scroll-mt-6`} aria-labelledby="t-puede">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="t-puede" className="text-[13px] text-suave">Qué se puede hacer</h2>
          <p className="text-[12px] text-suave">{tareas.filter((t) => t.listo).length} de {tareas.length} listas · {sabidos} de {CLAVES_SABER.length} datos</p>
        </div>
        <ul className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3" data-tareas-saber>
          {[...tareas].sort((a, b) => a.faltan.length - b.faltan.length || ORDEN.indexOf(a.tarea) - ORDEN.indexOf(b.tarea)).map((t) => {
            const total = t.regla.minimo.length, hechos = total - t.faltan.length;
            const ir = accionTarea(t.tarea, f, id);
            return (
              <li key={t.tarea} data-tarea={t.tarea} data-listo={t.listo ? "si" : "no"} className={`flex gap-3 rounded-2xl p-3.5 ${t.listo ? "bg-[#e6f6ee]" : "bg-hueso/70"}`}>
                <Cara id={caraDe(t.regla.quien)} tam={36} />
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-medium leading-tight">{t.regla.nombre}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="flex gap-[3px]" role="img" aria-label={`${hechos} de ${total} datos`}>
                      {Array.from({ length: total }, (_, i) => <i key={i} className={`h-2.5 w-2.5 rounded-[3px] ${i < hechos ? (t.listo ? "bg-[#17714a]" : "bg-tinta") : "shadow-[inset_0_0_0_1.5px_#cfc8bc]"}`} />)}
                    </span>
                    <span className={`text-[12px] ${t.listo ? "text-[#17714a]" : "text-medio"}`}>{t.listo ? "Lista" : `A ${t.faltan.length} ${t.faltan.length === 1 ? "dato" : "datos"}`}</span>
                  </div>
                  {!t.listo && (
                    <p className="mt-2 flex flex-wrap gap-1.5" data-faltan>
                      {t.faltan.slice(0, 4).map((k) => <a key={k} href={`?campo=${k}#campo-${k}`} className="inline-flex min-h-8 items-center rounded-full bg-white px-2.5 text-[12px] shadow-[inset_0_0_0_1px_var(--color-borde)] hover:shadow-[inset_0_0_0_1px_var(--color-tinta)]">+ {DATOS[k].nombre}</a>)}
                      {t.faltan.length > 4 && <a href={`?campo=${t.faltan[4]}#campo-${t.faltan[4]}`} className="inline-flex min-h-8 items-center px-1.5 text-[12px] text-medio underline-offset-4 hover:underline">{t.faltan.length - 4} más</a>}
                    </p>
                  )}
                  {t.listo && ir && (ir.atlas
                    ? <AbrirAtlas id="atlas" texto={ir.atlas} className="mt-2 inline-flex min-h-10 items-center rounded-full bg-tinta px-4 text-[13px] text-white">{ir.texto}</AbrirAtlas>
                    : <a href={ir.href} data-ir-contenido={t.tarea === "contenido" ? "" : undefined} className="mt-2 inline-flex min-h-10 items-center rounded-full bg-tinta px-4 text-[13px] text-white">{ir.texto}</a>)}
                </div>
              </li>
            );
          })}
        </ul>

        {/* Buscar datos (sistema/93): lo encontrado entra en su mismo campo, marcado en verde, y se acepta ahí mismo (sistema/109). */}
        <div id="leido" className="mt-4 flex scroll-mt-6 flex-wrap items-center gap-3 rounded-2xl bg-hueso/60 p-4" data-buscar-datos>
          <div className="min-w-0 flex-1 text-[13px]">
            {propuestas.size > 0
              ? <p className="text-[14px]"><span className="font-medium text-[#17714a]">✓ {propuestas.size} {propuestas.size === 1 ? "dato encontrado" : "datos encontrados"}</span> <span className="text-medio">· en verde, abajo en su lugar</span></p>
              : <p className="text-[14px] font-medium">Buscar datos solo</p>}
            <p className="mt-0.5 text-medio">
              {esAnonymo(f.id) ? "Lo que el estudio sabe de Unmake se guarda directo." : fuentes.web ? `Leemos ${fuentes.web.replace(/^https?:\/\//, "").replace(/\/$/, "")}. Nada se guarda sin tu ok.` : "Anota su web en «Contacto y notas» para leerla."}
              {lectura?.web && lectura.web.estado !== "ok" && <span className="text-[#a33a0b]"> Su web no se pudo leer{lectura.web.motivo ? `: ${lectura.web.motivo}` : ""}.</span>}
              {fuentes.instagram && <> Instagram (@{fuentes.instagram}): pídele a Claude que lo lea desde tu Chrome.</>}
            </p>
          </div>
          {propuestas.size > 0 ? (
            <div className="flex flex-wrap gap-2">
              <button form="form-saber" name="accion" value="todos" className={botonLleno} data-trabajando="Guardando…">Aceptar todos</button>
              <button form="form-saber" name="accion" value="descartar" formNoValidate className={boton} data-trabajando="Descartando…">Descartar</button>
            </div>
          ) : (
            <form action={accionBuscarDatos}>
              <input type="hidden" name="id" value={f.id} />
              <button className={boton} disabled={!fuentes.web && !esAnonymo(f.id)} data-trabajando="Buscando datos…" data-buscar-solo={buscarSolo ? "si" : undefined}>{g?.leidoEl ? "Buscar de nuevo" : "Buscar datos"}</button>
            </form>
          )}
          {buscarSolo && <BuscarSolo />}
          {lectura && <p className="w-full text-[12px] text-suave">Leído el {fecha(lectura.cuando)}{lectura.por ? ` por ${lectura.por === "luna" ? "Luna" : "Jay"}` : ""}.</p>}
        </div>

        <details className="group mt-4" open={abrirSaber}>
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center rounded-full bg-white px-4 text-[13px] font-medium shadow-[inset_0_0_0_1px_var(--color-borde)] [&::-webkit-details-marker]:hidden">Lo que sabemos de {f.nombre}: ver y completar</summary>
          <form id="form-saber" action={accionGuardarSaber} className="mt-4 grid gap-6" data-form-saber>
            <input type="hidden" name="id" value={f.id} />
            <input type="hidden" name="nombre" value={g?.nombre ?? f.nombre} />
            {GRUPOS_SABER.map((grupo) => (
              <fieldset key={grupo} className="grid gap-3">
                <legend className="mb-1 text-[13px] font-medium">{grupo}</legend>
                <div className="grid gap-3 md:grid-cols-2">
                  {CLAVES_SABER.filter((k) => DATOS[k].grupo === grupo && k !== "nombre").map((k) => {
                    const d = DATOS[k], v = saber[k], pr = propuestas.get(k);
                    // Lo que trae Imán se ve y no se pisa por error: si quieres cambiarlo, escribe encima.
                    const deMano = f.guardada?.saber?.[k] ?? "";
                    const noAplica = esNoAplica(deMano);
                    // Si el campo estaba vacío, lo encontrado entra en el campo; si ya decía otra cosa, va debajo para elegir.
                    const choca = !!pr && !!v && v.valor !== pr.valor;
                    const valor = pr && !choca ? pr.valor : noAplica ? "" : deMano;
                    const largo = d.largo || valor.includes("\n");
                    const comun = { id: `campo-${k}`, name: `saber-${k}`, defaultValue: valor, placeholder: v && !deMano ? v.valor : d.ayuda, className: `${campo} ${pr && !choca ? "shadow-[inset_0_0_0_1.5px_#17714a] bg-[#f3fbf6]" : ""} ${campo_ === k ? "ring-2 ring-tinta" : ""}`, autoFocus: campo_ === k };
                    return (
                      <div key={k} data-campo={k} data-propuesta={pr ? k : undefined} className={`grid content-start gap-1 text-[13px] ${d.largo ? "md:col-span-2" : ""} scroll-mt-24`}>
                        <span className="flex flex-wrap items-center gap-x-2">
                          <label htmlFor={`campo-${k}`}>{d.nombre}</label>
                          {pr ? (
                            <label className="inline-flex items-center gap-1 text-[12px] text-[#17714a]">
                              <input type="hidden" name={`propuesta-${k}`} value="1" />
                              <input type="checkbox" id={`tomar-${k}`} name={`tomar-${k}`} value="si" defaultChecked={!choca} className="h-4 w-4 accent-[#17714a]" />
                              {choca ? "Usar lo de" : "✓ de"} {NOMBRE_FUENTE_LEIDA[pr.fuente]}{pr.detalle ? ` (${pr.detalle})` : ""}
                            </label>
                          ) : v ? <span className="text-suave">· {noAplica ? "no aplica" : ORIGEN[v.origen]}</span> : <span className="text-[#a33a0b]">· falta</span>}
                          <label className="ml-auto inline-flex items-center gap-1 text-[12px] text-suave" title="A este cliente no le toca">
                            <input type="checkbox" name={`noaplica-${k}`} value="si" defaultChecked={noAplica} className="h-3.5 w-3.5" />No aplica
                          </label>
                        </span>
                        {largo ? <textarea rows={pr ? Math.min(6, valor.split("\n").length + 1) : 3} maxLength={1200} {...comun} /> : <input maxLength={200} {...comun} />}
                        {choca && <><input type="hidden" name={`valor-${k}`} value={pr!.valor} /><span className="rounded-lg bg-[#f3fbf6] px-2.5 py-1.5 text-[12px] text-[#17714a] shadow-[inset_0_0_0_1px_#17714a]">Encontramos otra cosa: {pr!.valor.split("\n").join(" · ")}. Márcalo arriba para usarla.</span></>}
                        {!v && !pr && <span className="text-[12px] text-suave">Se saca de: {d.fuentes.map((x) => NOMBRE_FUENTE[x]).join(", ")}.</span>}
                      </div>
                    );
                  })}
                </div>
              </fieldset>
            ))}
            <div className="flex flex-wrap gap-2"><button className={botonLleno} name="accion" value="guardar" data-trabajando="Guardando lo que sabemos…">{propuestas.size ? "Guardar (con los marcados)" : "Guardar lo que sabemos"}</button></div>
          </form>
        </details>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
        <div className="grid content-start gap-5">
          <section className={tarjeta} aria-labelledby="t-proyectos">
            <h2 id="t-proyectos" className="text-[13px] text-suave">Pedidos y proyectos · {f.proyectos.length}</h2>
            {!f.proyectos.length && <p className="mt-2 text-[14px] text-medio">Todavía no hay pedidos. <Link href={nuevoPedido} className="underline">Cuéntale a Atlas el primero</Link>.</p>}
            <ul className="mt-2 grid gap-2">
              {f.proyectos.map((p) => (
                <li key={p.id}>
                  <Link href={`/estudio/${p.id}`} className="flex min-h-12 items-center gap-3 rounded-xl bg-hueso/60 px-3 py-2 transition hover:bg-hueso">
                    <span className="min-w-0 flex-1"><span className="block text-[14px] font-medium">{TIPO[p.tipo] ?? p.tipo}</span><span className="block text-[12px] text-suave">Pedido el {fecha(p.creado ?? p.actualizado)}</span></span>
                    <span className="shrink-0 rounded-full bg-white px-3 py-1 text-[12px] text-medio">{ESTADO[p.estado] ?? p.estado}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className={tarjeta} aria-labelledby="t-videos">
            <h2 id="t-videos" className="text-[13px] text-suave">Videos · {f.videos.length}</h2>
            {!f.videos.length && <p className="mt-2 text-[14px] text-medio">Sin videos. <Link href={subirVideo} className="underline">Sube el primero</Link> y quedará aquí.</p>}
            <ul className="mt-2 grid gap-2">
              {f.videos.map((v) => (
                <li key={v.id}><Link href={`/estudio/video/${v.id}`} className="flex min-h-12 items-center gap-3 rounded-xl bg-hueso/60 px-3 py-2 transition hover:bg-hueso"><span className="min-w-0 flex-1 truncate text-[14px]">{v.nombre}</span><span className="shrink-0 text-[12px] text-suave">{v.formatos ? `${v.formatos} ${v.formatos === 1 ? "formato listo" : "formatos listos"}` : "en edición"}</span></Link></li>
              ))}
            </ul>
          </section>

          <section className={tarjeta} aria-labelledby="t-marca">
            <h2 id="t-marca" className="text-[13px] text-suave">Marca y contenido</h2>
            {f.kits.length ? f.kits.map((k) => <p key={k.id} className="mt-2 flex items-center gap-2 text-[14px]"><i aria-hidden className="h-4 w-4 rounded" style={{ background: k.color }} />Kit de marca para video: <Link href="/estudio/video/marcas" className="underline">{k.nombre}</Link></p>)
              : <p className="mt-2 text-[14px] text-medio">Sin kit de marca todavía. <Link href="/estudio/video/marcas" className="underline">Crear uno</Link> (logo, color y música para sus videos).</p>}
            <p className="mt-2 text-[13px] text-suave">El contenido mensual para redes todavía no está en el estudio.</p>
          </section>

          <section className={tarjeta} aria-labelledby="t-historia">
            <h2 id="t-historia" className="text-[13px] text-suave">Historia</h2>
            <ol className="mt-3 grid gap-3 border-l border-borde pl-4">
              {f.historia.map((h, i) => (
                <li key={i} className="relative text-[14px]">
                  <i aria-hidden className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-tinta/40" />
                  {h.enlace ? <Link href={h.enlace} className="underline-offset-4 hover:underline">{h.que}</Link> : h.que}
                  <span className="block text-[12px] text-suave">{fecha(h.cuando)}{h.por ? ` · ${h.por === "luna" ? "Luna" : "Jay"}` : ""}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="grid content-start gap-5">
          {x && (
            <section className={tarjeta} aria-labelledby="t-origen">
              <h2 id="t-origen" className="text-[13px] text-suave">Vino de Imán · Clientes nuevos</h2>
              <p className="mt-2 text-[14px]">{x.rubro} en {x.ciudad}{x.estrellas ? ` · ★ ${x.estrellas} (${x.resenas})` : ""}</p>
              {puntuar(x).motivos.length > 0 && <p className="mt-1 text-[13px] text-medio">Su web cuando lo encontramos: {puntuar(x).motivos.join(", ").toLowerCase()}.</p>}
              {x.notas && <p className="mt-2 rounded-xl bg-hueso/60 px-3 py-2 text-[13px]">{x.notas}</p>}
              <Link href="/estudio/clientes/nuevos" className="mt-3 inline-flex min-h-11 items-center text-[13px] underline">Ver en Clientes nuevos</Link>
            </section>
          )}

          <section className={tarjeta} aria-labelledby="t-datos">
            <h2 id="t-datos" className="text-[13px] text-suave">Contacto y notas</h2>
            {/* Se lee como texto; los campos aparecen al tocar «Editar» (sistema/76). */}
            <dl className="mt-3 grid gap-1 text-[14px]">
              {[["Teléfono", g?.telefono ?? f.contacto.telefono], ["Correo", g?.correo], ["Web", g?.web ?? f.contacto.web]].filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="flex gap-2"><dt className="w-20 shrink-0 text-suave">{k}</dt><dd className="min-w-0 break-words">{v}</dd></div>
              ))}
              {g?.notas ? <div className="mt-2 whitespace-pre-line rounded-xl bg-hueso/60 p-3">{g.notas}</div> : null}
              {!(g?.telefono ?? f.contacto.telefono) && !g?.correo && !(g?.web ?? f.contacto.web) && !g?.notas && <p className="text-medio">Sin datos todavía.</p>}
            </dl>
            <details className="mt-3 group">
            <summary className="inline-flex min-h-11 cursor-pointer list-none items-center rounded-full bg-white px-4 text-[13px] font-medium shadow-[inset_0_0_0_1px_var(--color-borde)] [&::-webkit-details-marker]:hidden">Editar contacto y notas</summary>
            <form action={accionGuardarFicha} className="mt-3 grid gap-3">
              <input type="hidden" name="id" value={f.id} />
              <label className="grid gap-1 text-[13px]">Nombre<input name="nombre" required maxLength={80} defaultValue={f.nombre} className={campo} /></label>
              <label className="grid gap-1 text-[13px]">Teléfono<input name="telefono" maxLength={40} defaultValue={g?.telefono ?? f.contacto.telefono ?? ""} className={campo} inputMode="tel" /></label>
              <label className="grid gap-1 text-[13px]">Correo<input name="correo" type="email" maxLength={120} defaultValue={g?.correo ?? ""} className={campo} /></label>
              <label className="grid gap-1 text-[13px]">Web<input name="web" maxLength={200} defaultValue={g?.web ?? f.contacto.web ?? ""} className={campo} /></label>
              <label className="grid gap-1 text-[13px]">Otros nombres <span className="text-suave">· separados por coma; sus pedidos y videos entran a esta ficha</span><input name="alias" maxLength={300} defaultValue={(g?.alias ?? []).join(", ")} className={campo} /></label>
              <label className="grid gap-1 text-[13px]">Notas<textarea name="notas" rows={5} maxLength={4000} defaultValue={g?.notas ?? ""} className={campo} /></label>
              <div><button className={botonLleno} data-trabajando="Guardando la ficha…">Guardar</button></div>
            </form>
            </details>
            {g && <p className="mt-2 text-[12px] text-suave">Cambiada por {g.por === "luna" ? "Luna" : "Jay"} el {fecha(g.actualizado)}.</p>}
          </section>
        </div>
      </div>
    </div>
  );
}
