"use client";
// Copia un texto tal cual (sistema/99): el informe para mandárselo al cliente.
import { useState } from "react";

export function CopiarTexto({ texto, etiqueta = "Copiar", className = "" }: { texto: string; etiqueta?: string; className?: string }) {
  const [estado, setEstado] = useState<"" | "ok" | "mal">("");
  return (
    <button type="button" className={className} onClick={async () => {
      try { await navigator.clipboard.writeText(texto); setEstado("ok"); } catch { setEstado("mal"); }
      setTimeout(() => setEstado(""), 2500);
    }}>{estado === "ok" ? "Copiado" : estado === "mal" ? "No se pudo copiar" : etiqueta}</button>
  );
}
