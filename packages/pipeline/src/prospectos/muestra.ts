// La muestra de cada prospecto (sistema/72): una idea de su web, armada sin IA con lo que ya se sabe del negocio.
// Se abre en /m/<id>. Cada vez que el negocio la abre, queda anotado y Jay recibe un aviso.
import { createHash } from "node:crypto";
import { slug } from "../solicitudes.ts";
import { GRUPOS_RUBRO, ORDEN_PLANTILLAS, type PlantillaMuestra, type Prospecto } from "./tipos.ts";
import { colorDe, paletaDe, type Paleta, type Tono } from "./paleta.ts";
export type { Tono } from "./paleta.ts";
import { nombreDe } from "./nombre.ts";

/** El id de la muestra: el nombre y una huella del lugar. No hace falta guardarlo: siempre sale igual. */
export function idMuestra(p: Pick<Prospecto, "id" | "nombre">) {
  const base = slug(p.nombre).slice(0, 40).replace(/-+$/, "") || "negocio";
  return `${base}-${createHash("sha256").update(`muestra:${p.id}`).digest("hex").slice(0, 6)}`;
}

export const idMuestraValido = (id: string) => /^[a-z0-9][a-z0-9-]{2,60}$/.test(id);

export function buscarPorMuestra<T extends Pick<Prospecto, "id" | "nombre">>(prospectos: Record<string, T>, id: string) {
  return Object.values(prospectos).find((p) => idMuestra(p) === id);
}


export function tonoDe(rubro: string): Tono {
  const r = rubro.toLowerCase();
  for (const g of GRUPOS_RUBRO) if (g.busquedas.some((b) => r.includes(b.toLowerCase()))) return g.id as Tono;
  if (/odont|dent|m[eé]dic|cl[ií]nica|fisio|psic|derma|pediat|veterin|[oó]ptica/.test(r)) return "salud";
  if (/abogad|notar|contab|legal|jur[ií]d/.test(r)) return "legal";
  if (/spa|barber|est[eé]tic|belleza|sal[oó]n|gimnas|u[ñn]as|peluquer/.test(r)) return "belleza";
  return "otro";
}

const SERVICIOS: Record<Tono, string[]> = {
  salud: ["Primera consulta", "Tratamientos", "Controles y seguimiento", "Agenda en línea"],
  legal: ["Asesoría inicial", "Trámites y contratos", "Acompañamiento en tu caso", "Agenda tu reunión"],
  belleza: ["Tratamientos", "Paquetes", "Promociones del mes", "Reserva tu turno"],
  otro: ["Lo que hacemos", "Cómo trabajamos", "Preguntas frecuentes", "Contacto"],
};

/** Servicios de ejemplo por oficio (sistema/84): «Ortodoncia» le dice más a un odontólogo que «Tratamientos». Cada uno con su línea. */
const OFICIOS: [RegExp, [string, string][]][] = [
  [/odont|dent|ortodon/, [["Limpieza y prevención", "Revisión, limpieza y un plan claro para tu boca."], ["Ortodoncia", "Brackets y alineadores, con controles cada mes."], ["Blanqueamiento", "Resultados que se notan desde la primera sesión."], ["Implantes y coronas", "Recupera tu sonrisa con piezas que duran."]]],
  [/psic|terap(eu|ia) (individual|de pareja)|psiqu/, [["Terapia individual", "Un espacio para ti, a tu ritmo."], ["Terapia de pareja", "Para volver a entenderse y decidir juntos."], ["Niños y adolescentes", "Acompañamos a tu hijo y a la familia."], ["Sesiones en línea", "Desde donde estés, con la misma atención."]]],
  [/pediat|neonat/, [["Control del niño sano", "Crecimiento, desarrollo y todas tus preguntas."], ["Vacunas", "El esquema al día, sin filas."], ["Recién nacidos", "Los primeros controles, con calma."], ["Consultas del día", "Si tu hijo amaneció mal, te vemos hoy."]]],
  [/fisio|rehabil|kinesi|quiropr/, [["Lesiones y esguinces", "Vuelve a moverte sin dolor, paso a paso."], ["Terapia deportiva", "Para entrenar y competir sin recaer."], ["Espalda y cuello", "Alivio y ejercicios para que no vuelva."], ["Después de una cirugía", "Rehabilitación guiada hasta el alta."]]],
  [/derma|est[eé]tica|piel|l[aá]ser/, [["Consulta dermatológica", "Diagnóstico claro y tratamiento a tu medida."], ["Acné y manchas", "Planes que se sostienen en el tiempo."], ["Medicina estética", "Resultados naturales, sin exagerar."], ["Láser", "Tecnología segura para tu tipo de piel."]]],
  [/veterin/, [["Consulta general", "Revisión completa de tu mascota."], ["Vacunas y desparasitación", "Su carnet al día."], ["Cirugía", "Con anestesia segura y seguimiento."], ["Peluquería", "Baño y corte sin estrés."]]],
  [/[oó]ptica|optom|oftalm/, [["Examen visual", "Medimos tu vista con equipos actuales."], ["Lentes y monturas", "Te ayudamos a elegir los tuyos."], ["Lentes de contacto", "Adaptación y controles."], ["Niños", "Revisiones desde la edad escolar."]]],
  [/m[eé]dic|cl[ií]nica|ginec|cardi|traumat|nutri|gastro|urolog|otorrin|neum/, [["Consulta", "Te escuchamos y te explicamos tu diagnóstico."], ["Exámenes y controles", "Todo coordinado en un solo lugar."], ["Tratamientos", "Un plan claro, con seguimiento."], ["Citas por WhatsApp", "Elige día y hora desde tu celular."]]],
  [/notar/, [["Escrituras", "Compraventas, hipotecas y promesas."], ["Poderes", "Generales y especiales, el mismo día."], ["Declaraciones juramentadas", "Rápidas y sin vueltas."], ["Reconocimiento de firmas", "Con cita o al paso."]]],
  [/contab|contador|tribut|auditor/, [["Declaraciones al SRI", "Al día, sin multas ni sustos."], ["Contabilidad mensual", "Tus números claros cada mes."], ["Nómina e IESS", "Roles, aportes y contratos en orden."], ["Crear tu empresa", "Te acompañamos de principio a fin."]]],
  [/abogad|legal|jur[ií]d|bufete/, [["Familia", "Divorcios, alimentos y tenencia."], ["Contratos y empresas", "Documentos que te protegen."], ["Laboral", "Despidos, liquidaciones y reclamos."], ["Tránsito y penal", "Te defendemos desde el primer momento."]]],
  [/barber/, [["Corte", "Clásico o moderno, como lo pidas."], ["Barba", "Perfilado, navaja y toalla caliente."], ["Corte y barba", "El servicio completo."], ["Niños", "Con paciencia y buen pulso."]]],
  [/spa|masaj/, [["Masajes", "Relajantes, descontracturantes y deportivos."], ["Faciales", "Limpieza profunda e hidratación."], ["Rituales para dos", "Un regalo que se recuerda."], ["Tarjetas de regalo", "Para quien necesita una pausa."]]],
  [/u[ñn]as|manic/, [["Manicure", "Tradicional, semipermanente y acrílicas."], ["Pedicure", "Cuidado completo para tus pies."], ["Diseños", "A mano, a tu gusto."], ["Cejas y pestañas", "Perfilado, lifting y extensiones."]]],
  [/peluquer|sal[oó]n|belleza|estilis/, [["Corte y peinado", "Para todos los días o para tu evento."], ["Color", "Tintes, mechas y balayage."], ["Tratamientos", "Keratina, hidratación y reparación."], ["Maquillaje", "Social, novias y quinceañeras."]]],
  [/gimnas|gym|crossfit|pilates|yoga/, [["Clases", "Horarios desde temprano hasta la noche."], ["Entrenamiento personal", "Un plan hecho para ti."], ["Planes", "Mensual, trimestral y por clase."], ["Primera clase", "Ven a probar sin compromiso."]]],
];

/** Los servicios de ejemplo de este oficio, o undefined si no lo conocemos (entonces van los del rubro en general). */
export const serviciosDeOficio = (rubro: string) => OFICIOS.find(([re]) => re.test(rubro.toLowerCase()))?.[1];

const DETALLE_TONO: Record<Tono, string[]> = {
  salud: ["Revisión completa y plan claro desde el primer día.", "Explicados paso a paso.", "Te acompañamos después de cada sesión.", "Elige día y hora desde tu celular."],
  legal: ["Una primera reunión para entender tu caso.", "Documentos en orden y a tiempo.", "Te representamos con criterio y cercanía.", "Agenda en línea, sin llamadas."],
  belleza: ["Hechos a tu medida, con calma.", "Combinaciones pensadas para ti.", "Lo mejor del mes, con precio especial.", "Escoge tu turno en un minuto."],
  otro: ["Lo que mejor sabemos hacer.", "Simple, claro y a tiempo.", "Lo que siempre nos preguntan.", "Escríbenos y te respondemos hoy."],
};

const BAJADA: Record<Tono, (rubro: string, ciudad: string) => string> = {
  salud: (r, c) => `${r} en ${c}. Agenda tu cita en un minuto, sin llamar.`,
  legal: (r, c) => `${r} en ${c}. Te explicamos tu caso con claridad desde la primera reunión.`,
  belleza: (r, c) => `${r} en ${c}. Mira lo que hacemos y reserva tu turno por WhatsApp.`,
  otro: (r, c) => `${r} en ${c}. Todo lo que necesitas saber, en un solo lugar.`,
};

const GENERICAS = /^(inicio|home|contacto|cont[aá]ctanos|nosotros|qui[eé]nes somos|men[uú]|blog|galer[ií]a|ubicaci[oó]n|bienvenid)/i;
const mayuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Qué plantillas le sirven a cada rubro (sistema/86): «Noche» le queda a una barbería y no a un pediatra. */
export const PLANTILLAS_DE_RUBRO: Record<Tono, PlantillaMuestra[]> = {
  salud: ["grafico", "sereno", "mosaico"],
  legal: ["revista", "sereno", "mosaico"],
  belleza: ["noche", "grafico", "sereno", "revista"],
  otro: ["grafico", "mosaico", "revista"],
};

/** La plantilla elegida, o una fija por negocio, repartida parejo entre las que le sirven a su rubro, para comparar cuál responde mejor. */
export function plantillaDe(p: Pick<Prospecto, "id" | "plantilla" | "rubro">): PlantillaMuestra {
  if (p.plantilla) return p.plantilla;
  const opciones = PLANTILLAS_DE_RUBRO[tonoDe(p.rubro)];
  return opciones[parseInt(createHash("sha256").update(`plantilla:${p.id}`).digest("hex").slice(0, 4), 16) % opciones.length]!;
}

export interface ContenidoMuestra {
  plantilla: PlantillaMuestra;
  /** Sus colores: los del negocio si se conocen, o los de su rubro (sistema/85). */
  paleta: Paleta;
  colorOrigen: "mano" | "web" | "rubro";
  nombre: string;
  rubro: string;
  ciudad: string;
  direccion: string;
  tono: Tono;
  bajada: string;
  /** Lo que dicen de sí mismos en su web, si Sonda lo encontró. */
  propia: boolean;
  servicios: string[];
  /** Una línea por servicio, en el mismo orden («» si el servicio salió de su propia web). */
  detalles: string[];
  estrellas?: number;
  resenas: number;
  telefono?: string;
  mapa?: string;
  /** El horario, ya agrupado («Lunes a viernes», «9:00 – 18:00»). Si no es el de Google, es de ejemplo y la muestra lo dice. */
  horario: [string, string][];
  horarioReal: boolean;
  /** Lo de hoy en Cuenca: «9:00 – 18:00» o «Cerrado». */
  hoy: string;
}

export const HORARIO_EJEMPLO: [string, string][] = [["Lunes a viernes", "9:00 – 18:00"], ["Sábado", "9:00 – 13:00"]];
const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

/** «lunes: 9:00–13:00, 15:00–19:00» → «9:00 – 13:00 y 15:00 – 19:00». */
const horasDe = (linea: string) => {
  const h = linea.slice(linea.indexOf(":") + 1).trim().replace(/[\u2009\u202f]/g, " ").replace(/\s*[–-]\s*/g, " – ").replace(/,\s*/g, " y ");
  return /cerrado|closed/i.test(h) || !h ? "Cerrado" : /24 horas|open 24/i.test(h) ? "Abierto 24 horas" : h;
};

/** Agrupa los días seguidos con las mismas horas: 7 líneas de Google quedan en 2 o 3. Los días cerrados no se listan. */
export function agruparHorario(dias?: string[]): [string, string][] | undefined {
  if (!dias || dias.length !== 7) return undefined;
  const horas = dias.map(horasDe);
  const grupos: [string, string][] = [];
  for (let i = 0; i < 7; ) {
    let j = i;
    while (j + 1 < 7 && horas[j + 1] === horas[i]) j++;
    if (horas[i] !== "Cerrado") grupos.push([j === i ? DIAS[i]! : j === i + 1 ? `${DIAS[i]} y ${DIAS[j]!.toLowerCase()}` : `${DIAS[i]} a ${DIAS[j]!.toLowerCase()}`, horas[i]!]);
    i = j + 1;
  }
  return grupos.length ? grupos : undefined;
}

/** El día de la semana en Cuenca, lunes = 0. */
const diaCuenca = (ahora: Date) => (new Date(ahora.toLocaleString("en-US", { timeZone: "America/Guayaquil" })).getDay() + 6) % 7;

/** Lo que muestra la página: nada inventado sobre el negocio salvo textos de ejemplo, que se dicen como tales. */
export function contenidoMuestra(p: Prospecto, ahora = new Date()): ContenidoMuestra {
  const tono = tonoDe(p.rubro);
  const real = agruparHorario(p.horario);
  const sonda = p.revision?.estado === "ok" ? p.revision.sonda : undefined;
  const propias = (sonda?.secciones ?? [])
    .map((s) => s.trim())
    .filter((s) => s.length >= 3 && s.length <= 40 && !GENERICAS.test(s) && s.toLowerCase() !== p.nombre.toLowerCase());
  const oficio = serviciosDeOficio(p.rubro) ?? SERVICIOS[tono].map((s, i): [string, string] => [s, DETALLE_TONO[tono][i] ?? ""]);
  const pares: [string, string][] = [...propias.map((s): [string, string] => [s, ""]), ...oficio.filter(([s]) => !propias.includes(s))].slice(0, 4);
  const servicios = pares.map(([s]) => s);
  const descripcion = sonda?.descripcion?.trim();
  const plantilla = plantillaDe(p);
  const { color, origen } = colorDe(p, tono);
  return {
    plantilla,
    paleta: paletaDe(plantilla, tono, color),
    colorOrigen: origen,
    nombre: nombreDe(p),
    rubro: mayuscula(p.rubro),
    ciudad: p.ciudad,
    direccion: p.direccion,
    tono,
    bajada: descripcion && descripcion.length <= 180 ? descripcion : BAJADA[tono](mayuscula(p.rubro), p.ciudad),
    propia: !!descripcion,
    servicios,
    detalles: pares.map(([, d]) => d),
    estrellas: p.estrellas,
    resenas: p.resenas ?? 0,
    telefono: p.telefono,
    mapa: p.mapa,
    horario: real ?? HORARIO_EJEMPLO,
    horarioReal: !!real,
    hoy: real ? horasDe(p.horario![diaCuenca(ahora)]!) : HORARIO_EJEMPLO[0]![1],
  };
}

/** Cada cuánto una vista nueva cuenta como otra visita (y vuelve a avisar). */
export const PAUSA_VISITA_MS = 30 * 60 * 1000;

/** Anota que el negocio abrió su muestra. Devuelve si hay que avisar (primera vez o vuelve después de un rato). */
export function anotarVista(p: Prospecto, ahora = new Date()) {
  const m = (p.muestra ??= { vistas: 0 });
  const antes = m.ultima ? Date.parse(m.ultima) : 0;
  const nueva = !antes || ahora.getTime() - antes > PAUSA_VISITA_MS;
  const primera = !m.primera;
  m.vistas += 1;
  m.primera ??= ahora.toISOString();
  m.ultima = ahora.toISOString();
  if (nueva) (p.historial ??= []).push({ cuando: ahora.toISOString(), que: primera ? "Abrió su muestra" : "Volvió a ver su muestra" });
  return { avisar: nueva, primera };
}

/** Tocó «Quiero esta web» en la muestra: la señal más fuerte. */
export function anotarQuiere(p: Prospecto, ahora = new Date()) {
  const m = (p.muestra ??= { vistas: 0 });
  const ya = !!m.quiere;
  m.quiere = ahora.toISOString();
  if (!ya) (p.historial ??= []).push({ cuando: ahora.toISOString(), que: "Tocó «Quiero esta web» en su muestra" });
  return { avisar: !ya };
}

// Seguimiento y propuesta (sistema/80).

/** Días sin respuesta antes del único recordatorio. */
export const DIAS_SEGUIMIENTO = 3;

/** Cuándo se le escribió por primera vez. */
export const contactadoEn = (p: Pick<Prospecto, "historial">) => p.historial?.find((h) => h.que === "Pasó a «Contactado»")?.cuando;

/** Le toca el recordatorio: se le escribió hace 3 días o más, no respondió, no pidió la web y no se le recordó todavía. */
export function tocaSeguimiento(p: Prospecto, ahora = new Date()) {
  const desde = contactadoEn(p);
  if (p.estado !== "contactado" || p.seguimiento || p.muestra?.quiere || p.propuesta?.acepto || !desde) return false;
  return ahora.getTime() - Date.parse(desde) >= DIAS_SEGUIMIENTO * 24 * 60 * 60 * 1000;
}

/** El recordatorio: corto, sin presión, con la muestra y la propuesta. */
export function mensajeSeguimiento(p: Pick<Prospecto, "nombre" | "alias" | "muestra">, firma: string, muestra: string, propuesta: string) {
  const vio = p.muestra?.vistas ? "Vi que alcanzaron a abrir la idea de web que les preparé." : `Hace unos días les mandé una idea de web para ${nombreDe(p)}: ${muestra}`;
  return `Hola de nuevo. ${vio} Si les interesa, aquí está la propuesta con precio, plazos y lo que incluye: ${propuesta}\n\nSi no es el momento, no hay problema. ¡Gracias!\n\n${firma}`;
}

// Fotos del negocio (sistema/82): las sube el propio negocio desde su muestra, y la muestra se rehace con ellas.
export const FOTOS_MAX = 3;
export const FOTO_BYTES_MAX = 1_500_000;
/** Dónde vive cada foto en la nube privada. `n` va de 1 a FOTOS_MAX. */
export const rutaFoto = (idDeMuestra: string, n: number) => `_fotos/${idDeMuestra}/${n}.jpg`;
/** Un JPEG de verdad (empieza con FF D8 FF) y de tamaño razonable. El navegador ya la achica antes de subirla. */
export const fotoValida = (b: Uint8Array) => b.length > 1000 && b.length <= FOTO_BYTES_MAX && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;

/** El negocio subió la foto `n`. Devuelve si hay que avisar (solo la primera vez). */
export function anotarFoto(p: Prospecto, n: number, total?: number, ahora = new Date()) {
  const primera = !p.fotos;
  // La última de una tanda fija cuántas quedan: si antes había 3 y ahora sube 1, se ve solo la nueva.
  p.fotos = Math.min(FOTOS_MAX, total && n === total ? total : Math.max(p.fotos ?? 0, n));
  if (primera) (p.historial ??= []).push({ cuando: ahora.toISOString(), que: "Subió fotos a su muestra" });
  p.actualizado = ahora.toISOString();
  return { avisar: primera };
}

/** Lo que cuesta la web de este negocio: su precio a mano o el de la oferta (sistema/82). */
export const precioDe = (p: Pick<Prospecto, "precio">, deOferta: number) => p.precio ?? deOferta;

/** El mensaje para cobrar el primer pago a quien aceptó (sistema/81). No lleva datos bancarios: los pasa Jay en el chat. */
export function mensajeCobro(nombre: string, firma: string, total: number, conIva: boolean) {
  const mitad = Math.round(total / 2);
  return `¡Gracias por aceptar la propuesta! Para empezar la web de ${nombre}, el primer pago es USD ${mitad}${conIva ? " + IVA" : ""} (50 %). ¿Te paso los datos para la transferencia?\n\n${firma}`;
}

/** Cómo le va a cada plantilla (sistema/81): de las muestras enviadas, cuántas se abrieron, pidieron la web y aceptaron. */
export function resultadosPlantillas(prospectos: Prospecto[]) {
  const fila = () => ({ enviadas: 0, abiertas: 0, quieren: 0, aceptaron: 0 });
  const r = Object.fromEntries(ORDEN_PLANTILLAS.map((x) => [x, fila()])) as Record<PlantillaMuestra, ReturnType<typeof fila>>;
  for (const p of prospectos) {
    if (!contactadoEn(p)) continue;
    const f = r[plantillaDe(p)];
    f.enviadas++;
    if (p.muestra?.vistas) f.abiertas++;
    if (p.muestra?.quiere) f.quieren++;
    if (p.propuesta?.acepto) f.aceptaron++;
  }
  return r;
}

/** Abrió su propuesta o tocó «Aceptar». Devuelve si hay que avisar. */
export function anotarPropuesta(p: Prospecto, accion: "vista" | "acepto", ahora = new Date()) {
  const pr = (p.propuesta ??= { vistas: 0 });
  if (accion === "acepto") {
    const ya = !!pr.acepto;
    pr.acepto ??= ahora.toISOString();
    if (!ya) {
      (p.historial ??= []).push({ cuando: ahora.toISOString(), que: "Aceptó la propuesta" });
      if (p.estado === "nuevo" || p.estado === "contactado") p.estado = "respondio";
    }
    return { avisar: !ya };
  }
  const antes = pr.ultima ? Date.parse(pr.ultima) : 0;
  const nueva = !antes || ahora.getTime() - antes > PAUSA_VISITA_MS;
  pr.vistas += 1;
  pr.ultima = ahora.toISOString();
  if (nueva) (p.historial ??= []).push({ cuando: ahora.toISOString(), que: "Abrió su propuesta" });
  return { avisar: nueva };
}
