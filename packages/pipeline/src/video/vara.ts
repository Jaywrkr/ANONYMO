// La revisión contra la vara (sistema/120): cada pieza del mes se dibuja y se mira al lado de las capturas de la vara
// del cliente (su trabajo real y lo que para ellos es bueno) y de su Dirección. Si no llega, Faro reescribe lo que va
// en el arte y el texto, se vuelve a dibujar y se vuelve a mirar, solo, hasta 2 veces. Lo que no se arregla con
// palabras (color, letra, composición de la plantilla) queda dicho en los motivos para Jay y Luna.
import { pedirEstructura } from "../ia.ts";
import { bloquesVara, type CapturaVara } from "../clientes/material.ts";
import type { FormatoPieza, Lamina, PlantillaArte } from "./contenido.ts";

/** Desde esta nota llega a la vara. */
export const NOTA_VARA = 7;
/** Cuántas veces se rehace sola una pieza que no llega. */
export const RONDAS_VARA = 2;

export interface VaraPieza {
  nota: number;
  llega: boolean;
  motivos: string[];
  /** Cuántas veces Faro la rehízo para llegar. */
  rehecha: number;
  /** Con cuántas capturas de la vara se comparó (0: solo con la Dirección escrita). */
  capturas: number;
  fecha: string;
}

export const SISTEMA_VARA = `Eres el director creativo de Unmake. Revisas una pieza de redes ya dibujada, al lado de la vara del cliente: capturas de su trabajo real y de lo que para ellos está bien hecho, más su Dirección (colores, letras, palabras, sí y no).
Pregúntate: ¿esto se ve y se lee al mismo nivel que la vara? ¿Respeta la Dirección? ¿Se entiende en un segundo en el celular? ¿Una sola idea, con aire, sin relleno?
Nota de 0 a 10, con exigencia real: 7 es «se puede publicar sin vergüenza al lado de la vara»; 9 es «está a la altura de su mejor trabajo».
Motivos: hasta 3, concretos, en frases cortas y simples, sin jerga (qué falla y dónde).
Si la nota es menor que ${NOTA_VARA}, reescribe lo que va en el arte (lamina) y, si hace falta, el texto, para que llegue. Mantén la idea y la plantilla. Títulos cortos (menos de 60 letras). No inventes datos del cliente.
Lo que no se arregla con palabras (color, letra, composición) dilo en los motivos.
Si la pieza es de una cuenta de portafolio (muestra trabajo), un texto largo o una frase de consejo es un error: reescríbelo al nombre del proyecto y qué se hizo.`;

const HERRAMIENTA_VARA = {
  nombre: "revisar_con_vara",
  descripcion: "La nota de la pieza frente a la vara del cliente y, si no llega, la versión reescrita.",
  esquema: {
    type: "object",
    properties: {
      nota: { type: "number", description: "0 a 10" },
      motivos: { type: "array", items: { type: "string" } },
      lamina: { type: "object", description: "Solo si la nota es menor que 7: lo que va escrito en el arte, reescrito.", properties: { antetitulo: { type: "string" }, titulo: { type: "string" }, bajada: { type: "string" }, tachado: { type: "string" }, numero: { type: "string" }, items: { type: "array", items: { type: "object", properties: { t: { type: "string" }, d: { type: "string" } }, required: ["t"] } }, cierre: { type: "string" } } },
      texto: { type: "string", description: "Solo si hay que reescribir el texto de la publicación." },
    },
    required: ["nota", "motivos"],
  },
};

const corto = (x: unknown, n: number) => (typeof x === "string" ? x.replace(/\s+/g, " ").trim().slice(0, n) : "");

/** Lo que devolvió la IA, limpio. Sin nota válida no sirve. */
export function leerRevisionVara(x: unknown): { nota: number; motivos: string[]; lamina?: Partial<Lamina>; texto?: string } | undefined {
  const r = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
  const nota = typeof r.nota === "number" ? r.nota : Number(r.nota);
  if (!Number.isFinite(nota) || nota < 0 || nota > 10) return undefined;
  const motivos = (Array.isArray(r.motivos) ? r.motivos : []).map((m) => corto(m, 200)).filter(Boolean).slice(0, 3);
  const l = (r.lamina && typeof r.lamina === "object" ? r.lamina : undefined) as Record<string, unknown> | undefined;
  const lamina: Partial<Lamina> = {};
  if (l) {
    for (const k of ["antetitulo", "titulo", "bajada", "tachado", "numero", "cierre"] as const) { const v = corto(l[k], k === "titulo" ? 120 : 300); if (v) lamina[k] = v; }
    if (Array.isArray(l.items)) { const items = l.items.map((i) => ({ t: corto((i as { t?: unknown })?.t, 120), d: corto((i as { d?: unknown })?.d, 300) || undefined })).filter((i) => i.t).slice(0, 8); if (items.length >= 3) lamina.items = items; }
  }
  const texto = typeof r.texto === "string" ? r.texto.trim().slice(0, 2200) : "";
  return { nota: Math.round(nota * 10) / 10, motivos, ...(Object.keys(lamina).length ? { lamina } : {}), ...(texto ? { texto } : {}) };
}

/** La lámina con lo reescrito encima: nunca se pierde la imagen del trabajo ni se deja el título vacío. */
export function aplicarLamina(l: Lamina, c: Partial<Lamina> | undefined): Lamina {
  if (!c) return l;
  return { ...l, ...c, titulo: c.titulo || l.titulo, imagen: l.imagen };
}

/** Mira el arte dibujado al lado de la vara. Sin clave de IA devuelve undefined. */
export async function revisarConVara(o: {
  arte: Buffer[]; vara: CapturaVara[]; direccion: string; nombre: string; enfoque?: string;
  pieza: { texto: string; plantilla?: PlantillaArte; formato: FormatoPieza; lamina: Lamina; idea: string };
}) {
  const contenido = [
    ...bloquesVara(o.vara),
    ...o.arte.slice(0, 2).flatMap((b, i) => [{ type: "text", text: `La pieza dibujada${o.arte.length > 1 ? `, lámina ${i + 1}` : ""}:` }, { type: "image", source: { type: "base64", media_type: "image/jpeg", data: b.toString("base64") } }]),
    { type: "text", text: [
      `## Cliente\n${o.nombre}`,
      o.enfoque === "portafolio" ? "## Enfoque\nPortafolio: la cuenta muestra su trabajo. Juzga cómo se presenta el trabajo (aire, recorte, que se vea de primer nivel), no el texto: el texto debe ser mínimo." : "",
      o.direccion.slice(0, 3000),
      o.vara.length ? "" : "## Vara\nNo hay capturas: compárala con la Dirección y con lo mejor de su rubro.",
      `## La pieza\nIdea: ${o.pieza.idea}\nFormato: ${o.pieza.formato} · plantilla «${o.pieza.plantilla ?? "frase"}»\nLo que va en el arte: ${JSON.stringify({ ...o.pieza.lamina, imagen: undefined })}\nTexto de la publicación:\n${o.pieza.texto}`,
    ].filter(Boolean).join("\n\n") },
  ];
  const r = await pedirEstructura(SISTEMA_VARA, contenido, HERRAMIENTA_VARA, 2500, { origen: "faro", tarea: "vara" });
  if (r === undefined) return undefined;
  const v = leerRevisionVara(r);
  if (!v) throw new Error("La revisión no devolvió una nota.");
  return v;
}
