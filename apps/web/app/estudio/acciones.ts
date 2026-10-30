"use server";
// Lo mismo que la terminal, con botones. Cada acción corre el pipeline y vuelve a la página del proyecto.
import { redirect } from "next/navigation";
import { agentePorId } from "@anonymo/agentes";
import { revalidatePath } from "next/cache";
import { mandarAPapelera, sacarDePapelera, borrarProyecto, borrarRemoto, subirRuta, ocultarClaves, bitacora, crear, empezar, entenderPedido, nubeActiva, planificar, proyectosEnNube, replanear, slug, type Pedido } from "@anonymo/pipeline";
import { cambiarModo, elegirDireccion, pedirDirecciones, guardarProyecto, leerEntrega, type Marca, type ModoTrabajo, type Propuesta } from "@anonymo/pipeline";
import { prepararEncargo, aplicarEncargo, cambiarMejora, type AccionEncargo, pedirControl, anotar, aprobar, archivarSolicitud, listarSolicitudes, pedidoDeSolicitud, cambiarResponsable, avanzar, cambiar, existe, cambiarPausas, elegirMotor, parar, guardarArchivo, leerProyecto, quitarPendiente, responder, reanudar, restaurar, tokenPortal, type TareaId } from "@anonymo/pipeline";
import { exigirEstudio } from "@/lib/estudio";
import { sesionConfigurada } from "@/lib/sesion";
import { conNube, llevar, traer } from "@/lib/nube";
import { archivosDe } from "@/lib/subidas";
import { lanzar, trabajandoAhora } from "@/lib/trabajo";

type Quien = "jay" | "luna";

/** Con claves configuradas, la acción queda a nombre de quien entró (no de lo que diga el formulario). */
async function leer(f: FormData) {
  const sesion = await exigirEstudio();
  const id = String(f.get("id") ?? "");
  const quien: Quien = sesionConfigurada() ? sesion : f.get("quien") === "luna" ? "luna" : "jay";
  const motor = elegirMotor({ simulado: f.get("motor") === "simulado", manual: f.get("motor") === "manual" });
  return { id, quien, motor, nota: String(f.get("nota") ?? "").trim() || undefined };
}

/**
 * Corre una acción del estudio sobre la nube y vuelve al proyecto con un aviso.
 * Con `trabaja`, al terminar pide una vuelta de trabajo en segundo plano (sistema/36): la acción vuelve al momento
 * y el equipo trabaja aparte, un agente por vuelta, sin cortes por tiempo.
 */
async function correr(id: string, fn: () => Promise<unknown> | unknown, ok: string, fiesta = false, ruta = "", trabaja = false) {
  await exigirEstudio();
  // ruta: a qué parte del proyecto volver (ej. «?ver=marca» o «/propuesta»).
  const base = `/estudio/${id}${ruta.startsWith("/") ? ruta.split("?")[0] : ""}`;
  const extra = ruta.includes("?") ? `${ruta.split("?")[1]}&` : "";
  let destino = `${base}?${extra}ok=${encodeURIComponent(ok)}${fiesta ? "&fiesta=1" : ""}`;
  try {
    await conNube([id], fn);
    // Si ya hay un agente trabajando, no se arranca otro: el que está sigue solo con lo nuevo (sistema/42).
    if (trabaja && !(await trabajandoAhora(id))) await lanzar(id);
  } catch (e) {
    const msj = ocultarClaves((e as Error).message);
    // Aprobar dos veces o reintentar mientras trabajan no es un error: el equipo ya está en eso.
    destino = /no está esperando una decisión \(estado: en-curso\)/.test(msj)
      ? `${base}?${extra}ok=${encodeURIComponent("Ya está trabajando: te avisamos cuando termine.")}`
      : `${base}?${extra}error=${encodeURIComponent(msj)}`;
  }
  revalidatePath(`/estudio/${id}`);
  redirect(destino);
}


export async function accionAprobar(f: FormData) {
  const { id, quien, motor, nota } = await leer(f);
  await correr(id, () => aprobar(id, quien, nota, motor, undefined, f.get("forzar") === "1", { max: 0 }), "Aprobado. Sigue el equipo: te avisamos cuando haya algo para revisar.", true, "", true);
}

export async function accionCambiar(f: FormData) {
  const { id, quien, motor, nota } = await leer(f);
  const agente = String(f.get("agente") ?? "") || undefined;
  await correr(id, () => {
    if (!nota) throw new Error("Escribe qué hay que cambiar.");
    return cambiar(id, quien, nota, agente, motor, undefined, { max: 0 });
  }, "Cambio pedido. Lo están rehaciendo: te avisamos cuando esté.", false, "", true);
}

export async function accionParar(f: FormData) {
  const { id, quien, nota } = await leer(f);
  await correr(id, () => parar(id, quien, nota), "Proyecto en pausa. Nadie trabaja en él hasta que lo reanudes.");
}

export async function accionReanudar(f: FormData) {
  const { id } = await leer(f);
  await correr(id, () => reanudar(id), "Proyecto reanudado.", false, "", true);
}

export async function accionPausas(f: FormData) {
  const { id, motor } = await leer(f);
  await correr(id, async () => {
    cambiarPausas(id, String(f.get("pausas") ?? "clave"));
    await avanzar(id, motor, undefined, { max: 0 });
  }, "Listo: te pedirá revisar donde elegiste.", false, "?ver=ajustes", true);
}

export async function accionSeguir(f: FormData) {
  const { id, motor } = await leer(f);
  // Si ya está trabajando, Continuar no hace nada (ni reinicia lo que va a medias): solo lo dice.
  const ya = await trabajandoAhora(id);
  if (ya) {
    const quien = ya.tarea ? agentePorId(ya.tarea.split(".")[1])?.nombre : "El equipo";
    redirect(`/estudio/${id}?ok=${encodeURIComponent(`${quien} ya está trabajando: no hace falta continuar. Te avisamos cuando termine.`)}`);
  }
  await correr(id, () => {
    // Retoma lo que quedó a medias: limpia el error y lo que quedó «en curso» de una vuelta muerta
    // (si tenía entrega, se rehace; si no, se empieza; lo escrito a medias se conserva y sigue desde ahí).
    const p = leerProyecto(id);
    // Si falló porque la IA no alcanzó a escribir, esta vez va directo a escribir (sin buscar y pensando poco).
    if (p.error?.tarea && /no alcanzó a escribir|no avanzó/.test(p.error.mensaje)) p.reintentos = { ...p.reintentos, [p.error.tarea]: 1 };
    delete p.error;
    for (const [t, e] of Object.entries(p.tareas)) {
      if (e !== "en-curso" || p.parciales?.[t]) continue;
      p.tareas[t as TareaId] = leerEntrega(id, t as TareaId) ? "rehacer" : "por-empezar";
      if (p.vueltas) delete p.vueltas[t];
    }
    if (p.estado === "esperando" && !p.revision && !p.esperaJurado && !p.direcciones?.esperando) p.estado = "en-curso";
    guardarProyecto(p);
    return avanzar(id, motor, undefined, { max: 0 });
  }, "El equipo sigue desde donde quedó.", false, "", true);
}

export async function accionPortal(f: FormData) {
  const { id } = await leer(f);
  await correr(id, () => tokenPortal(id, f.get("nuevo") === "1"), f.get("nuevo") === "1" ? "Enlace nuevo creado: el anterior ya no sirve." : "Enlace del cliente listo.");
}

/** Primer paso: ver a quién manda Atlas el comentario, sin cambiar nada. */
export async function accionVerReparto(f: FormData) {
  await exigirEstudio();
  const { id } = await leer(f);
  const texto = String(f.get("texto") ?? "").trim();
  const pendiente = String(f.get("pendiente") ?? "");
  redirect(`/estudio/${id}?ver=cliente&vista=${encodeURIComponent(texto)}${pendiente ? `&pendiente=${encodeURIComponent(pendiente)}` : ""}#anotar`);
}

/** Segundo paso: el comentario entra al proyecto, va a los agentes elegidos y el equipo rehace. */
export async function accionMandarCliente(f: FormData) {
  const { id, quien, motor } = await leer(f);
  const texto = String(f.get("texto") ?? "").trim();
  const agentes = f.getAll("agentes").map(String).filter(Boolean);
  const pendiente = String(f.get("pendiente") ?? "");
  const origen = f.get("origen") === "cliente" ? "cliente" : quien;
  // Mientras un agente trabaja no se mezclan pedidos nuevos: se pasa cuando termine (sistema/42).
  const ya = await trabajandoAhora(id);
  if (ya) redirect(`/estudio/${id}?ver=cliente&error=${encodeURIComponent(`${ya.tarea ? agentePorId(ya.tarea.split(".")[1])?.nombre : "El equipo"} está trabajando. Pásaselo al equipo cuando termine (queda anotado aquí).`)}`);
  await correr(id, async () => {
    if (!texto) throw new Error("El comentario está vacío.");
    if (!agentes.length) throw new Error("Elige al menos un agente.");
    anotar(id, texto, origen, agentes);
    if (pendiente) quitarPendiente(id, pendiente);
    await avanzar(id, motor, undefined, { max: 0 });
  }, "Comentario enviado: el equipo lo está rehaciendo.", false, "", true);
}

export async function accionDescartarPendiente(f: FormData) {
  const { id } = await leer(f);
  await correr(id, () => quitarPendiente(id, String(f.get("pendiente") ?? "")), "Comentario descartado.");
}

export async function accionRestaurar(f: FormData) {
  await exigirEstudio();
  const { id } = await leer(f);
  const tarea = String(f.get("tarea") ?? "") as TareaId;
  const v = Number(f.get("v"));
  let destino = `/estudio/${id}/${tarea.replace(".", "-")}`;
  try {
    const r = await conNube([id], () => restaurar(id, tarea, v));
    destino += `?ok=${encodeURIComponent(`La v${v} quedó como v${r.nueva}.${r.revisar.length ? ` Revisa lo que dependía de ella: ${r.revisar.join(", ")}.` : ""}`)}`;
  } catch (e) {
    destino += `?error=${encodeURIComponent((e as Error).message)}`;
  }
  revalidatePath(destino.split("?")[0]);
  redirect(destino);
}

export async function accionSubir(f: FormData) {
  const { id } = await leer(f);
  const nota = String(f.get("nota") ?? "").trim() || undefined;
  const cuantos = f.getAll("archivos").filter((x) => x instanceof File && x.size > 0).length + f.getAll("subida").filter(Boolean).length;
  await correr(id, async () => {
    const archivos = await archivosDe(f);
    if (!archivos.length) throw new Error("Elige al menos un archivo.");
    for (const a of archivos) guardarArchivo(id, a.nombre, a.datos, nota);
  }, `${cuantos} archivo(s) agregado(s). Los agentes los verán en su próxima entrega.`, false, "?ver=archivos");
}

export async function accionResponder(f: FormData) {
  const { id, quien } = await leer(f);
  await correr(id, () => {
    const preguntas = leerProyecto(id).plan.preguntas;
    responder(id, Object.fromEntries(preguntas.map((q, i) => [q, String(f.get(`r${i}`) ?? "")])), quien);
  }, "Respuestas anotadas: los agentes las leen desde ahora.");
}

export async function accionResponsable(f: FormData) {
  const { id } = await leer(f);
  const fase = Number(f.get("fase"));
  const socio = f.get("socio") === "luna" ? "luna" : "jay";
  await correr(id, () => cambiarResponsable(id, fase, socio), `La fase ${fase} la aprueba ahora ${socio === "luna" ? "Luna" : "Jay"}.`);
}

export async function accionConvertirSolicitud(f: FormData) {
  await exigirEstudio();
  const sid = String(f.get("solicitud") ?? "");
  const plantilla = String(f.get("plantilla") ?? "") || undefined;
  let destino = "/estudio";
  try {
    const pedido = await conNube(["_solicitudes"], async () => {
      const s = listarSolicitudes().find((x) => x.id === sid);
      if (!s) throw new Error("La solicitud ya no existe.");
      // Atlas lee el mensaje del cliente y arma el plan; nadie trabaja hasta «que empiecen».
      const l = await entenderPedido(s.mensaje, { cliente: s.nombre });
      const pedido: Pedido = { ...pedidoDeSolicitud(s), tipo: l.tipo, contexto: l.contexto, idioma: l.idioma, plantilla: plantilla ?? l.plantilla };
      await conNube([pedido.id], () => {
        const plan = planificar(pedido, l.eleccion);
        crear(pedido, plan, "plan");
        bitacora(pedido.id, `Solicitud de la web de ${s.nombre}. Atlas armó el plan: ${plan.tareas.length} tareas.`);
      });
      archivarSolicitud(sid);
      return pedido;
    });
    destino = `/estudio/${pedido.id}`;
  } catch (e) {
    destino = `/estudio?error=${encodeURIComponent((e as Error).message)}`;
  }
  revalidatePath("/estudio");
  redirect(destino);
}

export async function accionDescartarSolicitud(f: FormData) {
  await exigirEstudio();
  try {
    await conNube(["_solicitudes"], () => archivarSolicitud(String(f.get("solicitud") ?? "")));
  } catch {}
  revalidatePath("/estudio");
  redirect("/estudio");
}

/**
 * Nuevo proyecto: Jay o Luna cuentan lo que hablaron con el cliente, en sus palabras.
 * Atlas lo lee, saca los datos y decide qué agentes trabajan. Nadie trabaja hasta «que empiecen».
 */
export async function accionNuevoProyecto(f: FormData) {
  const yo = await exigirEstudio();
  const quienN = yo === "luna" ? "Luna" : "Jay";
  const texto = String(f.get("texto") ?? "").trim();
  const nombre = String(f.get("cliente") ?? "").trim().slice(0, 80) || undefined;
  let destino = "/estudio/nuevo";
  try {
    const archivos = (await archivosDe(f)).map((a) => ({ name: a.nombre, datos: a.datos }));
    if (texto.length < 20) throw new Error("Cuéntale a Atlas un poco más: al menos un par de frases de lo que hablaron.");
    const l = await entenderPedido(texto, { cliente: nombre, archivos: archivos.map((a) => a.name) });
    const cliente = l.cliente;
    if (!cliente) throw new Error("Atlas no encontró el nombre del cliente. Escríbelo en «Cliente».");
    // Nombre único: mira lo que hay en local y, en línea, también en la nube.
    const usados = new Set(nubeActiva() ? await proyectosEnNube() : []);
    const base = slug(cliente);
    let id = base;
    for (let i = 2; usados.has(id) || existe(id); i++) id = `${base}-${i}`;
    const pedido: Pedido = { id, cliente, tipo: l.tipo, descripcion: texto, contexto: l.contexto, idioma: l.idioma, plantilla: l.plantilla, creado: new Date().toISOString() };
    await conNube([id], async () => {
      const plan = planificar(pedido, l.eleccion);
      crear(pedido, plan, "plan");
      bitacora(id, `${quienN} contó el pedido de ${cliente}. Atlas ${plan.porIA ? "lo leyó con IA" : "usó sus reglas"}: trabajan ${plan.tareas.length} tareas en las fases ${plan.fases.join(", ")}.`);
      // Los archivos entran antes de que trabajen: así los agentes los ven desde la primera entrega.
      for (const a of archivos) guardarArchivo(id, a.name, a.datos, `Subido por ${quienN} al crear el proyecto`);
    });
    destino = `/estudio/${id}`;
  } catch (e) {
    // Lo que escribió vuelve a la caja: no se pierde por un error.
    destino = `/estudio/nuevo?error=${encodeURIComponent(ocultarClaves((e as Error).message))}&q=${encodeURIComponent(texto.slice(0, 1800))}`;
  }
  revalidatePath("/estudio");
  redirect(destino);
}

/** «Que empiecen»: el plan queda aprobado y el equipo trabaja hasta la primera pausa. */
export async function accionEmpezar(f: FormData) {
  const { id, quien, motor } = await leer(f);
  const modo = (["paso", "fase", "auto"].includes(String(f.get("modo"))) ? f.get("modo") : "paso") as ModoTrabajo;
  await correr(id, () => {
    const p = leerProyecto(id);
    p.modo = modo;
    p.prueba = motor.nombre === "simulado" || undefined;
    guardarProyecto(p);
    return empezar(id, quien, motor, undefined, { max: 0 });
  }, modo === "paso" ? "Empezaron. Trabaja un agente a la vez: te avisamos cuando entregue." : "Empezaron. Te avisamos cuando haya algo para revisar.", true, "", true);
}

/** Corregir el plan con palabras antes de empezar: Atlas lo vuelve a leer. */
export async function accionReplanear(f: FormData) {
  const { id, quien } = await leer(f);
  await correr(id, () => replanear(id, String(f.get("ajuste") ?? ""), quien), "Atlas rehízo el plan con tu ajuste.");
}

/** Borrar un proyecto: hay que escribir el nombre del cliente para confirmar. No se puede deshacer. */
export async function accionBorrar(f: FormData) {
  const yo = await exigirEstudio();
  const id = String(f.get("id") ?? "");
  let destino = "/estudio";
  try {
    await traer(id);
    const p = leerProyecto(id);
    if (String(f.get("confirmar") ?? "").trim().toLowerCase() !== p.pedido.cliente.trim().toLowerCase())
      throw new Error(`Para borrar escribe el nombre exacto del cliente: «${p.pedido.cliente}».`);
    if (nubeActiva()) await borrarRemoto(id);
    borrarProyecto(id);
    console.error(`[estudio] ${yo} borró el proyecto ${id}`);
    destino = `/estudio/papelera?ok=${encodeURIComponent(`«${p.pedido.cliente}» se borró para siempre.`)}`;
  } catch (e) {
    destino = `/estudio/papelera?error=${encodeURIComponent(ocultarClaves((e as Error).message))}`;
  }
  revalidatePath("/estudio");
  redirect(destino);
}

/** Mandar a la papelera: deja de aparecer y de trabajar. Se restaura cuando quieras; a los 30 días se borra sola. */
export async function accionAPapelera(f: FormData) {
  const yo = await exigirEstudio();
  const id = String(f.get("id") ?? "");
  let destino = `/estudio?ok=${encodeURIComponent("Proyecto en la papelera. Lo puedes restaurar durante 30 días.")}`;
  try {
    await conNube([id], () => mandarAPapelera(id, yo));
  } catch (e) {
    destino = `/estudio/${id}?error=${encodeURIComponent(ocultarClaves((e as Error).message))}`;
  }
  revalidatePath("/estudio");
  redirect(destino);
}

export async function accionSacarDePapelera(f: FormData) {
  const yo = await exigirEstudio();
  const id = String(f.get("id") ?? "");
  let destino = `/estudio/${id}?ok=${encodeURIComponent("Proyecto restaurado: volvió a donde estaba.")}`;
  try {
    await conNube([id], () => sacarDePapelera(id, yo));
  } catch (e) {
    destino = `/estudio/papelera?error=${encodeURIComponent(ocultarClaves((e as Error).message))}`;
  }
  revalidatePath("/estudio");
  redirect(destino);
}

// ---- sistema/35 ----

const hexOk = (h: string) => /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(h.trim());
const normalHex = (h: string) => {
  const x = h.trim().replace("#", "").toLowerCase();
  return `#${x.length === 3 ? x.split("").map((c) => c + c).join("") : x}`;
};

/** Guarda la marca del cliente: colores, fuentes, logo y notas. */
export async function accionMarca(f: FormData) {
  const { id } = await leer(f);
  await correr(id, () => {
    const colores = (JSON.parse(String(f.get("colores") ?? "[]")) as { nombre: string; hex: string }[])
      .filter((c) => hexOk(c.hex)).slice(0, 16).map((c) => ({ nombre: c.nombre.trim().slice(0, 40) || normalHex(c.hex), hex: normalHex(c.hex) }));
    const fuentes = (JSON.parse(String(f.get("fuentes") ?? "[]")) as { nombre: string; uso: string }[])
      .filter((x) => x.nombre.trim()).slice(0, 8).map((x) => ({ nombre: x.nombre.trim().slice(0, 60), uso: x.uso.trim().slice(0, 80) }));
    const p = leerProyecto(id);
    const marca: Marca = { colores, fuentes, logo: String(f.get("logo") ?? "") || undefined, notas: String(f.get("notas") ?? "").trim().slice(0, 1500) || undefined, actualizado: new Date().toISOString() };
    p.marca = marca;
    guardarProyecto(p);
    bitacora(id, `Marca actualizada: ${colores.length} colores, ${fuentes.length} fuentes.`);
  }, "Marca guardada. El equipo la usa desde su próxima entrega.", false, "?ver=marca");
}

/** Horas reales de Jay y tarifa: mandan sobre la estimación de Ledger. */
export async function accionPresupuesto(f: FormData) {
  const { id } = await leer(f);
  await correr(id, () => {
    const num = (k: string) => { const v = Number(String(f.get(k) ?? "").replace(",", ".")); return Number.isFinite(v) && v > 0 ? v : undefined; };
    const p = leerProyecto(id);
    p.presupuesto = { ...p.presupuesto, ajustes: p.presupuesto?.ajustes ?? [], horasJay: num("horasJay"), tarifa: num("tarifa") };
    guardarProyecto(p);
    bitacora(id, `Presupuesto: ${p.presupuesto.horasJay ? `${p.presupuesto.horasJay} h de Jay` : "horas de Ledger"}${p.presupuesto.tarifa ? ` a $${p.presupuesto.tarifa}/h` : ""}.`);
  }, "Números guardados.", false, "?ver=numeros");
}

/** Guarda la propuesta editada (o la borra para volver al borrador). */
export async function accionPropuesta(f: FormData) {
  const { id } = await leer(f);
  const rehacer = f.get("rehacer") === "1";
  await correr(id, () => {
    const p = leerProyecto(id);
    if (rehacer) { delete p.propuesta; guardarProyecto(p); return; }
    const t = (k: string) => String(f.get(k) ?? "").trim();
    const conceptos = f.getAll("concepto").map(String);
    const detalles = f.getAll("detalle").map(String);
    const precios = f.getAll("precio").map((x) => Number(String(x).replace(/[^0-9.,]/g, "").replace(",", ".")) || 0);
    const propuesta: Propuesta = {
      titulo: t("titulo"), intro: t("intro"), quienes: t("quienes"), entendimos: t("entendimos"), haremos: t("haremos"),
      entregables: t("entregables"), tiempos: t("tiempos"), condiciones: t("condiciones"), validez: t("validez"),
      items: conceptos.map((c, i) => ({ concepto: c.trim(), detalle: (detalles[i] ?? "").trim(), precio: precios[i] ?? 0 })).filter((x) => x.concepto),
      actualizado: new Date().toISOString(),
    };
    p.propuesta = propuesta;
    guardarProyecto(p);
  }, rehacer ? "Volvió al borrador con los datos de hoy." : "Propuesta guardada.", false, "/propuesta");
}

/** Cambia cómo trabaja el equipo (sistema/36): un agente a la vez, por fases o automático. */
export async function accionModo(f: FormData) {
  const { id } = await leer(f);
  const modo = (["paso", "fase", "auto"].includes(String(f.get("modo"))) ? f.get("modo") : "paso") as ModoTrabajo;
  await correr(id, () => cambiarModo(id, modo), "Modo de trabajo cambiado.", false, "?ver=ajustes", true);
}

// ---- sistema/37: direcciones de diseño ----

/** Eligen una dirección: el diseñador la desarrolla completa y el equipo sigue con ella. */
export async function accionElegirDireccion(f: FormData) {
  const { id, quien, motor, nota } = await leer(f);
  const n = Number(f.get("n"));
  await correr(id, () => elegirDireccion(id, n, quien, nota, motor, undefined, { max: 0 }), "Dirección elegida. El equipo diseña la web con ella: te avisamos cuando haya algo para revisar.", true, "", true);
}

/** Pide (otras) 3 direcciones de diseño. */
export async function accionPedirDirecciones(f: FormData) {
  const { id, quien, motor, nota } = await leer(f);
  await correr(id, () => pedirDirecciones(id, quien, nota, motor, undefined, { max: 0 }), "Pedidas. Te avisamos cuando lleguen las 3 direcciones.", false, "", true);
}


export async function accionVerificar(f: FormData) {
  const {id} = await leer(f);
  const tarea = String(f.get("tarea") ?? "") as TareaId;
  await correr(id,() => pedirControl(id,tarea),"La revisión está en marcha. Puedes seguir su avance aquí.",false,"/calidad",true);
}

export async function accionCondiciones(f: FormData) {
  const {id} = await leer(f);
  await correr(id,() => {
    const p = leerProyecto(id);
    if (p.estado === "en-curso") throw new Error("Espera a que termine el trabajo actual para cambiar las condiciones.");
    const tarea = String(f.get("tarea") ?? "") as TareaId;
    if (tarea && !p.plan.tareas.includes(tarea)) throw new Error("La entrega no pertenece a este proyecto.");
    const lineas = String(f.get("condiciones") ?? "").split(/\n/).map(s=>s.trim()).filter(Boolean);
    if (lineas.length > 30 || lineas.some(s=>s.length>600)) throw new Error("Usa hasta 30 condiciones, de hasta 600 caracteres cada una.");
    p.requisitos = [...(p.requisitos ?? []).filter(r => (r.tarea ?? "") !== tarea),...lineas.map((texto,i)=>({id:`manual-${tarea || "proyecto"}-${i}`,texto,fuente:"Decisión de Jay o Luna",...(tarea?{tarea}:{})}))];
    if (p.estado === "listo") {
      const primera = p.plan.tareas.find(t=>p.tareas[t] === "lista");
      if (primera) {p.estado="esperando";p.revision={tarea:primera,fecha:new Date().toISOString()};}
    }
    guardarProyecto(p);
  },"Condiciones guardadas. Las revisiones anteriores necesitan comprobar los nuevos requisitos.",false,"/calidad");
}

export async function accionEncargarAtlas(f:FormData){
 const {id,quien}=await leer(f);
 const clave=String(f.get("solicitud")??""),accion=String(f.get("accion")??"") as AccionEncargo,t=String(f.get("tarea")??"");
 // Primero se conserva la solicitud; si la aplicación se interrumpe, el encargo queda visible.
 await conNube([id],()=>prepararEncargo(id,{id:clave,quien,accion,tarea:t?t as TareaId:undefined,nota:String(f.get("nota")??"")}));
 await correr(id,async()=>{
  const r=await aplicarEncargo(id,clave);
  if(r.estado!=="aplicado")throw new Error(r.resultado??"El encargo quedó pendiente.");
 },"Encargo registrado. El proyecto muestra el avance y lo que falta revisar.",false,"/atlas",accion!=="pausar");
}
export async function accionReintentarEncargo(f:FormData){
 const {id}=await leer(f);const clave=String(f.get("solicitud")??"");
 await correr(id,async()=>{const r=await aplicarEncargo(id,clave);if(r.estado!=="aplicado")throw new Error(r.resultado??"El encargo sigue pendiente.");},"Encargo aplicado.",false,"/atlas",true);
}
export async function accionEstadoMejora(f:FormData){
 const {id}=await leer(f);
 await correr(id,()=>cambiarMejora(id,String(f.get("mejora")??""),String(f.get("estado")??"") as "detectada"|"investigando"|"propuesta"|"resuelta",String(f.get("prueba")??"")),"Mejora actualizada.",false,"/atlas");
}
