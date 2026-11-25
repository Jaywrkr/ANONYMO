"use server";
// Lo que Jay y Luna escriben a mano en la ficha de un cliente (sistema/70): notas, contacto y otros nombres.
import { redirect, RedirectType } from "next/navigation";
import { revalidatePath } from "next/cache";
import { CLAVES_SABER, NO_APLICA, esAnonymo, fuentesDe, guardarFicha, idFicha, leerFuentes, ocultarClaves, PROPIAS_ANONYMO, saberDe } from "@anonymo/pipeline";
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

/**
 * Guarda lo que se sabe del cliente (sistema/92). Solo cambia los campos que llegan.
 * Con datos encontrados (sistema/109) vienen en su mismo campo, marcados: se guardan los que siguen marcados.
 * «Aceptar todos» los toma todos; «Descartar» borra lo encontrado sin tocar nada más. «No aplica» cuenta como sabido.
 */
export async function accionGuardarSaber(f: FormData) {
  const yo = await exigirEstudio();
  const id = String(f.get("id") ?? "");
  const accion = String(f.get("accion") ?? "guardar");
  let destino = `/estudio/cliente/${id}?ok=${encodeURIComponent("Guardado. Mira arriba qué se puede hacer ahora.")}#saber`;
  try {
    const nombre = String(f.get("nombre") ?? "");
    if (accion === "descartar") {
      await guardarFicha(id, { nombre, lectura: null }, yo);
      destino = `/estudio/cliente/${id}?ok=${encodeURIComponent("Descartamos lo encontrado. No cambió nada.")}#saber`;
    } else {
      const saber: Record<string, string> = {};
      let tomados = 0, hayPropuestas = false;
      for (const k of CLAVES_SABER) {
        if (f.get(`noaplica-${k}`) === "si") { saber[k] = NO_APLICA; continue; }
        if (f.has(`propuesta-${k}`)) {
          hayPropuestas = true;
          const toma = accion === "todos" || f.get(`tomar-${k}`) === "si";
          // Si ya había otro valor, el campo muestra el de antes y lo encontrado va aparte: se usa solo si se marca.
          if (f.has(`valor-${k}`)) { if (toma) { saber[k] = String(f.get(`valor-${k}`) ?? ""); tomados++; continue; } }
          // Si el campo estaba vacío, lo encontrado está en el campo: se queda solo si sigue marcado.
          else if (!toma) continue;
          else tomados++;
        }
        if (f.has(`saber-${k}`)) saber[k] = String(f.get(`saber-${k}`) ?? "");
      }
      await guardarFicha(id, { nombre, saber, ...(hayPropuestas ? { lectura: null } : {}) }, yo);
      if (tomados) destino = `/estudio/cliente/${id}?ok=${encodeURIComponent(`Guardamos ${tomados} ${tomados === 1 ? "dato encontrado" : "datos encontrados"}. Mira arriba qué se puede hacer ahora.`)}#saber`;
    }
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
  let destino = `/estudio/cliente/${id}#saber`;
  try {
    const ficha = (await cartera()).fichas.find((x) => x.id === id);
    if (!ficha) throw new Error("No encontramos ese cliente.");
    const saber = saberDe(ficha);
    const web = ficha.guardada?.web ?? ficha.contacto.web;
    const propias = esAnonymo(ficha.id) ? PROPIAS_ANONYMO : undefined;
    if (!fuentesDe(saber, web).web && !propias) throw new Error("Para buscar, anota su web en «Contacto y notas».");
    const leida = await leerFuentes({ saber, web, propias });
    // Lo que el estudio sabe de sí mismo (Unmake) no se revisa: se guarda directo si falta (sistema/109).
    const directos = Object.fromEntries(leida.propuestas.filter((p) => p.fuente === "estudio" && !saber[p.clave]).map((p) => [p.clave, p.valor]));
    const lectura = { ...leida, propuestas: leida.propuestas.filter((p) => p.fuente !== "estudio"), por: yo };
    await guardarFicha(id, { nombre: ficha.guardada?.nombre ?? ficha.nombre, saber: directos, lectura }, yo);
    const n = lectura.propuestas.length, d = Object.keys(directos).length;
    const leyo = lectura.web?.estado === "ok" ? "su web" : "";
    const aviso = [d ? `Guardamos ${d} ${d === 1 ? "dato" : "datos"} que el estudio ya sabe de sí.` : "", n ? `Encontramos ${n} ${n === 1 ? "dato" : "datos"}${leyo ? ` en ${leyo}` : ""}: están en su lugar, marcados en verde.` : leyo ? `Leímos ${leyo} y no hay nada nuevo.` : d ? "" : "No pudimos leer nada. Mira abajo por qué."].filter(Boolean).join(" ");
    destino = `/estudio/cliente/${id}?ok=${encodeURIComponent(aviso || "Listo.")}#saber`;
  } catch (e) {
    destino = `/estudio/cliente/${id}?error=${encodeURIComponent(ocultarClaves((e as Error).message))}#leido`;
  }
  revalidatePath(`/estudio/cliente/${id}`);
  redirect(destino, RedirectType.replace);
}
