// Pedidos que llegan del formulario de la web: quedan como solicitudes hasta que Jay o Luna las vuelven proyecto.
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { TipoPedido } from "@anonymo/agentes";
import { CARPETA, existe } from "./almacen.ts";
import { avisar } from "./avisos.ts";
import type { Pedido } from "./tipos.ts";

export interface Solicitud { id: string; fecha: string; tipo: TipoPedido; nombre: string; correo: string; mensaje: string; origen: string }

const carpeta = () => join(CARPETA, "_solicitudes");
export const slug = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "cliente";

/** Guarda la solicitud y avisa. Devuelve el id. Lanza si no se puede escribir (por ejemplo, en un hosting sin disco). */
export async function guardarSolicitud(d: Omit<Solicitud, "id" | "fecha">): Promise<Solicitud> {
  const fecha = new Date().toISOString();
  const s: Solicitud = { ...d, id: `${fecha.slice(0, 10)}-${slug(d.nombre)}-${Math.random().toString(36).slice(2, 6)}`, fecha };
  mkdirSync(carpeta(), { recursive: true });
  writeFileSync(join(carpeta(), `${s.id}.json`), JSON.stringify(s, null, 2) + "\n");
  await avisar({ proyecto: "_solicitudes", cliente: d.nombre, tipo: "comentario", titulo: `Nueva solicitud: ${d.tipo}`, texto: `${d.nombre} <${d.correo}>\n\n${d.mensaje}`, enlace: `${process.env.ANONYMO_URL ?? "http://localhost:3000"}/estudio` });
  return s;
}

export function listarSolicitudes(): Solicitud[] {
  if (!existsSync(carpeta())) return [];
  return readdirSync(carpeta())
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(carpeta(), f), "utf8")) as Solicitud)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
}

/** Mueve la solicitud al archivo (convertida o descartada). */
export function archivarSolicitud(id: string) {
  const de = join(carpeta(), `${id}.json`);
  if (!existsSync(de)) throw new Error("La solicitud ya no existe.");
  mkdirSync(join(carpeta(), "archivo"), { recursive: true });
  renameSync(de, join(carpeta(), "archivo", `${id}.json`));
}

/** El pedido que sale de una solicitud (id único aunque el nombre se repita). */
export function pedidoDeSolicitud(s: Solicitud): Pedido {
  let id = slug(s.nombre);
  for (let i = 2; existe(id); i++) id = `${slug(s.nombre)}-${i}`;
  return { id, cliente: s.nombre, correo: s.correo, tipo: s.tipo, descripcion: s.mensaje, creado: new Date().toISOString() };
}
