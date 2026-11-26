// Lo que el estudio ya sabe de Unmake (sistema/96). Unmake es su propio primer cliente: no hay que preguntarle
// a nadie qué vende ni a quién le habla. Se propone en su ficha como cualquier dato leído: nada cuenta hasta que se aprueba.
import type { PropuestaDato } from "./fuentes.ts";

export const ID_ANONYMO = "anonymo";
// La ficha propia: «unmake» en las nuevas; «anonymo» en las que se crearon antes del cambio de nombre.
export const esAnonymo = (id: string | undefined) => id === ID_ANONYMO || id === "unmake";
/** Un pedido es interno cuando el cliente es el propio estudio (sistema/111): por su ficha o por su nombre. */
export const esInterno = (p: { ficha?: string; cliente: string }) => esAnonymo(p.ficha) || /^(unmake|anonymo)(\b|$)/i.test(p.cliente.trim());

const DETALLE = "lo que ya sabe el estudio";
const DATOS_ANONYMO: [PropuestaDato["clave"], string][] = [
  ["rubro", "Agencia creativa: diseño, tecnología y comunicación"],
  ["oferta", "Marca, web y contenido para negocios que quieren verse distintos, hechos por dos personas de principio a fin. En redes no se dicen precios."],
  ["publico", "Negocios con buenas reseñas en Google que no tienen web o tienen una que no funciona."],
  ["servicios", "Webs\nMarca y logo\nExperiencias digitales\nRedes y contenido\nFotografía y eventos"],
  ["canales", "Instagram"],
  ["temas", "Desarmamos: una marca por dentro (cuadrícula, letra, color), empezando por Unmake\nLaboratorio: piezas animadas de nuestra marca\nCómo trabajamos: Jay, Luna y los 4 pasos (desarmar, elegir, armar, soltar)\nLo que no hacemos: opiniones claras\nTrabajos de Unmake: la web de Coresolutions y la web de @jaywrkr"],
  ["tono", "Directo y simple. Sin tecnicismos, sin frases motivacionales ni promesas exageradas. Mostrar que sabemos, no decirlo. No se habla de IA."],
  ["frecuencia", "3 veces por semana"],
  ["aprueba", "Jay y Luna"],
  ["color", "Sin color fijo: cinco luces (naranja #F0602A, azul #3D5BFF, magenta #FF3D8B, verde #1FCF8F, amarillo #FFB21A) sobre tinta #0E0C0C y papel #F4EFE9"],
];

export const PROPIAS_ANONYMO: PropuestaDato[] = DATOS_ANONYMO.map(([clave, valor]) => ({ clave, valor, fuente: "estudio", detalle: DETALLE }));

/**
 * Los primeros trabajos de Unmake (sistema/117, 26 nov): las dos webs que ya existen y les gustan a Jay y Luna.
 * Son la vara de calidad («qué es bueno») y el portafolio real con que arranca su contenido.
 */
export const TRABAJOS_UNMAKE: { url: string; nota: string; trabajo: true }[] = [
  { url: "https://coresolutions-web.vercel.app/", nota: "web de Coresolutions: empresa seria, clara, navy e IBM Plex", trabajo: true },
  { url: "https://jayjaramillo.vercel.app/", nota: "web de @jaywrkr: una historia con scroll, Geist Mono, mucho aire, nada de plantilla", trabajo: true },
];
