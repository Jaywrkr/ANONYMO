// Lo que cada agente dice en el proyecto actual: la propia agencia. Con un cliente, este archivo lo llena el pipeline.
export type Estado = "listo" | "en-curso" | "por-empezar";

export interface Mensaje {
  estado: Estado;
  dice: string;
  necesita: string;
  entrega: string;
}

export const PROYECTO = {
  nombre: "Nuestra agencia",
  mensajes: {
    1: {
      atlas: { estado: "listo", dice: "El plan está listo: 22 agentes, 7 fases y lanzamiento el 14 de diciembre. Hoy el cuello de botella es el nombre.", necesita: "Que elijan el nombre esta semana.", entrega: "Plan maestro" },
      ledger: { estado: "por-empezar", dice: "Todavía no tengo números. Para poner precio necesito saber cuánto vale su tiempo y qué herramientas pagamos.", necesita: "Tarifa objetivo y costos fijos al mes.", entrega: "Modelo de precios" },
      sonda: { estado: "listo", dice: "En Ecuador las agencias más premiadas hacen publicidad. Ninguna se presenta como estudio de webs de nivel premio. Ese espacio está libre.", necesita: "Tres marcas que Luna admire y tres clientes soñados.", entrega: "Referencias y mapa de competencia" },
      nova: { estado: "en-curso", dice: "La agencia vende la precisión de un ingeniero con la energía de una productora de eventos.", necesita: "Que Luna lea el brief.", entrega: "Brief de marca" },
    },
    2: {
      verba: { estado: "en-curso", dice: "Revisé más de 250 dominios y me quedé con 108 libres. Mi favorito hoy es Corsivo: tipografía en movimiento, suena italiano y tiene tres dominios libres.", necesita: "Marquen Sí, Quizás o No en la matriz.", entrega: "Matriz de 108 nombres" },
      rhea: { estado: "en-curso", dice: "Cada finalista necesita su frase. Corsivo: diseño con inclinación. Lucciola: brillamos de noche.", necesita: "El tono: elegante, juguetón o directo.", entrega: "Frase por finalista" },
      sonda: { estado: "por-empezar", dice: "Falta revisar Instagram y SENADI antes de comprar el dominio.", necesita: "Los tres finalistas.", entrega: "Chequeo de redes y marca" },
    },
    3: {
      mira: { estado: "por-empezar", dice: "Arranco el logo el día que haya nombre, dentro de esta dirección de arte.", necesita: "El nombre elegido.", entrega: "Tres propuestas de logo" },
      rhea: { estado: "por-empezar", dice: "Manifiesto y tono: frases cortas, palabras comunes, cero jerga.", necesita: "Tres palabras que describan la agencia.", entrega: "Manifiesto y guía de tono" },
      kine: { estado: "por-empezar", dice: "El logo tiene que moverse como estos agentes: con peso, no con fade.", necesita: "El logo en vector.", entrega: "Logo animado" },
      eco: { estado: "por-empezar", dice: "Una firma de dos notas: una por Jay, una por Luna. Solo suena si el visitante la activa.", necesita: "Nada por ahora.", entrega: "Logo sonoro" },
    },
    4: {
      orla: { estado: "en-curso", dice: "Esta web es el primer caso: base calma, tipografía de póster y el color solo en los agentes.", necesita: "Su visto bueno a la dirección de arte.", entrega: "Diseño de la web" },
      lumen: { estado: "en-curso", dice: "Un solo contexto 3D para toda la web. Los 22 agentes comparten lienzo para que corra en un celular.", necesita: "Nada por ahora.", entrega: "Escena 3D" },
      vector: { estado: "en-curso", dice: "Next.js, Tailwind y React Three Fiber. Cada fase en su rama.", necesita: "Acceso al dominio cuando exista.", entrega: "Web publicada" },
      kine: { estado: "por-empezar", dice: "Transiciones entre fases como una repetición de jugada.", necesita: "Nada por ahora.", entrega: "Sistema de movimiento" },
      eco: { estado: "por-empezar", dice: "Sonidos de interfaz suaves, apagados por defecto.", necesita: "Nada por ahora.", entrega: "Sonidos de la web" },
      tempo: { estado: "en-curso", dice: "Si el nombre se decide hasta el 26 de octubre, la web sale el 14 de diciembre.", necesita: "La decisión del nombre.", entrega: "Calendario y riesgos" },
    },
    5: {
      faro: { estado: "por-empezar", dice: "Lanzamiento en serie: un agente por día, 22 piezas.", necesita: "Fecha de lanzamiento.", entrega: "Plan de contenido" },
      chispa: { estado: "por-empezar", dice: "El mismo @usuario en Instagram, TikTok y LinkedIn.", necesita: "El @usuario reservado.", entrega: "Cuentas listas" },
      lente: { estado: "por-empezar", dice: "Retratos de Jay y Luna en blanco y negro con el color de cada área.", necesita: "Fecha y locación en Cuenca.", entrega: "Fotos de los fundadores" },
      corte: { estado: "por-empezar", dice: "Un reel de 15 segundos por fase y uno de lanzamiento de 30.", necesita: "Material del shooting.", entrega: "Reels" },
      escena: { estado: "por-empezar", dice: "Evento en Cuenca con la sala proyectada en vivo y visuales de Jay.", necesita: "Presupuesto y lugar.", entrega: "Evento de lanzamiento" },
    },
    6: {
      prisma: { estado: "por-empezar", dice: "Velocidad, accesibilidad y SEO en celulares reales. Nada sale con errores.", necesita: "La web en un entorno de prueba.", entrega: "Informe de calidad" },
      trofeo: { estado: "por-empezar", dice: "El jurado premia punto de vista y ejecución impecable. Meta realista: Site of the Day en diciembre.", necesita: "Textos y capturas del caso.", entrega: "Postulación a Awwwards" },
      pulso: { estado: "por-empezar", dice: "Mido visitas, tiempo en la sala y contactos desde el día uno.", necesita: "Acceso a la analítica.", entrega: "Tablero de métricas" },
    },
    7: {
      iman: { estado: "por-empezar", dice: "Con la web publicada armo la propuesta base: las mismas 7 fases para cada cliente.", necesita: "La lista de clientes soñados.", entrega: "Propuesta comercial" },
      ledger: { estado: "por-empezar", dice: "Vendemos por fases. El cliente puede entrar en cualquiera.", necesita: "Los números de la fase 1.", entrega: "Paquetes y precios" },
      atlas: { estado: "por-empezar", dice: "Cada cliente entra por la fase 1 y su proyecto se ve en esta sala.", necesita: "El primer cliente.", entrega: "Proyecto del cliente en la sala" },
    },
  } as Record<number, Record<string, Mensaje>>,
};

export const ESTADO_TEXTO: Record<Estado, string> = { listo: "Listo", "en-curso": "En curso", "por-empezar": "Por empezar" };
