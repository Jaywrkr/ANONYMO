// Calidad del 3D según el equipo: se decide una vez, antes de crear el lienzo.
export type Calidad = "alta" | "media" | "baja";

let actual: Calidad = "alta";

export function decidirCalidad(): Calidad {
  if (typeof window === "undefined") return actual;
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  const movil = window.innerWidth < 768 || matchMedia("(pointer: coarse)").matches;
  const debil = (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4;
  actual = nav.connection?.saveData ? "baja" : movil && debil ? "baja" : movil ? "media" : "alta";
  return actual;
}

export const calidad = () => actual;

/** Con ahorro de datos el 3D no se carga: se quedan los óvalos de respaldo. */
export const sin3D = () => typeof navigator !== "undefined" && !!(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
