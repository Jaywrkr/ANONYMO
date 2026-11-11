// La tanda de hoy (sistema/71 y 72): a quién escribirle hoy sin pasar del tope. Sin nada del servidor: la usan el escritorio y la tanda de celular.
import type { VistaProspecto } from "@/lib/clientes";

export const diaCuenca = (iso?: string | Date) => (iso ? new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Guayaquil" }) : "");

export function armarTanda(lista: VistaProspecto[], tope: number, ahora = new Date()) {
  const hoy = diaCuenca(ahora);
  const enviadosHoy = lista.filter((p) => diaCuenca(p.contactado) === hoy).length;
  const quedan = Math.max(0, tope - enviadosHoy);
  const propuestos = lista
    .filter((p) => p.estado === "nuevo" && p.revisada && p.whatsapp && p.puntaje >= 50)
    .sort((a, b) => b.puntaje - a.puntaje || (b.resenas ?? 0) - (a.resenas ?? 0))
    .slice(0, quedan);
  return { hoy, enviadosHoy, quedan, propuestos };
}

/** Los que abrieron su muestra hace menos de media hora: es el momento de llamarlos. */
export const MINUTOS_AHORA = 30;
export function viendoAhora(lista: VistaProspecto[], ahora = Date.now()) {
  return lista
    .filter((p) => p.ultimaVista && ahora - Date.parse(p.ultimaVista) < MINUTOS_AHORA * 60_000)
    .sort((a, b) => Date.parse(b.ultimaVista!) - Date.parse(a.ultimaVista!));
}
