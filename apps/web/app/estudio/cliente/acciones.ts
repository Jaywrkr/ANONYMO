"use server";
// Lo que Jay y Luna escriben a mano en la ficha de un cliente (sistema/70): notas, contacto y otros nombres.
import { redirect, RedirectType } from "next/navigation";
import { revalidatePath } from "next/cache";
import { CLAVES_SABER, NO_APLICA, esAnonymo, fuentesDe, guardarFicha, idFicha, leerFuentes, ocultarClaves, PROPIAS_ANONYMO, saberDe, TRABAJOS_UNMAKE, aprobarPropuesta, direccionVacia, editarDireccion, guardarGuia, leerGuiaPdf, leerMarcaWeb, logoDeWeb, navegadorCapturas, type DireccionCliente } from "@anonymo/pipeline";
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
    // Unmake: sus primeros trabajos entran a «qué es bueno» de su Dirección, sin pisar lo que ya haya (sistema/117).
    let direccion: DireccionCliente | undefined;
    if (esAnonymo(ficha.id)) {
      const d = ficha.guardada?.direccion ?? direccionVacia();
      const faltan = TRABAJOS_UNMAKE.filter((t) => !d.referencias.some((r) => r.url === t.url));
      if (faltan.length) direccion = { ...d, referencias: [...d.referencias, ...faltan.map((t) => ({ ...t, origen: "ustedes" as const }))], actualizada: new Date().toISOString(), por: yo };
    }
    await guardarFicha(id, { nombre: ficha.guardada?.nombre ?? ficha.nombre, saber: directos, lectura, ...(direccion ? { direccion } : {}) }, yo);
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

/** La Dirección del cliente (sistema/117): leer su web, subir su guía, aprobar «esto entendí», descartar o editar. */
export async function accionDireccion(f: FormData) {
  const yo = await exigirEstudio();
  const id = String(f.get("id") ?? "");
  const accion = String(f.get("accion") ?? "");
  let destino = `/estudio/cliente/${id}#direccion`;
  try {
    const ficha = (await cartera()).fichas.find((x) => x.id === id);
    if (!ficha) throw new Error("No encontramos ese cliente.");
    const nombre = ficha.guardada?.nombre ?? ficha.nombre;
    const antes: DireccionCliente = ficha.guardada?.direccion ?? direccionVacia();
    let d = antes, aviso = "";
    if (accion === "leer-web") {
      const web = ficha.guardada?.web ?? ficha.contacto.web;
      if (!web) throw new Error("Para leer su marca, anota su web en «Contacto y notas».");
      const p = await leerMarcaWeb(web);
      // El logo como se ve de verdad (también los que dibuja un script): con el navegador del estudio (sistema/118).
      const nav = await navegadorCapturas().catch(() => undefined);
      if (nav) {
        try { const l = await logoDeWeb(nav, /^https?:\/\//i.test(web) ? web : `https://${web}`); if (l) p.logo = l; } finally { await nav.close().catch(() => {}); }
      }
      if (!p.colores.length && !p.letras.length && !p.logo) throw new Error("Leímos su web pero no encontramos colores, letras ni logo. Súbelos a mano o sube su guía de marca.");
      d = { ...antes, propuesta: p };
      aviso = "Leímos su web. Revisa «esto entendí» y apruébalo.";
    } else if (accion === "guia") {
      const archivo = f.get("guia");
      if (!(archivo instanceof File) || !archivo.size) throw new Error("Elige el PDF de su guía de marca.");
      if (!/pdf$/i.test(archivo.type) && !/\.pdf$/i.test(archivo.name)) throw new Error("La guía tiene que ser un PDF.");
      if (archivo.size > 4 * 1024 * 1024) throw new Error("El PDF pesa más de 4 MB. Exporta una versión más liviana (sin imágenes en alta) y vuelve a subirlo.");
      const datos = new Uint8Array(await archivo.arrayBuffer());
      const p = await leerGuiaPdf(datos, archivo.name.slice(0, 80), { cliente: id });
      await guardarGuia(id, datos);
      d = { ...antes, guia: { nombre: archivo.name.slice(0, 80), subida: new Date().toISOString(), bytes: archivo.size }, propuesta: p };
      aviso = "Leímos su guía. Revisa «esto entendí» y apruébalo.";
    } else if (accion === "aprobar") {
      if (!antes.propuesta) throw new Error("No hay nada por aprobar.");
      d = aprobarPropuesta(antes, yo);
      aviso = "Aprobado. Los agentes ya trabajan con esta Dirección.";
    } else if (accion === "descartar") {
      d = { ...antes, propuesta: undefined };
      aviso = "Descartado. No cambió nada.";
    } else if (accion === "editar") {
      const t = (k: string) => (f.has(k) ? String(f.get(k) ?? "") : undefined);
      d = editarDireccion(antes, { colores: t("colores"), letras: t("letras"), palabras: t("palabras"), si: t("si"), no: t("no"), referencias: t("referencias"), trabajos: t("trabajos") }, yo);
      aviso = "Dirección guardada.";
    } else throw new Error("No entendí qué hacer.");
    await guardarFicha(id, { nombre, direccion: d }, yo);
    destino = `/estudio/cliente/${id}?ok=${encodeURIComponent(aviso)}#direccion`;
  } catch (e) {
    destino = `/estudio/cliente/${id}?error=${encodeURIComponent(ocultarClaves((e as Error).message))}#direccion`;
  }
  revalidatePath(`/estudio/cliente/${id}`);
  redirect(destino, RedirectType.replace);
}
