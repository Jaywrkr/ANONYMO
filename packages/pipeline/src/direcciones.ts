// Tres direcciones de diseño antes de construir (sistema/37).
// El agente de diseño (Orla) propone 3 caminos distintos en un formato fijo; la web los dibuja como maquetas,
// Jay, Luna o el cliente eligen uno y recién ahí se diseña y se construye todo con esa dirección.
import type { Direccion, Marca, Pedido } from "./tipos.ts";

const ESTILOS: Direccion["estilo"][] = ["editorial", "minimal", "audaz", "calido"];
const hexOk = (h: unknown) => typeof h === "string" && /^#[0-9a-f]{6}$/i.test(h.trim());
const txt = (x: unknown, max = 300) => (typeof x === "string" ? x.trim().slice(0, max) : "");
const fuente = (x: unknown) => txt(x, 40).replace(/[^\p{L}\p{N} ]/gu, "").trim();

/** Lo que se le pide al agente para proponer las direcciones. */
export const PEDIDO_DIRECCIONES = [
  "# Esta vez: 3 direcciones de diseño (todavía no el diseño completo)",
  "Propón exactamente 3 direcciones visuales para la web, claramente distintas entre sí (no tres variaciones de lo mismo).",
  "Si el cliente ya tiene marca, las tres la respetan: cambian composición, tipografía, ritmo y tono, no los colores de la marca.",
  "Para cada una escribe una sección «## Dirección N: <nombre>» con la idea, para quién funciona y qué se arriesga.",
  "Al final agrega un bloque ```json con un arreglo de 3 objetos, exactamente con esta forma:",
  '{"nombre":"…","idea":"una o dos frases","estilo":"editorial|minimal|audaz|calido","colores":[{"nombre":"…","hex":"#rrggbb"}],"tipografias":{"titulos":"Nombre en Google Fonts","texto":"Nombre en Google Fonts"},"tono":"…","portada":{"titular":"…","bajada":"…","boton":"…"},"seccion":{"titulo":"…","items":[{"titulo":"…","texto":"…"}]},"imagen":"qué foto iría en la portada"}',
  "Reglas del json: 3 a 5 colores con hex válido (el primero es el principal); tipografías que existan en Google Fonts; un estilo distinto en cada dirección; 3 items en la sección; textos reales para este cliente, en su idioma, cortos.",
].join("\n");

/** Saca las direcciones del bloque json de la entrega. Devuelve solo las que estén bien formadas. */
export function leerDirecciones(texto: string): Direccion[] {
  const bloques = [...texto.matchAll(/```json\s*([\s\S]*?)```/g)].map((m) => m[1]);
  for (const b of bloques.reverse()) {
    let datos: unknown;
    try { datos = JSON.parse(b); } catch { continue; }
    const lista = Array.isArray(datos) ? datos : (datos as { direcciones?: unknown[] })?.direcciones;
    if (!Array.isArray(lista)) continue;
    const ok = lista.map((d, i) => normalizar(d, i)).filter((d): d is Direccion => !!d);
    if (ok.length) return ok.slice(0, 3);
  }
  return [];
}

function normalizar(d: unknown, i: number): Direccion | undefined {
  if (!d || typeof d !== "object") return;
  const x = d as Record<string, unknown>;
  const colores = (Array.isArray(x.colores) ? x.colores : [])
    .map((c) => ({ nombre: txt((c as { nombre?: unknown })?.nombre, 40), hex: txt((c as { hex?: unknown })?.hex, 7).toLowerCase() }))
    .filter((c) => hexOk(c.hex))
    .slice(0, 5);
  const port = (x.portada ?? {}) as Record<string, unknown>;
  const sec = (x.seccion ?? {}) as Record<string, unknown>;
  const tip = (x.tipografias ?? {}) as Record<string, unknown>;
  const nombre = txt(x.nombre, 60);
  if (!nombre || colores.length < 2 || !txt(port.titular)) return;
  return {
    nombre,
    idea: txt(x.idea, 400),
    estilo: ESTILOS.includes(x.estilo as Direccion["estilo"]) ? (x.estilo as Direccion["estilo"]) : ESTILOS[i % ESTILOS.length],
    colores,
    tipografias: { titulos: fuente(tip.titulos) || "Fraunces", texto: fuente(tip.texto) || "Inter" },
    tono: txt(x.tono, 200),
    portada: { titular: txt(port.titular, 120), bajada: txt(port.bajada, 240), boton: txt(port.boton, 40) || "Conversemos" },
    seccion: {
      titulo: txt(sec.titulo, 80),
      items: (Array.isArray(sec.items) ? sec.items : []).slice(0, 3).map((it) => ({ titulo: txt((it as { titulo?: unknown })?.titulo, 60), texto: txt((it as { texto?: unknown })?.texto, 200) })),
    },
    imagen: txt(x.imagen, 200),
  };
}

/** La dirección elegida, en texto: todo el equipo la lee y la respeta. */
export const textoDireccion = (d?: Direccion) =>
  d
    ? [
        `# Dirección de diseño elegida: «${d.nombre}» (respétala; si un cambio la contradice, dilo)`,
        d.idea,
        `Estilo: ${d.estilo}. Tono: ${d.tono}.`,
        `Colores: ${d.colores.map((c) => `${c.nombre} ${c.hex}`).join(" · ")}`,
        `Tipografías: títulos ${d.tipografias.titulos}, texto ${d.tipografias.texto}.`,
        `Portada: «${d.portada.titular}» — ${d.portada.bajada} [${d.portada.boton}]. Imagen: ${d.imagen}`,
      ].join("\n")
    : "";

/** Tres direcciones de ejemplo para el motor simulado (con la marca del cliente si la hay). */
export function direccionesSimuladas(pedido: Pedido, marca?: Marca): Direccion[] {
  const deMarca = (marca?.colores ?? []).filter((c) => hexOk(c.hex));
  const base = (paleta: [string, string][]) => (deMarca.length >= 2 ? deMarca.slice(0, 4) : paleta.map(([nombre, hex]) => ({ nombre, hex })));
  const c = pedido.cliente;
  return [
    {
      nombre: "Serena", idea: `Calma y confianza: mucho aire, una tipografía con carácter y fotos reales de ${c}.`, estilo: "editorial",
      colores: base([["Bosque", "#1f3d36"], ["Arena", "#efe7da"], ["Salvia", "#9bb7a5"], ["Tinta", "#141414"]]),
      tipografias: { titulos: "Fraunces", texto: "Inter" }, tono: "Cercano y tranquilo.",
      portada: { titular: `${c}, con calma`, bajada: "Lo que haces, contado con claridad y sin ruido.", boton: "Agenda una cita" },
      seccion: { titulo: "Lo que hacemos", items: [{ titulo: "Primero", texto: "Te escuchamos." }, { titulo: "Después", texto: "Proponemos un plan claro." }, { titulo: "Siempre", texto: "Te acompañamos." }] },
      imagen: "Retrato con luz natural en el lugar de trabajo.",
    },
    {
      nombre: "Precisa", idea: "Minimalista y técnica: blanco, una línea de color y datos a la vista.", estilo: "minimal",
      colores: base([["Blanco", "#ffffff"], ["Azul", "#2347ff"], ["Gris", "#e9ebef"], ["Carbón", "#16181d"]]),
      tipografias: { titulos: "Space Grotesk", texto: "Inter" }, tono: "Directo y experto.",
      portada: { titular: "Hecho con precisión", bajada: `Todo lo que ${c} hace, en una página clara.`, boton: "Ver servicios" },
      seccion: { titulo: "Por qué nosotros", items: [{ titulo: "Experiencia", texto: "Años haciéndolo bien." }, { titulo: "Método", texto: "Pasos claros, sin sorpresas." }, { titulo: "Resultados", texto: "Lo medimos." }] },
      imagen: "Detalle de producto o herramienta sobre fondo limpio.",
    },
    {
      nombre: "Viva", idea: "Audaz y memorable: color pleno, tipografía grande y movimiento.", estilo: "audaz",
      colores: base([["Coral", "#ff5a3c"], ["Crema", "#fff4e8"], ["Noche", "#1b1532"], ["Sol", "#ffc83d"]]),
      tipografias: { titulos: "Syne", texto: "DM Sans" }, tono: "Seguro y con energía.",
      portada: { titular: `${c} se nota`, bajada: "Una presencia que nadie olvida.", boton: "Hablemos" },
      seccion: { titulo: "Lo que nos mueve", items: [{ titulo: "Idea", texto: "Algo que contar." }, { titulo: "Forma", texto: "Que se vea distinto." }, { titulo: "Ritmo", texto: "Que se sienta vivo." }] },
      imagen: "Foto con color fuerte y una persona en movimiento.",
    },
  ];
}
