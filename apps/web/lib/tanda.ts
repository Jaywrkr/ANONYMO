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
  // Los recordatorios (sistema/80) van primero y no cuentan para el tope: son chats que ya existen.
  const seguimientos = lista.filter((p) => p.tocaSeguimiento && p.whatsappSeguimiento).sort((a, b) => (a.contactado ?? "").localeCompare(b.contactado ?? ""));
  return { hoy, enviadosHoy, quedan, propuestos, seguimientos };
}

/** Los que abrieron su muestra hace menos de media hora: es el momento de llamarlos. */
export const MINUTOS_AHORA = 30;

/** Los que aceptaron su propuesta o pidieron su web y todavía no son clientes: lo primero de la pantalla. */
export const calientes = (lista: VistaProspecto[]) => lista.filter((x) => (x.quiere || x.acepto) && x.estado !== "cliente" && x.estado !== "descartado")
  .sort((a, b) => Number(!!b.acepto) - Number(!!a.acepto));
export function viendoAhora(lista: VistaProspecto[], ahora = Date.now()) {
  return lista
    .filter((p) => p.ultimaVista && ahora - Date.parse(p.ultimaVista) < MINUTOS_AHORA * 60_000)
    .sort((a, b) => Date.parse(b.ultimaVista!) - Date.parse(a.ultimaVista!));
}
