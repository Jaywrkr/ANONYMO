// Lo que el juez aprendió del banco de calibración (sistema/55): pesos de la rúbrica, ajustes a sus instrucciones
// y la corrección de su nota. Vive en _agencia/juez.json (pequeño): baja con cada vuelta de trabajo, como el criterio.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { carpeta } from "./almacen.ts";

export type DisciplinaBanco = "web" | "identidad" | "naming" | "contenido";
export const DISCIPLINAS_BANCO: DisciplinaBanco[] = ["web", "identidad", "naming", "contenido"];

/** Corrección lineal de la nota: calibrada = a + b · nota del juez (ajustada con el banco). */
export interface Mapa { a: number; b: number; n: number }
export interface EstadoJuez {
  revision: number;
  fecha?: string;
  /** Instrucciones extra que salieron de rondas de calibración anteriores (sesgos detectados). */
  ajustes: Partial<Record<DisciplinaBanco, string[]>>;
  /** Pesos de la rúbrica deducidos del banco: suman 10 por disciplina. */
  pesos: Partial<Record<DisciplinaBanco, Record<string, number>>>;
  mapas: Partial<Record<DisciplinaBanco, Mapa>>;
  /** Cómo se pasa de la suma de pesos cumplidos a la nota, según el banco: nota ≈ a + b · suma. */
  escalas?: Partial<Record<DisciplinaBanco, Mapa>>;
  /** Huella del banco con la que se calibró: si el banco cambia, hay que recalibrar. */
  huellaCalibrada?: string;
  /** Huella del banco con la que se calcularon los pesos. */
  huellaPesos?: string;
  ronda?: number;
}

const ruta = () => join(carpeta(), "_agencia", "juez.json");
export function leerJuez(): EstadoJuez {
  try { if (existsSync(ruta())) return JSON.parse(readFileSync(ruta(), "utf8")) as EstadoJuez; } catch {}
  return { revision: 0, ajustes: {}, pesos: {}, mapas: {} };
}
export function guardarJuez(cambio: (j: EstadoJuez) => void): EstadoJuez {
  const j = leerJuez();
  cambio(j);
  j.revision++;
  j.fecha = new Date().toISOString();
  mkdirSync(join(carpeta(), "_agencia"), { recursive: true });
  const tmp = ruta() + "." + randomUUID() + ".tmp";
  writeFileSync(tmp, JSON.stringify(j, null, 1));
  renameSync(tmp, ruta());
  return j;
}

const redondear = (x: number) => Math.round(x * 10) / 10;
/** La nota corregida con el mapa de su disciplina. Sin calibración, queda igual. */
export function corregir(d: DisciplinaBanco | undefined, nota: number): number | undefined {
  const m = d ? leerJuez().mapas[d] : undefined;
  if (!m) return undefined;
  return redondear(Math.max(0, Math.min(10, m.a + m.b * nota)));
}

/** El banco registra aquí cómo deducir la rúbrica en vivo (así el juez no depende de que alguien haya recalculado). */
let rubricaViva: ((d: DisciplinaBanco) => { pesos: Record<string, number>; escala?: Mapa }) | undefined;
export const registrarRubrica = (f: typeof rubricaViva) => { rubricaViva = f; };

/** Lo que el juez lee además de la escala: pesos del banco y ajustes de calibraciones anteriores. */
export function textoCalibrado(d: DisciplinaBanco | undefined, textos: Record<string, string>): string {
  if (!d) return "";
  const j = leerJuez();
  let viva: ReturnType<NonNullable<typeof rubricaViva>> | undefined;
  try { viva = rubricaViva?.(d); } catch {}
  const pesos = viva?.pesos ?? j.pesos[d];
  const partes: string[] = [];
  if (pesos && Object.keys(pesos).length) {
    const e = viva ? viva.escala : j.escalas?.[d];
    partes.push(`Pesos de la rúbrica deducidos del banco de calibración (suman 10). ${e ? `En el banco, la nota se acerca a ${Math.round(e.a * 10) / 10} + ${Math.round(e.b * 100) / 100} × (suma de los pesos de lo que cumple): una pieza correcta sin nada distintivo queda cerca de ${Math.round(e.a * 10) / 10}.` : "Una pieza correcta sin nada distintivo queda en 5–6."} Un recurso de plantilla de la lista mantiene el tope de 6.`);
    for (const [id, peso] of Object.entries(pesos).sort((x, y) => y[1] - x[1])) partes.push(`- oficio-${id} (${peso}): ${textos[id] ?? id}`);
  }
  const ajustes = j.ajustes[d];
  if (ajustes?.length) partes.push("Lo que aprendiste al compararte con piezas de nota conocida:", ...ajustes.map((x) => `- ${x}`));
  return partes.join("\n");
}
