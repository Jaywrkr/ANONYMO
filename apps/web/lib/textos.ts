// Textos de la web en español e inglés (web/05). Los del equipo están en @anonymo/agentes.
export const T = {
  es: {
    nav: { equipo: "Equipo", sala: "Sala", fases: "Fases", casos: "Casos", contacto: "Contacto", sistema: "Sistema" },
    menu: "Menú", cerrar: "Cerrar", hablemos: "Hablemos →", provisional: "* Nombre provisional", lugar: "Cuenca, Ecuador · 2026", cambiar: "English", cambiarCorto: "EN",
    reloj: { en: "en Cuenca.", noche: "Ellos duermen. El equipo, no.", dia: "Jay y Luna al mando." },
    inicio: {
      titulo: ["Trabajamos", "mientras", "duermes."], agencia: "Agencia creativa · Cuenca, Ecuador", cuenta: (a: number, f: number) => `2 humanos · ${a} agentes · ${f} fases`,
      quienes: "Quiénes somos", manifiesto: "Jay pone el código y el sistema. Luna pone la imagen, la gente y la fiesta. Veintidós agentes se aseguran de que nada se quede a medias.",
      lema: ["Menos humo.", "Más obra."], equipo: "El equipo", equipoTexto: "Cada agente mezcla a los mejores del mundo en su oficio y lleva el objeto de su trabajo. Toca uno para conocerlo.", porArea: "Ver por área",
      conLuna: "Con Luna", gente: "También juntamos gente.", genteTexto: "Shootings, lanzamientos y eventos. La marca no termina en la pantalla: se vive en un lugar, con música, luz y personas.",
      contacto: "Contacto", proyecto: "¿Tienes un proyecto?", proyectoTexto: "Cuéntanos qué necesitas. Atlas arma el plan esa misma noche.", escribenos: "Escríbenos",
    },
    agentes: { titulo: "22 agentes", texto: "Cada uno toma lo mejor de los mejores del mundo en su oficio. Trabajan por fases, de noche si hace falta, y nada sale sin que Jay y Luna lo aprueben.", todos: "Todos", filtrar: "Filtrar por área" },
    ficha: { caracter: "Carácter", influencias: "Influencias", superpoder: "Superpoder", objeto: "Su objeto", fases: "Fases", actual: "En el proyecto actual", fase: "Fase", entrega: "Entrega:", sala: "La sala" },
    fases: { titulo: "Cómo trabajamos", texto: "Siete fases. Cada una con sus agentes, su entrega y una aprobación de Jay o Luna.", recibe: "El cliente recibe", entra: "Entra a la sala →" },
    contacto: { titulo: "Hablemos", texto: "Cuéntanos qué necesitas. Atlas arma el plan esa misma noche y Jay o Luna te responden." },
  },
  en: {
    nav: { equipo: "Team", sala: "Room", fases: "Phases", casos: "Work", contacto: "Contact", sistema: "System" },
    menu: "Menu", cerrar: "Close", hablemos: "Let's talk →", provisional: "* Working name", lugar: "Cuenca, Ecuador · 2026", cambiar: "Español", cambiarCorto: "ES",
    reloj: { en: "in Cuenca.", noche: "They sleep. The team doesn't.", dia: "Jay and Luna in charge." },
    inicio: {
      titulo: ["We work", "while you", "sleep."], agencia: "Creative agency · Cuenca, Ecuador", cuenta: (a: number, f: number) => `2 humans · ${a} agents · ${f} phases`,
      quienes: "Who we are", manifiesto: "Jay brings the code and the system. Luna brings the image, the people and the party. Twenty-two agents make sure nothing is left half done.",
      lema: ["Less smoke.", "More work."], equipo: "The team", equipoTexto: "Each agent blends the best in the world at their craft and carries the tool of their trade. Tap one to meet them.", porArea: "See by area",
      conLuna: "With Luna", gente: "We bring people together too.", genteTexto: "Shoots, launches and events. A brand doesn't end on the screen: it's lived in a place, with music, light and people.",
      contacto: "Contact", proyecto: "Got a project?", proyectoTexto: "Tell us what you need. Atlas drafts the plan that same night.", escribenos: "Write to us",
    },
    agentes: { titulo: "22 agents", texto: "Each one takes the best of the best in the world at their craft. They work in phases, at night if needed, and nothing ships without Jay and Luna's approval.", todos: "All", filtrar: "Filter by area" },
    ficha: { caracter: "Character", influencias: "Influences", superpoder: "Superpower", objeto: "Their object", fases: "Phases", actual: "On the current project", fase: "Phase", entrega: "Deliverable:", sala: "The room" },
    fases: { titulo: "How we work", texto: "Seven phases. Each with its agents, its deliverable and Jay or Luna's approval.", recibe: "The client gets", entra: "Enter the room →" },
    contacto: { titulo: "Let's talk", texto: "Tell us what you need. Atlas drafts the plan that same night and Jay or Luna get back to you." },
  },
} as const;
