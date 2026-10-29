"use server";
// Lo mismo que la terminal, con botones. Cada acción corre el pipeline y vuelve a la página del proyecto.
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { mandarAPapelera, sacarDePapelera, borrarProyecto, borrarRemoto, subirRuta, ocultarClaves, bitacora, crear, empezar, entenderPedido, nubeActiva, planificar, proyectosEnNube, replanear, slug, type Pedido } from "@anonymo/pipeline";
import { anotar, aprobar, archivarSolicitud, listarSolicitudes, pedidoDeSolicitud, cambiarResponsable, avanzar, cambiar, existe, cambiarPausas, elegirMotor, parar, guardarArchivo, leerProyecto, quitarPendiente, responder, reanudar, restaurar, tokenPortal, type TareaId } from "@anonymo/pipeline";
import { exigirEstudio } from "@/lib/estudio";
import { sesionConfigurada } from "@/lib/sesion";
import { conNube, llevar, traer } from "@/lib/nube";

type Quien = "jay" | "luna";

/** Con claves configuradas, la acción queda a nombre de quien entró (no de lo que diga el formulario). */
async function leer(f: FormData) {
  const sesion = await exigirEstudio();
  const id = String(f.get("id") ?? "");
  const quien: Quien = sesionConfigurada() ? sesion : f.get("quien") === "luna" ? "luna" : "jay";
  const motor = elegirMotor({ simulado: f.get("motor") === "simulado", manual: f.get("motor") === "manual" });
  return { id, quien, motor, nota: String(f.get("nota") ?? "").trim() || undefined };
}

async function correr(id: string, fn: () => Promise<unknown> | unknown, ok: string) {
  await exigirEstudio();
  let destino = `/estudio/${id}?ok=${encodeURIComponent(ok)}`;
  try {
    await conNube([id], fn);
  } catch (e) {
    destino = `/estudio/${id}?error=${encodeURIComponent(ocultarClaves((e as Error).message))}`;
  }
  revalidatePath(`/estudio/${id}`);
  redirect(destino);
}


/** Cada tarea terminada sube a la nube al momento: si Vercel corta por tiempo, lo hecho no se pierde y «Seguir» continúa. */
const subirCadaTarea = (id: string) => async (texto: string) => {
  const t = texto.trimStart();
  if (t.startsWith("✓")) await llevar(id);
  // Al empezar una tarea basta con el estado: así la oficina ve quién está trabajando.
  else if (t.startsWith("…") && nubeActiva()) await subirRuta(`${id}/estado.json`).catch(() => {});
};

export async function accionAprobar(f: FormData) {
  const { id, quien, motor, nota } = await leer(f);
  await correr(id, () => aprobar(id, quien, nota, motor, subirCadaTarea(id), f.get("forzar") === "1"), "Aprobado. El equipo siguió hasta la próxima pausa.");
}

export async function accionCambiar(f: FormData) {
  const { id, quien, motor, nota } = await leer(f);
  const agente = String(f.get("agente") ?? "") || undefined;
  await correr(id, () => {
    if (!nota) throw new Error("Escribe qué hay que cambiar.");
    return cambiar(id, quien, nota, agente, motor, subirCadaTarea(id));
  }, "Cambio pedido. Se rehizo y quedó esperando tu revisión.");
}

export async function accionParar(f: FormData) {
  const { id, quien, nota } = await leer(f);
  await correr(id, () => parar(id, quien, nota), "Proyecto en pausa. Nadie trabaja en él hasta que lo reanudes.");
}

export async function accionReanudar(f: FormData) {
  const { id } = await leer(f);
  await correr(id, () => reanudar(id), "Proyecto reanudado: te toca decidir.");
}

export async function accionPausas(f: FormData) {
  const { id, motor } = await leer(f);
  await correr(id, async () => {
    cambiarPausas(id, String(f.get("pausas") ?? "clave"));
    await avanzar(id, motor, subirCadaTarea(id));
  }, "Listo: te pedirá revisar donde elegiste.");
}

export async function accionSeguir(f: FormData) {
  const { id, motor } = await leer(f);
  await correr(id, () => avanzar(id, motor, subirCadaTarea(id)), "El equipo siguió trabajando.");
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
  await correr(id, async () => {
    if (!texto) throw new Error("El comentario está vacío.");
    if (!agentes.length) throw new Error("Elige al menos un agente.");
    anotar(id, texto, origen, agentes);
    if (pendiente) quitarPendiente(id, pendiente);
    await avanzar(id, motor, subirCadaTarea(id));
  }, "Comentario enviado: el equipo rehízo lo necesario.");
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
  const archivos = f.getAll("archivos").filter((x): x is File => x instanceof File && x.size > 0);
  await correr(id, async () => {
    if (!archivos.length) throw new Error("Elige al menos un archivo.");
    for (const a of archivos) guardarArchivo(id, a.name, Buffer.from(await a.arrayBuffer()), nota);
  }, `${archivos.length} archivo(s) agregado(s). Los agentes los verán en su próxima entrega.`);
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
  const archivos = f.getAll("archivos").filter((x): x is File => x instanceof File && x.size > 0).slice(0, 15);
  let destino = "/estudio/nuevo";
  try {
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
      for (const a of archivos) guardarArchivo(id, a.name, Buffer.from(await a.arrayBuffer()), `Subido por ${quienN} al crear el proyecto`);
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
  await correr(id, () => empezar(id, quien, motor, subirCadaTarea(id)), "El equipo trabajó hasta la primera pausa.");
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
