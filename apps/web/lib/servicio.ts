// Lo que recibe un cliente en cada fase. Duraciones típicas: propuesta para que Jay y Luna ajusten.
export const SERVICIO: Record<number, { entrega: string[]; dura: string }> = {
  1: { entrega: ["Brief de marca", "Plan por fases", "Presupuesto"], dura: "3 a 5 días" },
  2: { entrega: ["Nombre", "Dominios reservados", "Chequeo de redes y marca"], dura: "1 semana" },
  3: { entrega: ["Logo y sistema visual", "Tono de voz", "Logo animado y sonoro"], dura: "2 semanas" },
  4: { entrega: ["Diseño de la web", "Desarrollo y 3D", "Web publicada"], dura: "3 a 5 semanas" },
  5: { entrega: ["Plan de contenido", "Shooting y video", "Evento de lanzamiento"], dura: "2 a 3 semanas" },
  6: { entrega: ["Informe de calidad", "Postulación a premios", "Tablero de métricas"], dura: "1 semana" },
  7: { entrega: ["Lectura de resultados", "Siguiente paso", "Mantenimiento"], dura: "Continuo" },
};

/** Qué fases despierta cada tipo de pedido en el formulario de contacto. */
export const PEDIDOS: Record<string, { nombre: string; fases: number[] }> = {
  web: { nombre: "Una web", fases: [1, 4, 6] },
  marca: { nombre: "Una marca", fases: [1, 2, 3] },
  lanzamiento: { nombre: "Un lanzamiento", fases: [1, 5, 6] },
  todo: { nombre: "Todo, desde cero", fases: [1, 2, 3, 4, 5, 6, 7] },
};
