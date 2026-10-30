// La versión del estudio (sistema/34). Sube con cada «sistema/NN» que se fusiona.
export const VERSION = "0.50";

/** «29 oct, 10:42» en hora de Cuenca. */
export function horaBuild(iso = process.env.NEXT_PUBLIC_BUILD ?? "") {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  return new Date(t).toLocaleString("es-EC", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Guayaquil" });
}
