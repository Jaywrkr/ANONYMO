// La conversación de cada uno con Atlas (sistema/106): una sola, para todo el estudio.
// Vive en _atlas/<jay|luna>.json (en línea, en la nube). Jay no ve la de Luna ni Luna la de Jay.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { carpeta, leerRemoto, nubeActiva } from "@anonymo/pipeline";
import type { Tarjeta } from "./caja";
import { conNube } from "./nube";

export const CARPETA_ATLAS = "_atlas";
/** Lo que se guarda por persona: lo último, para que el archivo no crezca sin fin. */
const MAXIMO = 80;

/** Lo que Atlas entendió que hay que hacer: viaja en los botones para hacerlo sin volver a preguntar a la IA. */
export interface Eleccion {
  accion: string;
  cliente?: string;
  proyecto?: string;
  texto: string;
}

export interface MensajeHilo {
  id: string;
  fecha: string;
  de: "yo" | "atlas";
  texto?: string;
  tarjeta?: Tarjeta;
  /** Antes de gastar: qué va a hacer y el botón para confirmarlo. */
  confirmar?: { texto: string; eleccion: Eleccion };
  /** Una pregunta con respuestas para tocar. */
  opciones?: { texto: string; eleccion: Eleccion }[];
  error?: string;
  /** Dónde se completa lo que falta. */
  ficha?: string;
  /** Proyecto que quedó trabajando: la ventana muestra su avance en vivo. */
  seguir?: string;
  /** El cliente del que se habló: queda como contexto para lo siguiente. */
  cliente?: string;
  /** Qué entendió y cómo (para mostrarlo debajo de la respuesta). */
  entendi?: string;
}

const archivo = (quien: string) => join(carpeta(), CARPETA_ATLAS, `${quien}.json`);

function leerLocal(quien: string): MensajeHilo[] {
  try { return existsSync(archivo(quien)) ? (JSON.parse(readFileSync(archivo(quien), "utf8")) as MensajeHilo[]) : []; } catch { return []; }
}

/** La conversación guardada, sin bajar nada más. */
export async function leerHilo(quien: "jay" | "luna"): Promise<MensajeHilo[]> {
  if (!nubeActiva()) return leerLocal(quien);
  try { const t = await leerRemoto(CARPETA_ATLAS, `${quien}.json`); return t ? (JSON.parse(t) as MensajeHilo[]) : []; } catch { return []; }
}

/** Agrega mensajes a la conversación y la sube. Si ya estaba ese id (un reintento), no se duplica. */
export async function agregarHilo(quien: "jay" | "luna", nuevos: MensajeHilo[]) {
  await conNube([CARPETA_ATLAS], () => {
    const ya = leerLocal(quien);
    const ids = new Set(ya.map((m) => m.id));
    const todo = [...ya, ...nuevos.filter((m) => !ids.has(m.id))].slice(-MAXIMO);
    mkdirSync(join(carpeta(), CARPETA_ATLAS), { recursive: true });
    writeFileSync(archivo(quien), JSON.stringify(todo));
  });
}

/** Empezar de cero: la conversación queda vacía (los proyectos y las fichas no se tocan). */
export async function vaciarHilo(quien: "jay" | "luna") {
  await conNube([CARPETA_ATLAS], () => {
    mkdirSync(join(carpeta(), CARPETA_ATLAS), { recursive: true });
    writeFileSync(archivo(quien), "[]");
  });
}
