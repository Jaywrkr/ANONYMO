"use client";

// El mes de contenido como un planner (sistema/114): el calendario del mes con el arte de cada día a la vista, y al
// tocar un día la pieza completa al lado (en celular, a pantalla completa): A y B en pestañas sin mezclarse, el arte tal
// como se publica, las historias como pantallas de celular y las acciones abajo. El arte se ve al instante (HTML);
// «Bajar para Instagram» lo dibuja en JPG. Reemplaza a MesRevision (sistema/96).
import { useEffect, useMemo, useRef, useState } from "react";
import type { EstadoPieza, FormatoPieza, MesContenido, Pieza } from "@anonymo/pipeline";
import { laminasHTML, type ArteDibujo, type EstiloArte } from "@anonymo/pipeline/src/video/artes-html.ts";

const FORMATO: Record<FormatoPieza, string> = { reel: "Reel", carrusel: "Carrusel", post: "Post", historia: "Historia" };
const ESTADO: Record<EstadoPieza, { texto: string; clase: string; punto: string }> = {
  propuesta: { texto: "Por revisar", clase: "bg-hueso text-medio", punto: "bg-[#cfc8bc]" },
  aprobada: { texto: "Aprobada", clase: "bg-[#e6f6ee] text-[#17714a]", punto: "bg-[#17714a]" },
  cambio: { texto: "Pidieron un cambio", clase: "bg-[#fff1ea] text-[#a33a0b]", punto: "bg-[#ff6a2b]" },
};
/** Un color por serie, para leer el mes de un vistazo. */
const COLORES = ["#ff5a36", "#3b6cff", "#17a36b", "#b5179e", "#e0a100", "#6e675f"];
const SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const dia = (f: string) => { const d = new Date(`${f}T12:00:00Z`); return `${DIAS[d.getUTCDay()]} ${d.getUTCDate()}`; };
const boton = "inline-flex min-h-11 items-center justify-center rounded-full bg-white px-4 text-[13px] shadow-[inset_0_0_0_1px_var(--color-borde)] transition hover:shadow-[inset_0_0_0_1px_rgba(26,24,22,.35)] disabled:opacity-40";
const lleno = "inline-flex min-h-11 items-center justify-center rounded-full bg-tinta px-5 text-[13px] text-white disabled:opacity-40";
const campo = "w-full rounded-xl bg-hueso/60 px-3 py-2.5 text-[15px] outline-none focus:bg-white focus:shadow-[inset_0_0_0_1px_var(--color-borde)]";

/**
 * El arte tal como se publica: el mismo HTML que se dibuja en JPG, achicado al ancho que haya.
 * Sin «ancho», mide su espacio (las celdas del calendario cambian con la pantalla).
 */
function Vista({ a, ancho, titulo, perezosa = false }: { a: ArteDibujo; ancho?: number; titulo: string; perezosa?: boolean }) {
  const caja = useRef<HTMLDivElement>(null);
  const [medido, setMedido] = useState(ancho ?? 0);
  useEffect(() => {
    if (ancho || !caja.current) return;
    const ro = new ResizeObserver(([e]) => setMedido(Math.floor(e!.contentRect.width)));
    ro.observe(caja.current);
    return () => ro.disconnect();
  }, [ancho]);
  const w = ancho ?? medido, escala = w / a.ancho;
  return (
    <div ref={caja} className={`relative shrink-0 overflow-hidden bg-hueso ${ancho ? "" : "w-full"}`} style={{ width: ancho, height: w ? Math.round(a.alto * escala) : undefined, aspectRatio: w ? undefined : `${a.ancho} / ${a.alto}` }} data-vista>
      {w > 0 && <iframe title={titulo} srcDoc={a.html} sandbox="" loading={perezosa ? "lazy" : "eager"} tabIndex={-1} aria-hidden
        className="pointer-events-none absolute left-0 top-0 origin-top-left border-0" style={{ width: a.ancho, height: a.alto, transform: `scale(${escala})` }} />}
    </div>
  );
}

export function PlannerMes({ inicial, estilo }: { inicial: MesContenido; estilo: EstiloArte }) {
  const [mes, setMes] = useState(inicial);
  const hoy = new Date().toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" });
  const proxima = mes.piezas.find((p) => p.fecha >= hoy);
  const [sel, setSel] = useState<string | null>(null);
  const [opcion, setOpcion] = useState<"A" | "B">("A");
  const [trabajo, setTrabajo] = useState<{ pieza: string; que: string } | null>(null);
  const [aviso, setAviso] = useState<{ pieza: string; ok: boolean; texto: string } | null>(null);
  const [modo, setModo] = useState<"cambio" | "editar" | "guion" | null>(null);
  const [nota, setNota] = useState("");
  const [borrador, setBorrador] = useState({ idea: "", texto: "", visual: "", tituloArte: "" });
  const [filtro, setFiltro] = useState<"todas" | EstadoPieza>("todas");
  const [copiado, setCopiado] = useState("");
  // En computadora la pieza se abre al lado desde el principio; en celular, solo al tocar un día.
  useEffect(() => { if (window.matchMedia("(min-width: 1024px)").matches) setSel((s) => s ?? (proxima ?? mes.piezas[0])?.id ?? null); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const conteo = { aprobada: 0, cambio: 0, propuesta: 0 } as Record<EstadoPieza, number>;
  for (const p of mes.piezas) conteo[p.estado]++;
  const colorSerie = (s: string) => COLORES[Math.max(0, mes.series.findIndex((x) => x.nombre === s)) % COLORES.length]!;
  const nSerie = (p: Pieza) => mes.piezas.filter((x) => x.serie === p.serie && x.fecha <= p.fecha).length;
  const laminas = (p: Pieza, cual: "A" | "B"): ArteDibujo[] => {
    const l = cual === "A" ? p.lamina : p.b?.lamina;
    if (!l || !p.plantilla) return [];
    try { return laminasHTML(estilo, { id: p.id, formato: p.formato, plantilla: p.plantilla, lamina: l, serie: p.serie, nSerie: nSerie(p), historias: p.historias }); } catch { return []; }
  };

  // Las semanas del mes, de lunes a domingo, con cada día y su pieza.
  const semanas = useMemo(() => {
    const [a, m] = mes.mes.split("-").map(Number) as [number, number];
    const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate();
    const inicio = (new Date(Date.UTC(a, m - 1, 1)).getUTCDay() + 6) % 7;
    const celdas: ({ fecha: string; n: number } | null)[] = [...Array(inicio).fill(null), ...Array.from({ length: ultimo }, (_, i) => ({ fecha: `${mes.mes}-${String(i + 1).padStart(2, "0")}`, n: i + 1 }))];
    while (celdas.length % 7) celdas.push(null);
    return Array.from({ length: celdas.length / 7 }, (_, i) => celdas.slice(i * 7, i * 7 + 7));
  }, [mes.mes]);
  const porFecha = useMemo(() => { const x = new Map<string, Pieza[]>(); for (const p of mes.piezas) x.set(p.fecha, [...(x.get(p.fecha) ?? []), p]); return x; }, [mes.piezas]);

  async function pedir(p: Pieza, metodo: "PATCH" | "POST", cuerpo: Record<string, unknown>, que: string, hecho: string, ruta = "pieza") {
    if (trabajo) return;
    setTrabajo({ pieza: p.id, que });
    setAviso(null);
    try {
      const r = await fetch(`/estudio/contenido/${mes.id}/${ruta}`, { method: metodo, headers: { "content-type": "application/json" }, body: JSON.stringify({ pieza: p.id, ...cuerpo }) });
      const j = (await r.json().catch(() => ({}))) as { error?: string; mes?: MesContenido };
      if (!r.ok || !j.mes) throw new Error(j.error ?? "No se pudo guardar. Vuelve a intentar.");
      setMes(j.mes);
      setModo(null);
      setAviso({ pieza: p.id, ok: true, texto: hecho });
    } catch (e) {
      setAviso({ pieza: p.id, ok: false, texto: (e as Error).message === "Failed to fetch" ? "Se cortó la conexión. Vuelve a intentar." : (e as Error).message });
    } finally {
      setTrabajo(null);
    }
  }
  async function copiarTexto(t: string, clave: string) {
    try { await navigator.clipboard.writeText(t); setCopiado(clave); setTimeout(() => setCopiado(""), 2000); } catch { setCopiado(""); }
  }
  async function copiar() {
    const aprobadas = mes.piezas.filter((p) => p.estado === "aprobada");
    const texto = [`Contenido de ${mes.nombre}`, `Series: ${mes.series.map((s) => s.nombre).join(", ")}`, ...aprobadas.map((p) => `${dia(p.fecha)} · ${FORMATO[p.formato]} · ${p.serie}\n${p.idea}\n«${p.texto}»`)].join("\n\n");
    try { await navigator.clipboard.writeText(texto); setCopiado(`Copiado: ${aprobadas.length} ${aprobadas.length === 1 ? "pieza aprobada" : "piezas aprobadas"}. Pégalo en WhatsApp o en un correo.`); }
    catch { setCopiado("No se pudo copiar. Mantén presionado el texto para copiarlo a mano."); }
  }
  const abrir = (id: string) => { setSel(id); setOpcion("A"); setModo(null); setAviso((a) => (a?.pieza === id ? a : null)); };

  const p = mes.piezas.find((x) => x.id === sel);
  const ocupada = !!p && trabajo?.pieza === p.id;
  const verB = opcion === "B" && !!p?.b;
  const op = p ? (verB ? { idea: p.b!.idea, texto: p.b!.texto, visual: p.b!.visual, lamina: p.b!.lamina } : { idea: p.idea, texto: p.texto, visual: p.visual, lamina: p.lamina }) : undefined;

  return (
    <div data-mes-revision className="grid gap-5">
      {/* Avance y filtros: cuántas van aprobadas y qué mirar. */}
      <div className="grid gap-3">
        <div className="flex items-center gap-3" role="img" aria-label={`${conteo.aprobada} de ${mes.piezas.length} aprobadas`}>
          <span className="flex h-2 flex-1 overflow-hidden rounded-full bg-[#eee9e0]">
            <i className="h-full bg-[#17714a]" style={{ width: `${(conteo.aprobada / Math.max(1, mes.piezas.length)) * 100}%` }} />
            <i className="h-full bg-[#ff6a2b]" style={{ width: `${(conteo.cambio / Math.max(1, mes.piezas.length)) * 100}%` }} />
          </span>
          <span className="shrink-0 text-[13px] text-medio">{conteo.aprobada} de {mes.piezas.length} aprobadas</span>
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar piezas">
          {(["todas", "propuesta", "cambio", "aprobada"] as const).map((f) => (
            <button key={f} type="button" aria-pressed={filtro === f} onClick={() => setFiltro(f)} className={`inline-flex min-h-10 items-center rounded-full px-4 text-[13px] ${filtro === f ? "bg-tinta text-white" : "bg-white shadow-[inset_0_0_0_1px_var(--color-borde)]"}`}>
              {f === "todas" ? `Todas (${mes.piezas.length})` : `${ESTADO[f].texto} (${conteo[f]})`}
            </button>
          ))}
          <button type="button" data-copiar-mes disabled={!conteo.aprobada} onClick={() => void copiar()} className={`${boton} ml-auto`}>Copiar lo aprobado para enviar</button>
        </div>
        {copiado && !copiado.startsWith("t:") && <p role="status" className="text-[13px] text-[#17714a]">{copiado}</p>}
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-medio" aria-label="Series">
          {mes.series.map((s) => <span key={s.nombre} className="inline-flex items-center gap-1.5" title={s.para}><i className="h-2.5 w-2.5 rounded-full" style={{ background: colorSerie(s.nombre) }} />{s.nombre}</span>)}
          <span className="text-suave">· Cada lunes: 15 min de revisión (guardados, compartidos y mensajes).</span>
        </p>
      </div>

      {proxima && (
        <button type="button" onClick={() => abrir(proxima.id)} data-proxima className="block rounded-[18px] bg-tinta p-4 text-left text-white">
          <span className="block text-[12px] text-white/60">{proxima.fecha === hoy ? "Hoy" : "Lo próximo"} · <span className="capitalize">{dia(proxima.fecha)}</span>{proxima.hora ? ` · ${proxima.hora}` : ""} · {FORMATO[proxima.formato]}</span>
          <span className="mt-1 block text-[15px]">{proxima.idea}</span>
          <span className="mt-1 block text-[12px] text-white/60">{proxima.estado === "aprobada" ? (proxima.artes?.length ? "Aprobada y con arte: lista para publicar." : "Aprobada. Falta bajar el arte.") : "Todavía no está aprobada."}{proxima.historias?.length ? ` · ${proxima.historias.length} historias` : ""}</span>
        </button>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(360px,440px)]">
        {/* El calendario: en computadora, la grilla del mes; en celular, la misma semana a semana, en columna. */}
        <div data-calendario className="grid gap-1.5">
          <div className="hidden grid-cols-7 gap-1.5 text-[11px] uppercase tracking-[0.08em] text-suave md:grid">{SEMANA.map((d) => <span key={d} className="px-1">{d}</span>)}</div>
          {semanas.map((sem, i) => (
            <div key={i} className="grid grid-cols-1 gap-1.5 md:grid-cols-7">
              {sem.map((c, j) => {
                if (!c) return <div key={j} className="hidden md:block" />;
                const ps = porFecha.get(c.fecha) ?? [];
                if (!ps.length) return <div key={j} className={`hidden min-h-24 rounded-xl px-2 py-1.5 text-[12px] md:block ${c.fecha === hoy ? "bg-white" : "bg-white/40"} text-suave`}>{c.n}</div>;
                return ps.map((x) => {
                  const atenua = filtro !== "todas" && x.estado !== filtro;
                  const lam = laminas(x, "A")[0];
                  const marcada = sel === x.id;
                  return (
                    <button key={x.id} type="button" id={x.id} data-pieza={x.id} data-estado={x.estado} data-fecha={x.fecha} aria-pressed={marcada} onClick={() => abrir(x.id)}
                      className={`group flex gap-2 rounded-xl bg-white p-1.5 text-left transition md:flex-col ${marcada ? "shadow-[0_0_0_2px_var(--color-tinta)]" : "shadow-[0_0_0_1px_rgba(26,24,22,.06)] hover:shadow-[0_0_0_1px_rgba(26,24,22,.3)]"} ${atenua ? "opacity-35" : ""}`}>
                      <span className="flex items-center justify-between gap-1 px-0.5 text-[12px] md:w-full">
                        <span className="font-medium" data-dia><span className="capitalize md:hidden">{dia(x.fecha)}</span><span className="hidden md:inline">{c.n}</span></span>
                        <span className="flex items-center gap-1">
                          {x.avisos?.length ? <i className="h-2 w-2 rounded-full bg-[#e5341b]" title="Tiene avisos" /> : null}
                          <i className={`h-2 w-2 rounded-full ${ESTADO[x.estado].punto}`} title={ESTADO[x.estado].texto} />
                        </span>
                      </span>
                      <span className="block w-24 shrink-0 overflow-hidden rounded-md md:w-full">{lam ? <Vista a={lam} titulo={`Arte del ${dia(x.fecha)}`} perezosa /> : <span className="block aspect-[4/5] w-full bg-hueso" />}</span>
                      <span className="min-w-0 flex-1 px-0.5 md:w-full">
                        <span className="flex items-center gap-1 text-[11px] text-medio"><i className="h-2 w-2 shrink-0 rounded-full" style={{ background: colorSerie(x.serie) }} /><span data-hora>{x.hora ?? ""}</span></span>
                        <span className="block truncate text-[11px] text-medio">{FORMATO[x.formato]}</span>
                        <span className="mt-0.5 line-clamp-2 block text-[12px] leading-snug md:hidden">{x.idea}</span>
                      </span>
                    </button>
                  );
                });
              })}
            </div>
          ))}
        </div>

        {/* La pieza abierta. En celular ocupa la pantalla; se cierra con «Volver al mes». */}
        {p && op && (
          <section data-detalle={p.id} data-estado={p.estado} aria-label={`Pieza del ${dia(p.fecha)}`}
            className="fixed inset-0 z-50 overflow-y-auto bg-[#f6f3ee] p-4 pb-28 lg:sticky lg:inset-auto lg:top-4 lg:z-auto lg:max-h-[calc(100dvh-2rem)] lg:rounded-[18px] lg:bg-white lg:p-5 lg:pb-5 lg:shadow-[0_0_0_1px_rgba(26,24,22,.06)]">
            <button type="button" onClick={() => setSel(null)} className="mb-3 inline-flex min-h-11 items-center text-[13px] text-medio lg:hidden">← Volver al mes</button>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-medio">
              <span className="font-medium capitalize text-tinta">{dia(p.fecha)}</span>
              {p.hora && <span>{p.hora}</span>}
              <span>{FORMATO[p.formato]}</span>
              <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full" style={{ background: colorSerie(p.serie) }} />{p.serie}</span>
              <span className={`ml-auto rounded-full px-3 py-1 text-[12px] ${ESTADO[p.estado].clase}`}>{ESTADO[p.estado].texto}</span>
            </div>

            {/* A y B en pestañas: cada una con su idea, su texto y su arte. Nunca se mezclan. */}
            {p.b && (
              <div role="tablist" aria-label="Opciones" className="mt-3 inline-flex rounded-full bg-hueso p-1">
                {(["A", "B"] as const).map((o) => (
                  <button key={o} type="button" role="tab" aria-selected={opcion === o} onClick={() => setOpcion(o)} data-tab={o}
                    className={`min-h-9 rounded-full px-4 text-[13px] ${opcion === o ? "bg-white text-tinta shadow-[0_0_0_1px_rgba(26,24,22,.08)]" : "text-medio"}`}>
                    {o === "A" ? "Opción A · va" : "Opción B"}
                  </button>
                ))}
              </div>
            )}

            {modo === "editar" ? (
              <div className="mt-3 grid gap-3">
                <label className="grid gap-1 text-[13px] text-medio">La idea<input value={borrador.idea} onChange={(e) => setBorrador({ ...borrador, idea: e.target.value })} className={campo} /></label>
                <label className="grid gap-1 text-[13px] text-medio">El texto que se publica<textarea rows={5} value={borrador.texto} onChange={(e) => setBorrador({ ...borrador, texto: e.target.value })} className={campo} /></label>
                {p.lamina && <label className="grid gap-1 text-[13px] text-medio">Título del arte<input value={borrador.tituloArte} onChange={(e) => setBorrador({ ...borrador, tituloArte: e.target.value })} className={campo} /></label>}
                <label className="grid gap-1 text-[13px] text-medio">Cómo se ve<textarea rows={2} value={borrador.visual} onChange={(e) => setBorrador({ ...borrador, visual: e.target.value })} className={campo} /></label>
                <div className="flex gap-2">
                  <button type="button" disabled={!!trabajo} onClick={() => void pedir(p, "PATCH", p.lamina ? borrador : { idea: borrador.idea, texto: borrador.texto, visual: borrador.visual }, "Guardando", "Guardado.")} className={lleno}>{ocupada ? "Guardando…" : "Guardar"}</button>
                  <button type="button" disabled={!!trabajo} onClick={() => setModo(null)} className={boton}>Cancelar</button>
                </div>
              </div>
            ) : (
              <div data-opcion={verB ? "B" : "A"}>
                <p className="mt-3 text-[16px] font-medium leading-snug" data-idea>{op.idea}</p>
                {/* El arte tal como se publica; si es carrusel, sus láminas para pasar de lado. */}
                {op.lamina && (
                  <div data-arte className="mt-3">
                    <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
                      {laminas(p, verB ? "B" : "A").map((a, i) => <div key={a.nombre} className="shrink-0 snap-start overflow-hidden rounded-lg shadow-[0_0_0_1px_rgba(26,24,22,.08)]"><Vista a={a} ancho={a.alto > a.ancho * 1.5 ? 150 : 220} titulo={`Lámina ${i + 1}`} /></div>)}
                    </div>
                    {!verB && p.artes && p.artes.length > 0 && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <div className="flex gap-1.5 overflow-x-auto">{p.artes.map((a) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <a key={a} href={`/estudio/contenido/${mes.id}/arte/${a}?v=${encodeURIComponent(mes.actualizado)}`} target="_blank" rel="noreferrer" className="shrink-0"><img src={`/estudio/contenido/${mes.id}/arte/${a}?v=${encodeURIComponent(mes.actualizado)}`} alt={`Arte ${a}`} className="h-14 w-auto border border-black/10" /></a>
                        ))}</div>
                        <a data-descargar-arte href={`/estudio/contenido/${mes.id}/arte?pieza=${p.id}`} className="inline-flex min-h-11 items-center text-[13px] underline underline-offset-4">Bajar todo (.zip, con el texto)</a>
                      </div>
                    )}
                  </div>
                )}
                <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed" data-texto>{op.texto}</p>
                <button type="button" data-copiar-texto onClick={() => void copiarTexto(op.texto, `t:${p.id}${opcion}`)} className="mt-1 inline-flex min-h-11 items-center text-[12.5px] text-medio underline underline-offset-4">{copiado === `t:${p.id}${opcion}` ? "Texto copiado" : "Copiar el texto"}</button>
                {op.visual && !/^solo el arte\.?$/i.test(op.visual.trim()) && <p className="text-[13px] text-medio">Para grabar o fotografiar: {op.visual}</p>}
                {verB && <button type="button" data-usar-b disabled={!!trabajo} onClick={() => void pedir(p, "PATCH", { elegirB: true }, "Cambiando", "Ahora va la opción B. La A quedó como alternativa.").then(() => setOpcion("A"))} className={`${lleno} mt-2`}>{ocupada && trabajo?.que === "Cambiando" ? "Cambiando…" : "Usar esta opción"}</button>}
              </div>
            )}

            {/* Las historias del día, como pantallas de celular. */}
            {p.historias && p.historias.length > 0 && modo !== "editar" && (
              <div data-historias className="mt-4">
                <p className="text-[12px] text-medio">Historias del día</p>
                <ol className="mt-2 flex gap-2 overflow-x-auto pb-1">
                  {p.historias.map((h, i) => (
                    <li key={i} className="flex aspect-[9/16] w-[118px] shrink-0 flex-col justify-between rounded-[14px] bg-tinta p-2.5 text-white">
                      <span className="font-mono text-[10px] text-white/50">{i + 1}/{p.historias!.length}</span>
                      <span className="text-[12px] leading-snug">{h.texto}</span>
                      {h.sticker ? <span className="rounded-md bg-white px-1.5 py-1 text-center text-[10px] text-tinta">{h.sticker}{h.opciones?.length ? `: ${h.opciones.join(" / ")}` : ""}</span> : <span />}
                    </li>
                  ))}
                </ol>
                {/* Texto plano para quien lee la pantalla y para copiar. */}
                <p className="sr-only">{p.historias.map((h) => `${h.texto}${h.sticker ? ` · sticker de ${h.sticker}${h.opciones?.length ? `: ${h.opciones.join(" / ")}` : ""}` : ""}`).join(". ")}</p>
              </div>
            )}
            {p.youtube && <p data-youtube className="mt-2 text-[13px] text-medio">YouTube Shorts: «{p.youtube.titulo}»</p>}
            {p.avisos && p.avisos.length > 0 && <div data-avisos className="mt-3 rounded-xl border border-[#e5341b]/50 bg-[#fff5f2] px-3 py-2 text-[13px]"><p className="text-[12px] text-[#a33a0b]">Revísalo antes de aprobar:</p><ul className="mt-1 grid gap-0.5">{p.avisos.map((a, i) => <li key={i}>· {a}</li>)}</ul></div>}
            {p.nota && <p className="mt-3 rounded-xl bg-[#fff1ea] px-3 py-2 text-[13px] text-[#8a2f08]">Cambio pedido: {p.nota}</p>}
            {p.guion && <pre data-guion className="mt-3 whitespace-pre-wrap rounded-xl bg-hueso/60 p-3 font-sans text-[13px]">{p.guion}</pre>}

            {modo === "cambio" && (
              <div className="mt-3 grid gap-2">
                <label className="grid gap-1 text-[13px] text-medio">¿Qué hay que cambiar?<textarea rows={2} autoFocus value={nota} onChange={(e) => setNota(e.target.value.slice(0, 400))} placeholder="Ej.: más corto, sin precio, otra foto." className={campo} /></label>
                <div className="flex gap-2">
                  <button type="button" disabled={!!trabajo || !nota.trim()} onClick={() => void pedir(p, "PATCH", { estado: "cambio", nota }, "Anotando", "Cambio anotado.")} className={lleno}>{ocupada ? "Anotando…" : "Anotar el cambio"}</button>
                  <button type="button" disabled={!!trabajo} onClick={() => setModo(null)} className={boton}>Cancelar</button>
                </div>
              </div>
            )}
            {modo === "guion" && (
              <div role="alertdialog" aria-label="Confirmar" className="mt-3 rounded-2xl bg-hueso p-4 text-[14px]">
                <p>Faro va a escribir el guion de este reel. Usa IA: unos centavos del saldo. ¿Lo hago?</p>
                <div className="mt-3 flex gap-2">
                  <button type="button" disabled={!!trabajo} onClick={() => void pedir(p, "POST", {}, "Faro está escribiendo", "Guion listo.")} className={lleno}>{ocupada ? "Faro está escribiendo…" : "Sí, escribirlo"}</button>
                  <button type="button" disabled={!!trabajo} onClick={() => setModo(null)} className={boton}>Todavía no</button>
                </div>
              </div>
            )}

            {/* Las acciones, siempre a mano: en celular quedan fijas abajo. */}
            {!modo && (
              <div className="fixed inset-x-0 bottom-0 z-10 flex flex-wrap gap-2 border-t border-borde bg-white/95 p-3 backdrop-blur lg:static lg:mt-4 lg:border-0 lg:bg-transparent lg:p-0">
                {p.estado !== "aprobada" && <button type="button" data-aprobar disabled={!!trabajo} onClick={() => void pedir(p, "PATCH", { estado: "aprobada" }, "Aprobando", "Aprobada.")} className={lleno}>{ocupada && trabajo?.que === "Aprobando" ? "Aprobando…" : "Aprobar"}</button>}
                <button type="button" data-pedir-cambio disabled={!!trabajo} onClick={() => { setNota(p.nota ?? ""); setModo("cambio"); }} className={boton}>Pedir un cambio</button>
                <button type="button" data-corregir disabled={!!trabajo} onClick={() => { setBorrador({ idea: p.idea, texto: p.texto, visual: p.visual, tituloArte: p.lamina?.titulo ?? "" }); setOpcion("A"); setModo("editar"); }} className={boton}>Corregir</button>
                {p.lamina && <button type="button" data-dibujar disabled={!!trabajo} onClick={() => void pedir(p, "POST", {}, "Dibujando", "Arte listo para Instagram. Bájalo con «Bajar todo».", "arte")} className={boton}>{ocupada && trabajo?.que === "Dibujando" ? "Preparando el arte…" : p.artes?.length ? "Volver a preparar" : "Preparar para Instagram"}</button>}
                {p.formato === "reel" && <button type="button" data-escribir-guion disabled={!!trabajo} onClick={() => setModo("guion")} className={boton}>{p.guion ? "Otro guion" : "Escribir su guion"}</button>}
              </div>
            )}
            {aviso?.pieza === p.id && <p role={aviso.ok ? "status" : "alert"} className={`mt-2 text-[13px] ${aviso.ok ? "text-[#17714a]" : "text-[#a33a0b]"}`}>{aviso.texto}</p>}
          </section>
        )}
        {!p && <p className="hidden rounded-[18px] bg-white/60 p-6 text-center text-[14px] text-medio lg:block">Toca un día para ver su pieza.</p>}
      </div>
    </div>
  );
}
