"use client";

// Barra de la vista para imprimir: descargar como PDF (el diálogo del navegador) y volver. No sale en el papel.
import { useEffect } from "react";

export function BotonImprimir({ volver, md, nombre }: { volver: string; md?: string; nombre?: string }) {
  useEffect(() => {
    document.title = nombre ?? document.title;
  }, [nombre]);
  const bajarMd = () => {
    if (!md) return;
    const url = URL.createObjectURL(new Blob([md], { type: "text/markdown;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.setAttribute("download", `${(nombre ?? "entrega").replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, " ").trim()}.md`);
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  return (
    <div className="no-imprimir fixed inset-x-0 top-0 z-50 flex flex-wrap items-center gap-2 bg-[#1a1816]/92 px-4 py-2.5 text-white backdrop-blur">
      <a href={volver} className="inline-flex min-h-10 items-center rounded-full px-3 text-[13px] text-white/70 hover:text-white">← Volver al estudio</a>
      <span className="hidden text-[12px] text-white/50 sm:inline">En el diálogo elige «Guardar como PDF».</span>
      <span className="ml-auto flex gap-2">
        {md && <button type="button" onClick={bajarMd} className="inline-flex min-h-10 items-center rounded-full bg-white/10 px-4 text-[13px] hover:bg-white/20">Texto (.md)</button>}
        <button type="button" onClick={() => window.print()} className="inline-flex min-h-10 items-center rounded-full bg-white px-5 text-[13px] font-medium text-[#1a1816]">Descargar PDF</button>
      </span>
    </div>
  );
}
