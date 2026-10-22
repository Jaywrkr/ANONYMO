"use client";
// Día o noche (web/14): automático por la hora de Cuenca, o elegido a mano (se recuerda).
import { useSyncExternalStore } from "react";

export type ModoNoche = "auto" | "dia" | "noche";
const CLAVE = "anonymo-noche";
const oyentes = new Set<() => void>();
let modo: ModoNoche = "auto";

if (typeof window !== "undefined") {
  try {
    const g = localStorage.getItem(CLAVE);
    if (g === "dia" || g === "noche") modo = g;
  } catch {}
}

export function cambiarModo(m: ModoNoche) {
  modo = m;
  try {
    if (m === "auto") localStorage.removeItem(CLAVE);
    else localStorage.setItem(CLAVE, m);
  } catch {}
  oyentes.forEach((f) => f());
}

export const modoNoche = () => modo;

export function useModoNoche() {
  return useSyncExternalStore(
    (f) => {
      oyentes.add(f);
      return () => oyentes.delete(f);
    },
    () => modo,
    () => "auto" as ModoNoche,
  );
}
