// El nombre con que se le habla a un negocio (sistema/83). En Google Maps muchos se llaman como un anuncio:
// «Dr.JUAN CARLOS AVILA CARRERA. Medico, Psicologo Clinico, Master en Psicofarmacologia en Cuenca Ecuador».
// Eso rompe la muestra y suena a robot en el mensaje. De ahí sale un nombre corto; si no convence, Jay lo escribe a mano.
import type { Prospecto } from "./tipos.ts";

const TITULOS = /^(dra?|lic|ing|abg|ab|sra?|srta|psic|od|odont|arq|mg|msc|phd|cpa|eco|econ|tlgo|tnlgo|nut|ft|lcda?|md)$/i;
const CONECTORES = /^(y|e|o|u|de|del|la|las|el|los|en|para|por|con|a|al|&)$/i;
const CIUDADES = "cuenca|quito|guayaquil|loja|azogues|ambato|machala|ecuador|azuay";
export const NOMBRE_CORTO_MAX = 48;

const mayus = (w: string) => w.length > 1 && w === w.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(w);
const titulo = (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();

/** «SKIN CLINIC» → «Skin Clinic»; en un nombre mixto solo baja las palabras largas en mayúsculas («ALELI») y deja las siglas («SPA»). */
function arreglarMayusculas(s: string) {
  const palabras = s.split(/\s+/);
  const limpia = (w: string) => w.replace(/[.,]/g, "");
  // Cuentan las palabras de verdad: ni los títulos («Dr.») ni los conectores.
  const letras = palabras.filter((w) => /[a-záéíóúñ]/i.test(w) && !TITULOS.test(limpia(w)) && !CONECTORES.test(w));
  const casiTodo = letras.length > 0 && letras.filter((w) => mayus(limpia(w))).length * 2 > letras.length;
  return palabras.map((w, i) => {
    if (!mayus(limpia(w))) return w;
    if (i > 0 && CONECTORES.test(w)) return w.toLowerCase();
    if (casiTodo) return w.split("-").map(titulo).join("-");
    return limpia(w).length > 4 ? titulo(w) : w;
  }).join(" ");
}

export function nombreCorto(original: string): string {
  let s = original.replace(/[“”«»]/g, '"').replace(/\s+/g, " ").trim();
  // «Dr.JUAN» → «Dr. JUAN»
  s = s.replace(/\b(dra?|lic|ing|abg|psic|od|arq|lcda?)\.(?=\S)/gi, "$1. ");
  // Si trae un nombre entre comillas, ese es el nombre: Cuenca "SMILE Factory" Odontología Integral…
  const comillas = s.match(/"([^"]{3,40})"/);
  if (comillas) s = comillas[1]!;
  s = s.replace(/"/g, "");
  // Lo que va después de un separador es descripción: «ZAHOFER | Ortodoncia en Cuenca», «Dra. Karina Díaz I Kadira I Medicina Estética».
  s = s.split(/\s*[|•·–—/]\s*|\s+-\s+|\s+I\s+(?=[A-ZÁÉÍÓÚÑ])|\s*[:;(]\s*/)[0]!.trim();
  // «…CARRERA. Medico, Psicologo…»: un punto que no es de «Dr.» cierra el nombre; una coma también.
  const trozos = s.split(/(?<=\S)\.\s+/);
  let k = 0;
  while (k < trozos.length - 1 && TITULOS.test(trozos[k]!.split(" ").pop()!)) k++;
  s = trozos.slice(0, k + 1).join(". ");
  s = s.split(/\s*,\s*/)[0]!.trim();
  // «Neumóloga pediatra Dra. Angela Pesántez Abril» → desde el título.
  const dr = s.search(/\bDra?\.\s/i);
  if (dr > 0 && s.length > 34) s = s.slice(dr);
  // La ciudad al final o al inicio sobra: «Pediatra Stephany Galindo Cuenca», «en Cuenca Ecuador».
  s = s.replace(new RegExp(`(\\s+(en|de)?\\s*(${CIUDADES}))+\\s*$`, "i"), "").replace(new RegExp(`^(${CIUDADES})\\s+(?=\\S+\\s+\\S)`, "i"), "").trim();
  s = arreglarMayusculas(s).replace(/[.\s]+$/, (m) => (TITULOS.test(s.split(" ").pop()!.replace(/\./g, "")) ? m.trim() : ""));
  // Muy largo todavía: se corta en una palabra entera, sin dejar un «y» o «de» colgando.
  if (s.length > NOMBRE_CORTO_MAX) {
    const w = s.split(" ");
    while (w.length > 2 && w.join(" ").length > NOMBRE_CORTO_MAX) w.pop();
    while (w.length > 2 && CONECTORES.test(w.at(-1)!)) w.pop();
    s = w.join(" ");
  }
  return s.length >= 3 ? s : original.trim().slice(0, NOMBRE_CORTO_MAX);
}

/** El nombre para la muestra, la propuesta y los mensajes: el que escribió Jay o el corto que sale solo. */
export const nombreDe = (p: Pick<Prospecto, "nombre" | "alias">) => p.alias?.trim() || nombreCorto(p.nombre);
