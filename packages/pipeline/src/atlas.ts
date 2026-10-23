// Atlas: convierte un pedido en un plan.
// Con clave de Anthropic lee lo que contaron Jay o Luna y decide qué agentes trabajan (sistema/23);
// sin clave usa reglas por palabras clave. Regla de oro: solo trabaja quien hace falta, cada tarea cuesta.
import { agentePorId, FASES, PEDIDOS, type TipoPedido } from "@anonymo/agentes";
import { CONTRATOS, contratosDeFase, ordenar } from "./contratos.ts";
import type { Pausas, Pedido, Plan, TareaId } from "./tipos.ts";
import { PLANTILLAS, plantillaPorId } from "./plantillas.ts";
import { json, preguntarClaude } from "./ia.ts";

/** Lo que Atlas eligió: qué tareas entran y por qué; lo demás queda fuera con su razón. */
export interface Eleccion {
  tareas: TareaId[];
  razones?: Record<string, string>;
  fuera?: Record<string, string>;
  preguntas?: string[];
  resumen?: string;
  porIA?: boolean;
  sinIA?: string;
}

/** Pausas que Atlas propone por tipo: después de lo que el resto del trabajo usa como base. */
const PAUSAS_CLAVE: Record<Pedido["tipo"], number[]> = {
  web: [1, 4],
  marca: [1, 2, 3],
  lanzamiento: [1, 5],
  todo: [1, 2, 3, 4],
};

export function resolverPausas(p: Pausas | undefined, tipo: Pedido["tipo"], fases: number[]): number[] {
  if (p === "nunca") return [];
  if (p === "cada-fase") return [...fases];
  if (Array.isArray(p)) return p.filter((f) => fases.includes(f)).sort((a, b) => a - b);
  return PAUSAS_CLAVE[tipo].filter((f) => fases.includes(f));
}

/** Acepta "nunca", "cada-fase", "clave" o "1,4". */
export function leerPausas(texto: string): Pausas {
  const t = texto.trim().toLowerCase();
  if (t === "nunca" || t === "cada-fase" || t === "clave") return t;
  const nums = t.split(/[ ,]+/).map(Number).filter((n) => Number.isInteger(n) && n >= 1 && n <= 7);
  if (!nums.length) throw new Error(`Pausas no válidas: "${texto}". Usa nunca, cada-fase, clave o números como 1,4`);
  return nums;
}

export function planificar(pedido: Pedido, eleccion?: Eleccion): Plan {
  if (eleccion) return planElegido(pedido, eleccion);
  const base = PEDIDOS[pedido.tipo];
  const fases = new Set(base.fases);
  const razones: Record<number, string> = {};
  for (const f of base.fases) razones[f] = `Incluida en "${base.nombre.toLowerCase()}".`;

  // Sin marca, no hay sobre qué diseñar una web ni un lanzamiento.
  if (pedido.contexto?.tieneMarca === false && !fases.has(3) && pedido.tipo !== "marca") {
    fases.add(3);
    razones[3] = "El cliente no tiene marca: sin identidad, la web o el lanzamiento no tienen base.";
  }

  const lista = [...fases].sort((a, b) => a - b);
  for (const f of FASES) if (!fases.has(f.n)) razones[f.n] = "No aplica a este pedido.";

  // Tareas que no tienen sentido en este plan.
  const quitadas: Plan["quitadas"] = [];
  if (!fases.has(4) && fases.has(6)) quitadas.push({ id: "6.prisma", razon: "No hay web que auditar." });
  const fuera = new Set<TareaId>(quitadas.map((q) => q.id));
  const tareas = ordenar(lista).filter((id) => !fuera.has(id));

  return {
    pedido: pedido.id,
    fases: lista,
    razones,
    tareas,
    quitadas,
    pausas: resolverPausas(pedido.pausas, pedido.tipo, lista),
    preguntas: preguntasPor(pedido),
  };
}

/** Lo que falta saber del cliente, según lo que ya está en el contexto. */
function preguntasPor(pedido: Pedido): string[] {
  const c = pedido.contexto ?? {};
  const preguntas: string[] = [];
  if (!c.publico) preguntas.push("¿Quién es el cliente ideal? Edad, zona y qué busca.");
  if (!c.referencias?.length) preguntas.push("Tres marcas o webs que te gusten y por qué.");
  if (!c.plazo) preguntas.push("¿Para cuándo lo necesitas?");
  if (!c.presupuesto) preguntas.push("¿Qué rango de inversión tienes en mente?");
  if (c.tieneMarca === undefined && pedido.tipo !== "marca" && pedido.tipo !== "todo") preguntas.push("¿Ya tienes logo y colores?");

  // Las preguntas propias del rubro van primero.
  const pl = plantillaPorId(pedido.plantilla);
  if (pl) preguntas.unshift(...pl.preguntas);
  return preguntas;
}

const VALIDAS = new Set<string>(CONTRATOS.map((c) => c.id));

/** Plan con las tareas que eligió Atlas: las fases salen de las tareas; lo que no entra queda con su razón. */
function planElegido(pedido: Pedido, e: Eleccion): Plan {
  const elegidas = new Set(e.tareas.filter((t) => VALIDAS.has(t)));
  if (!elegidas.size) throw new Error("Atlas no eligió ninguna tarea válida.");
  const fases = [...new Set([...elegidas].map((t) => Number(t.split(".")[0])))].sort((a, b) => a - b);
  const todas = ordenar(fases);
  const razones: Record<number, string> = {};
  for (const f of FASES) razones[f.n] = fases.includes(f.n) ? e.razones?.[f.n] ?? "Entra por lo que pidió el cliente." : "No aplica a este pedido.";
  return {
    pedido: pedido.id,
    fases,
    razones,
    tareas: todas.filter((t) => elegidas.has(t)),
    quitadas: todas.filter((t) => !elegidas.has(t)).map((id) => ({ id, razon: e.fuera?.[id] ?? "No hace falta para este pedido." })),
    pausas: resolverPausas(pedido.pausas, pedido.tipo, fases),
    preguntas: (e.preguntas?.length ? e.preguntas : preguntasPor(pedido)).slice(0, 5),
    resumen: e.resumen,
    porIA: e.porIA,
    sinIA: e.sinIA,
  };
}

/** Lo que Atlas saca de un texto libre: datos del pedido y qué tareas entran. */
export interface Lectura {
  cliente?: string;
  tipo: TipoPedido;
  contexto: NonNullable<Pedido["contexto"]>;
  idioma?: "es" | "en";
  plantilla?: string;
  eleccion: Eleccion;
}

// Sin IA: palabras clave. Cada grupo enciende un tipo de pedido o un agente que si no, no trabaja.
const PALABRAS = {
  marca: /\b(logo|logotipo|marca|identidad|branding|isotipo|imagen corporativa)\b/i,
  // Naming solo si falta el nombre: «ya tiene nombre» no cuenta.
  naming: /(naming|sin nombre|no tiene nombre|(buscar|crear|necesita|nuevo|cambiar|elegir)( el| un)? nombre|nombre nuevo|c[oó]mo (se )?(va a )?llamar)/i,
  web: /\b(web|p[aá]gina|sitio|landing|tienda en l[ií]nea|e-?commerce)\b/i,
  lanzamiento: /\b(evento|lanzamiento|inauguraci[oó]n|fiesta|activaci[oó]n|campa[ñn]a)\b/i,
  sonido: /\b(sonido|audio|m[uú]sica|jingle|sonoro)\b/i,
  movimiento: /\b(anima|animaci[oó]n|movimiento|motion|interactiv)/i,
  tresD: /\b(3d|tridimensional|inmersiv)/i,
  video: /\b(video|v[ií]deo|reel|reels|tiktok)\b/i,
  foto: /\b(foto|fotos|fotograf[ií]a|sesi[oó]n|shooting)\b/i,
  redes: /\b(redes|instagram|facebook|tiktok|comunidad|contenido)\b/i,
  presencial: /\b(evento|inauguraci[oó]n|fiesta|activaci[oó]n|presencial)\b/i,
};

/** Qué entiende Atlas sin clave: reglas simples, pensadas para no encender agentes de más. */
export function leerSinIA(texto: string, cliente?: string): Lectura {
  const t = texto;
  const hay = (k: keyof typeof PALABRAS) => PALABRAS[k].test(t);
  const tipos = (["web", "marca", "lanzamiento"] as const).filter((k) => hay(k));
  const tipo: TipoPedido = tipos.length > 1 ? "todo" : tipos[0] ?? "web";
  const condicion: Partial<Record<TareaId, boolean>> = {
    "3.eco": hay("sonido"), "4.eco": hay("sonido"),
    "3.kine": hay("movimiento") || hay("video"), "4.kine": hay("movimiento"),
    "4.lumen": hay("tresD"),
    "5.corte": hay("video"), "5.lente": hay("foto"), "5.escena": hay("presencial"),
    "5.chispa": hay("redes"), "5.faro": hay("redes") || hay("lanzamiento"),
  };
  // La fase 2 (naming) solo si hace falta un nombre; la 7 es interna de la agencia.
  const fases = PEDIDOS[tipo].fases.filter((f) => (f === 2 ? hay("naming") : f !== 7));
  const todas = ordenar(fases);
  const tareas = todas.filter((id) => condicion[id] !== false);
  const fuera: Record<string, string> = {};
  for (const id of todas) if (!tareas.includes(id)) fuera[id] = "No se mencionó nada que lo necesite.";
  if (!fases.includes(4) && tareas.includes("6.prisma")) {
    tareas.splice(tareas.indexOf("6.prisma"), 1);
    fuera["6.prisma"] = "No hay web que auditar.";
  }
  const url = t.match(/https?:\/\/[^\s)>\]]+/g) ?? [];
  return {
    cliente,
    tipo,
    contexto: { referencias: url.length ? url : undefined },
    eleccion: { tareas, fuera, resumen: `${PEDIDOS[tipo].nombre} para ${cliente ?? "el cliente"} (reglas sin IA).`, porIA: false },
  };
}

/** El catálogo que Atlas tiene delante para elegir: una línea por tarea. */
const catalogo = () =>
  CONTRATOS.map((c) => `${c.id} · ${agentePorId(c.agente)?.nombre} — ${c.entrega}: ${c.objetivo}${c.interna ? " (interna de la agencia)" : ""}`).join("\n");

/**
 * Atlas lee lo que contaron Jay o Luna y decide qué agentes trabajan.
 * Con clave usa el modelo rápido (centavos por pedido); sin clave o si falla, reglas por palabras clave.
 */
export async function entenderPedido(texto: string, op: { cliente?: string; archivos?: string[] } = {}): Promise<Lectura> {
  // Sin IA: reglas, y queda anotado por qué (se ve en el plan y en los registros del servidor).
  const sinIA = (motivo: string) => {
    console.error(`[atlas] sin IA: ${motivo}`);
    const l = leerSinIA(texto, op.cliente);
    l.eleccion.sinIA = motivo;
    return l;
  };
  if (!process.env.ANTHROPIC_API_KEY) return sinIA("no hay ANTHROPIC_API_KEY en este servidor");
  let crudo: string | undefined;
  try {
    crudo = await preguntarClaude(
      [
        "Eres Atlas, el director de operaciones de una agencia creativa en Cuenca, Ecuador, dirigida por Jay y Luna.",
        "Lees lo que Jay o Luna cuentan después de hablar con un cliente y decides qué agentes trabajan.",
        "Regla de oro: cada tarea cuesta dinero. Solo entran las tareas cuya entrega el cliente necesita de verdad para lo que pidió. Nada «por si acaso».",
        "Ejemplos: si solo pide un logo, no trabajan web, video, evento ni sonido. Si pide una web y ya tiene marca, no se rehace la identidad. Si no pidió sonido, Eco no trabaja. Si no hay web, Prisma no audita.",
        "1.atlas (plan) y 1.ledger (presupuesto) entran casi siempre. 6.trofeo (jurado) entra si hay diseño o web que evaluar. La fase 7 es interna de la agencia: no la uses para un cliente.",
        "Responde SOLO con un objeto JSON, sin texto antes ni después.",
      ].join("\n"),
      [
        "# Tareas posibles (id · agente — entrega: objetivo)",
        catalogo(),
        "",
        `# Lo que contaron${op.cliente ? ` sobre ${op.cliente}` : ""}`,
        texto,
        op.archivos?.length ? `\n# Archivos que adjuntaron\n${op.archivos.map((a) => `- ${a}`).join("\n")}` : "",
        "",
        "# Formato de respuesta",
        JSON.stringify({
          cliente: "nombre del cliente o su negocio",
          tipo: "web | marca | lanzamiento | todo (lo más cercano)",
          resumen: "lo que entendiste del pedido, 1 o 2 frases",
          tareas: ["ids de las tareas que entran"],
          razones: { "4": "por qué entra cada fase, una línea" },
          fuera: { "4.eco": "por qué no trabaja, solo para tareas de las fases que entran" },
          preguntas: ["máximo 4: solo lo que de verdad falta para trabajar bien"],
          contexto: { rubro: "", ciudad: "", publico: "", plazo: "", presupuesto: "", url: "", referencias: ["enlaces o marcas"], tieneMarca: "true | false | null" },
          idioma: "es | en (idioma de las entregas para el cliente)",
          plantilla: `${PLANTILLAS.map((p) => p.id).join(" | ")} | null`,
        }),
      ].join("\n"),
      1800,
    );
  } catch (e) {
    return sinIA((e as Error).message);
  }
  type Crudo = {
    cliente?: string; tipo?: string; resumen?: string; tareas?: string[]; razones?: Record<string, string>; fuera?: Record<string, string>;
    preguntas?: string[]; contexto?: Record<string, unknown>; idioma?: string; plantilla?: string | null;
  };
  const r = json<Crudo>(crudo);
  if (!r?.tareas?.length) return sinIA(`la respuesta no trajo un plan válido: ${String(crudo).slice(0, 120)}`);
  const tareas = r.tareas.filter((t): t is TareaId => VALIDAS.has(t));
  if (!tareas.length) return sinIA("eligió tareas que no existen");
  const c = r.contexto ?? {};
  const txt = (v: unknown) => (typeof v === "string" && v.trim() && v.trim() !== "null" ? v.trim().slice(0, 200) : undefined);
  const tipo = (r.tipo && r.tipo in PEDIDOS ? r.tipo : "web") as TipoPedido;
  return {
    cliente: op.cliente || txt(r.cliente),
    tipo,
    contexto: {
      rubro: txt(c.rubro), ciudad: txt(c.ciudad), publico: txt(c.publico), plazo: txt(c.plazo), presupuesto: txt(c.presupuesto), url: txt(c.url),
      referencias: Array.isArray(c.referencias) ? c.referencias.map(txt).filter((x): x is string => !!x).slice(0, 12) : undefined,
      tieneMarca: c.tieneMarca === true || c.tieneMarca === "true" ? true : c.tieneMarca === false || c.tieneMarca === "false" ? false : undefined,
    },
    idioma: r.idioma === "en" ? "en" : undefined,
    plantilla: r.plantilla && plantillaPorId(r.plantilla) ? r.plantilla : undefined,
    eleccion: {
      tareas,
      razones: r.razones,
      fuera: r.fuera,
      preguntas: (r.preguntas ?? []).map(txt).filter((x): x is string => !!x).slice(0, 4),
      resumen: txt(r.resumen),
      porIA: true,
    },
  };
}

/** Cuántas tareas tiene cada fase del plan (para la sala y los resúmenes). */
export const tareasPorFase = (plan: Plan) =>
  Object.fromEntries(plan.fases.map((f) => [f, contratosDeFase(f).filter((c) => plan.tareas.includes(c.id)).length]));
