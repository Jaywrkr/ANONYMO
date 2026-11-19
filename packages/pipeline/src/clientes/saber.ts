// Lo que se sabe de cada cliente y lo que cada tarea necesita para hacerse bien (sistema/92).
// La regla: si falta un mínimo, la tarea no se hace; se dice qué falta y de dónde se puede sacar. Nunca se inventa
// un dato del negocio. Lo que ya trae Imán (Google Maps y su web) entra solo; el resto se escribe en la ficha.
import { colorDe } from "../prospectos/paleta.ts";
import { agruparHorario, tonoDe } from "../prospectos/muestra.ts";
import { nombreDe } from "../prospectos/nombre.ts";
import { esCelular } from "../prospectos/puntaje.ts";
import type { Ficha } from "./fichas.ts";

/** De dónde puede salir un dato. */
export type Fuente = "maps" | "web" | "instagram" | "preguntar";
export const NOMBRE_FUENTE: Record<Fuente, string> = {
  maps: "Google Maps (lo trae Imán)",
  web: "su web",
  instagram: "su Instagram",
  preguntar: "preguntarle al cliente",
};

export type ClaveSaber =
  | "nombre" | "rubro" | "ciudad" | "celular" | "direccion" | "horario" | "servicios"
  | "color" | "logo" | "fotos" | "instagram" | "tono"
  | "publico" | "oferta" | "canales" | "temas" | "frecuencia" | "aprueba"
  | "preguntas" | "precios" | "referencias" | "objetivo";

export interface DatoSaber { nombre: string; ayuda: string; fuentes: Fuente[]; grupo: "Contacto" | "Negocio" | "Marca" | "Contenido" | "Web y asistente"; largo?: boolean }

export const DATOS: Record<ClaveSaber, DatoSaber> = {
  nombre: { nombre: "Nombre", ayuda: "Cómo se llama el negocio.", fuentes: ["maps"], grupo: "Contacto" },
  rubro: { nombre: "A qué se dedica", ayuda: "Odontología, estudio jurídico, barbería…", fuentes: ["maps"], grupo: "Contacto" },
  ciudad: { nombre: "Ciudad", ayuda: "Dónde atiende.", fuentes: ["maps"], grupo: "Contacto" },
  celular: { nombre: "Celular con WhatsApp", ayuda: "Un 09… al que se le pueda escribir.", fuentes: ["maps", "instagram", "preguntar"], grupo: "Contacto" },
  direccion: { nombre: "Dirección", ayuda: "Calle y número, como la buscaría un cliente.", fuentes: ["maps"], grupo: "Negocio" },
  horario: { nombre: "Horario", ayuda: "Días y horas en que atiende.", fuentes: ["maps", "preguntar"], grupo: "Negocio" },
  servicios: { nombre: "Servicios", ayuda: "Lo que ofrece, con sus palabras. Uno por línea.", fuentes: ["web", "instagram", "preguntar"], grupo: "Negocio", largo: true },
  color: { nombre: "Color de su marca", ayuda: "El de su logo o su letrero (por ejemplo #0B5D5A).", fuentes: ["web", "instagram"], grupo: "Marca" },
  logo: { nombre: "Logo", ayuda: "Dónde está: un enlace, «en su Instagram» o «lo mandó por WhatsApp».", fuentes: ["instagram", "preguntar"], grupo: "Marca" },
  fotos: { nombre: "Fotos propias (mínimo 3)", ayuda: "De su local, su equipo o su trabajo. Dónde están o cuántas hay.", fuentes: ["instagram", "preguntar"], grupo: "Marca" },
  instagram: { nombre: "Instagram", ayuda: "Su cuenta, con @.", fuentes: ["maps", "web", "preguntar"], grupo: "Marca" },
  tono: { nombre: "Cómo habla la marca", ayuda: "Cercana, seria, divertida… y palabras que usa o evita.", fuentes: ["instagram", "preguntar"], grupo: "Marca", largo: true },
  publico: { nombre: "A quién le habla", ayuda: "Quién le compra: edad, qué busca, qué le preocupa.", fuentes: ["preguntar"], grupo: "Contenido", largo: true },
  oferta: { nombre: "Qué quiere vender", ayuda: "El servicio o producto que más le interesa mover.", fuentes: ["preguntar"], grupo: "Contenido", largo: true },
  canales: { nombre: "Dónde publica", ayuda: "Instagram, TikTok, Facebook…", fuentes: ["instagram", "preguntar"], grupo: "Contenido" },
  temas: { nombre: "Temas o series", ayuda: "Tres o más temas de los que puede hablar siempre.", fuentes: ["instagram", "preguntar"], grupo: "Contenido", largo: true },
  frecuencia: { nombre: "Cada cuánto publica", ayuda: "Por ejemplo: 3 veces por semana.", fuentes: ["preguntar"], grupo: "Contenido" },
  aprueba: { nombre: "Quién aprueba", ayuda: "La persona del negocio que dice que sí antes de publicar.", fuentes: ["preguntar"], grupo: "Contenido" },
  preguntas: { nombre: "Preguntas que le hacen siempre", ayuda: "Con su respuesta. Una por línea.", fuentes: ["preguntar"], grupo: "Web y asistente", largo: true },
  precios: { nombre: "Precios", ayuda: "Los que quiere mostrar, o «no mostrar precios».", fuentes: ["preguntar"], grupo: "Web y asistente", largo: true },
  referencias: { nombre: "Webs o cuentas que le gustan", ayuda: "Enlaces, y qué le gusta de cada una.", fuentes: ["preguntar"], grupo: "Web y asistente", largo: true },
  objetivo: { nombre: "Para qué quiere la web", ayuda: "Que lo llamen, que agenden, que compren…", fuentes: ["preguntar"], grupo: "Web y asistente" },
};
export const CLAVES_SABER = Object.keys(DATOS) as ClaveSaber[];
export const esClaveSaber = (x: unknown): x is ClaveSaber => typeof x === "string" && x in DATOS;
export const GRUPOS_SABER = ["Contacto", "Negocio", "Marca", "Contenido", "Web y asistente"] as const;

/** Las tareas del estudio y lo que cada una necesita saber del cliente. `minimo`: sin eso no se hace. `mejor`: sale mejor con eso. */
export type TareaSaber = "muestra" | "mensaje" | "guion" | "contenido" | "web" | "web-a-mano" | "asistente";
export interface ReglaTarea { nombre: string; quien: string; minimo: ClaveSaber[]; mejor: ClaveSaber[] }
export const TAREAS_SABER: Record<TareaSaber, ReglaTarea> = {
  muestra: { nombre: "Muestra de su web", quien: "Imán", minimo: ["nombre", "rubro", "ciudad"], mejor: ["horario", "direccion", "color", "fotos"] },
  mensaje: { nombre: "Primer mensaje de WhatsApp", quien: "Imán", minimo: ["nombre", "celular"], mejor: ["rubro"] },
  guion: { nombre: "Guion de video", quien: "Faro", minimo: ["nombre", "rubro", "oferta", "publico", "canales"], mejor: ["tono", "servicios", "instagram"] },
  contenido: { nombre: "Mes de contenido", quien: "Faro", minimo: ["nombre", "rubro", "oferta", "publico", "canales", "temas", "tono", "frecuencia", "aprueba"], mejor: ["servicios", "instagram", "fotos", "color"] },
  web: { nombre: "Web estándar", quien: "Vector", minimo: ["nombre", "rubro", "ciudad", "celular", "servicios", "horario", "direccion", "fotos", "color"], mejor: ["logo", "tono", "instagram"] },
  "web-a-mano": { nombre: "Web hecha a mano", quien: "Orla y Vector", minimo: ["nombre", "rubro", "ciudad", "celular", "servicios", "horario", "direccion", "fotos", "color", "objetivo", "referencias"], mejor: ["logo", "tono", "publico", "precios"] },
  asistente: { nombre: "Asistente de su web", quien: "Atlas", minimo: ["nombre", "celular", "servicios", "horario", "direccion", "preguntas"], mejor: ["precios", "tono"] },
};
export const ORDEN_TAREAS_SABER = Object.keys(TAREAS_SABER) as TareaSaber[];
export const esTareaSaber = (x: unknown): x is TareaSaber => typeof x === "string" && x in TAREAS_SABER;

export interface ValorSaber { valor: string; origen: "mano" | "maps" | "web" | "marca" }

/** Todo lo que se sabe de un cliente: lo que ya trae Imán y su kit de marca, y encima lo escrito a mano (que manda). */
export function saberDe(f: Pick<Ficha, "nombre" | "guardada" | "prospecto" | "kits" | "contacto">): Partial<Record<ClaveSaber, ValorSaber>> {
  const s: Partial<Record<ClaveSaber, ValorSaber>> = {};
  const pon = (k: ClaveSaber, valor: string | undefined, origen: ValorSaber["origen"]) => { const v = valor?.trim(); if (v) s[k] = { valor: v, origen }; };
  const x = f.prospecto;
  pon("nombre", f.nombre, f.guardada ? "mano" : "maps");
  if (x) {
    pon("nombre", f.guardada?.nombre ?? nombreDe(x), f.guardada ? "mano" : "maps");
    pon("rubro", x.rubro, "maps");
    pon("ciudad", x.ciudad, "maps");
    if (esCelular(x.telefono)) pon("celular", x.telefono, "maps");
    pon("direccion", x.direccion, "maps");
    pon("horario", agruparHorario(x.horario)?.map(([d, h]) => `${d}: ${h}`).join(" · "), "maps");
    // El color solo cuenta si es suyo: puesto a mano o leído de su web. El del rubro es un relleno, no un dato.
    const c = colorDe(x, tonoDe(x.rubro));
    if (c.origen !== "rubro") pon("color", c.color, c.origen === "web" ? "web" : "mano");
    if ((x.fotos ?? 0) >= 3) pon("fotos", `${x.fotos} fotos en su muestra`, "mano");
    const redes = [x.web, ...(x.revision?.estado === "ok" ? x.revision.sonda?.redes ?? [] : [])].filter((u): u is string => !!u);
    const ig = redes.map((u) => u.match(/instagram\.com\/([A-Za-z0-9._]+)/)?.[1]).find((u) => u && !["p", "reel", "explore"].includes(u));
    if (ig) pon("instagram", `@${ig}`, x.web?.includes("instagram.com") ? "maps" : "web");
  }
  if (!s.color && f.kits[0]?.color) pon("color", f.kits[0].color, "marca");
  if (!s.celular && esCelular(f.guardada?.telefono)) pon("celular", f.guardada?.telefono, "mano");
  for (const [k, v] of Object.entries(f.guardada?.saber ?? {})) if (esClaveSaber(k)) pon(k, v, "mano");
  return s;
}

export interface EstadoSaber { tarea: TareaSaber; regla: ReglaTarea; listo: boolean; faltan: ClaveSaber[]; mejoraria: ClaveSaber[] }
/** Si se puede hacer una tarea con lo que se sabe, y qué falta. */
export function puedeHacer(saber: Partial<Record<ClaveSaber, ValorSaber>>, tarea: TareaSaber): EstadoSaber {
  const regla = TAREAS_SABER[tarea];
  const faltan = regla.minimo.filter((k) => !saber[k]);
  return { tarea, regla, listo: faltan.length === 0, faltan, mejoraria: regla.mejor.filter((k) => !saber[k]) };
}
export const estadoTareas = (saber: Partial<Record<ClaveSaber, ValorSaber>>) => ORDEN_TAREAS_SABER.map((t) => puedeHacer(saber, t));

/** El nombre de un dato en medio de una frase: «celular con WhatsApp», sin tocar las mayúsculas de adentro. */
export const nombreDato = (k: ClaveSaber) => DATOS[k].nombre.charAt(0).toLowerCase() + DATOS[k].nombre.slice(1);

/** «Falta saber: a quién le habla (preguntarle al cliente), dónde publica (su Instagram o preguntarle al cliente).» */
export function textoFaltan(faltan: ClaveSaber[]) {
  const lista = (x: string[]) => (x.length > 1 ? `${x.slice(0, -1).join(", ")} o ${x.at(-1)}` : x[0] ?? "");
  return faltan.map((k) => `${nombreDato(k)} (${lista(DATOS[k].fuentes.map((f) => NOMBRE_FUENTE[f]))})`).join("; ");
}

/** Lo que se le pasa a un agente sobre el cliente: solo datos que existen, cada uno con su nombre. */
export function contextoCliente(saber: Partial<Record<ClaveSaber, ValorSaber>>, claves: ClaveSaber[]) {
  return claves.filter((k) => saber[k]).map((k) => `- ${DATOS[k].nombre}: ${saber[k]!.valor.replace(/\s*\n\s*/g, "; ")}`).join("\n");
}

/** Un cliente es «de verdad» cuando alguien lo anotó, vino de Imán o tiene pedidos: a esos se les exigen los mínimos. */
export const clienteConFicha = (f: Pick<Ficha, "guardada" | "prospecto" | "proyectos">) => !!f.guardada || !!f.prospecto || f.proyectos.length > 0;
