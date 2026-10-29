"use server";
import { redirect } from "next/navigation";
import { aprobar, avisar, comentarioPortal, direccionDelCliente, elegirMotor, guardarArchivo, leerProyecto, responder, tokenValido } from "@anonymo/pipeline";
import { notFound } from "next/navigation";
import { portalActivo } from "@/lib/estudio";
import { llevar, traer } from "@/lib/nube";
import { archivosDe } from "@/lib/subidas";
import { lanzar } from "@/lib/trabajo";

async function validar(f: FormData) {
  const id = String(f.get("id") ?? "");
  const t = String(f.get("t") ?? "");
  if (!portalActivo() || !/^[a-z0-9-]+$/.test(id)) notFound();
  await traer(id);
  if (!tokenValido(id, t)) notFound();
  return { id, t };
}

export async function portalAprobar(f: FormData) {
  const { id, t } = await validar(f);
  let msj = "Gracias. El equipo sigue con la siguiente fase.";
  try {
    if (leerProyecto(id).estado !== "esperando") throw new Error("Esta fase ya no espera aprobación.");
    await aprobar(id, "cliente", "Aprobado por el cliente en su portal", elegirMotor(), () => {}, false, { max: 0 });
  } catch (e) {
    msj = (e as Error).message;
  }
  await llevar(id);
  // El equipo sigue en segundo plano (sistema/36).
  if (leerProyecto(id).estado === "en-curso") await lanzar(id);
  redirect(`/portal/${id}?t=${t}&m=${encodeURIComponent(msj)}`);
}

export async function portalComentar(f: FormData) {
  const { id, t } = await validar(f);
  let msj = "Recibido. Jay o Luna lo pasan al equipo.";
  try {
    await comentarioPortal(id, String(f.get("texto") ?? ""));
  } catch (e) {
    msj = (e as Error).message;
  }
  await llevar(id);
  redirect(`/portal/${id}?t=${t}&m=${encodeURIComponent(msj)}`);
}

export async function portalSubir(f: FormData) {
  const { id, t } = await validar(f);
  let msj = "";
  try {
    const archivos = await archivosDe(f, 12);
    msj = `Recibimos ${archivos.length} archivo(s). Gracias.`;
    if (!archivos.length) throw new Error("Elige al menos un archivo.");
    for (const a of archivos) guardarArchivo(id, a.nombre, a.datos, "Subido por el cliente");
    await avisar({ proyecto: id, cliente: leerProyecto(id).pedido.cliente, tipo: "comentario", titulo: `Subió ${archivos.length} archivo(s)`, texto: archivos.map((a) => a.nombre).join(", ") });
  } catch (e) {
    msj = (e as Error).message;
  }
  await llevar(id);
  redirect(`/portal/${id}?t=${t}&m=${encodeURIComponent(msj)}`);
}

export async function portalResponder(f: FormData) {
  const { id, t } = await validar(f);
  const preguntas = leerProyecto(id).plan.preguntas;
  const r = Object.fromEntries(preguntas.map((q, i) => [q, String(f.get(`r${i}`) ?? "")]));
  let msj = "Gracias. El equipo ya tiene tus respuestas.";
  try {
    const n = responder(id, r, "cliente");
    await avisar({ proyecto: id, cliente: leerProyecto(id).pedido.cliente, tipo: "comentario", titulo: `Respondió ${n.length} pregunta(s)`, texto: n.map((x) => `${x.pregunta} → ${x.respuesta}`).join("\n") });
  } catch (e) {
    msj = (e as Error).message;
  }
  await llevar(id);
  redirect(`/portal/${id}?t=${t}&m=${encodeURIComponent(msj)}`);
}

/** El cliente marca la dirección de diseño que le gusta (sistema/37). Jay o Luna la confirman en el estudio. */
export async function portalElegirDireccion(f: FormData) {
  const { id, t } = await validar(f);
  const n = Number(f.get("n"));
  const nota = String(f.get("nota") ?? "").trim() || undefined;
  let msj = "";
  try {
    const p = direccionDelCliente(id, n, nota);
    const d = p.direcciones!.opciones[n];
    msj = (p.pedido.idioma === "en" ? `Thanks: you picked “${d.nombre}”. Jay and Luna will confirm soon.` : `Gracias: elegiste «${d.nombre}». Jay y Luna te confirman pronto.`);
    await avisar({ proyecto: id, cliente: p.pedido.cliente, tipo: "comentario", titulo: `Eligió la dirección «${d.nombre}»`, texto: nota ?? "Sin comentarios." });
  } catch (e) {
    msj = (e as Error).message;
  }
  await llevar(id);
  redirect(`/portal/${id}?t=${t}&m=${encodeURIComponent(msj)}`);
}
