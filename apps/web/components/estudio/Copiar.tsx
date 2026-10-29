"use client";

// Copiar un enlace con un toque (sistema/33): arma la dirección completa y avisa que quedó copiado.
import { useState } from "react";

export function Copiar({ ruta, texto = "Copiar enlace", className = "" }: { ruta: string; texto?: string; className?: string }) {
  const [listo, setListo] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        const url = new URL(ruta, location.origin).toString();
        try { await navigator.clipboard.writeText(url); } catch { prompt("Copia el enlace:", url); }
        setListo(true);
        setTimeout(() => setListo(false), 2200);
      }}
      className={className || "inline-flex min-h-11 items-center gap-2 rounded-full bg-tinta px-5 text-[13px] font-medium text-white transition hover:bg-black"}
      aria-live="polite"
    >
      {listo ? "✓ Copiado" : texto}
    </button>
  );
}
