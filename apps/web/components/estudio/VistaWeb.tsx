"use client";

// La web funcionando dentro del estudio (sistema/42): escritorio, tablet o celular, a escala.
// Corre aislada (sandbox sin acceso a la sesión del estudio).
import { useEffect, useRef, useState } from "react";

const EQUIPOS = [
  { id: "escritorio", nombre: "Escritorio", ancho: 1440, alto: 900 },
  { id: "tablet", nombre: "Tablet", ancho: 820, alto: 1100 },
  { id: "celular", nombre: "Celular", ancho: 390, alto: 820 },
] as const;

export function VistaWeb({ base, paginas }: { base: string; paginas: string[] }) {
  const [equipo, setEquipo] = useState<(typeof EQUIPOS)[number]["id"]>("escritorio");
  const [pagina, setPagina] = useState(paginas[0] ?? "index.html");
  const [ancho, setAncho] = useState(0);
  const caja = useRef<HTMLDivElement>(null);
  const e = EQUIPOS.find((x) => x.id === equipo)!;
  useEffect(() => {
    const medir = () => setAncho(caja.current?.clientWidth ?? 0);
    medir();
    const o = new ResizeObserver(medir);
    if (caja.current) o.observe(caja.current);
    return () => o.disconnect();
  }, []);
  // El equipo se dibuja a su tamaño real y se escala para caber.
  const escala = ancho ? Math.min(1, (ancho - (equipo === "escritorio" ? 0 : 48)) / e.ancho) : 0.5;
  const src = `${base}/${pagina}`;
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-full bg-[#f1ede6] p-1" role="group" aria-label="Ver en">
          {EQUIPOS.map((x) => (
            <button key={x.id} type="button" onClick={() => setEquipo(x.id)} aria-pressed={equipo === x.id}
              className={`min-h-9 rounded-full px-4 text-[13px] transition ${equipo === x.id ? "bg-tinta text-white" : "text-medio hover:text-tinta"}`}>{x.nombre}</button>
          ))}
        </div>
        {paginas.length > 1 && (
          <label className="inline-flex items-center gap-2 text-[13px] text-medio">Página
            <select value={pagina} onChange={(ev) => setPagina(ev.target.value)} className="min-h-9 rounded-full bg-[#f1ede6] px-3 text-[13px] outline-none">
              {paginas.map((p) => <option key={p} value={p}>{p.replace(/\.html$/, "")}</option>)}
            </select>
          </label>
        )}
        <a href={src} target="_blank" rel="noreferrer" className="ml-auto inline-flex min-h-9 items-center rounded-full px-3 text-[13px] text-medio underline-offset-4 hover:text-tinta hover:underline">Abrir en otra pestaña ↗</a>
      </div>
      <div ref={caja} className={`relative overflow-hidden rounded-[18px] ${equipo === "escritorio" ? "bg-white shadow-[0_0_0_1px_rgba(26,24,22,.08)]" : "bg-[#ebe6dd] py-6"}`} style={{ height: e.alto * escala + (equipo === "escritorio" ? 0 : 48) }}>
        <div className={`mx-auto origin-top-left overflow-hidden ${equipo === "escritorio" ? "" : "rounded-[28px] shadow-[0_0_0_8px_#1a1816,0_20px_50px_-20px_rgba(0,0,0,.5)]"}`} style={{ width: e.ancho * escala, height: e.alto * escala }}>
          <iframe key={src + equipo} src={src} title="Vista previa de la web" sandbox="allow-scripts allow-forms allow-popups" loading="lazy"
            style={{ width: e.ancho, height: e.alto, transform: `scale(${escala})`, transformOrigin: "0 0", border: 0, background: "#fff" }} />
        </div>
      </div>
    </div>
  );
}
