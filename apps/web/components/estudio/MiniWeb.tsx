"use client";

// Miniatura de la web (sistema/42): la portada real a escala, sin poder tocarla.
import { useEffect, useRef, useState } from "react";

export function MiniWeb({ src, titulo = "Vista previa de la web" }: { src: string; titulo?: string }) {
  const caja = useRef<HTMLSpanElement>(null);
  const [escala, setEscala] = useState(0);
  useEffect(() => {
    const medir = () => setEscala((caja.current?.clientWidth ?? 0) / 1280);
    medir();
    const o = new ResizeObserver(medir);
    if (caja.current) o.observe(caja.current);
    return () => o.disconnect();
  }, []);
  return (
    <span ref={caja} className="relative block aspect-[16/10] overflow-hidden rounded-[10px] bg-white shadow-[0_0_0_1px_rgba(26,24,22,.08)]">
      {escala > 0 && (
        <iframe src={src} title={titulo} tabIndex={-1} aria-hidden sandbox="allow-scripts" loading="lazy"
          className="pointer-events-none absolute left-0 top-0 origin-top-left border-0"
          style={{ width: 1280, height: 800, transform: `scale(${escala})` }} />
      )}
    </span>
  );
}
