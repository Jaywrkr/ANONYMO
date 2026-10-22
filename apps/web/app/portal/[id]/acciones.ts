"use server";
import { redirect } from "next/navigation";
import { aprobar, avisar, comentarioPortal, elegirMotor, guardarArchivo, leerProyecto, responder, tokenValido } from "@anonymo/pipeline";
import { notFound } from "next/navigation";
import { portalActivo } from "@/lib/estudio";

function validar(f: FormData) {
  const id = String(f.get("id") ?? "");
  const t = String(f.get("t") ?? "");
  if (!portalActivo() || !tokenValido(id, t)) notFound();
  return { id, t };
}

export async function portalAprobar(f: FormData) {
  const { id, t } = validar(f);
  let msj = "Gracias. El equipo sigue con la siguiente fase.";
  try {
    if (leerProyecto(id).estado !== "esperando") throw new Error("Esta fase ya no espera aprobación.");
    await aprobar(id, "cliente", "Aprobado por el cliente en su portal", elegirMotor(), () => {});
  } catch (e) {
    msj = (e as Error).message;
  }
  redirect(`/portal/${id}?t=${t}&m=${encodeURIComponent(msj)}`);
}

export async function portalComentar(f: FormData) {
  const { id, t } = validar(f);
  let msj = "Recibido. Jay o Luna lo pasan al equipo.";
  try {
    await comentarioPortal(id, String(f.get("texto") ?? ""));
  } catch (e) {
    msj = (e as Error).message;
  }
  redirect(`/portal/${id}?t=${t}&m=${encodeURIComponent(msj)}`);
}

export async function portalSubir(f: FormData) {
  const { id, t } = validar(f);
  const archivos = f.getAll("archivos").filter((x): x is File => x instanceof File && x.size > 0).slice(0, 10);
  let msj = `Recibimos ${archivos.length} archivo(s). Gracias.`;
  try {
    if (!archivos.length) throw new Error("Elige al menos un archivo.");
    for (const a of archivos) guardarArchivo(id, a.name, Buffer.from(await a.arrayBuffer()), "Subido por el cliente");
    await avisar({ proyecto: id, cliente: leerProyecto(id).pedido.cliente, tipo: "comentario", titulo: `Subió ${archivos.length} archivo(s)`, texto: archivos.map((a) => a.name).join(", ") });
  } catch (e) {
    msj = (e as Error).message;
  }
  redirect(`/portal/${id}?t=${t}&m=${encodeURIComponent(msj)}`);
}

export async function portalResponder(f: FormData) {
  const { id, t } = validar(f);
  const preguntas = leerProyecto(id).plan.preguntas;
  const r = Object.fromEntries(preguntas.map((q, i) => [q, String(f.get(`r${i}`) ?? "")]));
  let msj = "Gracias. El equipo ya tiene tus respuestas.";
  try {
    const n = responder(id, r, "cliente");
    await avisar({ proyecto: id, cliente: leerProyecto(id).pedido.cliente, tipo: "comentario", titulo: `Respondió ${n.length} pregunta(s)`, texto: n.map((x) => `${x.pregunta} → ${x.respuesta}`).join("\n") });
  } catch (e) {
    msj = (e as Error).message;
  }
  redirect(`/portal/${id}?t=${t}&m=${encodeURIComponent(msj)}`);
}
