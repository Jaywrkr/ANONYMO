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
  const [borrador, setBorrador] = useState({ idea: "", texto: "", visual: "" });
  const [filtro, setFiltro] = useState<"todas" | EstadoPieza>("todas");
  const [copiado, setCopiado] = useState("");

  const conteo = { aprobada: 0, cambio: 0, propuesta: 0 } as Record<EstadoPieza, number>;
  for (const p of mes.piezas) conteo[p.estado]++;

  async function pedir(p: Pieza, metodo: "PATCH" | "POST", cuerpo: Record<string, unknown>, que: string, hecho: string) {
    if (trabajo) return;
    setTrabajo({ pieza: p.id, que });
    setAviso(null);
    try {
      const r = await fetch(`/estudio/contenido/${mes.id}/pieza`, { method: metodo, headers: { "content-type": "application/json" }, body: JSON.stringify({ pieza: p.id, ...cuerpo }) });
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

  async function copiar() {
    const aprobadas = mes.piezas.filter((p) => p.estado === "aprobada");
    const texto = [`Contenido de ${mes.nombre}`, `Series: ${mes.series.map((s) => s.nombre).join(", ")}`, ...aprobadas.map((p) => `${dia(p.fecha)} · ${FORMATO[p.formato]} · ${p.serie}\n${p.idea}\n«${p.texto}»`)].join("\n\n");
    try { await navigator.clipboard.writeText(texto); setCopiado(`Copiado: ${aprobadas.length} ${aprobadas.length === 1 ? "pieza aprobada" : "piezas aprobadas"}. Pégalo en WhatsApp o en un correo.`); }
    catch { setCopiado("No se pudo copiar. Mantén presionado el texto para copiarlo a mano."); }
  }

  const visibles = mes.piezas.filter((p) => filtro === "todas" || p.estado === filtro);
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
      {copiado && <p role="status" className="text-[13px] text-[#17714a]">{copiado}</p>}
      {!visibles.length && <p className="text-[14px] text-medio">No hay piezas así.</p>}
      <ol className="grid gap-3">
        {visibles.map((p) => {
          const ocupada = trabajo?.pieza === p.id;
          const modo = abierta?.pieza === p.id ? abierta.modo : null;
          return (
            <li key={p.id} data-pieza={p.id} data-estado={p.estado} className="rounded-[18px] bg-white p-5 shadow-[0_0_0_1px_rgba(26,24,22,.05)]">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-medio">
                <span className="font-medium capitalize text-tinta">{dia(p.fecha)}</span>
                <span>{FORMATO[p.formato]}</span>
                <span>{p.serie}</span>
                <span className={`ml-auto rounded-full px-3 py-1 text-[12px] ${ESTADO[p.estado].clase}`}>{ESTADO[p.estado].texto}</span>
              </div>
              {modo === "editar" ? (
                <div className="mt-3 grid gap-3">
                  <label className="grid gap-1 text-[13px] text-medio">La idea<input value={borrador.idea} onChange={(e) => setBorrador({ ...borrador, idea: e.target.value })} className={campo} /></label>
                  <label className="grid gap-1 text-[13px] text-medio">El texto que se publica<textarea rows={4} value={borrador.texto} onChange={(e) => setBorrador({ ...borrador, texto: e.target.value })} className={campo} /></label>
                  <label className="grid gap-1 text-[13px] text-medio">Cómo se ve<textarea rows={2} value={borrador.visual} onChange={(e) => setBorrador({ ...borrador, visual: e.target.value })} className={campo} /></label>
                  <div className="flex gap-2">
                    <button type="button" disabled={!!trabajo} onClick={() => void pedir(p, "PATCH", borrador, "Guardando", "Guardado.")} className="inline-flex min-h-11 items-center rounded-full bg-tinta px-4 text-[13px] text-white disabled:opacity-40">{ocupada ? "Guardando…" : "Guardar"}</button>
                    <button type="button" disabled={!!trabajo} onClick={() => setAbierta(null)} className={boton}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="mt-2 text-[16px] font-medium">{p.idea}</p>
                  <p className="mt-2 whitespace-pre-line text-[15px]">{p.texto}</p>
                  <p className="mt-2 text-[13px] text-medio">Cómo se ve: {p.visual}</p>
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
                  <button type="button" data-corregir disabled={!!trabajo} onClick={() => { setBorrador({ idea: p.idea, texto: p.texto, visual: p.visual }); setAbierta({ pieza: p.id, modo: "editar" }); }} className={boton}>Corregir</button>
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
