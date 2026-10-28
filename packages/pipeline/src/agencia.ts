// Cómo trabaja la agencia (sistema/29): todos los agentes lo leen antes de cada entrega.
// Se puede reemplazar sin tocar código con la variable ANONYMO_COMO_TRABAJAMOS.

export const COMO_TRABAJAMOS =
  process.env.ANONYMO_COMO_TRABAJAMOS ??
  [
    "Cómo trabaja esta agencia: producimos con IA en cada paso. Lo que una agencia tradicional hace en semanas, aquí se hace en días.",
    "Referencia: una web completa, con la dirección de arte ya aprobada, toma unos 3 días de trabajo de Jay. Planifica, calcula horas y pon fechas con esos tiempos reales, nunca con los de una agencia tradicional.",
    "Lo que la IA no acelera se cuenta aparte y con su tiempo real: sesiones de fotos, esperar contenidos o aprobaciones del cliente, reuniones.",
    "Mercado: Ecuador. Precios accesibles para un negocio local, porque producimos rápido; pero la calidad es de nivel Awwwards: que se vea hermoso y cuidado al detalle. Awwwards es la vara de belleza, no una razón para sumar horas.",
  ].join("\n");

/** Tarifa por hora de Jay, si está configurada (TARIFA_HORA en las variables). */
export const tarifaHora = () => Number(process.env.TARIFA_HORA ?? 0) || undefined;
