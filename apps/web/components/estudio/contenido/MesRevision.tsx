"use client";

// Revisar el mes pieza por pieza (sistema/96): aprobar, pedir un cambio con una nota o corregir a mano.
// Los reels pueden llevar guion (Faro, usa IA: pregunta antes). Lo aprobado se copia para mandárselo al cliente.
import { useState } from "react";
import type { EstadoPieza, FormatoPieza, MesContenido, Pieza } from "@anonymo/pipeline";

const FORMATO: Record<FormatoPieza, string> = { reel: "Reel", carrusel: "Carrusel", post: "Post", historia: "Historia" };
const ESTADO: Record<EstadoPieza, { texto: string; clase: string }> = {
  propuesta: { texto: "Por revisar", clase: "bg-hueso text-medio" },
  aprobada: { texto: "Aprobada", clase: "bg-[#e6f6ee] text-[#17714a]" },
  cambio: { texto: "Pidieron un cambio", clase: "bg-[#fff1ea] text-[#a33a0b]" },
};
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const dia = (f: string) => { const d = new Date(`${f}T12:00:00Z`); return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()}`; };
const boton = "inline-flex min-h-11 items-center rounded-full bg-white px-4 text-[13px] shadow-[inset_0_0_0_1px_var(--color-borde)] transition hover:shadow-[inset_0_0_0_1px_rgba(26,24,22,.35)] disabled:opacity-40";
const campo = "w-full rounded-xl bg-hueso/60 px-3 py-2.5 text-[15px] outline-none focus:bg-white focus:shadow-[inset_0_0_0_1px_var(--color-borde)]";

export function MesRevision({ inicial }: { inicial: MesContenido }) {
  const [mes, setMes] = useState(inicial);
  const [trabajo, setTrabajo] = useState<{ pieza: string; que: string } | null>(null);
  const [aviso, setAviso] = useState<{ pieza: string; ok: boolean; texto: string } | null>(null);
  const [abierta, setAbierta] = useState<{ pieza: string; modo: "cambio" | "editar" | "guion" } | null>(null);
  const [nota, setNota] = useState("");
  const [borrador, setBorrador] = useState({ idea: "", texto: "", visual: "", tituloArte: "" });
  const [filtro, setFiltro] = useState<"todas" | EstadoPieza>("todas");
  const [copiado, setCopiado] = useState("");

  const conteo = { aprobada: 0, cambio: 0, propuesta: 0 } as Record<EstadoPieza, number>;
  for (const p of mes.piezas) conteo[p.estado]++;

  async function pedir(p: Pieza, metodo: "PATCH" | "POST", cuerpo: Record<string, unknown>, que: string, hecho: string, ruta = "pieza") {
    if (trabajo) return;
    setTrabajo({ pieza: p.id, que });
    setAviso(null);
    try {
      const r = await fetch(`/estudio/contenido/${mes.id}/${ruta}`, { method: metodo, headers: { "content-type": "application/json" }, body: JSON.stringify({ pieza: p.id, ...cuerpo }) });
      const j = (await r.json().catch(() => ({}))) as { error?: string; mes?: MesContenido };
      if (!r.ok || !j.mes) throw new Error(j.error ?? "No se pudo guardar. Vuelve a intentar.");
      setMes(j.mes);
      setAbierta(null);
      setAviso({ pieza: p.id, ok: true, texto: hecho });
    } catch (e) {
      setAviso({ pieza: p.id, ok: false, texto: (e as Error).message === "Failed to fetch" ? "Se cortó la conexión. Vuelve a intentar." : (e as Error).message });
    } finally {
      setTrabajo(null);
    }
  }

  async function copiarTexto(p: Pieza) {
    try { await navigator.clipboard.writeText(p.texto); setCopiado(`t:${p.id}`); setTimeout(() => setCopiado(""), 2000); } catch { setCopiado(""); }
  }

  async function copiar() {
    const aprobadas = mes.piezas.filter((p) => p.estado === "aprobada");
    const texto = [`Contenido de ${mes.nombre}`, `Series: ${mes.series.map((s) => s.nombre).join(", ")}`, ...aprobadas.map((p) => `${dia(p.fecha)} · ${FORMATO[p.formato]} · ${p.serie}\n${p.idea}\n«${p.texto}»`)].join("\n\n");
    try { await navigator.clipboard.writeText(texto); setCopiado(`Copiado: ${aprobadas.length} ${aprobadas.length === 1 ? "pieza aprobada" : "piezas aprobadas"}. Pégalo en WhatsApp o en un correo.`); }
    catch { setCopiado("No se pudo copiar. Mantén presionado el texto para copiarlo a mano."); }
  }

  const visibles = mes.piezas.filter((p) => filtro === "todas" || p.estado === filtro);
  // Lo de hoy (o lo próximo), como la vista del día de los planificadores.
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" });
  const proxima = mes.piezas.find((p) => p.fecha >= hoy);
  return (
    <div data-mes-revision className="grid gap-5">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar piezas">
        {(["todas", "propuesta", "cambio", "aprobada"] as const).map((f) => (
          <button key={f} type="button" aria-pressed={filtro === f} onClick={() => setFiltro(f)} className={`inline-flex min-h-10 items-center rounded-full px-4 text-[13px] ${filtro === f ? "bg-tinta text-white" : "bg-white shadow-[inset_0_0_0_1px_var(--color-borde)]"}`}>
            {f === "todas" ? `Todas (${mes.piezas.length})` : `${ESTADO[f].texto} (${conteo[f]})`}
          </button>
        ))}
        <button type="button" data-copiar-mes disabled={!conteo.aprobada} onClick={() => void copiar()} className={`${boton} ml-auto`}>Copiar lo aprobado para enviar</button>
      </div>
      {proxima && (
        <a href={`#${proxima.id}`} data-proxima className="block rounded-[18px] bg-tinta p-4 text-white">
          <p className="text-[12px] text-white/60">{proxima.fecha === hoy ? "Hoy" : "Lo próximo"} · <span className="capitalize">{dia(proxima.fecha)}</span>{proxima.hora ? ` · ${proxima.hora}` : ""} · {FORMATO[proxima.formato]}</p>
          <p className="mt-1 text-[15px]">{proxima.idea}</p>
          <p className="mt-1 text-[12px] text-white/60">{proxima.estado === "aprobada" ? (proxima.artes?.length ? "Aprobada y con arte: lista para publicar." : "Aprobada. Falta dibujar el arte.") : "Todavía no está aprobada."}{proxima.historias?.length ? ` · ${proxima.historias.length} historias` : ""}</p>
        </a>
      )}
      {copiado && !copiado.startsWith("t:") && <p role="status" className="text-[13px] text-[#17714a]">{copiado}</p>}
      {!visibles.length && <p className="text-[14px] text-medio">No hay piezas así.</p>}
      <ol className="grid gap-3">
        {visibles.map((p) => {
          const ocupada = trabajo?.pieza === p.id;
          const modo = abierta?.pieza === p.id ? abierta.modo : null;
          return (
            <li key={p.id} id={p.id} data-pieza={p.id} data-estado={p.estado} className="rounded-[18px] bg-white p-5 shadow-[0_0_0_1px_rgba(26,24,22,.05)]">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-medio">
                <span className="font-medium capitalize text-tinta">{dia(p.fecha)}</span>
                {p.hora && <span data-hora>{p.hora}</span>}
                <span>{FORMATO[p.formato]}</span>
                <span>{p.serie}</span>
                <span className={`ml-auto rounded-full px-3 py-1 text-[12px] ${ESTADO[p.estado].clase}`}>{ESTADO[p.estado].texto}</span>
              </div>
              {modo === "editar" ? (
                <div className="mt-3 grid gap-3">
                  <label className="grid gap-1 text-[13px] text-medio">La idea<input value={borrador.idea} onChange={(e) => setBorrador({ ...borrador, idea: e.target.value })} className={campo} /></label>
                  <label className="grid gap-1 text-[13px] text-medio">El texto que se publica<textarea rows={4} value={borrador.texto} onChange={(e) => setBorrador({ ...borrador, texto: e.target.value })} className={campo} /></label>
                  {p.lamina && <label className="grid gap-1 text-[13px] text-medio">Título del arte<input value={borrador.tituloArte} onChange={(e) => setBorrador({ ...borrador, tituloArte: e.target.value })} className={campo} /></label>}
                  <label className="grid gap-1 text-[13px] text-medio">Cómo se ve<textarea rows={2} value={borrador.visual} onChange={(e) => setBorrador({ ...borrador, visual: e.target.value })} className={campo} /></label>
                  <div className="flex gap-2">
                    <button type="button" disabled={!!trabajo} onClick={() => void pedir(p, "PATCH", p.lamina ? borrador : { idea: borrador.idea, texto: borrador.texto, visual: borrador.visual }, "Guardando", "Guardado.")} className="inline-flex min-h-11 items-center rounded-full bg-tinta px-4 text-[13px] text-white disabled:opacity-40">{ocupada ? "Guardando…" : "Guardar"}</button>
                    <button type="button" disabled={!!trabajo} onClick={() => setAbierta(null)} className={boton}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="mt-2 text-[16px] font-medium">{p.idea}</p>
                  <p className="mt-2 whitespace-pre-line text-[15px]">{p.texto}</p>
                  <button type="button" data-copiar-texto onClick={() => void copiarTexto(p)} className="mt-1 inline-flex min-h-11 items-center text-[12.5px] text-medio underline underline-offset-4">{copiado === `t:${p.id}` ? "Texto copiado" : "Copiar el texto"}</button>
                  <p className="mt-1 text-[13px] text-medio">Cómo se ve: {p.visual}</p>
                  {p.historias && p.historias.length > 0 && (
                    <div data-historias className="mt-3 rounded-xl bg-hueso/50 p-3">
                      <p className="text-[12px] text-medio">Historias del día</p>
                      <ol className="mt-1 grid gap-1 text-[14px]">{p.historias.map((h, i) => <li key={i}><span className="text-medio">{i + 1}.</span> {h.texto}{h.sticker && <span className="ml-1 text-[12px] text-medio">· sticker de {h.sticker}{h.opciones?.length ? `: ${h.opciones.join(" / ")}` : ""}</span>}</li>)}</ol>
                    </div>
                  )}
                  {p.youtube && <p data-youtube className="mt-2 text-[13px] text-medio">YouTube Shorts: «{p.youtube.titulo}»</p>}
                  {p.b && (
                    <details data-opcion-b className="mt-3 rounded-xl border border-black/10 p-3">
                      <summary className="cursor-pointer text-[13.5px]">Opción B: {p.b.idea}</summary>
                      <p className="mt-2 whitespace-pre-line text-[14px]">{p.b.texto}</p>
                      {p.b.lamina && <p className="mt-1 text-[13px] text-medio">En el arte: «{p.b.lamina.titulo}»</p>}
                      <button type="button" data-usar-b disabled={!!trabajo} onClick={() => void pedir(p, "PATCH", { elegirB: true }, "Cambiando", "Ahora va la opción B. La A quedó como alternativa.")} className={`${boton} mt-2`}>{ocupada && trabajo?.que === "Cambiando" ? "Cambiando…" : "Usar la opción B"}</button>
                    </details>
                  )}
                  {p.lamina && (
                    <div data-arte className="mt-3">
                      {p.artes && p.artes.length > 0 ? (
                        <>
                          <div className="flex gap-2 overflow-x-auto pb-1">{p.artes.map((a) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <a key={a} href={`/estudio/contenido/${mes.id}/arte/${a}?v=${encodeURIComponent(mes.actualizado)}`} target="_blank" rel="noreferrer" className="shrink-0"><img src={`/estudio/contenido/${mes.id}/arte/${a}?v=${encodeURIComponent(mes.actualizado)}`} alt={`Arte ${a}`} className={`${a.includes("historia") || a.includes("portada") ? "h-40 w-[90px]" : "h-40 w-32"} border border-black/10 object-cover`} /></a>
                          ))}</div>
                          <a data-descargar-arte href={`/estudio/contenido/${mes.id}/arte?pieza=${p.id}`} className="mt-1 inline-flex min-h-11 items-center text-[13px] underline underline-offset-4">Descargar todo (.zip, con el texto)</a>
                        </>
                      ) : <p className="text-[13px] text-medio">El arte todavía no está dibujado. En el arte va: «{p.lamina.titulo}».</p>}
                    </div>
                  )}
                  {new Date(`${p.fecha}T12:00:00Z`).getUTCDay() === 1 && <p data-revision className="mt-2 text-[12.5px] text-medio">Lunes de revisión (15 min): mira guardados, compartidos y mensajes de la semana pasada. Lo que no funcionó se cambia en las piezas que faltan con «Pedir un cambio».</p>}
                  {p.avisos && p.avisos.length > 0 && <div data-avisos className="mt-2 rounded-xl border border-[#FFB21A] px-3 py-2 text-[13px]"><p className="text-[12px] text-medio">Faro lo revisó y encontró:</p><ul className="mt-1 grid gap-0.5">{p.avisos.map((a, i) => <li key={i}>· {a}</li>)}</ul></div>}
                  {p.nota && <p className="mt-2 rounded-xl bg-[#fff1ea] px-3 py-2 text-[13px] text-[#8a2f08]">Cambio pedido: {p.nota}</p>}
                  {p.guion && <pre data-guion className="mt-3 whitespace-pre-wrap rounded-xl bg-hueso/60 p-3 font-sans text-[13px]">{p.guion}</pre>}
                </>
              )}
              {modo === "cambio" && (
                <div className="mt-3 grid gap-2">
                  <label className="grid gap-1 text-[13px] text-medio">¿Qué hay que cambiar?<textarea rows={2} autoFocus value={nota} onChange={(e) => setNota(e.target.value.slice(0, 400))} placeholder="Ej.: más corto, sin precio, otra foto." className={campo} /></label>
                  <div className="flex gap-2">
                    <button type="button" disabled={!!trabajo || !nota.trim()} onClick={() => void pedir(p, "PATCH", { estado: "cambio", nota }, "Anotando", "Cambio anotado.")} className="inline-flex min-h-11 items-center rounded-full bg-tinta px-4 text-[13px] text-white disabled:opacity-40">{ocupada ? "Anotando…" : "Anotar el cambio"}</button>
                    <button type="button" disabled={!!trabajo} onClick={() => setAbierta(null)} className={boton}>Cancelar</button>
                  </div>
                </div>
              )}
              {modo === "guion" && (
                <div role="alertdialog" aria-label="Confirmar" className="mt-3 rounded-2xl bg-hueso p-4 text-[14px]">
                  <p>Faro va a escribir el guion de este reel. Usa IA: unos centavos del saldo. ¿Lo hago?</p>
                  <div className="mt-3 flex gap-2">
                    <button type="button" disabled={!!trabajo} onClick={() => void pedir(p, "POST", {}, "Faro está escribiendo", "Guion listo.")} className="inline-flex min-h-11 items-center rounded-full bg-tinta px-4 text-[13px] text-white disabled:opacity-40">{ocupada ? "Faro está escribiendo…" : "Sí, escribirlo"}</button>
                    <button type="button" disabled={!!trabajo} onClick={() => setAbierta(null)} className={boton}>Todavía no</button>
                  </div>
                </div>
              )}
              {!modo && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {p.estado !== "aprobada" && <button type="button" data-aprobar disabled={!!trabajo} onClick={() => void pedir(p, "PATCH", { estado: "aprobada" }, "Aprobando", "Aprobada.")} className="inline-flex min-h-11 items-center rounded-full bg-tinta px-4 text-[13px] text-white disabled:opacity-40">{ocupada ? "Aprobando…" : "Aprobar"}</button>}
                  <button type="button" data-pedir-cambio disabled={!!trabajo} onClick={() => { setNota(p.nota ?? ""); setAbierta({ pieza: p.id, modo: "cambio" }); }} className={boton}>Pedir un cambio</button>
                  <button type="button" data-corregir disabled={!!trabajo} onClick={() => { setBorrador({ idea: p.idea, texto: p.texto, visual: p.visual, tituloArte: p.lamina?.titulo ?? "" }); setAbierta({ pieza: p.id, modo: "editar" }); }} className={boton}>Corregir</button>
                  {p.lamina && <button type="button" data-dibujar disabled={!!trabajo} onClick={() => void pedir(p, "POST", {}, "Dibujando", "Arte listo. Descárgalo o revísalo aquí.", "arte")} className={boton}>{ocupada && trabajo?.que === "Dibujando" ? "Dibujando el arte…" : p.artes?.length ? "Volver a dibujar" : "Dibujar el arte"}</button>}
                  {p.formato === "reel" && <button type="button" data-escribir-guion disabled={!!trabajo} onClick={() => setAbierta({ pieza: p.id, modo: "guion" })} className={boton}>{p.guion ? "Escribir otro guion" : "Escribir su guion"}</button>}
                </div>
              )}
              {aviso?.pieza === p.id && <p role={aviso.ok ? "status" : "alert"} className={`mt-2 text-[13px] ${aviso.ok ? "text-[#17714a]" : "text-[#a33a0b]"}`}>{aviso.texto}</p>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
