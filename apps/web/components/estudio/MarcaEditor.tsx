"use client";

// La marca del cliente (sistema/35): colores con su hex, fuentes y logo. Se ven, se copian y se editan aquí.
// «Sacar del logo» lee los colores de la imagen en el navegador; «Encontrados» son los hex que ya usó el equipo.
import { useMemo, useState } from "react";
import type { Marca } from "@anonymo/pipeline";
import { Enviar } from "@/app/estudio/nuevo/Enviar";
import { accionMarca } from "@/app/estudio/acciones";

type Color = { nombre: string; hex: string };
type Fuente = { nombre: string; uso: string };

const campo = "min-h-11 w-full rounded-xl bg-[#f6f3ee] px-3 text-[14px] outline-none focus:bg-white focus:shadow-[0_0_0_1.5px_#1a1816]";
const chico = "inline-flex min-h-9 items-center rounded-full bg-[#f1ede6] px-3 text-[13px] text-medio transition hover:bg-[#e9e3d9] hover:text-tinta";

const valido = (h: string) => /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(h.trim());
const normal = (h: string) => {
  const x = h.trim().replace("#", "").toLowerCase();
  return `#${x.length === 3 ? x.split("").map((c) => c + c).join("") : x}`;
};
const luz = (h: string) => {
  const x = normal(h).slice(1);
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16));
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};

/** Los colores principales de una imagen: cuantiza a 4 bits por canal y junta los más frecuentes y distintos. */
async function coloresDeImagen(url: string, cuantos = 6): Promise<string[]> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = url;
  await img.decode();
  const lado = 96;
  const c = document.createElement("canvas");
  const esc = Math.min(1, lado / Math.max(img.naturalWidth, img.naturalHeight));
  c.width = Math.max(1, Math.round(img.naturalWidth * esc));
  c.height = Math.max(1, Math.round(img.naturalHeight * esc));
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0, c.width, c.height);
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  const cubos = new Map<number, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 128) continue; // transparente
    const k = ((d[i] >> 4) << 8) | ((d[i + 1] >> 4) << 4) | (d[i + 2] >> 4);
    const x = cubos.get(k) ?? { n: 0, r: 0, g: 0, b: 0 };
    x.n++; x.r += d[i]; x.g += d[i + 1]; x.b += d[i + 2];
    cubos.set(k, x);
  }
  const lista = [...cubos.values()].sort((a, b) => b.n - a.n).map((x) => [x.r / x.n, x.g / x.n, x.b / x.n]);
  const elegidos: number[][] = [];
  for (const col of lista) {
    if (elegidos.every((e) => Math.hypot(e[0] - col[0], e[1] - col[1], e[2] - col[2]) > 48)) elegidos.push(col);
    if (elegidos.length >= cuantos) break;
  }
  return elegidos.map((e) => `#${e.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`);
}

export function MarcaEditor({ id, marca, imagenes, encontrados }: { id: string; marca?: Marca; imagenes: { nombre: string; nota?: string }[]; encontrados: { hex: string; de: string }[] }) {
  const [colores, setColores] = useState<Color[]>(marca?.colores ?? []);
  const [fuentes, setFuentes] = useState<Fuente[]>(marca?.fuentes ?? []);
  const [logo, setLogo] = useState(marca?.logo ?? "");
  const [copiado, setCopiado] = useState("");
  const [leyendo, setLeyendo] = useState(false);
  const [error, setError] = useState("");
  const tiene = useMemo(() => new Set(colores.map((c) => normal(c.hex))), [colores]);
  const urlArchivo = (n: string) => `/estudio/${id}/archivos/${encodeURIComponent(n)}`;

  const agregar = (hex: string, nombre = "") => {
    if (!valido(hex) || tiene.has(normal(hex))) return;
    setColores((cs) => [...cs, { nombre, hex: normal(hex) }].slice(0, 16));
  };
  const copiar = async (hex: string) => {
    try { await navigator.clipboard.writeText(hex); setCopiado(hex); setTimeout(() => setCopiado(""), 1400); } catch {}
  };
  const delLogo = async () => {
    if (!logo) return;
    setLeyendo(true); setError("");
    try {
      const hexes = await coloresDeImagen(urlArchivo(logo));
      // Fuera el blanco y el negro puro del fondo, salvo que sea lo único.
      const utiles = hexes.filter((h) => luz(h) < 0.96 && luz(h) > 0.04);
      (utiles.length ? utiles : hexes).forEach((h, i) => agregar(h, i === 0 ? "Principal" : ""));
    } catch {
      setError("No se pudo leer esa imagen. Prueba con un PNG o JPG.");
    } finally { setLeyendo(false); }
  };
  const sinUsar = encontrados.filter((e) => !tiene.has(normal(e.hex)));

  return (
    <form action={accionMarca} className="grid gap-5">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="motor" value="" />
      <input type="hidden" name="colores" value={JSON.stringify(colores)} />
      <input type="hidden" name="fuentes" value={JSON.stringify(fuentes)} />
      <input type="hidden" name="logo" value={logo} />

      {/* Colores */}
      <section className="rounded-[18px] bg-white p-5 shadow-[0_0_0_1px_rgba(26,24,22,.05)]">
        <div className="flex flex-wrap items-baseline gap-2">
          <h2 className="font-serif text-[26px] leading-none">Colores</h2>
          <span className="text-[13px] text-suave">Toca un color para copiar su hex. El primero manda: tiñe el proyecto.</span>
        </div>
        {colores.length === 0 ? (
          <p className="mt-4 text-[14px] text-medio">Todavía no hay colores. Agrégalos a mano, sácalos del logo o toma los que ya usó el equipo.</p>
        ) : (
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {colores.map((c, i) => (
              <li key={i} className="overflow-hidden rounded-[14px] shadow-[0_0_0_1px_rgba(26,24,22,.08)]">
                <button type="button" onClick={() => copiar(c.hex)} className="relative block h-24 w-full text-left" style={{ background: valido(c.hex) ? normal(c.hex) : "#eee" }} aria-label={`Copiar ${c.hex}`}>
                  <span className={`absolute bottom-2 left-3 font-mono text-[12px] ${valido(c.hex) && luz(c.hex) < 0.55 ? "text-white" : "text-tinta"}`}>{copiado === c.hex ? "¡Copiado!" : c.hex.toUpperCase()}</span>
                  {i === 0 && <span className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] ${valido(c.hex) && luz(c.hex) < 0.55 ? "bg-white/20 text-white" : "bg-black/10"}`}>principal</span>}
                </button>
                <div className="grid gap-1.5 bg-white p-2.5">
                  <input aria-label="Nombre del color" value={c.nombre} placeholder="Nombre (ej. Verde menta)" onChange={(e) => setColores((cs) => cs.map((x, j) => (j === i ? { ...x, nombre: e.target.value } : x)))} className="min-h-9 rounded-lg bg-[#f6f3ee] px-2 text-[13px] outline-none focus:bg-white focus:shadow-[0_0_0_1.5px_#1a1816]" />
                  <div className="flex items-center gap-1.5">
                    <input type="color" aria-label="Elegir color" value={valido(c.hex) ? normal(c.hex) : "#000000"} onChange={(e) => setColores((cs) => cs.map((x, j) => (j === i ? { ...x, hex: e.target.value } : x)))} className="h-9 w-9 shrink-0 cursor-pointer rounded-lg border-0 bg-transparent p-0" />
                    <input aria-label="Hex" value={c.hex} onChange={(e) => setColores((cs) => cs.map((x, j) => (j === i ? { ...x, hex: e.target.value } : x)))} className={`min-h-9 min-w-0 flex-1 rounded-lg bg-[#f6f3ee] px-2 font-mono text-[12px] outline-none ${valido(c.hex) ? "" : "text-[#a3260f]"}`} />
                    {i > 0 && <button type="button" title="Hacerlo el principal" onClick={() => setColores((cs) => [cs[i], ...cs.filter((_, j) => j !== i)])} className="h-9 w-9 shrink-0 rounded-lg text-[14px] text-suave hover:bg-[#f1ede6] hover:text-tinta">↑</button>}
                    <button type="button" aria-label="Quitar color" onClick={() => setColores((cs) => cs.filter((_, j) => j !== i))} className="h-9 w-9 shrink-0 rounded-lg text-[16px] text-suave hover:bg-[#fde8e4] hover:text-[#a3260f]">×</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" className={chico} onClick={() => setColores((cs) => [...cs, { nombre: "", hex: "#1a1816" }])}>+ Agregar color</button>
          {imagenes.length > 0 && <button type="button" disabled={!logo || leyendo} className={`${chico} disabled:opacity-50`} onClick={delLogo}>{leyendo ? "Leyendo el logo…" : logo ? "Sacar colores del logo" : "Elige el logo para sacar sus colores"}</button>}
          {error && <span className="text-[13px] text-[#a3260f]">{error}</span>}
        </div>
        {sinUsar.length > 0 && (
          <div className="mt-4 border-t border-[#f2eee8] pt-3">
            <p className="text-[12px] text-suave">Encontrados en las entregas del equipo · toca para agregar</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {sinUsar.slice(0, 18).map((e) => (
                <button type="button" key={e.hex} title={`De ${e.de}`} onClick={() => agregar(e.hex)} className="inline-flex min-h-9 items-center gap-2 rounded-full bg-[#f6f3ee] py-1 pl-1 pr-3 font-mono text-[12px] transition hover:bg-[#ece6dc]">
                  <i className="h-7 w-7 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,.08)]" style={{ background: e.hex }} /> {e.hex.toUpperCase()} <span className="font-sans text-suave">· {e.de}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Fuentes */}
      <section className="rounded-[18px] bg-white p-5 shadow-[0_0_0_1px_rgba(26,24,22,.05)]">
        <div className="flex flex-wrap items-baseline gap-2">
          <h2 className="font-serif text-[26px] leading-none">Fuentes</h2>
          <span className="text-[13px] text-suave">El nombre exacto, como aparece en Google Fonts o en el archivo.</span>
        </div>
        <ul className="mt-4 grid gap-2">
          {fuentes.map((x, i) => (
            <li key={i} className="grid gap-2 rounded-[14px] bg-[#faf8f4] p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-center">
              <input aria-label="Fuente" value={x.nombre} placeholder="Ej.: Instrument Serif" onChange={(e) => setFuentes((fs) => fs.map((y, j) => (j === i ? { ...y, nombre: e.target.value } : y)))} className={campo} />
              <input aria-label="Para qué" value={x.uso} placeholder="Para qué: títulos, texto…" onChange={(e) => setFuentes((fs) => fs.map((y, j) => (j === i ? { ...y, uso: e.target.value } : y)))} className={campo} />
              <button type="button" aria-label="Quitar fuente" onClick={() => setFuentes((fs) => fs.filter((_, j) => j !== i))} className="h-11 w-11 rounded-xl text-[16px] text-suave hover:bg-[#fde8e4] hover:text-[#a3260f]">×</button>
              {x.nombre && <p className="text-[22px] leading-tight sm:col-span-3" style={{ fontFamily: `"${x.nombre}", serif` }}>Aa — {x.nombre}</p>}
            </li>
          ))}
        </ul>
        <button type="button" className={`${chico} mt-3`} onClick={() => setFuentes((fs) => [...fs, { nombre: "", uso: fs.length ? "Texto" : "Títulos" }])}>+ Agregar fuente</button>
      </section>

      {/* Logo y notas */}
      <section className="grid gap-5 rounded-[18px] bg-white p-5 shadow-[0_0_0_1px_rgba(26,24,22,.05)] md:grid-cols-2">
        <div>
          <h2 className="font-serif text-[26px] leading-none">Logo</h2>
          {imagenes.length === 0 ? (
            <p className="mt-3 text-[14px] text-medio">Sube el logo en <a href={`/estudio/${id}?ver=archivos`} className="underline underline-offset-4">Archivos</a> y elígelo aquí.</p>
          ) : (
            <ul className="mt-3 grid grid-cols-3 gap-2">
              {imagenes.map((a) => (
                <li key={a.nombre}>
                  <button type="button" onClick={() => setLogo(logo === a.nombre ? "" : a.nombre)} aria-pressed={logo === a.nombre} className={`block w-full overflow-hidden rounded-xl bg-[#f4f1eb] transition ${logo === a.nombre ? "shadow-[0_0_0_2.5px_#1a1816]" : "shadow-[0_0_0_1px_rgba(26,24,22,.06)] hover:shadow-[0_0_0_1.5px_#8a8378]"}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={urlArchivo(a.nombre)} alt={a.nota ?? a.nombre} className="aspect-square w-full object-contain p-2" loading="lazy" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <label className="grid content-start gap-2">
          <span className="font-serif text-[26px] leading-none">Notas</span>
          <span className="text-[13px] text-suave">Lo que no se ve en un hex: «nunca el logo sobre fondo rojo», «tono cercano».</span>
          <textarea name="notas" rows={5} defaultValue={marca?.notas ?? ""} className="rounded-xl bg-[#f6f3ee] p-3 text-[14px] outline-none focus:bg-white focus:shadow-[0_0_0_1.5px_#1a1816]" />
        </label>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Enviar className="inline-flex min-h-12 items-center rounded-full bg-tinta px-7 text-[14px] font-medium text-white transition hover:bg-black" texto="Guardar la marca" trabajando="Guardando…" />
        <span className="text-[13px] text-suave">{colores.some((c) => !valido(c.hex)) ? "Hay un hex que no es válido: se quitará al guardar." : "Al guardar, el proyecto toma estos colores y el equipo los usa tal cual."}</span>
      </div>
    </form>
  );
}
