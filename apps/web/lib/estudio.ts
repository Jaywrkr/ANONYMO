// El estudio es el panel interno de Jay y Luna.
// En tu máquina (npm run dev) se abre directo. En línea solo existe con ESTUDIO=1 y las claves configuradas,
// y siempre pide entrar (ver lib/sesion.ts): sin claves, la ruta ni siquiera existe.
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { COOKIE, leerSesion, sesionConfigurada, type Socio } from "./sesion";

const local = () => process.env.NODE_ENV === "development";

export const estudioActivo = () => local() || (process.env.ESTUDIO === "1" && sesionConfigurada());

/** El portal del cliente vive en el mismo servidor del estudio, o solo con PORTAL=1. */
export const portalActivo = () => process.env.PORTAL === "1" || estudioActivo();

/** En local sin claves se entra directo; con claves (o en línea) hay que entrar. */
const pideEntrar = () => !local() || sesionConfigurada();

/** Quién está en el estudio, o undefined si no entró (en local sin claves: "jay"). */
export async function quienEsta(): Promise<Socio | undefined> {
  if (!estudioActivo()) return;
  if (!pideEntrar()) return "jay";
  return leerSesion((await cookies()).get(COOKIE)?.value);
}

/** Para páginas y acciones del estudio: 404 si está apagado, a /entrar si no entraste. Devuelve quién es. */
export async function exigirEstudio(): Promise<Socio> {
  if (!estudioActivo()) notFound();
  const q = await quienEsta();
  if (!q) redirect("/entrar");
  return q;
}

// Piezas de estilo del estudio (sistema/32): frases en minúscula, botones redondos, una serifa para lo importante.
export const etiqueta = "text-[12px] text-suave";
export const lateral = "px-5 md:px-10";
export const boton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-5 text-[13px] font-medium text-tinta shadow-[inset_0_0_0_1px_var(--color-borde)] transition hover:shadow-[inset_0_0_0_1px_#cbc3b6] disabled:opacity-40";
export const botonLleno =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-tinta px-5 text-[13px] font-medium text-white transition hover:bg-black disabled:opacity-50";
export const botonSuave = "inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-[13px] text-medio underline-offset-4 transition hover:text-tinta hover:underline";
export const campo =
  "w-full rounded-xl bg-white px-3.5 py-3 text-[15px] text-tinta shadow-[inset_0_0_0_1px_var(--color-borde)] outline-none transition placeholder:text-[#b3ab9f] focus:shadow-[inset_0_0_0_1.5px_var(--color-tinta)]";
export const serif = "font-serif font-normal tracking-[-0.01em]";

export const ESTADO_PROYECTO: Record<string, string> = {
  plan: "Plan por aprobar",
  "en-curso": "En curso",
  esperando: "Espera tu decisión",
  listo: "Listo",
  parado: "Parado",
};
