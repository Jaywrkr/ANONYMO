"use client";

// La pantalla de espera del departamento de video (sistema/62): bloquea, dice qué pasa, cuánto lleva y cuánto suele tardar.
import { useEffect, useState } from "react";

export const mmss = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, "0")}`;

export function Espera({ titulo, texto, avance, desde, estimado, aviso }: { titulo: string; texto?: string; avance?: number; desde: number; estimado?: number; aviso?: string }) {
  const [ahora, setAhora] = useState(desde);
  useEffect(() => {
    setAhora(Date.now());
    const t = setInterval(() => setAhora(Date.now()), 1000);
    document.documentElement.setAttribute("data-trabajando", "1");
    return () => { clearInterval(t); document.documentElement.removeAttribute("data-trabajando"); };
  }, []);
  const lleva = Math.round((ahora - desde) / 1000);
  const pasado = estimado && lleva > estimado * 1.5;
  return (
    <div role="alertdialog" aria-modal="true" aria-live="polite" aria-label={titulo} className="fixed inset-0 z-[80] grid place-items-center bg-[rgba(239,237,232,.72)] p-5 backdrop-blur-md">
      <div className="w-full max-w-md rounded-[22px] bg-white p-6 shadow-[0_20px_60px_rgba(18,18,20,.18)]">
        <div className="flex items-center gap-3">
          <span aria-hidden className="relative flex h-3 w-3"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-vivo opacity-60" /><span className="relative inline-flex h-3 w-3 rounded-full bg-vivo" /></span>
          <p className="text-[17px] font-medium">{titulo}</p>
        </div>
        {texto && <p className="mt-2 text-[14px] text-medio">{texto}…</p>}
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-hueso" aria-hidden>
          {avance !== undefined ? <div className="h-full rounded-full bg-tinta transition-[width] duration-700" style={{ width: `${Math.max(4, Math.round(avance * 100))}%` }} /> : <div className="h-full w-1/3 animate-pulse rounded-full bg-tinta/60" />}
        </div>
        <p className="mt-3 flex justify-between text-[13px] text-suave">
          <span>Lleva {mmss(lleva)}</span>
          {avance !== undefined && <span className="font-mono">{Math.round(avance * 100)} %</span>}
          {estimado ? <span>Suele tardar {mmss(estimado)}</span> : null}
        </p>
        {pasado && <p className="mt-3 rounded-xl bg-hueso px-3 py-2 text-[13px] text-medio">Está tardando más de lo normal, pero sigue trabajando. Si pasan 6 minutos sin cambios, se libera solo.</p>}
        <p className="mt-4 text-[13px] text-medio">{aviso ?? "Puedes esperar aquí. No hace falta tocar nada."}</p>
      </div>
    </div>
  );
}
