// La propuesta para el cliente (sistema/35): un borrador armado con lo que ya sabe el equipo,
// que Jay o Luna editan y descargan. Nada de IA aquí: lo arma al instante y es predecible.
import { FASES, HORAS_FASE, SERVICIO } from "@anonymo/agentes";
import { calendario, leerEntrega, presupuestoVivo, type Propuesta, type Proyecto } from "@anonymo/pipeline";

const QUIENES = `Anonymo* es un estudio creativo de Quito. Somos Jay y Luna, con un equipo de agentes que hace en días lo que antes tomaba meses: estrategia, nombre, identidad, web y lanzamiento, bajo una sola dirección de arte.

Trabajamos por fases cortas y con revisiones claras: en cada pausa ves lo hecho, opinas, y recién ahí seguimos. Todo queda en tu portal privado.`;

/** El primer párrafo con contenido de una entrega, sin títulos ni listas. */
function primerParrafo(md?: string) {
  if (!md) return "";
  return md.split(/\n{2,}/).map((b) => b.trim()).find((b) => b && !b.startsWith("#") && !b.startsWith("|") && !b.startsWith("-") && !b.startsWith("*") && b.length > 60)?.replace(/\*\*/g, "") ?? "";
}

/** Una sección de una entrega por su título (## …). */
function seccion(md: string | undefined, titulo: RegExp) {
  if (!md) return "";
  const partes = md.split(/\n(?=#{1,3} )/);
  const s = partes.find((x) => titulo.test(x.split("\n")[0]));
  const t = s ? s.split("\n").slice(1).join("\n").trim() : "";
  // Las entregas de prueba dicen «Pendiente: …»: eso no va al cliente.
  return /^pendiente\b/i.test(t) || t.length < 30 ? "" : t;
}

const redondear = (x: number) => Math.round(x / 10) * 10;

export function borradorPropuesta(p: Proyecto): Propuesta {
  const atlas = leerEntrega(p.pedido.id, "1.atlas")?.contenido;
  const nova = leerEntrega(p.pedido.id, "1.nova")?.contenido;
  const b = presupuestoVivo(p);
  const fases = p.plan.fases.filter((f) => f !== 6 && f !== 7 ? true : p.plan.fases.length <= 2);
  // Reparte las horas del proyecto entre las fases, según lo que suele pesar cada una.
  const peso = (f: number) => { const [a, z] = HORAS_FASE[f] ?? [1, 2]; return (a + z) / 2; };
  const totalPeso = fases.reduce((s, f) => s + peso(f), 0) || 1;
  const horas = b.total ?? fases.reduce((s, f) => s + peso(f), 0);
  const tarifa = b.tarifa ?? 0;
  const items = fases.map((f) => {
    const h = (horas * peso(f)) / totalPeso;
    return {
      concepto: `${FASES.find((x) => x.n === f)?.nombre ?? `Fase ${f}`}`,
      detalle: (SERVICIO[f]?.entrega ?? []).join(" · "),
      precio: tarifa ? redondear(h * tarifa) : Math.round(h),
    };
  });
  const tramos = calendario(p);
  const tiempos = tramos.length
    ? tramos.map((t) => `${t.nombre}: del ${fecha(t.inicio)} al ${fecha(t.fin)}`).join("\n")
    : fases.map((f) => `${FASES.find((x) => x.n === f)?.nombre}: ${SERVICIO[f]?.dura ?? ""}`).join("\n");
  const entendimos = seccion(atlas, /pidi[oó]|resumen/i) || primerParrafo(nova) || p.pedido.descripcion;
  const haremos = seccion(atlas, /qu[eé] entra/i) || fases.map((f) => `- ${FASES.find((x) => x.n === f)?.nombre}: ${FASES.find((x) => x.n === f)?.objetivo}`).join("\n");
  return {
    titulo: `Propuesta para ${p.pedido.cliente}`,
    intro: `Gracias por pensar en nosotros. Aquí va lo que entendimos, lo que haríamos y cuánto cuesta. Todo se puede conversar.`,
    quienes: QUIENES,
    entendimos,
    haremos,
    entregables: fases.flatMap((f) => SERVICIO[f]?.entrega ?? []).map((e) => `- ${e}`).join("\n"),
    tiempos,
    items,
    condiciones: "50 % para empezar y 50 % contra entrega final.\nIncluye dos rondas de cambios por fase; lo adicional se cotiza aparte.\nLos costos de terceros (dominio, hosting, fotografía, pauta) no están incluidos.",
    validez: "Esta propuesta es válida por 30 días.",
    actualizado: new Date().toISOString(),
  };
}

const fecha = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("es-EC", { day: "numeric", month: "long" });

/** La propuesta guardada o, si no hay, el borrador. */
export const propuestaDe = (p: Proyecto) => ({ propuesta: p.propuesta ?? borradorPropuesta(p), guardada: !!p.propuesta, enHoras: !presupuestoVivo(p).tarifa });

export const dinero = (n: number) => `$${n.toLocaleString("es-EC", { maximumFractionDigits: 0 })}`;
