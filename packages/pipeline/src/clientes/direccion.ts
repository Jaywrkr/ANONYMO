// La Dirección de cada cliente (sistema/117, fase 2): un solo lugar con su marca y lo que para él está bien hecho.
// La hacen Jay y Luna. Junta, en este orden de prioridad: 1) su guía de marca (PDF), 2) lo que dicen ustedes,
// 3) su web, 4) lo que deduce un agente. Todos los agentes la leen por la misma puerta (`textoDireccionCliente`) y lo que
// ustedes deciden al revisar queda en «aprendido». Lo leído de un PDF o de la web espera en «propuesta» hasta que
// alguien lo aprueba («esto entendí»).
import { pedirEstructura } from "../ia.ts";
import { direccionPermitida } from "./fuentes.ts";
import { contextoCliente, saberDe, type ClaveSaber } from "./saber.ts";

export type OrigenDir = "guia" | "ustedes" | "web" | "agente";
export const NOMBRE_ORIGEN_DIR: Record<OrigenDir, string> = { guia: "su guía de marca", ustedes: "ustedes", web: "su web", agente: "un agente" };
const PRIORIDAD: Record<OrigenDir, number> = { guia: 4, ustedes: 3, web: 2, agente: 1 };

export interface Color { hex: string; nombre?: string; origen: OrigenDir }
export interface Letra { familia: string; uso?: "títulos" | "texto"; origen: OrigenDir }
export interface LineaDir { texto: string; origen: OrigenDir }
export interface ReferenciaDir { url: string; nota?: string; origen: OrigenDir }
export interface Aprendido { texto: string; cuando: string; por: string; donde?: string }

/** Lo que se leyó de un PDF o de la web y espera que alguien lo apruebe. */
export interface PropuestaDireccion {
  desde: "guia" | "web";
  cuando: string;
  detalle?: string;
  colores: Omit<Color, "origen">[];
  letras: Omit<Letra, "origen">[];
  logo?: string;
  palabras: string[];
  si: string[];
  no: string[];
}

export interface DireccionCliente {
  colores: Color[];
  letras: Letra[];
  logo?: { url: string; origen: OrigenDir };
  /** Cómo se debe sentir, en 3 a 5 palabras. */
  palabras: LineaDir[];
  /** Lo que sí. */
  si: LineaDir[];
  /** Lo que no. */
  no: LineaDir[];
  /** Qué es bueno para este cliente: referencias de primer nivel elegidas por ustedes. */
  referencias: ReferenciaDir[];
  guia?: { nombre: string; subida: string; bytes: number };
  propuesta?: PropuestaDireccion;
  /** Lo que ustedes dijeron al aprobar o pedir cambios: los agentes lo leen antes de trabajar. */
  aprendido: Aprendido[];
  actualizada: string;
  por?: string;
}

export const direccionVacia = (): DireccionCliente => ({ colores: [], letras: [], palabras: [], si: [], no: [], referencias: [], aprendido: [], actualizada: new Date().toISOString() });

const limpio = (t: unknown, n = 200) => String(t ?? "").replace(/\s+/g, " ").trim().slice(0, n);
export const hexValido = (h: string) => /^#[0-9a-f]{6}$/i.test(h);
const hex6 = (h: string) => {
  const m = h.trim().toLowerCase().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (!m) return undefined;
  const x = m[1]!.length === 3 ? m[1]!.split("").map((c) => c + c).join("") : m[1]!;
  return `#${x}`;
};
const rgbAHex = (r: number, g: number, b: number) => `#${[r, g, b].map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0")).join("")}`;
const luz = (h: string) => { const n = parseInt(h.slice(1), 16); return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
const saturacion = (h: string) => { const n = parseInt(h.slice(1), 16), c = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; return (Math.max(...c) - Math.min(...c)) / 255; };

/** Familias de letra que no son de marca (las del sistema). */
const GENERICAS = /^(inherit|initial|unset|serif|sans-serif|monospace|cursive|system-ui|-apple-system|blinkmacsystemfont|ui-sans-serif|ui-serif|ui-monospace|segoe ui|roboto|helvetica neue|helvetica|arial|noto sans|apple color emoji|segoe ui emoji|segoe ui symbol|noto color emoji|var\(.*)$/i;

/**
 * La marca que se ve en una web: colores (por cuántas veces aparecen), letras (las que declara o carga de Google
 * Fonts) y el logo. Sin IA ni gasto: se lee el HTML y sus hojas de estilo.
 */
export function marcaDeWeb(html: string, css: string[], base: string): Omit<PropuestaDireccion, "desde" | "cuando" | "palabras" | "si" | "no"> {
  const todo = [html, ...css].join("\n");
  // Colores: hex y rgb(), contados. Se separan neutros (fondo y tinta) de los de acento.
  const cuenta = new Map<string, number>();
  for (const m of todo.matchAll(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi)) { const h = hex6(m[0]); if (h) cuenta.set(h, (cuenta.get(h) ?? 0) + 1); }
  for (const m of todo.matchAll(/rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/gi)) { const h = rgbAHex(+m[1]!, +m[2]!, +m[3]!); cuenta.set(h, (cuenta.get(h) ?? 0) + 1); }
  const orden = [...cuenta.entries()].sort((a, b) => b[1] - a[1]).map(([h]) => h);
  const neutros = orden.filter((h) => saturacion(h) < 0.12);
  const acentos = orden.filter((h) => saturacion(h) >= 0.12);
  const oscuro = neutros.find((h) => luz(h) < 0.25), claro = neutros.find((h) => luz(h) > 0.85);
  const colores = [
    ...acentos.slice(0, 3).map((hex, i) => ({ hex, nombre: i === 0 ? "principal" : "acento" })),
    ...(oscuro ? [{ hex: oscuro, nombre: "tinta" }] : []),
    ...(claro ? [{ hex: claro, nombre: "fondo" }] : []),
  ];
  // Letras: lo que pide a Google Fonts y lo que declaran font-family y @font-face.
  const familias = new Map<string, number>();
  for (const m of todo.matchAll(/fonts\.googleapis\.com\/css2?\?([^"'\s)>]+)/gi)) for (const f of m[1]!.split("&").filter((p) => p.startsWith("family="))) {
    const nombre = decodeURIComponent(f.slice(7).split(":")[0]!.replace(/\+/g, " ")).trim();
    if (nombre) familias.set(nombre, (familias.get(nombre) ?? 0) + 5);
  }
  for (const m of todo.matchAll(/font-family\s*:\s*([^;}"]+)/gi)) {
    const primera = m[1]!.split(",")[0]!.replace(/["']/g, "").trim();
    if (primera && !GENERICAS.test(primera) && primera.length < 40) familias.set(primera, (familias.get(primera) ?? 0) + 1);
  }
  const letras = [...familias.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([familia], i) => ({ familia, uso: (i === 0 ? "títulos" : "texto") as Letra["uso"] }));
  // Logo: una imagen o svg que se llame logo; si no, el ícono para iPhone o la imagen para compartir.
  const abs = (u: string) => { try { return new URL(u, base).toString(); } catch { return undefined; } };
  const imgLogo = html.match(/<img[^>]+(?:src|alt|class|id)=["'][^"']*logo[^"']*["'][^>]*>/i)?.[0];
  const srcLogo = imgLogo?.match(/src=["']([^"']+)["']/i)?.[1];
  const icono = html.match(/<link[^>]+rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i)?.[1] ?? html.match(/<link[^>]+href=["']([^"']+)["'][^>]*rel=["']apple-touch-icon["']/i)?.[1];
  const og = html.match(/<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1];
  const logo = [srcLogo, icono, og].map((u) => (u ? abs(u) : undefined)).find((u) => u && /^https?:/.test(u));
  return { colores, letras, logo };
}

/** Lee su web (la portada y hasta 4 hojas de estilo del mismo sitio) y devuelve lo que entendió de su marca. */
export async function leerMarcaWeb(direccion: string, f: typeof fetch = fetch, ms = 9000): Promise<PropuestaDireccion> {
  const url = /^https?:\/\//i.test(direccion) ? direccion : `https://${direccion}`;
  if (!direccionPermitida(url)) throw new Error("Esa dirección no se puede leer.");
  const r = await f(url, { signal: AbortSignal.timeout(ms), headers: { "user-agent": "Mozilla/5.0 (Unmake estudio)" } }).catch(() => undefined);
  if (!r?.ok) throw new Error("Su web no respondió. Revisa la dirección o vuelve a intentarlo.");
  const html = (await r.text()).slice(0, 600_000);
  const hojas = [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi)].map((m) => m[0].match(/href=["']([^"']+)["']/i)?.[1]).filter(Boolean) as string[];
  const css: string[] = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]!);
  for (const h of hojas.slice(0, 4)) {
    let u: URL;
    try { u = new URL(h, url); } catch { continue; }
    if (/fonts\.googleapis\.com/.test(u.host)) { css.push(`/* ${u} */`); continue; }
    if (u.host !== new URL(url).host || !direccionPermitida(u.toString())) continue;
    const c = await f(u.toString(), { signal: AbortSignal.timeout(ms) }).then((x) => (x.ok ? x.text() : "")).catch(() => "");
    css.push(c.slice(0, 400_000));
  }
  // Las hojas de Google Fonts se leen por su dirección (con las familias), no por su contenido.
  const marca = marcaDeWeb(html + "\n" + hojas.join("\n"), css, url);
  return { desde: "web", cuando: new Date().toISOString(), detalle: new URL(url).host, ...marca, palabras: [], si: [], no: [] };
}

const HERRAMIENTA_GUIA = {
  nombre: "leer_guia_de_marca",
  descripcion: "Lo que dice la guía de marca, tal cual. Sin inventar: si algo no está en la guía, se deja vacío.",
  esquema: {
    type: "object",
    properties: {
      colores: { type: "array", items: { type: "object", properties: { hex: { type: "string", description: "#rrggbb" }, nombre: { type: "string" } }, required: ["hex"] } },
      letras: { type: "array", items: { type: "object", properties: { familia: { type: "string" }, uso: { type: "string", enum: ["títulos", "texto"] } }, required: ["familia"] } },
      palabras: { type: "array", items: { type: "string" }, description: "Cómo debe sentirse la marca, en 3 a 5 palabras sueltas." },
      si: { type: "array", items: { type: "string" }, description: "Reglas de lo que sí se hace (uso del logo, tono, fotos…). Frases cortas." },
      no: { type: "array", items: { type: "string" }, description: "Lo que la guía prohíbe. Frases cortas." },
    },
    required: ["colores", "letras", "palabras", "si", "no"],
  },
};

/** Lee una guía de marca en PDF con la IA y devuelve «esto entendí» para aprobar. */
export async function leerGuiaPdf(pdf: Uint8Array, nombre: string, ctx: { cliente?: string } = {}): Promise<PropuestaDireccion> {
  if (!pdf.byteLength) throw new Error("El PDF está vacío.");
  if (pdf.byteLength > 20 * 1024 * 1024) throw new Error("El PDF pesa más de 20 MB. Sube una versión más liviana.");
  const datos = Buffer.from(pdf).toString("base64");
  const r = await pedirEstructura<{ colores?: { hex?: string; nombre?: string }[]; letras?: { familia?: string; uso?: string }[]; palabras?: string[]; si?: string[]; no?: string[] }>(
    "Eres directora de arte en Unmake. Lees la guía de marca de un cliente y anotas solo lo que dice: colores con su código, letras, cómo debe sentirse y las reglas de lo que sí y lo que no. No inventas nada.",
    [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: datos } }, { type: "text", text: `Guía de marca «${nombre}». Anota lo que dice.` }],
    HERRAMIENTA_GUIA, 2500, { origen: "mira", tarea: "guia-de-marca", proyecto: ctx.cliente },
  );
  if (!r) throw new Error("Para leer un PDF hace falta la IA, y no está configurada.");
  return {
    desde: "guia", cuando: new Date().toISOString(), detalle: nombre,
    colores: (r.colores ?? []).map((c) => ({ hex: hex6(String(c.hex ?? "")) ?? "", nombre: limpio(c.nombre, 40) || undefined })).filter((c) => c.hex).slice(0, 10),
    letras: (r.letras ?? []).map((l) => ({ familia: limpio(l.familia, 60), uso: l.uso === "texto" ? "texto" as const : l.uso === "títulos" ? "títulos" as const : undefined })).filter((l) => l.familia).slice(0, 4),
    palabras: (r.palabras ?? []).map((p) => limpio(p, 40)).filter(Boolean).slice(0, 6),
    si: (r.si ?? []).map((p) => limpio(p, 200)).filter(Boolean).slice(0, 12),
    no: (r.no ?? []).map((p) => limpio(p, 200)).filter(Boolean).slice(0, 12),
  };
}

/** Junta dos listas: lo de mayor prioridad gana y no se repite. */
function juntar<T extends { origen: OrigenDir }>(actual: T[], nuevos: T[], clave: (x: T) => string, max: number): T[] {
  const m = new Map<string, T>();
  for (const x of [...actual, ...nuevos]) {
    const k = clave(x).toLowerCase();
    const antes = m.get(k);
    if (!antes || PRIORIDAD[x.origen] > PRIORIDAD[antes.origen]) m.set(k, x);
  }
  return [...m.values()].sort((a, b) => PRIORIDAD[b.origen] - PRIORIDAD[a.origen]).slice(0, max);
}

/**
 * Aprueba lo que se leyó («esto entendí»). Lo de la guía manda; lo de la web solo llena lo que falta, sin pisar lo
 * que dijeron ustedes o la guía: si ya hay colores de la guía o de ustedes, los colores de la web no entran.
 */
export function aprobarPropuesta(d: DireccionCliente, por: string): DireccionCliente {
  const p = d.propuesta;
  if (!p) return d;
  const o: OrigenDir = p.desde === "guia" ? "guia" : "web";
  const manda = (lista: { origen: OrigenDir }[]) => lista.some((x) => PRIORIDAD[x.origen] > PRIORIDAD[o]);
  return {
    ...d,
    // Los colores y las letras son un juego: si llega uno de más peso, reemplaza al anterior entero.
    colores: manda(d.colores) || !p.colores.length ? d.colores : juntar(d.colores.filter((c) => PRIORIDAD[c.origen] > PRIORIDAD[o]), p.colores.map((c) => ({ ...c, origen: o })), (c) => c.hex, 8),
    letras: manda(d.letras) || !p.letras.length ? d.letras : juntar(d.letras.filter((l) => PRIORIDAD[l.origen] > PRIORIDAD[o]), p.letras.map((l) => ({ ...l, origen: o })), (l) => l.familia, 3),
    logo: p.logo && (!d.logo || PRIORIDAD[d.logo.origen] <= PRIORIDAD[o]) ? { url: p.logo, origen: o } : d.logo,
    palabras: juntar(d.palabras, p.palabras.map((texto) => ({ texto, origen: o })), (x) => x.texto, 6),
    si: juntar(d.si, p.si.map((texto) => ({ texto, origen: o })), (x) => x.texto, 16),
    no: juntar(d.no, p.no.map((texto) => ({ texto, origen: o })), (x) => x.texto, 16),
    propuesta: undefined,
    actualizada: new Date().toISOString(),
    por,
  };
}

/** Lo que escriben ustedes a mano: una línea por cosa. Reemplaza solo lo suyo; lo de la guía y la web queda. */
export interface EdicionDireccion { colores?: string; letras?: string; palabras?: string; si?: string; no?: string; referencias?: string }
const lineas = (t: string | undefined) => String(t ?? "").split(/\n|;/).map((x) => limpio(x, 200)).filter(Boolean);
export function editarDireccion(d: DireccionCliente, e: EdicionDireccion, por: string): DireccionCliente {
  const nuestro = <T extends { origen: OrigenDir }>(lista: T[], nuevos: T[] | undefined) => (nuevos === undefined ? lista : [...lista.filter((x) => x.origen !== "ustedes"), ...nuevos]);
  const refs = e.referencias === undefined ? undefined : lineas(e.referencias).map((l) => {
    const url = l.match(/https?:\/\/\S+/)?.[0];
    return url ? { url: url.slice(0, 300), nota: limpio(l.replace(url, "").replace(/^[\s—–-]+|[\s—–-]+$/g, ""), 160) || undefined, origen: "ustedes" as OrigenDir } : undefined;
  }).filter(Boolean) as ReferenciaDir[];
  return {
    ...d,
    colores: nuestro(d.colores, e.colores === undefined ? undefined : lineas(e.colores).map((l) => { const m = l.match(/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b|\b[0-9a-f]{6}\b/i)?.[0]; const h = m ? hex6(m) : undefined; return h ? { hex: h, nombre: limpio(l.replace(m!, "").replace(/^[\s—–:-]+/, ""), 40) || undefined, origen: "ustedes" as OrigenDir } : undefined; }).filter(Boolean) as Color[]).slice(0, 10),
    letras: nuestro(d.letras, e.letras === undefined ? undefined : lineas(e.letras).slice(0, 3).map((familia, i) => ({ familia: familia.slice(0, 60), uso: (i === 0 ? "títulos" : "texto") as Letra["uso"], origen: "ustedes" as OrigenDir }))),
    palabras: nuestro(d.palabras, e.palabras === undefined ? undefined : lineas(e.palabras).slice(0, 6).map((texto) => ({ texto: texto.slice(0, 40), origen: "ustedes" as OrigenDir }))),
    si: nuestro(d.si, e.si === undefined ? undefined : lineas(e.si).slice(0, 16).map((texto) => ({ texto, origen: "ustedes" as OrigenDir }))),
    no: nuestro(d.no, e.no === undefined ? undefined : lineas(e.no).slice(0, 16).map((texto) => ({ texto, origen: "ustedes" as OrigenDir }))),
    referencias: nuestro(d.referencias, refs?.slice(0, 12)),
    actualizada: new Date().toISOString(),
    por,
  };
}

/** Lo que dijeron al revisar queda en la Dirección (los últimos 30). */
export function anotarAprendido(d: DireccionCliente, texto: string, por: string, donde?: string): DireccionCliente {
  const t = limpio(texto, 300);
  if (!t) return d;
  return { ...d, aprendido: [{ texto: t, cuando: new Date().toISOString(), por, donde }, ...d.aprendido].slice(0, 30), actualizada: new Date().toISOString() };
}

/** Lo mínimo para decir que la Dirección existe: algo de marca y algo de qué es bueno. */
export function estadoDireccion(d: DireccionCliente | undefined): { marca: boolean; bueno: boolean; pendiente: boolean } {
  return { marca: !!d && (d.colores.length > 0 || d.letras.length > 0 || !!d.logo), bueno: !!d && (d.referencias.length > 0 || d.si.length > 0 || d.no.length > 0 || d.palabras.length > 0), pendiente: !!d?.propuesta };
}

/** La puerta única por la que todos los agentes leen la Dirección. Vacío si no hay nada. */
export function textoDireccionCliente(d: DireccionCliente | undefined): string {
  if (!d) return "";
  const de = (o: OrigenDir) => (o === "guia" ? " (guía)" : "");
  const partes = [
    d.palabras.length ? `Cómo debe sentirse: ${d.palabras.map((p) => p.texto).join(", ")}.` : "",
    d.colores.length ? `Colores: ${d.colores.map((c) => `${c.hex}${c.nombre ? ` ${c.nombre}` : ""}${de(c.origen)}`).join(", ")}.` : "",
    d.letras.length ? `Letras: ${d.letras.map((l) => `${l.familia}${l.uso ? ` para ${l.uso}` : ""}`).join(", ")}.` : "",
    d.si.length ? `Sí:\n${d.si.map((x) => `- ${x.texto}`).join("\n")}` : "",
    d.no.length ? `No:\n${d.no.map((x) => `- ${x.texto}`).join("\n")}` : "",
    d.referencias.length ? `Qué es bueno para este cliente (referencias que eligieron Jay y Luna; esa es la vara):\n${d.referencias.map((r) => `- ${r.url}${r.nota ? ` — ${r.nota}` : ""}`).join("\n")}` : "",
    d.aprendido.length ? `Lo que dijeron al revisar antes (no repetir esos errores):\n${d.aprendido.slice(0, 10).map((a) => `- ${a.texto}`).join("\n")}` : "",
  ].filter(Boolean);
  return partes.length ? `## La Dirección del cliente (manda sobre todo lo demás)\n${partes.join("\n")}` : "";
}

/** Lee una Dirección guardada sin confiar en su forma (viene de un JSON). */
export function direccionDe(x: unknown): DireccionCliente | undefined {
  if (!x || typeof x !== "object") return undefined;
  const o = x as Partial<DireccionCliente>;
  const arr = <T>(v: unknown) => (Array.isArray(v) ? (v as T[]) : []);
  return {
    colores: arr<Color>(o.colores).filter((c) => hexValido(c?.hex)),
    letras: arr<Letra>(o.letras).filter((l) => l?.familia),
    logo: o.logo?.url ? o.logo : undefined,
    palabras: arr<LineaDir>(o.palabras).filter((l) => l?.texto),
    si: arr<LineaDir>(o.si).filter((l) => l?.texto),
    no: arr<LineaDir>(o.no).filter((l) => l?.texto),
    referencias: arr<ReferenciaDir>(o.referencias).filter((r) => r?.url),
    guia: o.guia,
    propuesta: o.propuesta,
    aprendido: arr<Aprendido>(o.aprendido),
    actualizada: o.actualizada ?? new Date().toISOString(),
    por: o.por,
  };
}

/** Lo que se sabe del cliente más su Dirección, en un solo texto: así lo leen todos los agentes. */
export function contextoConDireccion(f: Parameters<typeof saberDe>[0] & { guardada?: { direccion?: DireccionCliente } }, claves: ClaveSaber[]): string {
  return [contextoCliente(saberDe(f), claves), textoDireccionCliente(f.guardada?.direccion)].filter(Boolean).join("\n\n");
}
