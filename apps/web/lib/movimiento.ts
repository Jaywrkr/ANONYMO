"use client";
// Movimiento reducido (web/07): respeta la preferencia del sistema y, además, un interruptor en la web.
import { useSyncExternalStore } from "react";

const CLAVE = "anonymo-quieto";
const oyentes = new Set<() => void>();

function leer(): boolean {
  if (typeof window === "undefined") return false;
  let guardado: string | null = null;
  try {
    guardado = localStorage.getItem(CLAVE);
  } catch {}
  if (guardado === "1") return true;
  if (guardado === "0") return false;
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}

let actual = false;
function aplicar() {
  actual = leer();
  if (typeof document !== "undefined") document.documentElement.toggleAttribute("data-quieto", actual);
  oyentes.forEach((f) => f());
}

if (typeof window !== "undefined") {
  aplicar();
  matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", aplicar);
}

/** Para código fuera de React (el bucle del 3D). */
export const estaQuieto = () => actual;

export function cambiarQuieto(valor: boolean) {
  try {
    localStorage.setItem(CLAVE, valor ? "1" : "0");
  } catch {}
  aplicar();
}

export function useQuieto() {
  return useSyncExternalStore(
    (f) => {
      oyentes.add(f);
      return () => oyentes.delete(f);
    },
    () => actual,
    () => false,
  );
}
