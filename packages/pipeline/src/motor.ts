// Quién escribe cada entrega. Sin clave: modo simulado (estructura y checklist). Con ANTHROPIC_API_KEY: el agente de verdad.
import { claveAnthropic, ocultarClaves, pensamiento, sinPensar, textoDe } from "./ia.ts";
import { pedirEnVivo } from "./envivo.ts";
import { direccionesSimuladas, leerDirecciones, PEDIDO_DIRECCIONES, textoDireccion } from "./direcciones.ts";
import { leerArchivosSitio, PEDIDO_SITIO, sinArchivos, sitioSimulado } from "./sitio.ts";
import { COMO_TRABAJAMOS, tarifaHora } from "./agencia.ts";
import { agentePorId, FASES } from "@anonymo/agentes";
import { contratoPorId } from "./contratos.ts";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { carpeta } from "./almacen.ts";
import { usd, type Uso } from "./costo.ts";
import { archivoEntrega, type Direccion, type Entrega, type Marca, type Pedido, type ResultadoHerramienta, type TareaId } from "./tipos.ts";

export interface Contexto {
  pedido: Pedido;
  tarea: TareaId;
  /** Entregas que el contrato dice que debe leer. */
  lecturas: Entrega[];
  /** Nota de "cambiar" de Jay o Luna, si se está rehaciendo. */
  cambio?: string;
  version: number;
  preguntas: string[];
  /** Lo que ya trajeron las herramientas (dominios, auditoría...). */
  herramientas: ResultadoHerramienta[];
  /** Todo lo que ha dicho el cliente, en orden. Manda sobre las suposiciones del equipo. */
  cliente: string[];
  /** Lo que el equipo ya sabe del rubro (plantilla), para este agente. */
  consejos?: string[];
  /** Archivos del cliente: nombre, nota y, si es imagen, ruta en disco para mostrársela al agente. */
  archivos?: { nombre: string; nota?: string; ruta?: string; tipo: string }[];
  /** Colores, fuentes y logo del cliente, si ya están definidos. */
  marca?: Marca;
  /** Lo que el agente ya escribió en una vuelta anterior que se quedó sin tiempo: sigue desde ahí (sistema/36). */
  parcial?: string;
  /** Hora límite (ms) de esta vuelta: antes de pasarla, el agente guarda lo que lleva y devuelve «pendiente». */
  plazo?: number;
  /** Señal de vida mientras trabaja: qué hace y cuántas palabras lleva. */
  latido?: (x: Latido) => void;
  /**
   * Ir directo a escribir (sistema/39): sin buscar en la web y pensando poco. Se usa cuando una vuelta anterior
   * se fue entera en pensar y buscar sin escribir nada, para que esta sí entregue.
   */
  directo?: boolean;
  /** «proponer»: esta vez propone 3 direcciones de diseño; o la dirección ya elegida, que todos respetan (sistema/37). */
  direccion?: "proponer" | Direccion;
}

/** Qué está haciendo un agente en este momento (sistema/36). */
export interface Latido {
  fase: "preparando" | "esperando" | "pensando" | "buscando" | "escribiendo";
  palabras: number;
}

/** La marca del cliente en texto, para que todos la usen tal cual. */
export const textoMarca = (m?: Marca) =>
  m && (m.colores.length || m.fuentes.length)
    ? ["# Marca del cliente (úsala tal cual; no inventes otros colores ni fuentes)",
        m.colores.length ? "Colores: " + m.colores.map((c) => `${c.nombre} ${c.hex}`).join(" · ") : "",
        m.fuentes.length ? "Fuentes: " + m.fuentes.map((f) => `${f.nombre} (${f.uso})`).join(" · ") : "",
        m.logo ? `Logo: archivo ${m.logo}` : "",
        m.notas ? `Notas: ${m.notas}` : ""].filter(Boolean).join("\n")
    : "";

export type Resultado = Pick<Entrega, "dice" | "necesita" | "contenido" | "nota" | "modo" | "datos"> & {
  uso?: Uso;
  /** Se acabó el tiempo de la vuelta: lo escrito hasta ahora, para seguir en la próxima (sistema/36). */
  pendiente?: string;
  /** Los archivos de la web, si la entrega es un sitio (sistema/42). */
  sitio?: Record<string, string>;
};

const seccionHerramientas = (h: ResultadoHerramienta[]) =>
  h.length ? ["## Datos de herramientas", "", ...h.flatMap((x) => [`**${x.herramienta}** ${x.ok ? "" : "(pendiente)"}`, "", x.resumen, ""])] : [];
const datosHerramientas = (h: ResultadoHerramienta[]) =>
  Object.fromEntries(h.filter((x) => x.datos !== undefined).map((x) => [x.herramienta, x.datos]));

export interface Motor {
  nombre: "simulado" | "real" | "manual";
  trabajar(ctx: Contexto): Promise<Resultado>;
}

function semilla(texto: string) {
  let h = 2166136261;
  for (const c of texto) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0) / 4294967295;
}

const TXT = {
  es: { modo: (n: string) => `> Modo simulado. Esta es la estructura que ${n} va a llenar cuando haya clave de Anthropic.`, pedido: "Pedido", objetivo: "Objetivo", lei: "Leí", solo: "- Solo el pedido.", revisa: "Se revisa con", borrador: "Borrador", pendiente: (n: string, c: string) => `Pendiente: ${n} lo resuelve para ${c}.` },
  en: { modo: (n: string) => `> Simulated mode. This is the structure ${n} will fill in once there is an Anthropic key.`, pedido: "Brief", objetivo: "Goal", lei: "What I read", solo: "- Only the brief.", revisa: "Reviewed against", borrador: "Draft", pendiente: (n: string, c: string) => `Pending: ${n} will solve this for ${c}.` },
};

export const simulado: Motor = {
  nombre: "simulado",
  async trabajar({ pedido, tarea, lecturas, cambio, version, preguntas, herramientas, cliente, archivos, consejos, latido, direccion, marca }) {
    latido?.({ fase: "escribiendo", palabras: 0 });
    // Direcciones de diseño (sistema/37): tres caminos de ejemplo, con la marca del cliente si existe.
    if (direccion === "proponer") {
      const ops = direccionesSimuladas(pedido, marca);
      const a = agentePorId(contratoPorId(tarea)!.agente)!;
      return {
        dice: `Propongo 3 direcciones para ${pedido.cliente}: ${ops.map((d) => d.nombre).join(", ")}. Elijan una y la desarrollo completa.`,
        necesita: "Que elijan una dirección.",
        contenido: [`# Tres direcciones · ${pedido.cliente}`, "", TXT[pedido.idioma ?? "es"].modo(a.nombre), "", ...ops.flatMap((d, i) => [`## Dirección ${i + 1}: ${d.nombre}`, "", d.idea, "", `- Estilo: ${d.estilo}`, `- Tono: ${d.tono}`, `- Colores: ${d.colores.map((c) => c.hex).join(", ")}`, `- Tipografías: ${d.tipografias.titulos} / ${d.tipografias.texto}`, ""])].join("\n"),
        datos: { direcciones: ops },
        modo: "simulado",
      };
    }
    const c = contratoPorId(tarea)!;
    const a = agentePorId(c.agente)!;
    const fase = FASES.find((f) => f.n === c.fase)!;
    const lineas = [
      `# ${c.entrega} · ${pedido.cliente}`,
      "",
      TXT[pedido.idioma ?? "es"].modo(a.nombre),
      "",
      `**Fase ${c.fase} · ${fase.nombre}** · ${a.nombre}, ${a.rol.toLowerCase()} · versión ${version}`,
      "",
      `**${TXT[pedido.idioma ?? "es"].pedido}:** ${pedido.descripcion}`,
      "",
      `**${TXT[pedido.idioma ?? "es"].objetivo}:** ${c.objetivo}`,
      "",
    ];
    if (cambio) lineas.push(`**Cambio pedido:** ${cambio}`, "");
    if (cliente.length) lineas.push("## Lo que dijo el cliente", "", ...cliente.map((x) => `- "${x}"`), "");
    if (consejos?.length) lineas.push("## Lo que sabemos del rubro", "", ...consejos.map((x) => `- ${x}`), "");
    const resp = pedido.contexto?.respuestas ?? [];
    if (resp.length) lineas.push("## Respuestas del cliente", "", ...resp.map((r) => `- ${r.pregunta} → ${r.respuesta}`), "");
    if (archivos?.length) lineas.push("## Archivos del cliente", "", ...archivos.map((x) => `- ${x.nombre}${x.nota ? ` — ${x.nota}` : ""}`), "");
    const tx = TXT[pedido.idioma ?? "es"];
    lineas.push(`## ${tx.lei}`, "");
    lineas.push(...(lecturas.length ? lecturas.map((e) => `- ${agentePorId(e.agente)?.nombre}: ${e.titulo} (v${e.version})`) : [tx.solo]), "");
    lineas.push(`## ${tx.revisa}`, "", ...c.criterios.map((k) => `- [ ] ${k}`), "");
    lineas.push(`## ${tx.borrador}`, "");
    for (const k of c.estructura ?? c.criterios) lineas.push(`### ${k}`, "", tx.pendiente(a.nombre, pedido.cliente), "");
    lineas.push(...seccionHerramientas(herramientas));

    let nota: number | undefined;
    if (tarea === "6.trofeo") {
      // Simulado: arranca cerca del mínimo y sube con cada versión, para probar las rondas.
      const r1 = (x: number) => Math.round(x * 10) / 10;
      const base = 6 + semilla(pedido.id) * 0.9 + (version - 1) * 0.7;
      const notas = { diseno: r1(base + 0.3), usabilidad: r1(base + 0.5), creatividad: r1(base - 0.5 + semilla(pedido.id + "c") * 0.3), contenido: r1(base + 0.2) };
      nota = r1(notas.diseno * 0.4 + notas.usabilidad * 0.3 + notas.creatividad * 0.2 + notas.contenido * 0.1);
      const bajo = Object.entries(notas).sort((a, b) => a[1] - b[1])[0][0];
      lineas.push("## Nota", "", "```json", JSON.stringify({ ...notas, final: nota, arreglos: [`Subir ${bajo} (simulado)`], simulado: true }, null, 2), "```", "");
    }

    const falta = herramientas.find((x) => !x.ok);
    const necesita = falta
      ? falta.falta ?? falta.resumen.split("\n")[0]
      : tarea === "1.atlas" && preguntas.length
        ? preguntas[0]
        : "El visto bueno de Jay o Luna.";
    return {
      dice: `${cambio ? "Rehice" : "Armé"} la estructura de ${c.entrega.toLowerCase()} para ${pedido.cliente}: ${c.criterios.length} puntos por cubrir.`,
      necesita,
      contenido: lineas.join("\n"),
      nota,
      datos: c.sitio ? { ...datosHerramientas(herramientas), sitio: Object.keys(sitioSimulado(pedido, typeof direccion === "object" ? direccion : undefined, marca)) } : herramientas.length ? datosHerramientas(herramientas) : undefined,
      modo: "simulado",
      ...(c.sitio ? { sitio: sitioSimulado(pedido, typeof direccion === "object" ? direccion : undefined, marca) } : {}),
    };
  },
};

/** Agentes que pueden abrir los enlaces del pedido: investigan, definen la marca, diseñan, construyen o auditan. */
const LECTORES = ["sonda", "nova", "orla", "vector", "prisma"];

/** Lo que un agente lee de otro: completo si es corto; si es largo, el principio y el final (ahorra tokens). */
export function recortar(texto: string, max: number): string {
  if (texto.length <= max) return texto;
  const cabeza = Math.floor(max * 0.75);
  return `${texto.slice(0, cabeza)}\n\n[… recortado para ahorrar: ${texto.length - max} caracteres; está completo en el estudio …]\n\n${texto.slice(-(max - cabeza))}`;
}

/** Antes de abrir otro pedido a la API, cuánto tiempo mínimo debe quedar en la vuelta (ms). */
const MARGEN_VUELTA = Number(process.env.ANONYMO_MARGEN_MS ?? 15_000);

/** Motor real: llama a la API de Anthropic. Sin probar hasta que Jay ponga la clave. */
export const real: Motor = {
  nombre: "real",
  async trabajar({ pedido, tarea, lecturas, cambio, version, preguntas, herramientas, cliente, archivos, consejos, marca, parcial, plazo, latido, direccion, directo }) {
    const clave = claveAnthropic();
    if (!clave) throw new Error("Falta ANTHROPIC_API_KEY.");
    const c = contratoPorId(tarea)!;
    const a = agentePorId(c.agente)!;
    const buscaEnWeb = c.herramientas?.includes("web");
    // Enlaces que dieron Jay, Luna o el cliente: los agentes que investigan o diseñan pueden abrirlos (sistema/23).
    const enlaces = [...new Set([pedido.descripcion, JSON.stringify(pedido.contexto ?? {}), ...cliente].join(" ").match(/https?:\/\/[^\s"'<>)\]]+/g) ?? [])];
    const abreEnlaces = enlaces.length > 0 && LECTORES.includes(c.agente);
    const rapido = !!c.ligera;
    // Vuelta de rescate o de continuación: sin imágenes ni PDF, para que la IA responda rápido (sistema/40).
    const sinAdjuntos = !!directo || !!parcial;
    const modelo = rapido ? process.env.ANTHROPIC_MODEL_RAPIDO ?? process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5" : process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5";
    // Las creativas piensan: se les da espacio extra para que el pensamiento no se coma la entrega.
    const profunda = !!c.profunda;
    const sistema = [
      `Eres ${a.nombre}, ${a.rol} en una agencia creativa de Cuenca, Ecuador, dirigida por Jay y Luna.`,
      COMO_TRABAJAMOS,
      tarea.endsWith(".ledger") && tarifaHora() ? `Tarifa por hora de Jay: USD ${tarifaHora()}. Úsala para el costo.` : "",
      `Carácter: ${a.caracter} Tu ADN: ${a.adn}. Tu superpoder: ${a.superpoder} Tu frase: "${a.frase}"`,
      pedido.idioma === "en"
        ? "Write in English for the client: plain and direct, short sentences, common words, no jargon, no filler. Keep the markers DICE/NECESITA/NOTA/FINALISTAS/HORAS exactly as written, but write their content in English."
        : "Escribes en español, directo y simple: frases cortas, palabras comunes, cero jerga y cero relleno.",
      "No inventes datos, enlaces ni precios de terceros: si algo hay que verificarlo, márcalo como [verificar].",
      "Sé concreto: la entrega es para trabajar, no para impresionar. Sin introducciones, sin repetir el pedido, sin relleno. Listas y tablas cuando ayuden.",
      buscaEnWeb ? "Puedes buscar en la web. Usa fuentes reales y pon el enlace de cada una. Busca solo lo que tu tarea necesita." : "",
      abreEnlaces ? "Puedes abrir los enlaces que aparecen en el pedido (herramienta web_fetch). Abre solo los que sirvan para tu tarea y di qué sacaste de cada uno." : "",
      c.estructura && direccion !== "proponer" ? `Formato fijo: usa exactamente estas secciones, en este orden, como títulos «##»: ${c.estructura.map((x) => `«${x}»`).join(", ")}. No agregues otras.` : "",
      sinAdjuntos
        ? "Esta vez las imágenes del cliente no van adjuntas: usa lo que ya describieron las entregas del equipo y no digas que no las ves."
        : "Si el cliente mandó imágenes o PDF, los tienes adjuntos: míralos y úsalos. Las referencias muestran lo que le gusta al cliente: tu diseño tiene que dialogar con ellas y explicar qué decisiones nacen de cada una. No inventes haber consultado enlaces. Nunca digas que no puedes verlos.",
      "Termina siempre lo que empiezas: si el espacio no alcanza, resume, pero cierra cada sección y cada tabla.",
      "Lo que sea solo para el equipo (dudas, riesgos internos, márgenes, notas a otros agentes) va al final, bajo el título «## Para el equipo»: el cliente nunca lo ve.",
      "Responde en markdown. Al final agrega exactamente dos líneas:",
      "DICE: lo que dirías en la sala del proyecto, en una o dos frases.",
      "NECESITA: lo que necesitas del cliente o del equipo para seguir.",
      tarea.endsWith(".ledger") ? "Antes de esas líneas agrega: HORAS: <total de horas del proyecto>" : "",
      version > 1 && !tarea.endsWith(".ledger") ? "Si este cambio suma trabajo al proyecto, antes de esas líneas agrega: HORAS_EXTRA: <horas adicionales estimadas>" : "",
      tarea === "2.verba" ? "Antes de esas líneas agrega: FINALISTAS: nombre1, nombre2, nombre3, nombre4, nombre5" : "",
      tarea === "6.trofeo"
        ? 'Califica como jurado de Awwwards, con exigencia real. Antes de esas líneas agrega un bloque ```json con {"diseno","usabilidad","creatividad","contenido","final","arreglos"}: notas de 0 a 10 (pesos 40/30/20/10) y "arreglos" con los tres cambios que más suben la nota, cada uno nombrando al agente responsable. Luego la línea NOTA: <final>.'
        : "",
    ].filter(Boolean).join("\n");
    const usuario = [
      `# Pedido de ${pedido.cliente}`,
      pedido.descripcion,
      pedido.contexto ? "```json\n" + JSON.stringify(pedido.contexto, null, 2) + "\n```" : "",
      `# Tu tarea: ${c.entrega} (versión ${version})`,
      c.objetivo,
      direccion === "proponer" ? PEDIDO_DIRECCIONES : textoDireccion(typeof direccion === "object" ? direccion : undefined),
      c.sitio ? PEDIDO_SITIO : "",
      "Se revisa con:\n" + c.criterios.map((k) => `- ${k}`).join("\n"),
      consejos?.length ? "# Lo que el equipo ya sabe de este rubro (punto de partida, contrástalo)\n" + consejos.map((x) => `- ${x}`).join("\n") : "",
      archivos?.length ? "# Archivos del cliente (las imágenes y los PDF van adjuntos arriba)\n" + archivos.map((x) => `- ${x.nombre}${x.nota ? `: ${x.nota}` : ""}`).join("\n") : "",
      textoMarca(marca),
      cliente.length ? "# Lo que dijo el cliente (manda sobre cualquier suposición)\n" + cliente.map((x) => `- "${x}"`).join("\n") : "",
      cambio ? `# Cambio pedido\n${cambio}` : "",
      preguntas.length && c.fase === 1 ? "# Preguntas abiertas al cliente\n" + preguntas.map((p) => `- ${p}`).join("\n") : "",
      herramientas.length ? "# Datos de herramientas (reales, úsalos tal cual)\n" + herramientas.map((h) => `## ${h.herramienta}\n${h.resumen}`).join("\n\n") : "",
      ...lecturas.map((e) => `# Entrega de ${agentePorId(e.agente)?.nombre}: ${e.titulo}\n${recortar(e.contenido, c.usa === "todo" ? 5000 : 12000)}`),
    ].filter(Boolean).join("\n\n");

    type Bloque = { type: string; text?: string; source?: unknown };
    // Todos los agentes ven las imágenes y los PDF del cliente (sistema/35): capturas, fotos, logos, briefs.
    const pesa = (r?: string) => (r ? statSync(r).size : Infinity);
    const visibles = (archivos ?? []).filter((x) => x.ruta && existsSync(x.ruta));
    // Las más nuevas primero, hasta 8 y sin pasar de ~8 MB (sistema/40): más imágenes hacen que la IA tarde
    // minutos en empezar a responder. Yendo directo a escribir (vuelta de rescate) no se mandan imágenes.
    let cupo = sinAdjuntos ? 0 : 8 * 1024 * 1024;
    const imagenes: Bloque[] = visibles
      .filter((x) => /^image\/(jpeg|png|webp|gif)$/.test(x.tipo) && pesa(x.ruta) < 4 * 1024 * 1024)
      .slice(-8)
      .reverse()
      .filter((x) => (cupo -= pesa(x.ruta)) >= 0)
      .reverse()
      .map((x) => ({ type: "image", source: { type: "base64", media_type: x.tipo, data: readFileSync(x.ruta!).toString("base64") } }));
    const documentos: Bloque[] = visibles
      .filter((x) => !sinAdjuntos && x.tipo === "application/pdf" && pesa(x.ruta) < 4 * 1024 * 1024)
      .slice(-2)
      .map((x) => ({ type: "document", source: { type: "base64", media_type: "application/pdf", data: readFileSync(x.ruta!).toString("base64") } }));
    const adjuntos = [...imagenes, ...documentos];
    const mensajes: { role: "user" | "assistant"; content: string | Bloque[] }[] = [
      { role: "user", content: adjuntos.length ? [...adjuntos, { type: "text", text: usuario }] : usuario },
    ];
    // Vuelta anterior sin tiempo (sistema/36): el agente ve lo que ya escribió y sigue desde ahí.
    const yaEscrito = parcial?.trimEnd() ?? "";
    if (directo && !yaEscrito)
      (mensajes[0].content as unknown) = typeof mensajes[0].content === "string"
        ? `${mensajes[0].content}\n\n# Importante\nEscribe la entrega ya, de corrido, sin buscar en la web. Si algo hay que verificar, márcalo [verificar].`
        : [...(mensajes[0].content as Bloque[]), { type: "text", text: "# Importante\nEscribe la entrega ya, de corrido, sin buscar en la web. Si algo hay que verificar, márcalo [verificar]." }];
    if (yaEscrito)
      mensajes.push(
        { role: "assistant", content: [{ type: "text", text: yaEscrito }] },
        { role: "user", content: "Se acabó el tiempo de tu vuelta anterior. Sigue exactamente donde quedaste, sin repetir nada de lo ya escrito y sin volver a buscar. Cierra todas las secciones y termina con las líneas finales." },
      );
    const bloques: Bloque[] = [];
    const uso = { entrada: 0, salida: 0, busquedas: 0 };
    let fin = "";
    // Con búsqueda web la API puede pausar el turno; si se acaba el espacio, se le pide que siga donde quedó (sistema/35).
    let cortes = 0;
    let extra = 0;
    // Siguiendo una vuelta anterior, o si la anterior no alcanzó a escribir: directo a escribir.
    const apurado = !!yaEscrito || !!directo;
    let conHerramientas = !apurado;
    const palabrasPrevias = yaEscrito.split(/\s+/).filter(Boolean).length;
    const textoHastaAhora = () => {
      const nuevo = bloques.filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
      return yaEscrito + (/[\p{L}\p{N}.,;:]$/u.test(yaEscrito) && /^[\p{L}\p{N}]/u.test(nuevo) ? " " : "") + nuevo;
    };
    for (let vuelta = 0; vuelta < 6; vuelta++) {
      // Sin tiempo para otro pedido completo: se guarda lo que hay y sigue en otra vuelta.
      if (plazo && Date.now() > plazo - MARGEN_VUELTA) return { dice: "", necesita: "", contenido: "", modo: "real", pendiente: textoHastaAhora(), uso: { ...uso, usd: usd(uso.entrada, uso.salida, uso.busquedas, rapido), estimado: false } };
      // Pedido enviado: hasta que la IA mande algo, el agente está «esperando respuesta».
      latido?.({ fase: "esperando", palabras: palabrasPrevias + bloques.filter((b) => b.type === "text").reduce((n, b) => n + (b.text ?? "").split(/\s+/).filter(Boolean).length, 0) });
      const base = palabrasPrevias + bloques.filter((b) => b.type === "text").reduce((n, b) => n + (b.text ?? "").split(/\s+/).filter(Boolean).length, 0);
      const res = await pedirEnVivo(
        `${process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com"}/v1/messages`,
        { "content-type": "application/json", "x-api-key": clave, "anthropic-version": "2023-06-01" },
        {
          // Tareas livianas con el modelo rápido; el resto con el principal.
          model: modelo,
          max_tokens: (c.salida ?? 4000) + (profunda && !apurado ? 8000 : 2000) + (conHerramientas && (buscaEnWeb || abreEnlaces) ? 4000 : 0) + extra,
          ...(apurado ? sinPensar(modelo) : pensamiento(modelo, profunda)),
          system: sistema,
          messages: mensajes,
          ...(conHerramientas && (buscaEnWeb || abreEnlaces)
            ? {
                tools: [
                  ...(buscaEnWeb ? [{ type: "web_search_20250305", name: "web_search", max_uses: 4 }] : []),
                  ...(abreEnlaces ? [{ type: "web_fetch_20250910", name: "web_fetch", max_uses: 3, max_content_tokens: 5000 }] : []),
                ],
              }
            : {}),
        },
        { plazo, alAvanzar: (fase, palabras) => latido?.({ fase, palabras: base + palabras }) },
      ).catch((e: Error) => { throw new Error(ocultarClaves(e.message)); });
      bloques.push(...(res.content as Bloque[]));
      uso.entrada += res.usage?.input_tokens ?? 0;
      uso.salida += res.usage?.output_tokens ?? 0;
      uso.busquedas += res.usage?.server_tool_use?.web_search_requests ?? 0;
      fin = res.stop_reason;
      // Sin tiempo, o la conexión se cortó sin terminar: se guarda lo escrito y sigue en otra vuelta.
      if (res.sinTiempo || !res.stop_reason) return { dice: "", necesita: "", contenido: "", modo: "real", pendiente: textoHastaAhora(), uso: { ...uso, usd: usd(uso.entrada, uso.salida, uso.busquedas, rapido), estimado: false } };
      if (res.stop_reason === "pause_turn") { mensajes.push({ role: "assistant", content: res.content as Bloque[] }); continue; }
      if (res.stop_reason === "max_tokens" && cortes < 2) {
        cortes++;
        // Solo se reenvía lo que la API acepta de vuelta: pensamientos firmados y búsquedas con su resultado.
        const ids = new Set(res.content.filter((b) => b.type === "web_search_tool_result" || b.type === "web_fetch_tool_result").map((b) => (b as { tool_use_id?: string }).tool_use_id));
        const limpio = (res.content as Bloque[]).filter((b) =>
          b.type === "thinking" ? !!(b as { signature?: string }).signature
          : b.type === "server_tool_use" ? ids.has((b as { id?: string }).id)
          : b.type !== "text" || !!b.text?.trim());
        if (!limpio.some((b) => b.type === "text")) {
          // Se fue todo en pensar y buscar: se repite sin herramientas y con más espacio, y se descarta lo cortado.
          bloques.length -= res.content.length;
          conHerramientas = false;
          extra += 6000;
          continue;
        }
        mensajes.push({ role: "assistant", content: limpio }, { role: "user", content: "Se te acabó el espacio. Sigue exactamente donde quedaste, sin repetir nada y sin volver a buscar. Cierra todas las secciones y termina con las líneas finales." });
        continue;
      }
      break;
    }
    // Al unir lo de la vuelta anterior con lo nuevo, que no queden dos palabras pegadas.
    const primero = bloques.find((b) => b.type === "text")?.text ?? "";
    const union = /[\p{L}\p{N}.,;:]$/u.test(yaEscrito) && /^[\p{L}\p{N}]/u.test(primero) ? " " : "";
    const bloquesFinal: Bloque[] = yaEscrito ? [{ type: "text", text: yaEscrito + union }, ...bloques] : bloques;
    let texto = textoDe({ content: bloquesFinal, stop_reason: fin });
    // Si aun así quedó cortada, se dice en la entrega (nunca se guarda a medias en silencio).
    const cortada = fin === "max_tokens";
    if (cortada) texto += "\n\n> ⚠️ Esta entrega quedó cortada: se acabó el espacio. Pide un cambio con «complétala» para que la termine.";
    const linea = (k: string) => texto.match(new RegExp(`^${k}:\\s*(.+)$`, "m"))?.[1].trim();
    const nota = linea("NOTA");
    const finalistas = linea("FINALISTAS")?.split(",").map((x) => x.trim()).filter(Boolean);
    let jurado: unknown;
    if (tarea === "6.trofeo") {
      try {
        jurado = JSON.parse(texto.match(/```json\s*([\s\S]*?)```/)?.[1] ?? "null") ?? undefined;
      } catch {
        jurado = undefined;
      }
    }
    const direcciones = direccion === "proponer" ? leerDirecciones(texto) : [];
    const sitio = c.sitio ? leerArchivosSitio(texto) : {};
    if (c.sitio && Object.keys(sitio).length) texto = sinArchivos(texto);
    const horas = Number.parseFloat(linea("HORAS") ?? "");
    const horasExtra = Number.parseFloat(linea("HORAS_EXTRA") ?? "");
    const datos = {
      ...datosHerramientas(herramientas),
      ...(finalistas?.length ? { finalistas } : {}),
      ...(jurado ? { jurado } : {}),
      ...(Number.isFinite(horas) ? { horas } : {}),
      ...(Number.isFinite(horasExtra) && horasExtra > 0 ? { horasExtra } : {}),
      ...(cortada ? { cortada: true } : {}),
      ...(direcciones.length ? { direcciones } : {}),
      ...(Object.keys(sitio).length ? { sitio: Object.keys(sitio) } : {}),
    };
    return {
      dice: linea("DICE") ?? "",
      necesita: linea("NECESITA") ?? "",
      contenido: [texto.replace(/^(DICE|NECESITA|NOTA|FINALISTAS|HORAS|HORAS_EXTRA):.*$/gm, "").replace(direcciones.length ? /```json[\s\S]*?```/g : /$^/, "").trim(), "", ...seccionHerramientas(herramientas)].join("\n").trim(),
      nota: nota ? Number.parseFloat(nota) : undefined,
      datos: Object.keys(datos).length ? datos : undefined,
      modo: "real",
      ...(Object.keys(sitio).length ? { sitio } : {}),
      uso: { ...uso, usd: usd(uso.entrada, uso.salida, uso.busquedas, rapido), estimado: false },
    };
  },
};

/**
 * Motor manual: usa borradores escritos a mano (o en una sesión con Claude) en
 * proyectos/<id>/borradores/<fase>-<agente>.md, con el mismo frontmatter que una entrega.
 * Para una versión nueva: <fase>-<agente>.v2.md. Si falta un borrador, cae al simulado.
 */
export const manual: Motor = {
  nombre: "manual",
  async trabajar(ctx) {
    const base = join(carpeta(), ctx.pedido.id, "borradores", archivoEntrega(ctx.tarea).replace(".md", ""));
    const propia = `${base}.v${ctx.version}.md`;
    const ruta = [propia, `${base}.md`].find(existsSync);
    if (!ruta) return simulado.trabajar(ctx);
    // Se rehace pero no hay borrador nuevo: el agente revisó y su entrega sigue igual.
    const revisado = ctx.version > 1 && ruta !== propia && ctx.cambio ? `> Revisado tras el cambio (${ctx.cambio.replace(/\n/g, " ")}): esta entrega no necesita cambios.\n\n` : "";
    const texto = readFileSync(ruta, "utf8");
    const m = texto.match(/^---\n([\s\S]*?)\n---\n\n?([\s\S]*)$/);
    const datos: Record<string, unknown> = {};
    for (const l of (m?.[1] ?? "").split("\n")) {
      const i = l.indexOf(": ");
      if (i > 0) datos[l.slice(0, i)] = JSON.parse(l.slice(i + 2));
    }
    const contenido = (m?.[2] ?? texto).trim();
    const extra = { ...datosHerramientas(ctx.herramientas), ...((datos.datos as Record<string, unknown>) ?? {}) };
    return {
      dice: String(datos.dice ?? ""),
      necesita: String(datos.necesita ?? ""),
      // La nota de revisión va debajo del título, no encima.
      contenido: [contenido.replace(/^(# .*\n+)?/, (t) => t + revisado), "", ...seccionHerramientas(ctx.herramientas)].join("\n").trim(),
      nota: typeof datos.nota === "number" ? datos.nota : undefined,
      datos: Object.keys(extra).length ? extra : undefined,
      modo: "manual",
    };
  },
};

export function elegirMotor(op: { simulado?: boolean; manual?: boolean } | boolean = false): Motor {
  const o = typeof op === "boolean" ? { simulado: op } : op;
  if (o.manual) return manual;
  return !o.simulado && process.env.ANTHROPIC_API_KEY ? real : simulado;
}
