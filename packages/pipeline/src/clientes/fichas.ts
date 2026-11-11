// La ficha de cada cliente (sistema/70): un solo lugar con su prospecto, pedidos, proyectos, videos, kit de marca,
// contacto, notas e historia. Se arma sola uniendo lo que ya existe; lo único que se guarda aparte son las notas,
// el contacto y los otros nombres con que se conoce al cliente.
import { slug } from "../solicitudes.ts";
import type { Prospecto } from "../prospectos/tipos.ts";

/** Lo que Jay y Luna escriben a mano en la ficha. */
export interface FichaGuardada {
  id: string;
  nombre: string;
  notas?: string;
  telefono?: string;
  correo?: string;
  web?: string;
  /** Otros nombres del mismo cliente («Dr. Silva», «Clínica Silva»): sus proyectos y videos entran a esta ficha. */
  alias?: string[];
  creado: string;
  actualizado: string;
  por?: string;
}

export interface ListaFichas {
  actualizado: string;
  fichas: Record<string, FichaGuardada>;
}

/** Lo mínimo de cada cosa para armar las fichas, sin cargar proyectos ni videos enteros. */
export interface ProyectoParaFicha { id: string; cliente: string; ficha?: string; tipo: string; estado: string; creado?: string; actualizado: string; papelera?: boolean }
export interface VideoParaFicha { id: string; nombre: string; cliente?: string; estado: string; formatos: number; creado: string; actualizado: string }
export interface KitParaFicha { id: string; nombre: string; color: string; actualizado: string }

export interface EventoFicha { cuando: string; que: string; enlace?: string; por?: string }

export interface Ficha {
  id: string;
  nombre: string;
  guardada?: FichaGuardada;
  prospecto?: Prospecto;
  proyectos: ProyectoParaFicha[];
  videos: VideoParaFicha[];
  kits: KitParaFicha[];
  historia: EventoFicha[];
  contacto: { telefono?: string; correo?: string; web?: string; mapa?: string };
  /** Último movimiento de cualquier cosa del cliente. */
  actualizado: string;
}

/** El id de la ficha para un nombre de cliente: «Clínica Sonrisa» → «clinica-sonrisa». */
export const idFicha = (nombre: string) => slug(nombre);

/** Los estados de un prospecto en los que ya es relación, no solo un contacto en frío. */
const EN_RELACION = new Set(["respondio", "reunion", "cliente"]);

const TIPO_PEDIDO: Record<string, string> = { web: "una web", marca: "una marca", lanzamiento: "un lanzamiento", todo: "todo, desde cero" };

const ESTADO_PROYECTO: Record<string, string> = { plan: "con plan de Atlas", "en-curso": "en trabajo", esperando: "esperando una decisión", parado: "en pausa", listo: "terminado" };

export interface EntradaCartera {
  proyectos: ProyectoParaFicha[];
  videos: VideoParaFicha[];
  kits: KitParaFicha[];
  prospectos: Prospecto[];
  guardadas: FichaGuardada[];
}

/**
 * Arma todas las fichas. Cada cosa entra a la ficha de su cliente: el proyecto por su `ficha` o por el nombre;
 * el video y el kit por el nombre; el prospecto por el proyecto en que se convirtió o por su nombre.
 * Un prospecto solo abre ficha propia cuando ya hay relación (respondió, reunión, cliente) o se volvió pedido.
 */
export function construirCartera(e: EntradaCartera): Ficha[] {
  const fichas = new Map<string, Ficha>();
  const clave = new Map<string, string>(); // nombre normalizado → id de ficha

  const abrir = (id: string, nombre: string): Ficha => {
    let f = fichas.get(id);
    if (!f) {
      f = { id, nombre, proyectos: [], videos: [], kits: [], historia: [], contacto: {}, actualizado: "" };
      fichas.set(id, f);
      clave.set(id, id);
    }
    return f;
  };
  const deNombre = (nombre: string) => {
    const k = idFicha(nombre);
    return fichas.get(clave.get(k) ?? "") ?? abrir(k, nombre.trim());
  };

  // 1 · Lo escrito a mano manda: su nombre y sus alias.
  for (const g of e.guardadas) {
    const f = abrir(g.id, g.nombre);
    f.nombre = g.nombre;
    f.guardada = g;
    for (const a of g.alias ?? []) clave.set(idFicha(a), g.id);
  }

  // 2 · Proyectos (los de la papelera no).
  for (const p of e.proyectos) {
    if (p.papelera) continue;
    const f = p.ficha ? fichas.get(clave.get(p.ficha) ?? p.ficha) ?? abrir(p.ficha, p.cliente) : deNombre(p.cliente);
    f.proyectos.push(p);
    f.historia.push({ cuando: p.creado ?? p.actualizado, que: `Pedido nuevo: ${TIPO_PEDIDO[p.tipo] ?? p.tipo}`, enlace: `/estudio/${p.id}` });
    if (p.estado === "listo") f.historia.push({ cuando: p.actualizado, que: "Proyecto terminado", enlace: `/estudio/${p.id}` });
  }

  // 3 · Prospectos: por el proyecto en que se convirtieron, o por nombre si ya hay relación.
  const fichaDeProyecto = new Map<string, Ficha>();
  for (const f of fichas.values()) for (const p of f.proyectos) fichaDeProyecto.set(p.id, f);
  for (const x of e.prospectos) {
    const yaEsta = clave.has(idFicha(x.nombre));
    const f = (x.proyecto && fichaDeProyecto.get(x.proyecto)) || (yaEsta || EN_RELACION.has(x.estado) || x.proyecto ? deNombre(x.nombre) : undefined);
    if (!f) continue;
    f.prospecto = x;
    for (const h of x.historial ?? []) f.historia.push({ cuando: h.cuando, que: h.que, por: h.por, enlace: "/estudio/clientes/nuevos" });
  }

  // 4 · Videos y kits de marca: por nombre, solo si el cliente ya tiene ficha o el video lo nombra.
  for (const v of e.videos) {
    if (!v.cliente?.trim()) continue;
    const f = deNombre(v.cliente);
    f.videos.push(v);
    f.historia.push({ cuando: v.creado, que: `Video «${v.nombre}»`, enlace: `/estudio/video/${v.id}` });
  }
  for (const k of e.kits) {
    const f = deNombre(k.nombre);
    f.kits.push(k);
  }

  // 5 · Contacto (lo escrito a mano gana), historia en orden y último movimiento.
  for (const f of fichas.values()) {
    const g = f.guardada, x = f.prospecto;
    f.contacto = { telefono: g?.telefono || x?.telefono, correo: g?.correo, web: g?.web || x?.web, mapa: x?.mapa };
    if (g) f.historia.push({ cuando: g.creado, que: "Ficha creada a mano", por: g.por });
    f.historia.sort((a, b) => b.cuando.localeCompare(a.cuando));
    f.actualizado = [g?.actualizado, x?.actualizado, ...f.proyectos.map((p) => p.actualizado), ...f.videos.map((v) => v.actualizado), ...f.kits.map((k) => k.actualizado)]
      .filter((t): t is string => !!t).sort().at(-1) ?? "";
  }
  return [...fichas.values()].sort((a, b) => b.actualizado.localeCompare(a.actualizado));
}

/** Una frase de en qué está el cliente, para la lista. */
export function resumenFicha(f: Ficha) {
  const vivos = f.proyectos.filter((p) => p.estado !== "listo");
  if (vivos.length) return vivos.map((p) => ESTADO_PROYECTO[p.estado] ?? p.estado).join(" · ");
  if (f.proyectos.length) return `${f.proyectos.length} ${f.proyectos.length === 1 ? "proyecto terminado" : "proyectos terminados"}`;
  if (f.prospecto) return `Prospecto: ${f.prospecto.estado === "respondio" ? "respondió" : f.prospecto.estado === "reunion" ? "en reunión" : f.prospecto.estado}`;
  if (f.videos.length) return `${f.videos.length} ${f.videos.length === 1 ? "video" : "videos"}`;
  return "Sin movimiento todavía";
}
