"use client";
// Vuelve a leer la página cada pocos segundos mientras algo trabaja en segundo plano (sistema/55: la calibración).
import { useRouter } from "next/navigation";
import { useEffect } from "react";
export function Refrescar({ cada = 6000 }: { cada?: number }) {
  const r = useRouter();
  useEffect(() => { const t = setInterval(() => r.refresh(), cada); return () => clearInterval(t); }, [r, cada]);
  return null;
}
