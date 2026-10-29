"use client";

// Avisos flotantes (sistema/31): el resultado de cada acción aparece arriba a la derecha y se va solo.
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Fiesta } from "./Fiesta";

export function Avisos() {
  const params = useSearchParams();
  const ruta = usePathname();
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);
  const [fiesta, setFiesta] = useState(0);
  useEffect(() => {
    const ok = params.get("ok");
    const error = params.get("error");
    // En «Nuevo proyecto» el error se muestra junto al formulario.
    if ((!ok && !error) || ruta === "/estudio/nuevo") return;
    setAviso(error ? { tipo: "error", texto: error } : { tipo: "ok", texto: ok! });
    if (!error && params.get("fiesta") === "1") setFiesta(Date.now());
    // Se limpia la dirección para que recargar no repita el aviso.
    const u = new URL(location.href);
    u.searchParams.delete("ok");
    u.searchParams.delete("error");
    u.searchParams.delete("fiesta");
    history.replaceState(history.state, "", u.pathname + (u.search ? u.search : "") + u.hash);
    if (!error) {
      const t = setTimeout(() => setAviso(null), 6000);
      return () => clearTimeout(t);
    }
  }, [params, ruta]);
  useEffect(() => {
    if (!fiesta) return;
    const t = setTimeout(() => setFiesta(0), 3600);
    return () => clearTimeout(t);
  }, [fiesta]);
  if (!aviso) return fiesta ? <Fiesta key={fiesta} /> : null;
  return (
    <>
    {fiesta ? <Fiesta key={fiesta} /> : null}
    <div role={aviso.tipo === "error" ? "alert" : "status"} className="fixed right-4 top-4 z-[60] w-[min(420px,calc(100%-32px))]">
      <div className={`flex items-start gap-3 rounded-[16px] p-4 text-[14px] leading-snug shadow-[0_18px_44px_-14px_rgba(20,15,10,.45)] ${aviso.tipo === "error" ? "bg-[#fde8e4] text-[#7a1a0c] shadow-[0_0_0_1px_#f5c6bc]" : "bg-tinta text-white"}`}>
        <span aria-hidden className={`mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[12px] ${aviso.tipo === "error" ? "bg-[#b3260f] text-white" : "bg-vivo text-white"}`}>{aviso.tipo === "error" ? "!" : "✓"}</span>
        <p className="flex-1">{aviso.texto}</p>
        <button onClick={() => setAviso(null)} aria-label="Cerrar aviso" className="-m-2 h-11 w-11 shrink-0 rounded-full text-lg leading-none opacity-60 hover:opacity-100">×</button>
      </div>
    </div>
    </>
  );
}
