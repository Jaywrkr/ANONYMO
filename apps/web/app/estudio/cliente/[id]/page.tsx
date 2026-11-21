// La ficha de un cliente (sistema/70): todo lo suyo en un lugar, con su historia y lo que escribes a mano.
import Link from "next/link";
import { notFound } from "next/navigation";
import { DATOS, nombreDato, GRUPOS_SABER, NOMBRE_FUENTE, NOMBRE_FUENTE_LEIDA, CLAVES_SABER, estadoTareas, fuentesDe, numeroInternacional, puntuar, resumenFicha, saberDe } from "@anonymo/pipeline";
import { exigirEstudio, serif, campo, boton, botonLleno } from "@/lib/estudio";
import { cartera } from "@/lib/cartera";
import { accionAprobarDatos, accionBuscarDatos, accionGuardarFicha, accionGuardarSaber } from "../acciones";

export const dynamic = "force-dynamic";
// Leer su web e Instagram puede tardar (sistema/93).
export const maxDuration = 60;

const tarjeta = "rounded-[18px] bg-white p-5 shadow-[0_0_0_1px_rgba(26,24,22,.05),0_6px_18px_-12px_rgba(40,30,20,.2)]";
const fecha = (iso: string) => (iso ? new Date(iso).toLocaleString("es-EC", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Guayaquil" }) : "");
const ESTADO: Record<string, string> = { plan: "Con plan de Atlas", "en-curso": "En trabajo", esperando: "Espera una decisión", parado: "En pausa", listo: "Terminado" };
const TIPO: Record<string, string> = { web: "Una web", marca: "Una marca", lanzamiento: "Un lanzamiento", todo: "Todo, desde cero" };

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return { title: `Cliente ${(await params).id} — Estudio`, robots: { index: false } };
}

export default async function Ficha({ params }: { params: Promise<{ id: string }> }) {
  await exigirEstudio();
  const { id } = await params;
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
  const ESTADO_FUENTE = { ok: "leída", fallo: "no se pudo leer", "a-pedido": "a pedido" } as const;

  return (
    <div className="px-5 pb-20 pt-7 md:px-10">
      <p className="text-[13px]"><Link href="/estudio/clientes" className="text-medio underline-offset-4 hover:underline">← Clientes</Link></p>
      <div className="mt-3 flex items-center gap-4">
        <span aria-hidden className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-[16px] font-medium" style={{ background: f.kits[0]?.color ?? "#e9e4dc", color: f.kits[0]?.color ? "#fff" : "#5d5a55" }}>{f.nombre.split(/\s+/).filter((w) => w.length > 2).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || f.nombre.slice(0, 1).toUpperCase()}</span>
        <div className="min-w-0">
          <h1 className={`${serif} text-[clamp(34px,4vw,48px)] leading-none`}>{f.nombre}</h1>
          <p className="mt-1 text-[14px] text-medio">{resumenFicha(f)}</p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link href={nuevoPedido} className={botonLleno}>Nuevo pedido para {f.nombre}</Link>
        <Link href={subirVideo} className={boton}>Subir un video suyo</Link>
        {tel && <a href={`https://wa.me/${tel}`} target="_blank" rel="noreferrer" className={boton}>WhatsApp</a>}
        {f.contacto.web && <a href={f.contacto.web} target="_blank" rel="noreferrer" className={boton}>Su web</a>}
      </div>
      {fallas.length > 0 && <p role="alert" className="mt-4 rounded-2xl bg-[#fde8e4] p-4 text-[14px] text-[#8a1c0c]">Una parte no respondió y puede faltar algo: {fallas.join(" · ")}</p>}

      {/* Qué se puede hacer y qué falta (sistema/92): sin lo mínimo, la tarea no se hace. */}
      <section id="saber" className={`${tarjeta} mt-8 scroll-mt-6`} aria-labelledby="t-puede">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="t-puede" className="text-[13px] text-suave">Qué se puede hacer con lo que sabemos</h2>
          <p className="text-[12px] text-suave">{sabidos} de {CLAVES_SABER.length} datos · {tareas.filter((t) => t.listo).length} de {tareas.length} tareas listas</p>
        </div>
        <ul className="mt-3 grid gap-2 md:grid-cols-2" data-tareas-saber>
          {tareas.map((t) => (
            <li key={t.tarea} data-tarea={t.tarea} data-listo={t.listo ? "si" : "no"} className={`rounded-2xl p-3.5 ${t.listo ? "bg-[#e6f6ee]" : "bg-hueso/70"}`}>
              <p className="flex items-baseline justify-between gap-3 text-[14.5px] font-medium"><span>{t.regla.nombre}</span><span className={`shrink-0 text-[12px] font-normal ${t.listo ? "text-[#17714a]" : "text-[#a33a0b]"}`}>{t.listo ? "Se puede" : `Faltan ${t.faltan.length}`}</span></p>
              <p className="mt-0.5 text-[12px] text-suave">La hace {t.regla.quien}</p>
              {!t.listo && <p className="mt-2 text-[13px] leading-snug">Falta: {t.faltan.map((k) => nombreDato(k)).join(", ")}.</p>}
              {t.listo && t.mejoraria.length > 0 && <p className="mt-2 text-[13px] leading-snug text-medio">Saldría mejor con: {t.mejoraria.map((k) => nombreDato(k)).join(", ")}.</p>}
              {t.listo && t.tarea === "contenido" && <a href={`/estudio/contenido?cliente=${id}`} data-ir-contenido className="mt-2 inline-flex min-h-11 items-center rounded-full bg-white px-4 text-[13px] shadow-[inset_0_0_0_1px_var(--color-borde)]">Armar su mes de contenido</a>}
            </li>
          ))}
        </ul>

        {/* La ficha se llena sola desde su web (sistema/93): se lee y se propone; nada cuenta hasta que se aprueba. Instagram, a pedido desde el Chrome de Jay (sistema/94). */}
        <div id="leido" className="mt-4 scroll-mt-6 rounded-2xl bg-hueso/60 p-4" data-buscar-datos>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[14.5px] font-medium">Buscar datos solo</p>
              <p className="mt-0.5 text-[13px] text-medio">
                {fuentes.web
                  ? <>Leemos su web ({fuentes.web.replace(/^https?:\/\//, "").replace(/\/$/, "")}) y te proponemos lo que encontremos. Nada se guarda hasta que lo apruebes.</>
                  : "Anota su web en «Contacto y notas» y aquí podrás leerla."}
                {fuentes.instagram && <> Su Instagram (@{fuentes.instagram}) no se lee solo: pídele a Claude en el chat que lo revise desde tu Chrome.</>}
              </p>
            </div>
            <form action={accionBuscarDatos}>
              <input type="hidden" name="id" value={f.id} />
              <button className={boton} disabled={!fuentes.web} data-trabajando="Leyendo su web…">{lectura ? "Buscar de nuevo" : "Buscar datos"}</button>
            </form>
          </div>
          {lectura && (
            <div className="mt-4 border-t border-borde pt-4" data-lectura>
              <ul className="grid gap-1 text-[13px]">
                {([["Su web", lectura.web]] as const).filter(([, e]) => e).map(([n, e]) => (
                  <li key={n} data-fuente={n} data-estado={e!.estado}>
                    <span className={e!.estado === "ok" ? "text-[#17714a]" : "text-[#a33a0b]"}>{n}: {ESTADO_FUENTE[e!.estado]}</span>
                    {e!.estado === "ok" && e!.paginas ? <span className="text-suave"> · {e!.paginas} {e!.paginas === 1 ? "página" : "páginas"}</span> : null}
                    {e!.motivo && <span className="text-medio"> · {e!.motivo}</span>}
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-[12px] text-suave">Leído el {fecha(lectura.cuando)}{lectura.por ? ` por ${lectura.por === "luna" ? "Luna" : "Jay"}` : ""}.</p>
              {lectura.propuestas.length > 0 ? (
                <form action={accionAprobarDatos} className="mt-3 grid gap-3" data-form-aprobar>
                  <input type="hidden" name="id" value={f.id} />
                  <input type="hidden" name="nombre" value={g?.nombre ?? f.nombre} />
                  <p className="text-[13px] text-medio">Marca lo que está bien. Puedes corregirlo antes de guardar.</p>
                  {lectura.propuestas.map((p) => {
                    const ya = saber[p.clave];
                    return (
                      <div key={p.clave} data-propuesta={p.clave} className="grid gap-1.5 rounded-xl bg-white p-3 shadow-[inset_0_0_0_1px_var(--color-borde)] sm:grid-cols-[auto_1fr] sm:gap-x-3">
                        <input type="checkbox" id={`tomar-${p.clave}`} name={`tomar-${p.clave}`} value="si" defaultChecked={!ya} className="mt-1 h-5 w-5 accent-[#17714a]" />
                        <div className="grid min-w-0 gap-1">
                          <label htmlFor={`tomar-${p.clave}`} className="text-[13px] font-medium">{DATOS[p.clave].nombre} <span className="font-normal text-suave">· de {NOMBRE_FUENTE_LEIDA[p.fuente]}{p.detalle ? ` (${p.detalle})` : ""}</span></label>
                          {ya && <p className="text-[12px] text-[#a33a0b]">Hoy dice otra cosa: {ya.valor.split("\n").join(" · ")}</p>}
                          {DATOS[p.clave].largo || p.valor.includes("\n")
                            ? <textarea aria-label={`${DATOS[p.clave].nombre} encontrado`} name={`valor-${p.clave}`} rows={Math.min(6, p.valor.split("\n").length + 1)} maxLength={1200} defaultValue={p.valor} className={campo} />
                            : <input aria-label={`${DATOS[p.clave].nombre} encontrado`} name={`valor-${p.clave}`} maxLength={200} defaultValue={p.valor} className={campo} />}
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex flex-wrap gap-2">
                    <button className={botonLleno} name="accion" value="guardar" data-trabajando="Guardando los datos…">Guardar los marcados</button>
                    <button className={boton} name="accion" value="descartar" data-trabajando="Descartando…">Descartar</button>
                  </div>
                </form>
              ) : (
                <form action={accionAprobarDatos} className="mt-2 flex flex-wrap items-center gap-3">
                  <input type="hidden" name="id" value={f.id} />
                  <input type="hidden" name="nombre" value={g?.nombre ?? f.nombre} />
                  <p className="text-[13px] text-medio">No encontramos nada que no supiéramos.</p>
                  <button className={boton} name="accion" value="descartar" data-trabajando="Cerrando…">Cerrar</button>
                </form>
              )}
            </div>
          )}
        </div>

        <details className="group mt-4" open={sabidos < 6}>
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center rounded-full bg-white px-4 text-[13px] font-medium shadow-[inset_0_0_0_1px_var(--color-borde)] [&::-webkit-details-marker]:hidden">Lo que sabemos de {f.nombre}: ver y completar</summary>
          <form action={accionGuardarSaber} className="mt-4 grid gap-6" data-form-saber>
            <input type="hidden" name="id" value={f.id} />
            <input type="hidden" name="nombre" value={f.nombre} />
            {GRUPOS_SABER.map((grupo) => (
              <fieldset key={grupo} className="grid gap-3">
                <legend className="mb-1 text-[13px] font-medium">{grupo}</legend>
                <div className="grid gap-3 md:grid-cols-2">
                  {CLAVES_SABER.filter((k) => DATOS[k].grupo === grupo && k !== "nombre").map((k) => {
                    const d = DATOS[k], v = saber[k];
                    // Lo que trae Imán se ve y no se pisa por error: si quieres cambiarlo, escribe encima.
                    const deMano = f.guardada?.saber?.[k] ?? "";
                    return (
                      <label key={k} className={`grid content-start gap-1 text-[13px] ${d.largo ? "md:col-span-2" : ""}`}>
                        <span>{d.nombre} {v ? <span className="text-suave">· {ORIGEN[v.origen]}</span> : <span className="text-[#a33a0b]">· falta</span>}</span>
                        {d.largo
                          ? <textarea name={`saber-${k}`} rows={3} maxLength={1200} defaultValue={deMano} placeholder={v && !deMano ? v.valor : d.ayuda} className={campo} />
                          : <input name={`saber-${k}`} maxLength={200} defaultValue={deMano} placeholder={v && !deMano ? v.valor : d.ayuda} className={campo} />}
                        {!v && <span className="text-[12px] text-suave">Se puede sacar de: {d.fuentes.map((x) => NOMBRE_FUENTE[x]).join(", ")}.</span>}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}
            <div><button className={botonLleno} data-trabajando="Guardando lo que sabemos…">Guardar lo que sabemos</button></div>
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
