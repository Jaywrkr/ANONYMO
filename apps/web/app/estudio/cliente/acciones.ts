"use server";
// Lo que Jay y Luna escriben a mano en la ficha de un cliente (sistema/70): notas, contacto y otros nombres.
import { redirect, RedirectType } from "next/navigation";
import { revalidatePath } from "next/cache";
import { CLAVES_SABER, guardarFicha, idFicha, ocultarClaves } from "@anonymo/pipeline";
import { exigirEstudio } from "@/lib/estudio";

const texto = (f: FormData, k: string) => (f.has(k) ? String(f.get(k) ?? "") : undefined);

/** Guarda la ficha y vuelve a ella con un aviso (reemplazando el paso del historial, como todo el estudio). */
export async function accionGuardarFicha(f: FormData) {
  const yo = await exigirEstudio();
  const id = String(f.get("id") ?? "");
  let destino = `/estudio/cliente/${id}?ok=${encodeURIComponent("Ficha guardada.")}`;
  try {
    await guardarFicha(id, {
      nombre: String(f.get("nombre") ?? ""),
      notas: texto(f, "notas"),
      telefono: texto(f, "telefono"),
      correo: texto(f, "correo"),
      web: texto(f, "web"),
      alias: f.has("alias") ? String(f.get("alias") ?? "").split(",") : undefined,
    }, yo);
  } catch (e) {
    destino = `/estudio/cliente/${id}?error=${encodeURIComponent(ocultarClaves((e as Error).message))}`;
  }
  revalidatePath(`/estudio/cliente/${id}`);
  redirect(destino, RedirectType.replace);
}

/** Un cliente nuevo a mano, sin pedido todavía: abre su ficha. */
export async function accionNuevaFicha(f: FormData) {
  const yo = await exigirEstudio();
  const nombre = String(f.get("nombre") ?? "").trim().slice(0, 80);
  const id = idFicha(nombre);
  let destino = `/estudio/cliente/${id}?ok=${encodeURIComponent(`Ficha de ${nombre} creada.`)}`;
  try {
    if (!nombre) throw new Error("Escribe el nombre del cliente.");
    await guardarFicha(id, { nombre }, yo);
  } catch (e) {
    destino = `/estudio/clientes?error=${encodeURIComponent(ocultarClaves((e as Error).message))}`;
  }
  revalidatePath("/estudio/clientes");
  redirect(destino, RedirectType.push);
}

/** Guarda lo que se sabe del cliente (sistema/92): a quién le habla, qué vende, su tono… Solo cambia los campos que llegan. */
export async function accionGuardarSaber(f: FormData) {
  const yo = await exigirEstudio();
  const id = String(f.get("id") ?? "");
  let destino = `/estudio/cliente/${id}?ok=${encodeURIComponent("Guardado. Mira abajo qué se puede hacer ahora.")}#saber`;
  try {
    const saber: Record<string, string> = {};
    for (const k of CLAVES_SABER) if (f.has(`saber-${k}`)) saber[k] = String(f.get(`saber-${k}`) ?? "");
    await guardarFicha(id, { nombre: String(f.get("nombre") ?? ""), saber }, yo);
  } catch (e) {
    destino = `/estudio/cliente/${id}?error=${encodeURIComponent(ocultarClaves((e as Error).message))}#saber`;
  }
  revalidatePath(`/estudio/cliente/${id}`);
  redirect(destino, RedirectType.replace);
}
