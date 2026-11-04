// El oficio de la agencia (sistema/54): lo que sabe un director creativo de primer nivel, por disciplina.
// Lo leen el agente que produce (antes de trabajar) y el revisor (para calificar). No es una plantilla:
// son criterios para decidir bien y una lista de lo que delata trabajo genérico o de principiante.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { carpeta } from "./almacen.ts";
import { plantillaPorId, rubroDe } from "./plantillas.ts";
import type { Pedido, TareaId } from "./tipos.ts";
import { DISCIPLINAS_BANCO, textoCalibrado, type DisciplinaBanco } from "./juez.ts";

export type Disciplina = "web" | "identidad" | "naming" | "contenido" | "textos";

const POR_TAREA: Partial<Record<TareaId, Disciplina>> = {
  "4.orla": "web", "4.vector": "web", "4.lumen": "web", "4.kine": "web", "6.trofeo": "web",
  "1.nova": "identidad", "3.mira": "identidad", "3.kine": "identidad",
  "2.verba": "naming", "2.rhea": "naming", "2.sonda": "naming",
  "5.faro": "contenido", "5.chispa": "contenido", "5.corte": "contenido", "5.lente": "contenido", "5.escena": "contenido",
  "3.rhea": "textos",
};
export const disciplinaDe = (t: TareaId): Disciplina | undefined => POR_TAREA[t];
/** Las disciplinas que tienen banco de calibración (textos no: se juzga junto con identidad y web). */
export const disciplinaBanco = (d: Disciplina | undefined): DisciplinaBanco | undefined => (DISCIPLINAS_BANCO as string[]).includes(d ?? "") ? d as DisciplinaBanco : undefined;
/** Criterios del oficio que solo aplican a una propuesta con varias opciones, no a una pieza terminada del banco. */
export const SOLO_PROPUESTA = new Set(["rutas-distintas", "variedad", "disponibilidad"]);
/** Los criterios del banco salen del oficio (no se duplican): la rúbrica de la disciplina menos lo que solo aplica a propuestas. */
export const criteriosBanco = (d: DisciplinaBanco): [string, string][] => OFICIO[d].rubrica.filter(([id]) => !SOLO_PROPUESTA.has(id));
/** La tarea que produce la pieza principal de cada disciplina del banco: con su revisión se califica una referencia. */
export const TAREA_BANCO: Record<DisciplinaBanco, TareaId> = { web: "4.vector", identidad: "3.mira", naming: "2.verba", contenido: "5.faro" };
/** Las tareas que producen la pieza principal de su disciplina: a estas el revisor les aplica la rúbrica completa. */
const PRODUCEN = new Set<TareaId>(["4.orla", "4.vector", "3.mira", "2.verba", "5.faro", "5.chispa", "5.corte", "3.rhea"]);

interface Oficio {
  nombre: string;
  /** Quién revisa: el rol con el que se califica. */
  revisor: string;
  bien: string[];
  hoy: string[];
  evitar: string[];
  /** Condiciones que el revisor comprueba una por una (id corto, texto). */
  rubrica: [string, string][];
}

export const OFICIO: Record<Disciplina, Oficio> = {
  web: {
    nombre: "Diseño y desarrollo web",
    revisor: "director de arte digital de un estudio que gana Awwwards y FWA, con criterio de UX y conversión",
    bien: [
      "Una idea central propia del cliente, no un estilo: algo de su negocio, su ciudad, su historia o su forma de trabajar convertido en recurso visual o de interacción (un gesto, una metáfora, una retícula, un recorrido). Si cambias el nombre del cliente y la web sirve para otro, no está lista.",
      "Tipografía como protagonista: una familia con carácter para titulares (serif editorial, grotesca expresiva o variable) y una de texto muy legible; escala con contraste fuerte (titulares de 64 a 160 px en escritorio con clamp()), interlineado y tracking ajustados a mano, máximo 2 familias.",
      "Composición con retícula y ritmo: asimetría intencional, márgenes generosos, alternar densidad y aire, alinear a una retícula de 12 columnas; cada sección con un ritmo distinto pero del mismo sistema. Nada de bloques centrados uno tras otro.",
      "Dirección de arte en la imagen: fotos reales del cliente tratadas con un criterio (encuadre, color, grano, recorte, duotono) o, si no hay, composiciones tipográficas, formas y color propios. La imagen cuenta algo, no decora.",
      "Movimiento con intención: entradas cortas (200–700 ms) con curvas suaves, texto que aparece por líneas, scroll que revela y conecta secciones, microinteracciones en botones y enlaces. Respeta prefers-reduced-motion. Nada se mueve solo por moverse.",
      "Copy específico: titulares que dicen algo concreto del cliente (beneficio, promesa, dato real), no frases que sirven para cualquiera. Botones con verbo claro.",
      "Conversión sin fricción: la acción principal (agendar, escribir, comprar, reservar) visible en el primer pantallazo y siempre a mano en celular; pruebas de confianza cerca de la acción.",
      "Celular primero de verdad: la versión de 390 px se diseña, no se encoge; tipografía, botones de 44 px mínimo y navegación pensados para el pulgar.",
      "Calidad técnica: semántica correcta, contraste AA, imágenes en AVIF/WebP con tamaños, fuentes con font-display swap, Lighthouse móvil ≥ 85.",
    ],
    hoy: [
      "Tipografía gigante y editorial, mezclas serif + grotesca, fuentes variables animadas.",
      "Layouts editoriales con retícula visible o sugerida, textos en columnas, numeración y detalles tipográficos (índices, notas al margen).",
      "Scroll narrativo: secciones que se fijan (sticky), imágenes que se revelan con máscaras, transiciones entre páginas (View Transitions).",
      "Texturas sutiles (grano, papel), paletas reducidas con un color de acento fuerte, modos oscuros cuidados.",
      "Interacciones táctiles y cursores con intención, 3D ligero solo si sostiene la idea (WebGL con fallback).",
      "Librerías gratuitas y vigentes por CDN con versión fija: GSAP y ScrollTrigger, Lenis, SplitType, Three.js u OGL si hay 3D, Embla o Swiper si hay carrusel.",
    ],
    evitar: [
      "Hero centrado con titular genérico + subtítulo + botón sobre una foto de banco o un degradado.",
      "Tres tarjetas iguales con ícono, título y texto ('Calidad', 'Confianza', 'Experiencia').",
      "Íconos genéricos de librería como único recurso visual; ilustraciones planas de personas de stock.",
      "Degradados morados/azules por defecto, sombras grandes difusas en todo, bordes redondeados iguales en todo.",
      "Secciones todas del mismo alto y alineación, una debajo de otra, sin ritmo.",
      "Frases vacías: 'Bienvenidos a…', 'Soluciones integrales', 'Calidad y calidez', 'Tu mejor opción', 'Somos líderes'.",
      "Carruseles automáticos de testimonios, contadores animados de 'clientes felices', mapas gigantes sin propósito.",
      "Animaciones de entrada en cada elemento con el mismo fade-up.",
    ],
    rubrica: [
      ["concepto", "Tiene una idea central propia de este cliente, reconocible en la portada, que no serviría igual para otro negocio."],
      ["sin-plantilla", "No usa ninguno de los recursos de plantilla (hero centrado genérico, tres tarjetas iguales con ícono, degradados por defecto, frases vacías)."],
      ["tipografia-oficio", "La tipografía tiene carácter y una escala con contraste real; jerarquía clara a 1440 y 390 px."],
      ["direccion-arte", "Imagen y color con dirección de arte: tratamiento propio y coherente, no decoración."],
      ["ritmo", "La página tiene ritmo: secciones con densidades y composiciones distintas dentro del mismo sistema."],
      ["movimiento", "El movimiento y la interacción tienen intención: sostienen la idea, guían la lectura y no se repiten igual en todo."],
      ["copy-especifico", "Los textos dicen cosas concretas de este cliente; los botones tienen verbo claro."],
      ["accion", "La acción principal está visible en el primer pantallazo y a mano en celular."],
      ["nivel", "El resultado se puede mostrar junto a webs premiadas del mismo rubro sin desentonar."],
    ],
  },
  identidad: {
    nombre: "Identidad de marca y logo",
    revisor: "director creativo de identidad de un estudio de branding reconocido (nivel Pentagram, Collins, Koto)",
    bien: [
      "Concepto antes que forma: cada ruta nace de una idea verbal clara (qué quiere significar la marca) y se puede explicar en una frase.",
      "Distintivo dentro de su rubro: primero se mira qué hace la competencia y se evita su código obvio; la marca tiene que diferenciarse a 3 metros y a 16 px.",
      "Simple y construido: formas geométricas o tipográficas con corrección óptica, grosores consistentes, contraformas resueltas; funciona en una tinta, en negativo y en tamaños mínimos.",
      "Tipografía elegida o dibujada con intención: un logotipo bien espaciado (kerning a mano) vale más que un símbolo mediocre.",
      "Sistema, no solo logo: paleta con roles (principal, acento, neutros), tipografías, retícula, tratamiento de imagen, tono y aplicaciones reales (redes, señalética, papelería, web).",
      "Tres rutas realmente distintas: por ejemplo una tipográfica, una de símbolo y una de concepto más arriesgado; cada una con su razón y su riesgo.",
    ],
    hoy: [
      "Logotipos tipográficos con detalles propios (ligaduras, cortes, caracteres alternativos) y sistemas flexibles que cambian sin perder reconocimiento.",
      "Paletas con un color propio poco usado en el rubro, neutros cálidos, contraste alto.",
      "Identidades con movimiento pensado desde el inicio (el logo se anima) y piezas para pantalla primero.",
      "Tipografías de fundiciones independientes o libres de calidad (Google Fonts bien elegidas) en vez de las más gastadas.",
    ],
    evitar: [
      "El ícono literal del rubro: diente para odontólogos, taza para cafés, casa para inmobiliarias, engranaje para tecnología, balanza para abogados, hoja para todo lo 'natural'.",
      "Iniciales dentro de un círculo o escudo sin idea; monogramas genéricos.",
      "Swooshes, degradados como recurso principal, efectos 3D, sombras o brillos en el logo.",
      "Más de dos tipografías, tipografías de moda gastadas o de sistema (Arial, Comic, Papyrus, scripts genéricos).",
      "Detalles que se pierden a 32 px; símbolos que necesitan explicación larga.",
      "Paletas de 6 colores sin roles; colores elegidos 'porque son bonitos'.",
    ],
    rubrica: [
      ["concepto-marca", "Cada ruta tiene un concepto verbal claro y explicable en una frase."],
      ["distintivo", "Se diferencia del código obvio del rubro y no usa el ícono literal del negocio."],
      ["construccion", "Formas construidas con criterio: consistentes, simples, legibles a 16 y 32 px y en una tinta."],
      ["sistema", "Paleta con roles, tipografías y aplicaciones forman un sistema coherente."],
      ["memorable", "Se recuerda y se reconoce de un vistazo: alguien podría dibujarlo de memoria después de verlo una vez."],
      ["rutas-distintas", "Las rutas son realmente distintas entre sí, no variaciones de la misma idea."],
    ],
  },
  naming: {
    nombre: "Naming",
    revisor: "estratega de naming de una consultora de marca internacional",
    bien: [
      "Primero la estrategia: qué tiene que evocar el nombre (atributo, emoción, origen, promesa) y qué territorio dejan libre los competidores.",
      "Explorar tipos distintos: descriptivo, evocativo, metafórico, inventado, compuesto, nombre propio, otra lengua; los mejores suelen ser evocativos o metafóricos.",
      "Criterios duros: corto (1 a 3 sílabas ideal), fácil de pronunciar y escribir en español e inglés, sin connotaciones malas en otros idiomas ni en jerga local de Ecuador, que no limite el crecimiento.",
      "Disponibilidad: dominio .com o .ec razonable, usuario en Instagram y TikTok, y que no choque con una marca registrada en su categoría (marcar [verificar] lo que no se pudo comprobar).",
      "Cada finalista con su historia en una línea, cómo se ve escrito (logotipo) y cómo suena dicho en voz alta.",
    ],
    hoy: [
      "Nombres cortos y con personalidad, palabras reales usadas fuera de contexto, nombres que funcionan como verbo o como lugar.",
      "Evitar terminaciones gastadas de startup (-ify, -ly, -hub) y siglas.",
    ],
    evitar: [
      "Nombres descriptivos y genéricos ('Dental Care', 'Soluciones Pro'), combinaciones de iniciales, juegos de palabras forzados.",
      "Faltas de ortografía intencionales difíciles de dictar por teléfono; nombres que necesitan deletrearse.",
      "Listas largas sin criterio: mejor 15 buenos que 60 al azar.",
    ],
    rubrica: [
      ["estrategia-nombre", "Hay una estrategia explícita y los nombres responden a ella."],
      ["variedad", "Hay nombres de tipos distintos (evocativo, metafórico, inventado…), no variaciones de uno."],
      ["criterios-duros", "Los finalistas son cortos, pronunciables en español e inglés y sin connotaciones negativas evidentes."],
      ["evocador", "Evoca la promesa o el carácter de la marca sin describir literalmente lo que vende."],
      ["historia", "Cada nombre tiene una historia que se cuenta en una línea y hace que la gente lo repita."],
      ["distintivo-nombre", "Se distingue de los nombres de su categoría: no suena a otro competidor ni a plantilla."],
      ["disponibilidad", "Se revisó o se marcó para verificar dominio, redes y choque de marca de cada finalista."],
    ],
  },
  contenido: {
    nombre: "Contenido y redes sociales",
    revisor: "director creativo de contenido de una agencia social de referencia, que conoce los formatos que funcionan hoy",
    bien: [
      "Estrategia antes que piezas: para quién, qué cambio de percepción buscamos y qué acción queremos; 2 o 3 series con nombre y formato fijo en vez de posts sueltos.",
      "Cada pieza con un gancho en el primer segundo o primera línea: una afirmación concreta, una pregunta específica o un antes/después.",
      "Formatos de hoy por plataforma: Reels y TikTok de 7 a 30 s con texto en pantalla y subtítulos; carruseles de 6 a 10 láminas que enseñan algo; historias para conversación; LinkedIn con texto propio y opinión.",
      "Personas reales y el lugar real: el dueño o el equipo en cámara genera más confianza que cualquier gráfica.",
      "Diseño de piezas con sistema: retícula, tipografías y colores de la marca, mucho aire, una sola idea por lámina, texto grande legible en celular.",
      "Calendario realista que el cliente puede sostener, con métricas por serie.",
    ],
    hoy: [
      "Contenido nativo y poco producido que se siente real; tendencias de audio y formatos usadas con criterio de marca.",
      "Carruseles educativos con diseño editorial, series recurrentes, colaboraciones con creadores locales.",
    ],
    evitar: [
      "Plantillas de Canva reconocibles, fotos de banco, frases motivacionales genéricas, días internacionales sin relación con la marca.",
      "Textos largos dentro de la imagen, hashtags en masa, el logo gigante en cada pieza.",
      "Planes de 30 posts sin series, sin gancho y sin objetivo.",
    ],
    rubrica: [
      ["estrategia-contenido", "Hay objetivo, público y series con nombre y formato definidos."],
      ["ganchos", "Cada pieza propuesta tiene un gancho concreto en el primer segundo o primera línea."],
      ["formatos-actuales", "Usa los formatos actuales de cada plataforma con duraciones y especificaciones correctas."],
      ["sin-generico", "Evita plantillas, stock y frases genéricas; la marca es reconocible sin el logo."],
      ["idea", "Hay una idea creativa que se cuenta en una frase y que la gente quiere comentar o compartir."],
    ],
  },
  textos: {
    nombre: "Voz y textos de marca",
    revisor: "director de redacción creativa de una agencia de referencia",
    bien: [
      "Una voz definida con 3 rasgos y su contrario ('cercano, no informal'), ejemplos de sí y no, y palabras propias de la marca.",
      "Concreto y específico: datos, nombres, lugares, experiencias reales del cliente en vez de adjetivos.",
      "Frases cortas, verbos activos, el beneficio del cliente primero; titulares que se entienden solos.",
      "Bilingüe de verdad cuando aplica: adaptar, no traducir literal.",
    ],
    hoy: ["Tono humano y directo, humor fino cuando la marca lo permite, menos claims grandilocuentes."],
    evitar: [
      "Clichés: 'calidad y calidez', 'tu mejor aliado', 'pasión por lo que hacemos', 'soluciones integrales', 'brindamos un servicio de excelencia'.",
      "Superlativos sin prueba ('los mejores', 'líderes'), jerga técnica, frases de relleno.",
    ],
    rubrica: [
      ["voz-definida", "La voz tiene rasgos claros con ejemplos de sí y no."],
      ["especifico", "Los textos son concretos de este cliente, sin clichés ni superlativos vacíos."],
    ],
  },
};

/** El estándar de Jay y Luna para la casa: se edita en el estudio (Estudio → Criterio de la casa). */
export const CRITERIO_BASE = [
  "Nivel de estudio que gana premios, hoy. Nada que parezca plantilla, de principiante o de hace años: si se ve como algo que ya vimos mil veces, se rehace.",
  "Lo que pidió el cliente manda. Cada decisión de diseño se puede justificar con el pedido, sus respuestas o sus referencias.",
  "Moderno y actual: tendencias y herramientas de hoy, usadas con criterio y no por moda.",
  "Simple y directo: menos elementos y mejor resueltos. Cuidado al detalle.",
].join("\n");

export interface CriterioCasa { texto: string; revision: number; fecha?: string; quien?: string }
const rutaCriterio = () => join(carpeta(), "_agencia", "criterio.json");
export function leerCriterio(): CriterioCasa {
  try {
    if (existsSync(rutaCriterio())) return JSON.parse(readFileSync(rutaCriterio(), "utf8")) as CriterioCasa;
  } catch {}
  return { texto: CRITERIO_BASE, revision: 0 };
}
export function guardarCriterio(texto: string, quien: string, revision: number): CriterioCasa {
  const actual = leerCriterio();
  if (actual.revision !== revision) throw new Error("Alguien cambió el criterio mientras lo editabas. Recarga la página y vuelve a intentar.");
  const limpio = texto.replace(/\r/g, "").trim();
  if (limpio.length < 20) throw new Error("Escribe el criterio con un poco más de detalle (al menos una frase).");
  if (limpio.length > 4000) throw new Error("El criterio es muy largo: déjalo en menos de 4000 caracteres para que todos los agentes lo lean completo.");
  const nuevo: CriterioCasa = { texto: limpio, revision: actual.revision + 1, fecha: new Date().toISOString(), quien };
  mkdirSync(join(carpeta(), "_agencia"), { recursive: true });
  const tmp = rutaCriterio() + "." + randomUUID() + ".tmp";
  writeFileSync(tmp, JSON.stringify(nuevo));
  renameSync(tmp, rutaCriterio());
  return nuevo;
}

const lista = (xs: string[]) => xs.map((x) => `- ${x}`).join("\n");

/** Cómo comunica bien un negocio de este rubro (si se conoce o se detecta). */
export function textoRubro(pedido: Pedido): string {
  const pl = plantillaPorId(pedido.plantilla) ?? plantillaPorId(rubroDe(pedido));
  if (!pl?.comunica) return "";
  const c = pl.comunica;
  return [
    `## Cómo comunica bien un negocio de «${pl.nombre}»`,
    `Tono: ${c.tono}`,
    `Códigos visuales que funcionan: ${c.codigos}`,
    `Lo que pega: ${c.pega}`,
    `Lo que se ve genérico en este rubro (evitar): ${c.evitar}`,
    "Usa esto como punto de partida y rómpelo si el pedido del cliente lo justifica.",
  ].join("\n");
}

/** Lo que lee el agente antes de trabajar: el oficio de su disciplina, el rubro y el criterio de la casa. */
export function textoOficio(tarea: TareaId, pedido: Pedido): string {
  const d = disciplinaDe(tarea);
  if (!d) return "";
  const o = OFICIO[d];
  return [
    `# Estándar de oficio: ${o.nombre}`,
    "Trabajas al nivel de los mejores estudios del mundo. Esto es lo que separa ese nivel de una plantilla:",
    "## Cómo se hace bien", lista(o.bien),
    "## Lo que se está haciendo hoy (úsalo con criterio, no por moda)", lista(o.hoy),
    "## Lo que delata trabajo genérico o de principiante (no lo hagas)", lista(o.evitar),
    textoRubro(pedido),
    "## Criterio de la casa (Jay y Luna)", leerCriterio().texto,
    "## Antes de entregar, revisa tu propia propuesta contra esto (un revisor exigente lo va a calificar así; menos de 8/10 vuelve a hacerse)",
    lista(o.rubrica.map(([, t]) => t)),
    "Si tu propuesta podría ser de cualquier otro negocio cambiando el nombre, todavía no está lista: vuelve a la idea central.",
  ].filter(Boolean).join("\n\n");
}

/** Lo que comprueba el revisor además de los requisitos del cliente. */
export function rubricaOficio(tarea: TareaId): { id: string; texto: string; fuente: string }[] {
  const d = disciplinaDe(tarea);
  if (!d || !PRODUCEN.has(tarea)) return [];
  return OFICIO[d].rubrica.map(([id, texto]) => ({ id: `oficio-${id}`, texto, fuente: "Estándar de oficio" }));
}

/** Cómo se calibra la nota: para que un 8 signifique «nivel de estudio líder», no «correcto». */
export function calibracion(tarea: TareaId, pedido: Pedido): string {
  const d = disciplinaDe(tarea);
  if (!d || !PRODUCEN.has(tarea)) return "";
  const o = OFICIO[d];
  return [
    `Calificas como ${o.revisor}.`,
    // La misma escala del banco de calibración (sistema/58): antes decía «6–7 genérico, 5 o menos principiante» y el juez
    // ponía 2–3 a lo genérico pero prolijo, que el banco califica 5–6.
    "Escala: 9–10 = premiable, memorable y propio del cliente. 8 = nivel de estudio líder, se puede presentar ya. 7 = muy bien resuelto, con oficio, pero sin una idea memorable. 5–6 = correcto pero genérico o con recursos de plantilla: necesita cambios. 3–4 = de principiante: errores básicos (tipografía o colores sin criterio, textos de relleno, nombres que hay que deletrear). 0–2 = no sirve.",
    "Si aparece cualquiera de estos recursos genéricos, la nota no puede pasar de 6 y debes nombrarlo en la evidencia. Que sea genérico no lo vuelve de principiante: si está bien ejecutado, queda en 5–6; el 3–4 es para errores básicos.",
    lista(o.evitar),
    textoRubro(pedido),
    "Criterio de la casa:", leerCriterio().texto,
    "En cada condición que falla, escribe el arreglo concreto (qué cambiar y cómo), no solo el problema.",
    textoCalibrado(disciplinaBanco(d), Object.fromEntries(o.rubrica)),
  ].filter(Boolean).join("\n");
}
