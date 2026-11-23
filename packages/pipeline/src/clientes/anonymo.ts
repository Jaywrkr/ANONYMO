// Lo que el estudio ya sabe de Unmake (sistema/96). Unmake es su propio primer cliente: no hay que preguntarle
// a nadie qué vende ni a quién le habla. Se propone en su ficha como cualquier dato leído: nada cuenta hasta que se aprueba.
import type { PropuestaDato } from "./fuentes.ts";

export const ID_ANONYMO = "anonymo";
// La ficha propia: «unmake» en las nuevas; «anonymo» en las que se crearon antes del cambio de nombre.
export const esAnonymo = (id: string | undefined) => id === ID_ANONYMO || id === "unmake";

const DETALLE = "lo que ya sabe el estudio";
const DATOS_ANONYMO: [PropuestaDato["clave"], string][] = [
  ["rubro", "Agencia creativa: diseño, tecnología y comunicación"],
  ["oferta", "Webs para negocios: una página por USD 390 + IVA, con plan mensual de USD 19 (el primer mes va incluido). También marca, experiencias digitales, redes y sesiones de fotos con Luna."],
  ["publico", "Negocios con buenas reseñas en Google que no tienen web o tienen una que no funciona."],
  ["servicios", "Webs\nMarca y logo\nExperiencias digitales\nRedes y contenido\nFotografía y eventos"],
  ["canales", "Instagram"],
  ["temas", "Antes y después: de la muestra a la web terminada\nTrabajos que hemos hecho (ANKLA, JAYFIT, Kubono, Coresolutions, Minervo)\nCómo trabajamos Jay y Luna\nErrores comunes de los negocios que solo tienen Instagram"],
  ["tono", "Directo y simple. Sin tecnicismos, sin frases motivacionales ni promesas exageradas. Mostrar que sabemos, no decirlo. No se habla de IA."],
  ["frecuencia", "3 veces por semana"],
  ["aprueba", "Jay y Luna"],
];

export const PROPIAS_ANONYMO: PropuestaDato[] = DATOS_ANONYMO.map(([clave, valor]) => ({ clave, valor, fuente: "estudio", detalle: DETALLE }));
