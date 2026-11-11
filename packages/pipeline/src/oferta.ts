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

/** «USD 390 + IVA». */
export const precio = (n: number) => `USD ${n}${OFERTA.iva ? " + IVA" : ""}`;
