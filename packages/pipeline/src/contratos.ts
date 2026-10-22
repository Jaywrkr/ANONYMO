// Qué recibe y qué entrega cada agente en cada fase. Una entrada por agente y fase (28).
import type { Contrato, TareaId } from "./tipos.ts";

export const CONTRATOS: Contrato[] = [
  // 1 · Arranque
  {
    id: "1.atlas", fase: 1, agente: "atlas", entrega: "Plan del proyecto", formato: "md", usa: [],
    objetivo: "Leer el pedido, decidir qué fases aplican y por qué, poner fechas y nombrar los riesgos.",
    criterios: ["Cada fase tiene una razón", "Cada entrega tiene un responsable y una fecha", "Lista corta de preguntas para el cliente"],
  },
  {
    id: "1.sonda", fase: 1, agente: "sonda", entrega: "Investigación", formato: "md", usa: [], herramientas: ["web"],
    objetivo: "Mapear competencia y público del cliente y encontrar el espacio libre.",
    criterios: ["Cinco referencias reales con enlace", "Quién es el público y qué le importa", "Una oportunidad concreta"],
  },
  {
    id: "1.nova", fase: 1, agente: "nova", entrega: "Brief de marca", formato: "md", usa: ["1.sonda"],
    objetivo: "Resumir por qué alguien elegiría a este cliente y cómo debe sentirse la marca.",
    criterios: ["Propuesta en una frase", "Tres palabras de personalidad", "Qué no es la marca"],
  },
  {
    id: "1.ledger", fase: 1, agente: "ledger", entrega: "Presupuesto", formato: "md", usa: ["1.atlas"],
    objetivo: "Poner precio por fase con margen y condiciones de pago.",
    criterios: ["Costo y precio por fase", "Margen visible", "Qué está incluido y qué no"],
  },

  // 2 · Naming
  {
    id: "2.verba", fase: 2, agente: "verba", entrega: "Lista de nombres", formato: "md", usa: ["1.nova"],
    objetivo: "Generar nombres que se digan fácil y elegir cinco finalistas.",
    criterios: ["Treinta opciones", "Cinco finalistas con su razón", "Se pronuncian bien en español e inglés"],
  },
  {
    id: "2.rhea", fase: 2, agente: "rhea", entrega: "Frase por finalista", formato: "md", usa: ["1.nova", "2.verba"],
    objetivo: "Darle a cada finalista una frase que lo haga entender en segundos.",
    criterios: ["Una frase por finalista", "Menos de ocho palabras", "Cero jerga"],
  },
  {
    id: "2.sonda", fase: 2, agente: "sonda", entrega: "Chequeo de dominios y redes", formato: "md", usa: ["2.verba"], herramientas: ["dominios", "redes"],
    objetivo: "Confirmar qué finalistas tienen dominio, @usuario y marca libres.",
    criterios: ["Dominio .com y local por finalista", "@usuario en Instagram y TikTok", "Riesgo de marca registrada"],
  },

  // 3 · Identidad
  {
    id: "3.mira", fase: 3, agente: "mira", entrega: "Sistema visual", formato: "md", usa: ["1.nova", "2.verba"], herramientas: ["imagen"],
    objetivo: "Proponer logo, color y tipografía que funcionen de 16 px a un edificio.",
    criterios: ["Tres rutas de logo", "Paleta con contraste accesible", "Tipografías con licencia"],
  },
  {
    id: "3.rhea", fase: 3, agente: "rhea", entrega: "Tono de voz", formato: "md", usa: ["1.nova"],
    objetivo: "Escribir el manifiesto y las reglas de cómo habla la marca.",
    criterios: ["Manifiesto de menos de 80 palabras", "Cinco reglas con ejemplo sí/no", "Frases para web y redes"],
  },
  {
    id: "3.kine", fase: 3, agente: "kine", entrega: "Logo animado", formato: "md", usa: ["3.mira"],
    objetivo: "Definir cómo se mueve el logo: guion cuadro a cuadro y curvas.",
    criterios: ["Duración y curvas definidas", "Versión corta para redes", "Movimiento con razón, no decoración"],
  },
  {
    id: "3.eco", fase: 3, agente: "eco", entrega: "Logo sonoro", formato: "md", usa: ["3.mira", "3.rhea"],
    objetivo: "Proponer la firma sonora de la marca.",
    criterios: ["Duración menor a 2 s", "Referencias sonoras", "Cuándo suena y cuándo no"],
  },

  // 4 · Web
  {
    id: "4.orla", fase: 4, agente: "orla", entrega: "Diseño de la web", formato: "md", usa: ["1.nova", "1.sonda", "3.mira", "3.rhea"],
    objetivo: "Definir páginas, secciones, jerarquía y la idea visual que la hace memorable.",
    criterios: ["Mapa del sitio", "Contenido por sección", "Una idea central que un jurado recuerde"],
  },
  {
    id: "4.lumen", fase: 4, agente: "lumen", entrega: "Concepto 3D", formato: "md", usa: ["4.orla"],
    objetivo: "Proponer la interacción o escena 3D que sostiene la idea central sin matar el rendimiento.",
    criterios: ["Qué se toca y qué responde", "Plan para celulares", "Presupuesto de rendimiento"],
  },
  {
    id: "4.vector", fase: 4, agente: "vector", entrega: "Web construida", formato: "md", usa: ["4.orla", "4.lumen", "4.kine"], herramientas: ["web"],
    objetivo: "Construir la web en Next.js a partir del diseño.",
    criterios: ["Compila sin errores", "Responde en celular", "Accesibilidad sin errores graves"],
  },
  {
    id: "4.kine", fase: 4, agente: "kine", entrega: "Sistema de movimiento", formato: "md", usa: ["4.orla"],
    objetivo: "Definir transiciones, scroll y microinteracciones.",
    criterios: ["Tres duraciones y dos curvas", "Respeta reducir movimiento", "Ejemplo por tipo de interacción"],
  },
  {
    id: "4.eco", fase: 4, agente: "eco", entrega: "Sonidos de la web", formato: "md", usa: ["4.orla"],
    objetivo: "Proponer sonidos de interfaz, apagados por defecto.",
    criterios: ["Lista de eventos con sonido", "Apagado por defecto", "Peso total pequeño"],
  },
  {
    id: "4.tempo", fase: 4, agente: "tempo", entrega: "Calendario y riesgos", formato: "md", usa: ["1.atlas", "4.orla", "4.lumen", "4.vector"],
    objetivo: "Poner fechas reales a la construcción y avisar qué puede atrasarla.",
    criterios: ["Fecha por entrega", "Tres riesgos con plan B", "Qué necesita del cliente y cuándo"],
  },

  // 5 · Lanzamiento
  {
    id: "5.faro", fase: 5, agente: "faro", entrega: "Plan de contenido", formato: "md", usa: ["1.nova", "3.rhea"],
    objetivo: "Armar series de contenido para las primeras cuatro semanas.",
    criterios: ["Dos o tres series con nombre", "Calendario semanal", "Una pieza ancla de lanzamiento"],
  },
  {
    id: "5.chispa", fase: 5, agente: "chispa", entrega: "Cuentas y comunidad", formato: "md", usa: ["5.faro", "3.rhea"], herramientas: ["redes"],
    objetivo: "Dejar listas las cuentas y las respuestas tipo.",
    criterios: ["Bio por red", "Diez respuestas tipo", "Qué no se responde"],
  },
  {
    id: "5.lente", fase: 5, agente: "lente", entrega: "Plan de shooting", formato: "md", usa: ["3.mira", "5.faro"],
    objetivo: "Definir moodboard, lista de tomas y logística del shooting.",
    criterios: ["Moodboard con referencias", "Lista de tomas", "Locación, luz y horario"],
  },
  {
    id: "5.corte", fase: 5, agente: "corte", entrega: "Guiones de video", formato: "md", usa: ["5.faro", "5.lente"],
    objetivo: "Escribir los guiones de los reels de lanzamiento.",
    criterios: ["Gancho en 3 s", "Duración por pieza", "Tomas que salen del shooting"],
  },
  {
    id: "5.escena", fase: 5, agente: "escena", entrega: "Evento de lanzamiento", formato: "md", usa: ["1.nova", "5.faro"],
    objetivo: "Proponer el evento: formato, lugar, momento grabable y presupuesto.",
    criterios: ["Un momento que la gente grabe", "Presupuesto aproximado", "Lista de invitados por tipo"],
  },

  // 6 · Jurado
  {
    id: "6.prisma", fase: 6, agente: "prisma", entrega: "Informe de calidad", formato: "md", usa: ["4.vector"], herramientas: ["lighthouse"],
    objetivo: "Medir rendimiento, accesibilidad y SEO y listar lo que hay que arreglar.",
    criterios: ["Puntajes por página", "Errores graves en cero", "Lista de arreglos por prioridad"],
  },
  {
    id: "6.trofeo", fase: 6, agente: "trofeo", entrega: "Nota del jurado", formato: "json", usa: "todo",
    objetivo: "Calificar como Awwwards: diseño 40, usabilidad 30, creatividad 20, contenido 10.",
    criterios: ["Nota por criterio con razón", "Nota final ponderada", "Tres arreglos que más suben la nota"],
  },
  {
    id: "6.pulso", fase: 6, agente: "pulso", entrega: "Tablero de métricas", formato: "md", usa: ["1.nova", "5.faro"],
    objetivo: "Definir qué se mide desde el día uno y cómo se lee.",
    criterios: ["Cinco métricas con meta", "Dónde se miden", "Cada cuánto se revisan"],
  },

  // 7 · Crecimiento
  {
    id: "7.iman", fase: 7, agente: "iman", entrega: "Siguiente propuesta", formato: "md", usa: ["1.nova", "6.trofeo", "6.pulso"],
    objetivo: "Proponer al cliente el siguiente paso con valor claro.",
    criterios: ["Un resultado medible", "Precio y plazo", "Por qué ahora"],
  },
  {
    id: "7.ledger", fase: 7, agente: "ledger", entrega: "Cierre financiero", formato: "md", usa: ["1.ledger"],
    objetivo: "Comparar presupuesto contra lo real y decir si el proyecto dejó margen.",
    criterios: ["Presupuesto vs real", "Margen final", "Qué cobrar distinto la próxima vez"],
  },
  {
    id: "7.atlas", fase: 7, agente: "atlas", entrega: "Cierre del proyecto", formato: "md", usa: "todo",
    objetivo: "Resumir qué se entregó, qué aprendió el equipo y qué cambia en el proceso.",
    criterios: ["Lista de entregas", "Tres aprendizajes", "Un cambio al proceso"],
  },
];

export const contratoPorId = (id: TareaId) => CONTRATOS.find((c) => c.id === id);
export const contratosDeFase = (fase: number) => CONTRATOS.filter((c) => c.fase === fase);

/** Ordena las tareas de las fases elegidas: por fase y, dentro de cada una, después de lo que usan. */
export function ordenar(fases: number[]): TareaId[] {
  const orden: TareaId[] = [];
  for (const f of [...fases].sort((a, b) => a - b)) {
    const pendientes = contratosDeFase(f);
    const hechos = new Set(orden);
    while (pendientes.length) {
      const i = pendientes.findIndex((c) =>
        c.usa === "todo" ? pendientes.every((o) => o === c || o.usa === "todo") : c.usa.every((u) => hechos.has(u) || !pendientes.some((p) => p.id === u)),
      );
      if (i === -1) throw new Error(`Dependencia circular en la fase ${f}`);
      const [c] = pendientes.splice(i, 1);
      orden.push(c.id);
      hechos.add(c.id);
    }
  }
  return orden;
}

/** Qué entregas lee una tarea, dentro de un plan concreto. */
export function lecturas(id: TareaId, plan: TareaId[]): TareaId[] {
  const c = contratoPorId(id);
  if (!c) return [];
  const antes = plan.slice(0, plan.indexOf(id));
  return c.usa === "todo" ? antes : c.usa.filter((u) => antes.includes(u));
}
