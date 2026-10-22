"use server";
// Lo mismo que la terminal, con botones. Cada acción corre el pipeline y vuelve a la página del proyecto.
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { anotar, aprobar, cambiarResponsable, avanzar, cambiar, cambiarPausas, elegirMotor, parar, guardarArchivo, leerProyecto, quitarPendiente, responder, reanudar, restaurar, tokenPortal, type TareaId } from "@anonymo/pipeline";
import { exigirEstudio } from "@/lib/estudio";

type Quien = "jay" | "luna";

function leer(f: FormData) {
  const id = String(f.get("id") ?? "");
  const quien = (f.get("quien") === "luna" ? "luna" : "jay") as Quien;
  const motor = elegirMotor({ simulado: f.get("motor") === "simulado", manual: f.get("motor") === "manual" });
  return { id, quien, motor, nota: String(f.get("nota") ?? "").trim() || undefined };
}

async function correr(id: string, fn: () => Promise<unknown> | unknown, ok: string) {
  exigirEstudio();
  let destino = `/estudio/${id}?ok=${encodeURIComponent(ok)}`;
  try {
    await fn();
  } catch (e) {
    destino = `/estudio/${id}?error=${encodeURIComponent((e as Error).message)}`;
  }
  revalidatePath(`/estudio/${id}`);
  redirect(destino);
}

const silencio = () => {};

export async function accionAprobar(f: FormData) {
  const { id, quien, motor, nota } = leer(f);
  await correr(id, () => aprobar(id, quien, nota, motor, silencio, f.get("forzar") === "1"), "Aprobado. El equipo siguió hasta la próxima pausa.");
}

export async function accionCambiar(f: FormData) {
  const { id, quien, motor, nota } = leer(f);
  const agente = String(f.get("agente") ?? "") || undefined;
  await correr(id, () => {
    if (!nota) throw new Error("Escribe qué hay que cambiar.");
    return cambiar(id, quien, nota, agente, motor, silencio);
  }, "Cambio pedido. Se rehizo y quedó esperando tu revisión.");
}

export async function accionParar(f: FormData) {
  const { id, quien, nota } = leer(f);
  await correr(id, () => parar(id, quien, nota), "Proyecto parado.");
}

export async function accionReanudar(f: FormData) {
  const { id } = leer(f);
  await correr(id, () => reanudar(id), "Proyecto reanudado: espera tu decisión.");
}

export async function accionPausas(f: FormData) {
  const { id, motor } = leer(f);
  await correr(id, async () => {
    cambiarPausas(id, String(f.get("pausas") ?? "clave"));
    await avanzar(id, motor, silencio);
  }, "Pausas actualizadas.");
}

export async function accionSeguir(f: FormData) {
  const { id, motor } = leer(f);
  await correr(id, () => avanzar(id, motor, silencio), "El equipo siguió trabajando.");
}

export async function accionPortal(f: FormData) {
  const { id } = leer(f);
  await correr(id, () => tokenPortal(id, f.get("nuevo") === "1"), f.get("nuevo") === "1" ? "Enlace nuevo creado: el anterior ya no sirve." : "Enlace del cliente listo.");
}

/** Primer paso: ver a quién manda Atlas el comentario, sin cambiar nada. */
export async function accionVerReparto(f: FormData) {
  exigirEstudio();
  const { id } = leer(f);
  const texto = String(f.get("texto") ?? "").trim();
  const pendiente = String(f.get("pendiente") ?? "");
  redirect(`/estudio/${id}?vista=${encodeURIComponent(texto)}${pendiente ? `&pendiente=${encodeURIComponent(pendiente)}` : ""}#cliente`);
}

/** Segundo paso: el comentario entra al proyecto, va a los agentes elegidos y el equipo rehace. */
export async function accionMandarCliente(f: FormData) {
  const { id, quien, motor } = leer(f);
  const texto = String(f.get("texto") ?? "").trim();
  const agentes = f.getAll("agentes").map(String).filter(Boolean);
  const pendiente = String(f.get("pendiente") ?? "");
  const origen = f.get("origen") === "cliente" ? "cliente" : quien;
  await correr(id, async () => {
    if (!texto) throw new Error("El comentario está vacío.");
    if (!agentes.length) throw new Error("Elige al menos un agente.");
    anotar(id, texto, origen, agentes);
    if (pendiente) quitarPendiente(id, pendiente);
    await avanzar(id, motor, silencio);
  }, "Comentario enviado: el equipo rehízo lo necesario.");
}

export async function accionDescartarPendiente(f: FormData) {
  const { id } = leer(f);
  await correr(id, () => quitarPendiente(id, String(f.get("pendiente") ?? "")), "Comentario descartado.");
}

export async function accionRestaurar(f: FormData) {
  exigirEstudio();
  const { id } = leer(f);
  const tarea = String(f.get("tarea") ?? "") as TareaId;
  const v = Number(f.get("v"));
  let destino = `/estudio/${id}/${tarea.replace(".", "-")}`;
  try {
    const r = restaurar(id, tarea, v);
    destino += `?ok=${encodeURIComponent(`La v${v} quedó como v${r.nueva}.${r.revisar.length ? ` Revisa lo que dependía de ella: ${r.revisar.join(", ")}.` : ""}`)}`;
  } catch (e) {
    destino += `?error=${encodeURIComponent((e as Error).message)}`;
  }
  revalidatePath(destino.split("?")[0]);
  redirect(destino);
}

export async function accionSubir(f: FormData) {
  const { id } = leer(f);
  const nota = String(f.get("nota") ?? "").trim() || undefined;
  const archivos = f.getAll("archivos").filter((x): x is File => x instanceof File && x.size > 0);
  await correr(id, async () => {
    if (!archivos.length) throw new Error("Elige al menos un archivo.");
    for (const a of archivos) guardarArchivo(id, a.name, Buffer.from(await a.arrayBuffer()), nota);
  }, `${archivos.length} archivo(s) agregado(s). Los agentes los verán en su próxima entrega.`);
}

export async function accionResponder(f: FormData) {
  const { id, quien } = leer(f);
  await correr(id, () => {
    const preguntas = leerProyecto(id).plan.preguntas;
    responder(id, Object.fromEntries(preguntas.map((q, i) => [q, String(f.get(`r${i}`) ?? "")])), quien);
  }, "Respuestas anotadas: los agentes las leen desde ahora.");
}

export async function accionResponsable(f: FormData) {
  const { id } = leer(f);
  const fase = Number(f.get("fase"));
  const socio = f.get("socio") === "luna" ? "luna" : "jay";
  await correr(id, () => cambiarResponsable(id, fase, socio), `La fase ${fase} la aprueba ahora ${socio === "luna" ? "Luna" : "Jay"}.`);
}
