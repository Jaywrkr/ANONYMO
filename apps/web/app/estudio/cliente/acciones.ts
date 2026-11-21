"use server";
// Lo que Jay y Luna escriben a mano en la ficha de un cliente (sistema/70): notas, contacto y otros nombres.
import { redirect, RedirectType } from "next/navigation";
import { revalidatePath } from "next/cache";
import { CLAVES_SABER, fuentesDe, guardarFicha, idFicha, leerFuentes, ocultarClaves, saberDe } from "@anonymo/pipeline";
import { cartera } from "@/lib/cartera";
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

/** Lee su web y deja propuestas para aprobar (sistema/93). No cambia lo que se sabe. */
export async function accionBuscarDatos(f: FormData) {
  const yo = await exigirEstudio();
  const id = String(f.get("id") ?? "");
  let destino = `/estudio/cliente/${id}#leido`;
  try {
    const ficha = (await cartera()).fichas.find((x) => x.id === id);
    if (!ficha) throw new Error("No encontramos ese cliente.");
    const saber = saberDe(ficha);
    const web = ficha.guardada?.web ?? ficha.contacto.web;
    if (!fuentesDe(saber, web).web) throw new Error("Para buscar, anota su web en «Contacto y notas».");
    const lectura = await leerFuentes({ saber, web });
    await guardarFicha(id, { nombre: ficha.guardada?.nombre ?? ficha.nombre, lectura: { ...lectura, por: yo } }, yo);
    const n = lectura.propuestas.length;
    const leyo = lectura.web?.estado === "ok" ? "su web" : "";
    const aviso = n ? `Encontramos ${n} ${n === 1 ? "dato" : "datos"}${leyo ? ` en ${leyo}` : ""}. Revísalos y guarda los que estén bien.` : leyo ? `Leímos ${leyo} y no hay nada nuevo.` : "No pudimos leer nada. Mira abajo por qué.";
    destino = `/estudio/cliente/${id}?ok=${encodeURIComponent(aviso)}#leido`;
  } catch (e) {
    destino = `/estudio/cliente/${id}?error=${encodeURIComponent(ocultarClaves((e as Error).message))}#leido`;
  }
  revalidatePath(`/estudio/cliente/${id}`);
  redirect(destino, RedirectType.replace);
}

/** Guarda los datos encontrados que se marcaron, como escritos a mano, y borra la lectura. O la descarta entera. */
export async function accionAprobarDatos(f: FormData) {
  const yo = await exigirEstudio();
  const id = String(f.get("id") ?? "");
  let destino = `/estudio/cliente/${id}#saber`;
  try {
    const nombre = String(f.get("nombre") ?? "");
    if (f.get("accion") === "descartar") {
      await guardarFicha(id, { nombre, lectura: null }, yo);
      destino = `/estudio/cliente/${id}?ok=${encodeURIComponent("Descartado. No se guardó nada.")}#saber`;
    } else {
      const saber: Record<string, string> = {};
      for (const k of CLAVES_SABER) if (f.get(`tomar-${k}`) === "si") { const v = String(f.get(`valor-${k}`) ?? "").trim(); if (v) saber[k] = v; }
      const n = Object.keys(saber).length;
      if (!n) throw new Error("Marca al menos un dato para guardarlo, o toca «Descartar».");
      await guardarFicha(id, { nombre, saber, lectura: null }, yo);
      destino = `/estudio/cliente/${id}?ok=${encodeURIComponent(`Guardamos ${n} ${n === 1 ? "dato" : "datos"}. Mira qué se puede hacer ahora.`)}#saber`;
    }
  } catch (e) {
    destino = `/estudio/cliente/${id}?error=${encodeURIComponent(ocultarClaves((e as Error).message))}#leido`;
  }
  revalidatePath(`/estudio/cliente/${id}`);
  redirect(destino, RedirectType.replace);
}
