"use client";

// La primera vez que una ficha tiene web (sistema/109), lee su web sola: aprieta «Buscar datos» por ti, una vez.
// No gasta (se lee como texto). Después, se busca de nuevo solo a pedido.
import { useEffect } from "react";

export function BuscarSolo() {
  useEffect(() => {
    const boton = document.querySelector<HTMLButtonElement>("button[data-buscar-solo]");
    const clave = `buscar-solo:${location.pathname}`;
    try { if (sessionStorage.getItem(clave)) return; sessionStorage.setItem(clave, "1"); } catch {}
    boton?.form?.requestSubmit(boton);
  }, []);
  return <span role="status" className="w-full text-[12px] text-medio">Leyendo su web por primera vez…</span>;
}
