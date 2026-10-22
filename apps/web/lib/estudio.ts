// El estudio es el panel interno de Jay y Luna. Solo existe en local o con ESTUDIO=1: nunca en la web pública.
import { notFound } from "next/navigation";

export const estudioActivo = () => process.env.ESTUDIO === "1" || process.env.NODE_ENV === "development";

/** El portal del cliente vive en el mismo servidor del estudio, o solo con PORTAL=1. */
export const portalActivo = () => process.env.PORTAL === "1" || estudioActivo();

export function exigirEstudio() {
  if (!estudioActivo()) notFound();
}

export const etiqueta = "font-mono text-[12px] uppercase tracking-[0.14em] text-gris";
export const lateral = "px-[max(20px,env(safe-area-inset-left))] md:px-10";
export const boton =
  "inline-flex min-h-11 items-center rounded-full border border-tinta px-5 font-mono text-[12px] uppercase tracking-[0.12em] transition-colors hover:bg-tinta hover:text-hueso disabled:opacity-40";
export const botonLleno =
  "inline-flex min-h-11 items-center rounded-full bg-tinta px-5 font-mono text-[12px] uppercase tracking-[0.12em] text-hueso transition-transform hover:-translate-y-0.5";
export const campo = "w-full rounded-2xl border border-linea bg-papel p-3 text-[15px] outline-none focus:border-tinta";

export const ESTADO_PROYECTO: Record<string, string> = {
  "en-curso": "En curso",
  esperando: "Espera tu decisión",
  listo: "Listo",
  parado: "Parado",
};
