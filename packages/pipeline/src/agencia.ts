// Cómo trabaja la agencia (sistema/29): todos los agentes lo leen antes de cada entrega.
// Se puede reemplazar sin tocar código con la variable ANONYMO_COMO_TRABAJAMOS.

export const COMO_TRABAJAMOS =
  process.env.ANONYMO_COMO_TRABAJAMOS ??
  [
    "Cómo trabaja esta agencia: producimos con IA en cada paso. Lo que una agencia tradicional hace en semanas, aquí se hace en días.",
    "Horas reales de Jay con IA (úsalas como techo, no como piso): una web informativa completa, de la dirección de arte a publicada, toma 12 a 20 horas. Si son dos webs parecidas, la segunda comparte diseño y código: suma un 40 %, no el doble (dos webs ≈ 25 a 35 horas, nunca más de 40). Logo y sistema de marca: 6 a 10 horas. Naming: 2 a 4 horas. Plan de contenido: 3 a 6 horas.",
    "Si dudas entre dos números, elige el menor: Jay es rápido. Planifica y pon fechas con estos tiempos, nunca con los de una agencia tradicional.",
    "Lo que la IA no acelera se cuenta aparte y con su tiempo real: sesiones de fotos, esperar contenidos o aprobaciones del cliente, reuniones.",
    "Mercado: Ecuador. Precios accesibles para un negocio local, porque producimos rápido; pero la calidad es de nivel Awwwards: que se vea hermoso y cuidado al detalle. Awwwards es la vara de belleza, no una razón para sumar horas.",
  ].join("\n");

/** Tarifa por hora de Jay, si está configurada (TARIFA_HORA en las variables). */
export const tarifaHora = () => Number(process.env.TARIFA_HORA ?? 0) || undefined;
