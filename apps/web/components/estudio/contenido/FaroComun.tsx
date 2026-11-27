"use client";

// Lo común de una pieza de Faro (sistema/127), en Piezas de Faro y en el mes: pedir las vueltas, aprobar o pedir un
// cambio, ver las láminas a su tamaño (4:5 o 9:16) y el paquete para subir (al celular con la hoja de compartir, o .zip).
import { useState } from "react";
import type { PiezaFaro, VersionPieza } from "@anonymo/pipeline";

export const esVertical = (f: PiezaFaro["formato"]) => f === "reel" || f === "historia";
export const NOMBRE_FORMATO: Record<PiezaFaro["formato"], string> = { post: "Post", carrusel: "Carrusel", reel: "Reel", historia: "Historia" };
export const arteFaro = (a: string) => `/estudio/contenido/faro/arte/${a}`;

/** Las vueltas de Faro: diseña, dibuja, juzga y, si no llega a la vara, la rehace sola (hasta 4 pedidos). */
export async function vueltasFaro(id: string, poner: (p: PiezaFaro) => void, estado: (t: string) => void) {
  for (let i = 1; i <= 4; i++) {
    estado(i === 1 ? "Faro está diseñando. Tarda uno a tres minutos: no cierres esta pantalla." : `No llegaba a la vara: Faro la está rehaciendo (vuelta ${i}).`);
    const r = await fetch(`/estudio/contenido/faro/${id}`, { method: "POST" });
    const j = (await r.json().catch(() => ({}))) as { error?: string; pieza?: PiezaFaro; otra?: boolean };
    if (!r.ok || !j.pieza) throw new Error(j.error ?? "Faro no pudo. Vuelve a intentar.");
    poner(j.pieza);
    if (!j.otra) return j.pieza;
  }
}

/** Aprobar o pedir un cambio. Si es del mes, el calendario queda igual (lo hace el servidor). */
export async function decidirFaro(id: string, accion: "aprobar" | "cambio", nota?: string): Promise<PiezaFaro> {
  const r = await fetch(`/estudio/contenido/faro/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ accion, nota }) });
  const j = (await r.json().catch(() => ({}))) as { error?: string; pieza?: PiezaFaro };
  if (!r.ok || !j.pieza) throw new Error(j.error ?? "No se pudo guardar.");
  return j.pieza;
}

/** Las láminas a su proporción real, para pasar de lado. */
export function LaminasFaro({ p, v, chica = false }: { p: PiezaFaro; v: VersionPieza; chica?: boolean }) {
  const vert = esVertical(p.formato);
  const ancho = chica ? (vert ? "w-[min(46vw,190px)]" : "w-[min(70vw,300px)]") : vert ? "w-[min(62vw,300px)]" : "w-[min(86vw,432px)]";
  return (
    <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2" data-laminas data-formato={p.formato}>
      {v.laminas.map((a, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={a} src={arteFaro(a)} alt={`${p.formato === "reel" ? "Portada del reel" : `Lámina ${i + 1}`}`} className={`${vert ? "aspect-[9/16]" : "aspect-[4/5]"} ${ancho} shrink-0 snap-start bg-hueso object-cover shadow-[0_0_0_1px_rgba(26,24,22,.08)]`} />
      ))}
      {v.video && <video data-video src={`/material/${v.video}`} controls muted playsInline preload="metadata" className={`aspect-[9/16] ${chica ? "w-[min(46vw,190px)]" : "w-[min(62vw,300px)]"} shrink-0 snap-start bg-tinta object-cover`} />}
    </div>
  );
}

/** La nota de Mira frente a «qué es bueno». */
export function NotaFaro({ v }: { v: VersionPieza }) {
  if (v.nota === undefined) return null;
  return (
    <div data-nota={v.nota} className={`mt-3 max-w-xl rounded-xl px-3 py-2 text-[13px] ${v.nota >= 7 ? "bg-hueso/60" : "border border-[#e5341b]/50 bg-[#fff5f2]"}`}>
      <p><span className="text-[18px] tabular-nums">{v.nota}</span><span className="text-medio">/10 frente a «qué es bueno»{v.n > 1 ? ` · versión ${v.n}` : ""}</span></p>
      {v.motivos?.length ? <ul className="mt-1 grid gap-0.5 text-medio">{v.motivos.map((m, i) => <li key={i}>· {m}</li>)}</ul> : null}
    </div>
  );
}

/**
 * Para subir a Instagram: en el celular, la hoja de compartir con las imágenes (y el video) para «Guardar N elementos»;
 * el texto se copia aparte. En computadora, el .zip con todo.
 */
export function PaqueteFaro({ p, v }: { p: PiezaFaro; v: VersionPieza }) {
  const [estado, setEstado] = useState("");
  const puedeCompartir = typeof navigator !== "undefined" && "canShare" in navigator;
  async function guardar() {
    setEstado("Preparando…");
    try {
      const archivos: File[] = [];
      for (const [i, a] of v.laminas.entries()) { const b = await (await fetch(arteFaro(a))).blob(); archivos.push(new File([b], `${String(i + 1).padStart(2, "0")}.jpg`, { type: "image/jpeg" })); }
      if (v.video) { const b = await (await fetch(`/material/${v.video}`)).blob(); archivos.push(new File([b], "reel.mp4", { type: "video/mp4" })); }
      await navigator.clipboard.writeText(v.texto).catch(() => {});
      if (!navigator.canShare?.({ files: archivos })) { setEstado("Este navegador no deja guardar así: usa «Bajar todo (.zip)»."); return; }
      await navigator.share({ files: archivos });
      setEstado("Listo. El texto quedó copiado: pégalo al publicar.");
    } catch (e) {
      setEstado((e as Error).name === "AbortError" ? "" : "No se pudo. Usa «Bajar todo (.zip)».");
    }
  }
  async function copiar() { try { await navigator.clipboard.writeText(v.texto); setEstado("Texto copiado."); } catch { setEstado("No se pudo copiar. Mantén presionado el texto."); } }
  return (
    <div data-paquete className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
      {puedeCompartir && <button type="button" data-guardar-celular onClick={() => void guardar()} className="inline-flex min-h-11 items-center rounded-full bg-tinta px-5 text-[13px] text-white">Guardar en el celular</button>}
      <a data-bajar-zip href={`/estudio/contenido/faro/${p.id}/paquete`} className="inline-flex min-h-11 items-center text-[13px] underline underline-offset-4">Bajar todo (.zip)</a>
      <button type="button" data-copiar-faro onClick={() => void copiar()} className="inline-flex min-h-11 items-center text-[13px] underline underline-offset-4">Copiar el texto</button>
      {estado && <span role="status" className="text-[13px] text-medio">{estado}</span>}
    </div>
  );
}
