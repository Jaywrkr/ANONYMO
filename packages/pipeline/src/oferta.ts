// Lo que vende ANONYMO a los negocios que encuentra Imán (sistema/72). Una sola oferta clara; los extras van en la propuesta.
// Decidido por Jay el 11 nov 2026. Si cambia, se cambia aquí y en docs/oferta.md.

export const OFERTA = {
  web: {
    nombre: "Web ANONYMO",
    precio: 390,
    dias: 7,
    rondas: 2,
    incluye: [
      "Una página completa: inicio, servicios, quiénes son, horarios, ubicación con mapa y botón de WhatsApp",
      "Parte de la muestra que ya vio el cliente",
      "Los textos los escribimos nosotros; el cliente solo revisa",
      "Se ve bien en celular, carga rápido y tiene lo básico para salir en Google",
      "Dominio .com el primer año",
    ],
    pago: "50 % al aceptar y 50 % al publicar",
  },
  plan: {
    nombre: "Plan mensual",
    precio: 19,
    primerMesGratis: true,
    incluye: ["Hosting, dominio, seguridad y copias", "Un cambio pequeño al mes", "Informe mensual de visitas y clics a WhatsApp"],
  },
  extras: [
    { nombre: "Sesión de fotos con Luna", precio: 150 },
    { nombre: "Página extra (un servicio con su propia página)", precio: 60 },
  ],
  /** Los precios se dicen «+ IVA». */
  iva: true,
} as const;

/** Los planes mensuales de la web (sistema/98). Decididos por Jay el 21 nov 2026. Cuidado es el plan de siempre. */
export type PlanMensual = "cuidado" | "autonomo" | "pro";
export const PLANES: Record<PlanMensual, { nombre: string; precio: number; editaCliente: boolean; asistente: false | "respuestas" | "ia"; cambiosNuestros: number; incluye: string[] }> = {
  cuidado: { nombre: "Cuidado", precio: 19, editaCliente: false, asistente: false, cambiosNuestros: 1, incluye: ["Hosting, dominio, seguridad y copias", "Un cambio pequeño al mes, lo hacemos nosotros", "Informe mensual de visitas y clics a WhatsApp"] },
  autonomo: { nombre: "Autónomo", precio: 29, editaCliente: true, asistente: "respuestas", cambiosNuestros: 1, incluye: ["Todo lo de Cuidado", "Cambias tú mismo textos, fotos, horario y precios, cuando quieras", "Asistente en tu web que responde con tus propias respuestas"] },
  pro: { nombre: "Pro", precio: 49, editaCliente: true, asistente: "ia", cambiosNuestros: 2, incluye: ["Todo lo de Autónomo", "Asistente con IA, con un tope de mensajes al mes", "Dos cambios al mes hechos por nosotros"] },
};
export const ORDEN_PLANES = Object.keys(PLANES) as PlanMensual[];
export const esPlan = (x: unknown): x is PlanMensual => typeof x === "string" && x in PLANES;

/** «USD 390 + IVA». */
export const precio = (n: number) => `USD ${n}${OFERTA.iva ? " + IVA" : ""}`;
