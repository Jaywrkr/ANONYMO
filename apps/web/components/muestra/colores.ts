// Los colores de la muestra como variables de CSS (sistema/94): el servidor pone los del negocio y, si el negocio elige
// otro en su muestra, el navegador cambia solo las variables. Ningún componente usa el color directo.
import type { Paleta } from "@anonymo/pipeline/src/prospectos/paleta.ts";

const CLAVES = ["fondo", "tinta", "bloque", "sobreBloque", "acento", "sobreAcento", "suave", "texto", "linea"] as const;

/** Las variables de una paleta, para poner en `style`. */
export function varsDe(k: Paleta): Record<string, string> {
  return { ...Object.fromEntries(CLAVES.map((c) => [`--m-${c}`, k[c]])), "--m-cielo-0": k.cielo[0], "--m-cielo-1": k.cielo[1], "--m-cielo-2": k.cielo[2] };
}

/** La paleta que usan las plantillas: cada color es una variable. */
export const kVars: Paleta = {
  ...(Object.fromEntries(CLAVES.map((c) => [c, `var(--m-${c})`])) as Omit<Paleta, "cielo">),
  cielo: ["var(--m-cielo-0)", "var(--m-cielo-1)", "var(--m-cielo-2)"],
};

/** Igual, pero con el color de respaldo por si el elemento está fuera de la página (el asistente). */
export const kVarsCon = (k: Paleta): Paleta => ({
  ...(Object.fromEntries(CLAVES.map((c) => [c, `var(--m-${c}, ${k[c]})`])) as Omit<Paleta, "cielo">),
  cielo: [0, 1, 2].map((i) => `var(--m-cielo-${i}, ${k.cielo[i]})`) as [string, string, string],
});
