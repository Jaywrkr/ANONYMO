// Lo que cada agente "está haciendo" mientras trabaja (sistema/34): frases cortas, con su carácter, para que la espera se sienta viva.
export const HACIENDO: Record<string, string[]> = {
  atlas: ["está repartiendo el trabajo", "revisa quién hace qué", "ordena las fases en el tablero"],
  ledger: ["hace cuentas con calma", "revisa que el proyecto deje margen", "cuadra horas y precios"],
  nova: ["se pregunta por qué alguien elegiría esta marca", "resume la marca en una frase", "busca la idea que lo ordena todo"],
  sonda: ["investiga en silencio", "abre los enlaces que pegaste", "busca el dato que nadie buscó"],
  verba: ["prueba nombres en voz alta", "lleva cuarenta nombres y sigue", "descarta los que no suenan"],
  mira: ["mira el logo a 16 px", "ajusta una curva por tercera vez", "elige entre dos negros casi iguales"],
  rhea: ["escribe y borra", "busca la frase que se queda", "lo dice una vez, y bien"],
  orla: ["ajusta el espacio entre letras", "mueve todo 4 px", "decide el ritmo del scroll"],
  lumen: ["está renderizando un mundo", "prueba la luz de la escena", "convierte la idea en 3D"],
  vector: ["escribe código que carga rápido", "quita lo que sobra", "prueba en el celular"],
  kine: ["no se queda quieto", "le da vida a cada transición", "ajusta la curva de una animación"],
  eco: ["escucha antes de hablar", "busca el sonido de la marca", "prueba el silencio"],
  prisma: ["busca errores antes que el cliente", "revisa que se lea bien en todo", "pasa la lista de calidad"],
  tempo: ["arma el calendario", "convierte el caos en fechas", "cuenta los días que faltan"],
  faro: ["planea las series de contenido", "piensa en el próximo martes", "arma el calendario de publicaciones"],
  chispa: ["escribe como persona, no como marca", "busca cómo hacerlo más divertido", "responde comentarios imaginarios"],
  lente: ["mira la luz antes que nada", "arma el moodboard de la sesión", "elige el encuadre"],
  corte: ["corta lo que aburre", "busca los tres segundos que enganchan", "ajusta el ritmo al beat"],
  escena: ["piensa en la gente", "diseña el momento que todos van a grabar", "arma la lista de invitados"],
  iman: ["escucha más de lo que habla", "vende el resultado, no la hora", "arma una propuesta que se firma"],
  trofeo: ["mira con ojos de jurado", "pone la nota con paciencia", "compara con los mejores del año"],
  pulso: ["mide lo que importa", "dice qué funciona en una línea", "revisa los números con calma"],
};

/** Una frase para el agente; rota con el turno. */
export const queHace = (id: string, turno = 0) => {
  const l = HACIENDO[id] ?? ["está trabajando"];
  return l[turno % l.length];
};
