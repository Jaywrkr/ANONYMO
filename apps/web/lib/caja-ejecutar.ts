// Lo que hace la caja de Atlas (sistema/95), separado de la ruta para que la conversación única lo use (sistema/106).
// Nada sale hacia afuera: el mensaje se prepara y Jay o Luna lo mandan. Lo que usa IA pide confirmación primero.
// Si a un cliente le falta lo mínimo para la tarea, no se hace y se dice qué falta (saber.ts).
import {
  ACCIONES_CAJA, PROPIAS_ANONYMO, TAREAS_SABER, clienteConFicha, esAnonymo, contextoCliente, escribirGuion, estadoTareas, guardarFicha, leerFuentes,
  idFicha, leerProspectos, idMes, leerMesContenido, mesDeTexto, mesPorDefecto, nombreDato, nombreDe, nombreMes, ocultarClaves, puedeHacer, saberDe, textoFaltan, type AccionCaja, type Ficha,
} from "@anonymo/pipeline";
import { randomUUID } from "node:crypto";
import { cartera } from "@/lib/cartera";
import { baseUrl } from "@/lib/base";
import { mal, vistaProspecto } from "@/lib/clientes";
import type { Tarjeta } from "@/lib/caja";
import { crearMes } from "@/lib/contenido";
import { consultarProyecto, encargarProyecto } from "@/lib/proyecto-atlas";

const sinCache = { headers: { "cache-control": "no-store" } };

/** Los clientes de la caja: todas las fichas y, además, los negocios nuevos de Imán que todavía no tienen ficha
 * (a esos se les pide la muestra y el primer mensaje). Cada uno con la forma de una ficha, para medir sus mínimos. */
export async function clientesCaja(): Promise<Ficha[]> {
  const [{ fichas }, l] = await Promise.all([cartera(), leerProspectos().catch(() => ({ prospectos: {} as Record<string, never> }))]);
  const ids = new Set(fichas.map((f) => f.id));
  const nuevos = Object.values(l.prospectos)
    .filter((x) => x.estado !== "descartado" && !fichas.some((f) => f.prospecto?.id === x.id))
    .map((x): Ficha => ({ id: idFicha(x.nombre), nombre: nombreDe(x), prospecto: x, proyectos: [], videos: [], kits: [], historia: [], contacto: { telefono: x.telefono, web: x.web, mapa: x.mapa }, actualizado: x.actualizado }))
    .filter((f) => !ids.has(f.id) && (ids.add(f.id), true));
  return [...fichas, ...nuevos];
}

/** El proyecto más reciente del cliente que no está en la papelera. */
export const proyectoDe = (f: Ficha) => [...f.proyectos].filter((p) => !p.papelera).sort((a, b) => b.actualizado.localeCompare(a.actualizado))[0];

export interface PedidoCaja { accion?: unknown; cliente?: unknown; texto?: unknown; confirmado?: unknown }

/** Hace una acción de la caja. Responde una tarjeta, una confirmación o un error, igual que la ruta de la caja. */
export async function ejecutarCaja(c: PedidoCaja, yo: "jay" | "luna", origen: string): Promise<Response> {
  const p = { yo };
  const accion = String(c.accion ?? "") as AccionCaja;
  const def = ACCIONES_CAJA[accion];
  if (!def) return mal("No entendí qué hacer. Escribe / para ver lo que se puede pedir.");
  const texto = String(c.texto ?? "").trim().slice(0, 1200);
  const f = typeof c.cliente === "string" && c.cliente ? (await clientesCaja()).find((x) => x.id === c.cliente) : undefined;
  if (c.cliente && !f) return mal("No encontré ese cliente. Elígelo de la lista con #.", 404);
  if (def.conCliente && !f) return mal(`Para «${def.nombre}» dime para quién: escribe # y elige el cliente.`);
  if (def.pronto) {
    const falta = f ? puedeHacer(saberDe(f), def.tarea!).faltan : [];
    return mal(`«${def.nombre}» todavía no se puede pedir desde aquí.${falta.length ? ` Cuando esté, a ${f!.nombre} le va a faltar: ${textoFaltan(falta)}.` : ""}`, 409);
  }
  // Lo mínimo de cada tarea (sistema/92): sin eso no se hace, y se dice qué falta y dónde se completa.
  const saber = f ? saberDe(f) : undefined;
  if (f && saber && def.tarea && clienteConFicha(f)) {
    const e = puedeHacer(saber, def.tarea);
    if (!e.listo) return Response.json({ error: `A ${f.nombre} le falta: ${textoFaltan(e.faltan)}.`, ficha: `/estudio/cliente/${f.id}#saber` }, { status: 409, ...sinCache });
  }

  try {
    if (accion === "guion") {
      if (texto.length < 8) return mal("Cuéntale a Faro de qué es el video, en una frase.");
      if (c.confirmado !== true) return Response.json({ confirmar: `Faro va a escribir un guion${f ? ` para ${f.nombre}` : ""}. Usa IA: unos centavos del saldo. ¿Lo hago?` }, sinCache);
      const g = await escribirGuion(texto, { cliente: f?.nombre, por: p.yo!, saber: saber && f && clienteConFicha(f) ? contextoCliente(saber, [...TAREAS_SABER.guion.minimo, ...TAREAS_SABER.guion.mejor]) : undefined });
      return Response.json({ tarjeta: { titulo: `Guion: ${g.titulo}`, texto: `Gancho: ${g.gancho}\n\n${g.partes.map((x, i) => `${i + 1}. ${x.texto}`).join("\n")}\n\nCierre: ${g.cierre}`, botones: [{ texto: "Abrir en Video", href: "/estudio/video" }] } satisfies Tarjeta }, sinCache);
    }
    if (accion === "contenido") {
      // El mes que se nombra («diciembre») o, si no, el que viene. Lo demás del texto va como pedido especial.
      const mes = mesDeTexto(texto) ?? mesPorDefecto();
      const ya = await leerMesContenido(idMes(f!.id, mes));
      if (ya) return Response.json({ tarjeta: { titulo: `Contenido de ${f!.nombre} · ${nombreMes(mes)}`, texto: "Ese mes ya está armado. Ábrelo para revisarlo.", botones: [{ texto: "Revisar el mes", href: `/estudio/contenido/${ya.id}` }] } satisfies Tarjeta }, sinCache);
      if (c.confirmado !== true) return Response.json({ confirmar: `Faro va a armar ${nombreMes(mes)} de ${f!.nombre}. Usa IA: unos centavos del saldo. ¿Lo hago?` }, sinCache);
      const pedido = texto.replace(/\b(?:de |para )?(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)(?: de \d{4})?\b/gi, "").trim();
      const m = await crearMes(f!, mes, pedido.length > 3 ? pedido : undefined, p.yo!);
      return Response.json({ tarjeta: { titulo: `Contenido de ${f!.nombre} · ${nombreMes(mes)}`, texto: `Faro armó ${m.piezas.length} publicaciones en ${m.series.length} series: ${m.series.map((s) => s.nombre).join(", ")}. Revísalas y aprueba las que estén bien.`, botones: [{ texto: "Revisar el mes", href: `/estudio/contenido/${m.id}` }] } satisfies Tarjeta }, sinCache);
    }
    if (accion === "muestra" || accion === "mensaje") {
      if (!f!.prospecto) return mal(`${f!.nombre} no tiene muestra: las muestras salen de Imán, para negocios nuevos.`, 409);
      const l = await leerProspectos();
      const v = vistaProspecto(f!.prospecto, l.firma, await baseUrl());
      if (accion === "muestra") return Response.json({ tarjeta: { titulo: `Muestra de ${f!.nombre}`, texto: `${v.vistas ? `La abrió ${v.vistas} ${v.vistas === 1 ? "vez" : "veces"}.` : "Todavía no la abre."}`, botones: [{ texto: "Abrir la muestra", href: v.muestra, externo: true }, { texto: "Copiar el enlace", copiar: v.muestra }] } satisfies Tarjeta }, sinCache);
      return Response.json({ tarjeta: { titulo: `Mensaje para ${f!.nombre}`, texto: v.mensaje, botones: [{ texto: "Copiar", copiar: v.mensaje }, ...(v.whatsapp ? [{ texto: "Abrir en WhatsApp", href: v.whatsapp, externo: true }] : [])] } satisfies Tarjeta }, sinCache);
    }
    if (accion === "datos") {
      const web = f!.guardada?.web ?? f!.contacto.web;
      const propias = esAnonymo(f!.id) && clienteConFicha(f!) ? PROPIAS_ANONYMO : undefined;
      if (!web && !propias) return Response.json({ error: `No sé la web de ${f!.nombre}. Anótala en su ficha, en «Contacto y notas».`, ficha: `/estudio/cliente/${f!.id}` }, { status: 409, ...sinCache });
      const lectura = await leerFuentes({ saber: saber!, web, propias });
      await guardarFicha(f!.id, { nombre: f!.guardada?.nombre ?? f!.nombre, lectura: { ...lectura, por: p.yo! } }, p.yo!);
      const n = lectura.propuestas.length;
      const texto2 = !lectura.web && propias ? (n ? `Hay ${n} ${n === 1 ? "dato" : "datos"} que el estudio ya sabe de Unmake. Revísalos en su ficha y guarda los que estén bien.` : "Su ficha ya tiene todo lo que sabe el estudio.") : lectura.web?.estado !== "ok" ? `No pudimos leer su web: ${lectura.web?.motivo ?? "no abre"}` : n ? `Encontramos ${n} ${n === 1 ? "dato" : "datos"} en su web. Revísalos en su ficha y guarda los que estén bien.` : "Leímos su web y no hay nada nuevo.";
      return Response.json({ tarjeta: { titulo: `Datos de ${f!.nombre}`, texto: texto2, botones: n ? [{ texto: "Revisar en su ficha", href: `/estudio/cliente/${f!.id}#leido` }] : [] } satisfies Tarjeta }, sinCache);
    }
    if (accion === "pedido") {
      const q = new URLSearchParams({ ...(texto ? { q: texto } : {}), ...(f ? { cliente: f.nombre.slice(0, 80), ficha: f.id } : {}) });
      return Response.json({ tarjeta: { titulo: `Nuevo pedido${f ? ` para ${f.nombre}` : ""}`, texto: "Lo dejé escrito. Revísalo y Atlas arma el plan; nadie empieza hasta que tú lo digas.", botones: [{ texto: "Abrir el pedido", href: `/estudio/nuevo?${q}` }] } satisfies Tarjeta }, sinCache);
    }
    if (accion === "proyecto" || accion === "cambio") {
      const pr = proyectoDe(f!);
      if (!pr) return mal(`${f!.nombre} todavía no tiene un proyecto. Escribe /pedido para armar uno.`, 409);
      const botones = [{ texto: "Ver la conversación", proyecto: pr.id }, { texto: "Ver el proyecto", href: `/estudio/${pr.id}` }];
      if (accion === "proyecto" && texto.length < 4) return Response.json({ tarjeta: { titulo: `Proyecto de ${f!.nombre}`, texto: "Su conversación con Atlas guarda lo que se avanzó y lo que falta. Escribe una pregunta después de /proyecto y te respondo aquí.", botones: [{ texto: "Abrir la conversación", proyecto: pr.id }, { texto: "Ver el proyecto", href: `/estudio/${pr.id}` }] } satisfies Tarjeta }, sinCache);
      if (accion === "proyecto") {
        // Solo lectura: Atlas responde con los registros del proyecto y la respuesta queda en su conversación.
        const m = await consultarProyecto(pr.id, texto, p.yo!, "atlas", randomUUID());
        return Response.json({ tarjeta: { titulo: `Proyecto de ${f!.nombre}`, texto: m.respuesta, botones } satisfies Tarjeta }, sinCache);
      }
      if (texto.length < 8) return mal("Cuéntale a Atlas qué hay que cambiar, en una frase.");
      if (c.confirmado !== true) return Response.json({ confirmar: `Atlas va a anotar este cambio en el proyecto de ${f!.nombre} y el equipo lo va a hacer. Usa IA. ¿Lo hago?` }, sinCache);
      const m = await encargarProyecto(pr.id, texto, p.yo!, "atlas", randomUUID(), origen);
      return Response.json({ tarjeta: { titulo: `Cambio en el proyecto de ${f!.nombre}`, texto: m.respuesta, botones } satisfies Tarjeta }, sinCache);
    }
  } catch (e) {
    return mal(ocultarClaves((e as Error).message), (e as { status?: number }).status ?? 502);
  }
  return mal("No entendí qué hacer.");
}
