"use client";

// «Pruébala con tu color» (sistema/94): el negocio elige su color y toda la muestra cambia al instante.
// Tres formas: un color de la lista, el color de su logo (se calcula en su celular; el logo no se sube) o uno a mano.
// Lo que elige se guarda en su ficha, lo ve cuando vuelve y suena el celular de Jay y Luna la primera vez.
import { useEffect, useRef, useState } from "react";
import type { PlantillaMuestra, Tono } from "@anonymo/pipeline";
import { COLORES_PRUEBA, colorDeImagen, esColorDeMarca, paletaMuestra } from "@anonymo/pipeline/src/prospectos/paleta.ts";
import { varsDe } from "./colores";

export function ColorMuestra({ id, plantilla, tono, inicial }: { id: string; plantilla: PlantillaMuestra; tono: Tono; inicial?: string }) {
  const [elegido, setElegido] = useState<string | null>(inicial ?? null);
  const [aviso, setAviso] = useState("");
  const [leyendo, setLeyendo] = useState(false);
  const logo = useRef<HTMLInputElement>(null);
  const guardar = useRef<number | undefined>(undefined);
  const primera = useRef(true);

  // Pinta la página: las variables van en la muestra y en la raíz (el asistente vive fuera de la muestra).
  useEffect(() => {
    const vars = varsDe(paletaMuestra(plantilla, tono, elegido ?? undefined));
    for (const el of [document.querySelector<HTMLElement>("[data-muestra]"), document.documentElement]) {
      if (el) for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v);
    }
    if (primera.current) { primera.current = false; return; }
    // Se guarda el último que elige, no cada toque.
    window.clearTimeout(guardar.current);
    guardar.current = window.setTimeout(() => {
      void fetch(`/m/${id}/vista`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ accion: "color", color: elegido }), keepalive: true }).catch(() => {});
    }, 900);
  }, [elegido, id, plantilla, tono]);

  const decir = (t: string) => { setAviso(t); window.setTimeout(() => setAviso(""), 4000); };

  function aMano(valor: string) {
    const c = valor.toUpperCase();
    if (!esColorDeMarca(c)) return decir("Ese color es casi blanco, negro o gris. Elige uno con más color.");
    setElegido(c);
  }

  // El color del logo: se dibuja chiquito en el celular y se cuenta qué color se repite más.
  async function deLogo(archivo: File | undefined) {
    if (!archivo || !archivo.type.startsWith("image/")) return;
    setLeyendo(true);
    try {
      const img = await createImageBitmap(archivo);
      const lado = 64, lienzo = document.createElement("canvas");
      lienzo.width = lado; lienzo.height = lado;
      const ctx = lienzo.getContext("2d", { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0, lado, lado);
      const color = colorDeImagen(ctx.getImageData(0, 0, lado, lado).data);
      if (color) { setElegido(color); decir("Listo: tomamos el color de tu logo."); }
      else decir("No encontramos un color en tu logo. Elige uno de la lista.");
    } catch {
      decir("No pudimos abrir esa imagen. Prueba con otra.");
    } finally {
      setLeyendo(false);
      if (logo.current) logo.current.value = "";
    }
  }

  const circulo = "grid h-9 w-9 shrink-0 place-items-center rounded-full transition-transform active:scale-90";
  const marcado = (c: string | null) => (elegido === c ? "0 0 0 2px #fff, 0 0 0 4px #141414" : "inset 0 0 0 1px rgba(0,0,0,.12)");
  return (
    <div data-color-muestra className="sticky top-0 z-30 border-b border-black/10 bg-white/95 px-3 py-2 text-[#141414] backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="mx-auto flex max-w-5xl items-center gap-3">
        <p className="shrink-0 text-[13px] font-medium leading-tight">Pruébala<br className="sm:hidden" /> con tu color</p>
        <div role="radiogroup" aria-label="Color de tu web" className="-my-1 flex min-w-0 flex-1 items-center gap-2 overflow-x-auto px-1 py-1.5 [scrollbar-width:none]">
          <button type="button" role="radio" aria-checked={elegido === null} aria-label="Blanco y negro" title="Blanco y negro" onClick={() => setElegido(null)} className={circulo} style={{ background: "linear-gradient(135deg,#fff 50%,#141414 50%)", boxShadow: marcado(null) }} />
          {COLORES_PRUEBA.map((x) => (
            <button key={x.color} type="button" role="radio" aria-checked={elegido === x.color} aria-label={x.nombre} title={x.nombre} onClick={() => setElegido(x.color)} className={circulo} style={{ background: x.color, boxShadow: marcado(x.color) }} />
          ))}
          {elegido && !COLORES_PRUEBA.some((x) => x.color === elegido) && (
            <span role="radio" aria-checked="true" aria-label={`Tu color ${elegido}`} className={circulo} style={{ background: elegido, boxShadow: marcado(elegido) }} />
          )}
          <label className={`${circulo} relative cursor-pointer`} title="Otro color" style={{ background: "conic-gradient(#e53935,#fdd835,#43a047,#1e88e5,#8e24aa,#e53935)", boxShadow: "inset 0 0 0 1px rgba(0,0,0,.12)" }}>
            <span className="sr-only">Otro color</span>
            <input type="color" className="absolute inset-0 h-full w-full cursor-pointer opacity-0" value={elegido ?? "#1E5BC6"} onChange={(e) => aMano(e.target.value)} />
          </label>
        </div>
        <input ref={logo} type="file" accept="image/*" hidden aria-label="Elegir tu logo" onChange={(e) => void deLogo(e.target.files?.[0])} />
        <button type="button" onClick={() => logo.current?.click()} disabled={leyendo} className="min-h-11 shrink-0 rounded-full px-3.5 text-[13px] shadow-[inset_0_0_0_1px_rgba(0,0,0,.2)] disabled:opacity-60">
          {leyendo ? "Leyendo…" : "Desde mi logo"}
        </button>
      </div>
      {aviso && <p role="status" className="mx-auto mt-1 max-w-5xl text-[12.5px] text-[#3d3d3a]">{aviso}</p>}
    </div>
  );
}
