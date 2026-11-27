// Pedidos que llegan del formulario de la web: quedan como solicitudes hasta que Jay o Luna las vuelven proyecto.
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { TipoPedido } from "@anonymo/agentes";
import { carpeta, existe } from "./almacen.ts";
import { avisar } from "./avisos.ts";
import type { Pedido } from "./tipos.ts";

export interface Solicitud { id: string; fecha: string; tipo: TipoPedido; nombre: string; correo: string; mensaje: string; origen: string }

const dirSolicitudes = () => join(carpeta(), "_solicitudes");
export const slug = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "cliente";

/**
 * ¿Es spam? (sistema/125). Los que venden posicionamiento en Google, «visibilidad», listados o enlaces escriben al
 * formulario como si fueran clientes. Devuelve el motivo, o nada si parece un pedido de verdad.
 */
export function esSpam(s: Pick<Solicitud, "nombre" | "correo" | "mensaje">): string | undefined {
  const t = `${s.nombre} ${s.mensaje}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const dominio = s.correo.toLowerCase().split("@")[1] ?? "";
  if (/unmake|anonymo/.test(dominio)) return "usa un correo que imita al estudio";
  const vende = /\b(seo|backlinks?|guest post|google (rank|ranking|rankings|search)|search (index|engine|results)|rank(ing)? (higher|first|top)|top (google|rankings?|positions?)|first page|online visibility|website'?s? visibility|boost (your|traffic)|more traffic|organic traffic|domain authority|link building|listing|list (your|unmake)|submit your (site|website)|web traffic|lead generation|marketing services?|digital marketing agency|crypto|bitcoin|casino|loan|investment opportunity|posicionamiento (seo|web|en google)|primeros lugares de google|trafico web)\b/.test(t);
  if (vende) return "vende posicionamiento, tráfico o listados";
  if (/(hello|hi|hey)( team)? (https?:\/\/)?(www\.)?unmake\.studio/.test(t)) return "saluda a la web, no a una persona";
  if ((s.mensaje.match(/https?:\/\//g) ?? []).length >= 3) return "trae muchos enlaces";
  return undefined;
}

const dirSpam = () => join(dirSolicitudes(), "spam");

/** Lo que ya llegó y es spam se aparta solo: no aparece en «Te toca» ni avisa. Devuelve cuántos apartó. */
export function apartarSpam(): number {
  if (!existsSync(dirSolicitudes())) return 0;
  let n = 0;
  for (const f of readdirSync(dirSolicitudes()).filter((x) => x.endsWith(".json"))) {
    const s = JSON.parse(readFileSync(join(dirSolicitudes(), f), "utf8")) as Solicitud;
    const motivo = esSpam(s);
    if (!motivo) continue;
    mkdirSync(dirSpam(), { recursive: true });
    writeFileSync(join(dirSpam(), f), JSON.stringify({ ...s, spam: motivo }, null, 2) + "\n");
    rmSync(join(dirSolicitudes(), f));
    n++;
  }
  return n;
}

/** Lo apartado como spam, por si alguna vez se cuela un pedido de verdad. */
export function listarSpam(): (Solicitud & { spam: string })[] {
  if (!existsSync(dirSpam())) return [];
  return readdirSync(dirSpam()).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(join(dirSpam(), f), "utf8")) as Solicitud & { spam: string }).sort((a, b) => b.fecha.localeCompare(a.fecha));
}

/** Guarda la solicitud y avisa. Devuelve el id. Lanza si no se puede escribir (por ejemplo, en un hosting sin disco). */
export async function guardarSolicitud(d: Omit<Solicitud, "id" | "fecha">): Promise<Solicitud> {
  const fecha = new Date().toISOString();
  const s: Solicitud = { ...d, id: `${fecha.slice(0, 10)}-${slug(d.nombre)}-${Math.random().toString(36).slice(2, 6)}`, fecha };
  // El spam se guarda aparte y no avisa (sistema/125).
  const motivo = esSpam(s);
  if (motivo) { mkdirSync(dirSpam(), { recursive: true }); writeFileSync(join(dirSpam(), `${s.id}.json`), JSON.stringify({ ...s, spam: motivo }, null, 2) + "\n"); return s; }
  mkdirSync(dirSolicitudes(), { recursive: true });
  writeFileSync(join(dirSolicitudes(), `${s.id}.json`), JSON.stringify(s, null, 2) + "\n");
  await avisar({ proyecto: "_solicitudes", cliente: d.nombre, tipo: "comentario", titulo: `Nueva solicitud: ${d.tipo}`, texto: `${d.nombre} <${d.correo}>\n\n${d.mensaje}`, enlace: `${process.env.ANONYMO_URL ?? "http://localhost:3000"}/estudio` });
  return s;
}

export function listarSolicitudes(): Solicitud[] {
  if (!existsSync(dirSolicitudes())) return [];
  return readdirSync(dirSolicitudes())
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(dirSolicitudes(), f), "utf8")) as Solicitud)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
}

/** Mueve la solicitud al archivo (convertida o descartada). */
export function archivarSolicitud(id: string) {
  const de = join(dirSolicitudes(), `${id}.json`);
  if (!existsSync(de)) throw new Error("La solicitud ya no existe.");
  mkdirSync(join(dirSolicitudes(), "archivo"), { recursive: true });
  renameSync(de, join(dirSolicitudes(), "archivo", `${id}.json`));
}

/** El pedido que sale de una solicitud (id único aunque el nombre se repita). */
export function pedidoDeSolicitud(s: Solicitud): Pedido {
  let id = slug(s.nombre);
  for (let i = 2; existe(id); i++) id = `${slug(s.nombre)}-${i}`;
  return { id, cliente: s.nombre, correo: s.correo, tipo: s.tipo, descripcion: s.mensaje, creado: new Date().toISOString() };
}
