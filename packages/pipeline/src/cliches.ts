// La lista de clichés del estudio (sistema/124): los de base más los que agregan Jay y Luna («cliché: …» en el chat).
// La leen Nova en el sparring, Faro al diseñar y la revisión al juzgar.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { carpeta } from "./almacen.ts";
import { leerSuelto, nubeActiva, subirSuelto } from "./nube.ts";
import { CLICHES_BASE } from "./fichas-agentes.ts";

interface Lista { actualizado: string; cliches: { texto: string; por: string; fecha: string }[] }
const REL = "_contenido/lista/cliches.json";
const local = () => join(carpeta(), REL);

async function leer(): Promise<Lista> {
  let t: string | undefined;
  if (nubeActiva()) { const b = await leerSuelto(REL).catch(() => undefined); t = b ? Buffer.from(b).toString("utf8") : undefined; }
  else if (existsSync(local())) t = readFileSync(local(), "utf8");
  const l = t ? (JSON.parse(t) as Lista) : undefined;
  return { actualizado: l?.actualizado ?? "", cliches: l?.cliches ?? [] };
}

/** Todos los clichés: los de base y los agregados (los más nuevos primero, hasta 40). */
export async function leerCliches(): Promise<string[]> {
  const l = await leer().catch(() => ({ cliches: [] as Lista["cliches"] }));
  return [...l.cliches.map((c) => c.texto), ...CLICHES_BASE].slice(0, 40);
}

export async function agregarCliche(texto: string, por: string): Promise<number> {
  const t = texto.replace(/\s+/g, " ").trim().slice(0, 200);
  if (t.length < 4) throw new Error("Escribe el cliché en una frase.");
  const l = await leer();
  if (!l.cliches.some((c) => c.texto.toLowerCase() === t.toLowerCase())) l.cliches.unshift({ texto: t, por, fecha: new Date().toISOString() });
  l.cliches = l.cliches.slice(0, 60);
  l.actualizado = new Date().toISOString();
  const json = JSON.stringify(l, null, 1);
  if (nubeActiva()) await subirSuelto(REL, new TextEncoder().encode(json), "application/json");
  else { mkdirSync(join(carpeta(), "_contenido", "lista"), { recursive: true }); writeFileSync(`${local()}.tmp`, json); renameSync(`${local()}.tmp`, local()); }
  return l.cliches.length + CLICHES_BASE.length;
}
