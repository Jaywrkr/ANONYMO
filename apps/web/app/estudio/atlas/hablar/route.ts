// La conversación única con Atlas (sistema/106).
// GET: tu conversación, lo que te toca hoy y los clientes para sugerir. POST: le escribes; Atlas entiende, hace y responde.
// Lo que gasta IA se confirma antes. Nada sale hacia afuera: los mensajes a clientes se preparan y los mandas tú.
import { randomUUID } from "node:crypto";
import { DATOS, estadoTareas, nombreDato, ocultarClaves, saberDe, type ClaveSaber } from "@anonymo/pipeline";
import { mal, permiso } from "@/lib/clientes";
import { clientesCaja, ejecutarCaja, proyectoDe } from "@/lib/caja-ejecutar";
import type { Tarjeta } from "@/lib/caja";
import { agregarHilo, leerHilo, vaciarHilo, type Eleccion, type MensajeHilo } from "@/lib/atlas-hilo";
import { agenteDeAccion, entender, esAccion, nombreAccion, type ProyectoCorto } from "@/lib/atlas-entender";
import { pendientes } from "@/lib/pendientes";
import { resumenProyectos } from "@/lib/nube";
import { consultarProyecto, encargarProyecto } from "@/lib/proyecto-atlas";

export const dynamic = "force-dynamic";
export const maxDuration = 120;
const sinCache = { headers: { "cache-control": "no-store" } };
const ahora = () => new Date().toISOString();
const ID = /^[a-z0-9_-]{1,90}$/;

async function datos(yo: "jay" | "luna") {
  const [fichas, todos] = await Promise.all([clientesCaja(), resumenProyectos().catch(() => [])]);
  const vivos = todos.filter((p) => !p.papelera);
  const proyectos: ProyectoCorto[] = vivos.map((p) => ({ id: p.pedido.id, cliente: p.pedido.cliente, estado: p.estado }));
  return { fichas, todos: vivos, proyectos, yo };
}

export async function GET() {
  const p = await permiso();
  if (p.error) return p.error;
  const yo = p.yo!;
  const [hilo, d] = await Promise.all([leerHilo(yo), datos(yo)]);
  const { avisos } = await pendientes(yo, d.todos).catch(() => ({ avisos: [] }));
  const clientes = d.fichas.map((f) => ({
    id: f.id, nombre: f.nombre, alias: f.guardada?.alias, prospecto: !!f.prospecto, proyecto: proyectoDe(f)?.id,
    tareas: Object.fromEntries(estadoTareas(saberDe(f)).map((t) => [t.tarea, { listo: t.listo, faltan: t.faltan.map(nombreDato) }])),
  })).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  return Response.json({ yo, hilo, hoy: avisos.slice(0, 6).map((a) => ({ titulo: a.titulo, detalle: a.detalle, href: a.href })), clientes, proyectos: d.proyectos }, sinCache);
}

/** Empezar de cero: borra solo tu conversación. */
export async function DELETE() {
  const p = await permiso();
  if (p.error) return p.error;
  await vaciarHilo(p.yo!);
  return Response.json({ ok: true }, sinCache);
}

interface Cuerpo { id?: unknown; texto?: unknown; eleccion?: unknown; etiqueta?: unknown; confirmado?: unknown; contexto?: { cliente?: unknown; proyecto?: unknown; suave?: unknown } }

export async function POST(req: Request) {
  const p = await permiso();
  if (p.error) return p.error;
  const yo = p.yo!;
  let c: Cuerpo;
  try { c = await req.json(); } catch { return mal("Pedido no válido."); }
  const id = typeof c.id === "string" && /^[a-z0-9-]{8,60}$/i.test(c.id) ? c.id : randomUUID();
  const texto = typeof c.texto === "string" ? c.texto.trim().slice(0, 1500) : "";
  const ctx = {
    cliente: typeof c.contexto?.cliente === "string" && ID.test(c.contexto.cliente) ? c.contexto.cliente : undefined,
    proyecto: typeof c.contexto?.proyecto === "string" && ID.test(c.contexto.proyecto) ? c.contexto.proyecto : undefined,
    suave: c.contexto?.suave === true,
  };
  const d = await datos(yo);
  const clientes = d.fichas.map((f) => ({ id: f.id, nombre: f.nombre, alias: f.guardada?.alias }));

  // Lo que se pide: un botón ya trae la elección; si no, Atlas la entiende del texto.
  let eleccion: Eleccion | undefined;
  const e = c.eleccion as Partial<Eleccion> | undefined;
  if (e && esAccion(e.accion)) eleccion = { accion: e.accion, cliente: typeof e.cliente === "string" && ID.test(e.cliente) ? e.cliente : undefined, proyecto: typeof e.proyecto === "string" && ID.test(e.proyecto) ? e.proyecto : undefined, texto: String(e.texto ?? "").slice(0, 1500) };
  if (!eleccion && !texto) return mal("Escribe qué necesitas.");

  const confirmado = c.confirmado === true;
  const deYo: MensajeHilo = { id: `${id}:yo`, fecha: ahora(), de: "yo", texto: confirmado ? "Sí, hazlo" : typeof c.etiqueta === "string" ? c.etiqueta.slice(0, 120) : texto || eleccion?.texto };
  const responder = async (m: Omit<MensajeHilo, "id" | "fecha" | "de">) => {
    const atlas: MensajeHilo = { id: `${id}:atlas`, fecha: ahora(), de: "atlas", ...(clienteHablado ? { cliente: clienteHablado } : {}), ...m };
    await agregarHilo(yo, [deYo, atlas]).catch(() => {});
    return Response.json({ mensajes: [deYo, atlas] }, sinCache);
  };

  let clienteHablado: string | undefined;
  let como: "marcas" | "ia" | "palabras" | "boton" = "boton";
  if (!eleccion) {
    const i = await entender(texto, clientes, d.proyectos, ctx, yo);
    como = i.como;
    if (i.dudas?.length) return responder({ error: i.dudas.join(" ") });
    if (i.pregunta && i.opciones?.length) return responder({ texto: i.pregunta, opciones: i.opciones });
    eleccion = i.eleccion;
  }
  if (!eleccion) return responder({ error: "No entendí qué hacer. Escribe / para ver lo que puedo hacer." });

  const ficha = eleccion.cliente ? d.fichas.find((f) => f.id === eleccion!.cliente) : undefined;
  clienteHablado = ficha?.id;
  const proyectoId = eleccion.proyecto && d.todos.some((x) => x.pedido.id === eleccion!.proyecto) ? eleccion.proyecto : ficha ? proyectoDe(ficha)?.id : undefined;
  const nombre = ficha?.nombre ?? d.todos.find((x) => x.pedido.id === proyectoId)?.pedido.cliente;
  const entendi = `${agenteDeAccion(eleccion.accion as never)} · ${nombreAccion(eleccion.accion as never)}${nombre ? ` · ${nombre}` : ""}${como === "ia" ? " · lo entendí con IA" : ""}`;

  try {
    // Lo que te toca hoy, con un botón para cada cosa.
    if (eleccion.accion === "hoy") {
      const { avisos } = await pendientes(yo, d.todos);
      if (!avisos.length) return responder({ entendi, tarjeta: { titulo: "Hoy no te toca nada", texto: "El equipo sigue trabajando. Te aviso cuando algo necesite tu decisión." } });
      return responder({ entendi, tarjeta: { titulo: `Hoy te toca${avisos.length > 1 ? ` · ${avisos.length}` : ""}`, texto: avisos.slice(0, 6).map((a) => `${a.titulo}: ${a.detalle}`).join("\n"), botones: avisos.slice(0, 4).map((a) => ({ texto: a.titulo.slice(0, 40), href: a.href })) } });
    }
    // Lo que el estudio sabe de un cliente, para corregirlo donde está.
    if (eleccion.accion === "memoria") {
      if (!ficha) return responder({ texto: "¿De qué cliente?", opciones: d.fichas.slice(0, 4).map((f) => ({ texto: f.nombre, eleccion: { accion: "memoria", cliente: f.id, texto: "" } })) });
      const s = saberDe(ficha);
      const lineas = (Object.keys(s) as ClaveSaber[]).map((k) => `${DATOS[k]?.nombre ?? k}: ${s[k]!.valor}`);
      const proyectosDe = ficha.proyectos.filter((x) => !x.papelera).length;
      return responder({ entendi, tarjeta: { titulo: `Lo que sé de ${ficha.nombre}`, texto: `${lineas.join("\n") || "Todavía no sé nada: completa su ficha."}${proyectosDe ? `\n\n${proyectosDe} ${proyectosDe === 1 ? "proyecto" : "proyectos"} con el estudio.` : ""}`, botones: [{ texto: "Corregir en su ficha", href: `/estudio/cliente/${ficha.id}#saber` }] } });
    }
    if (eleccion.accion === "ayuda") {
      return responder({ entendi: undefined, tarjeta: { titulo: "Lo que puedo hacer", texto: "Escríbeme normal, como a una persona. Por ejemplo:\n· ¿cómo va la web de Clínica Sonrisa?\n· que el botón de reservar diga «Agenda tu cita»\n· un reel para el día de la madre\n· el mensaje de WhatsApp para un cliente nuevo\n· ¿qué sabes de Café Lento?\n· ¿qué me toca hoy?\nSi vas rápido: / para las acciones y # para el cliente." } });
    }
    // Preguntar o pedir un cambio: va al proyecto de la página, o al último del cliente.
    if (eleccion.accion === "proyecto" || eleccion.accion === "cambio") {
      if (!proyectoId) {
        if (!ficha) return responder({ texto: "¿De qué proyecto?", opciones: d.todos.slice(0, 4).map((x) => ({ texto: x.pedido.cliente, eleccion: { ...eleccion!, proyecto: x.pedido.id } })) });
        return responder({ error: `${ficha.nombre} todavía no tiene un proyecto. Pídeme «un pedido nuevo para ${ficha.nombre}».` });
      }
      const botones = [{ texto: "Ver la conversación", href: `/estudio/${proyectoId}/atlas` }, { texto: "Ver el proyecto", href: `/estudio/${proyectoId}` }];
      if (eleccion.accion === "proyecto") {
        if (eleccion.texto.length < 4) return responder({ entendi, tarjeta: { titulo: `Proyecto de ${nombre}`, texto: "Pregúntame lo que quieras de este proyecto: cómo va, qué falta, qué se decidió.", botones } });
        const m = await consultarProyecto(proyectoId, eleccion.texto, yo, "atlas", randomUUID());
        return responder({ entendi, tarjeta: { titulo: `Proyecto de ${nombre}`, texto: m.respuesta, botones } });
      }
      if (eleccion.texto.length < 8) return responder({ error: "Cuéntame qué hay que cambiar, en una frase." });
      if (!confirmado) return responder({ entendi, confirmar: { texto: `Voy a anotar este cambio en el proyecto de ${nombre} y el equipo lo va a hacer: «${eleccion.texto}». Usa IA: unos centavos del saldo. ¿Lo hago?`, eleccion: { ...eleccion, proyecto: proyectoId } } });
      const m = await encargarProyecto(proyectoId, eleccion.texto, yo, "atlas", randomUUID(), new URL(req.url).origin);
      return responder({ entendi, seguir: proyectoId, tarjeta: { titulo: `Cambio en el proyecto de ${nombre}`, texto: m.respuesta, botones } });
    }
    // Lo demás lo hace la caja, igual que siempre.
    const r = await ejecutarCaja({ accion: eleccion.accion, cliente: eleccion.cliente, texto: eleccion.texto, confirmado }, yo, new URL(req.url).origin);
    const j = (await r.json().catch(() => ({}))) as { tarjeta?: Tarjeta; confirmar?: string; error?: string; ficha?: string };
    if (j.confirmar) return responder({ entendi, confirmar: { texto: j.confirmar, eleccion } });
    if (!r.ok || j.error) return responder({ entendi, error: j.error ?? "No se pudo hacer.", ficha: j.ficha });
    const tarjeta = j.tarjeta && { ...j.tarjeta, botones: j.tarjeta.botones?.map((b) => (b.proyecto ? { texto: b.texto, href: `/estudio/${b.proyecto}/atlas` } : b)) };
    return responder({ entendi, tarjeta });
  } catch (err) {
    return responder({ entendi, error: `No se pudo hacer: ${ocultarClaves(String((err as Error).message)).slice(0, 200)}. Lo escrito queda aquí; vuelve a intentar.` });
  }
}
