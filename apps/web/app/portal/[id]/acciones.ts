"use server";
import { redirect } from "next/navigation";
import { aprobar, comentarioPortal, elegirMotor, leerProyecto, tokenValido } from "@anonymo/pipeline";
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
