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

export const etiqueta = "font-mono text-[12px] uppercase tracking-[0.14em] text-gris";
export const lateral = "px-[max(20px,env(safe-area-inset-left))] md:px-10";
export const boton =
  "inline-flex min-h-11 items-center rounded-full border border-tinta px-5 font-mono text-[12px] uppercase tracking-[0.12em] transition-colors hover:bg-tinta hover:text-hueso disabled:opacity-40";
export const botonLleno =
  "inline-flex min-h-11 items-center rounded-full bg-tinta px-5 font-mono text-[12px] uppercase tracking-[0.12em] text-hueso transition-transform hover:-translate-y-0.5";
export const campo = "w-full rounded-2xl border border-linea bg-papel p-3 text-[15px] outline-none focus:border-tinta";

export const ESTADO_PROYECTO: Record<string, string> = {
  plan: "Plan por aprobar",
  "en-curso": "En curso",
  esperando: "Espera tu decisión",
  listo: "Listo",
  parado: "Parado",
};
