// Lo que Faro necesita para diseñar una pieza (sistema/123): las referencias de «qué es bueno» del cliente, las piezas
// ya aprobadas y el material real del proyecto, todo como imágenes. También dibuja y juzga una vuelta.
import {
  ALTO_POST, ANCHO_POST, MES_PIEZAS, NOTA_PIEZA, cambiarPiezaFaro, conMaterial, dibujar, disenarPieza, guardarArte, juzgarPieza,
  leerArte, leerFichas, leerMaterial, listarPiezasFaro, navegadorCapturas, proyectosDe, sparringPieza, textoDireccionCliente, type ImagenFaro, type PiezaFaro, type Sparring,
} from "@anonymo/pipeline";

const tipo = (a: string) => (a.endsWith(".png") ? "image/png" : "image/jpeg") as ImagenFaro["tipo"];
async function imagen(archivo: string, que: string): Promise<ImagenFaro | undefined> {
  const d = await leerMaterial(archivo).catch(() => undefined);
  return d?.length ? { archivo, que, datos: Buffer.from(d).toString("base64"), tipo: tipo(archivo) } : undefined;
}
const hay = <T,>(x: (T | undefined)[]) => x.filter(Boolean) as T[];

/** Los proyectos de su trabajo real que se pueden mostrar, de todas las fichas. */
export async function proyectosParaPiezas() {
  const { fichas } = await leerFichas();
  return Object.values(fichas).flatMap((f) => proyectosDe(f.direccion).map((p) => ({ cliente: f.id, nombreCliente: f.nombre, url: p.url, nombre: p.nombre, nota: p.nota })));
}

/** Las primeras láminas de las piezas aprobadas del cliente (hasta 3): lo que ya se sabe que está bien. */
async function aprobadas(cliente: string): Promise<ImagenFaro[]> {
  const ps = (await listarPiezasFaro(cliente)).filter((p) => p.estado === "aprobada").slice(0, 3);
  return hay(await Promise.all(ps.map(async (p) => {
    const a = p.versiones.at(-1)?.laminas[0];
    const d = a ? await leerArte(MES_PIEZAS, a).catch(() => undefined) : undefined;
    return d ? { archivo: a!, que: `${p.proyecto.nombre}, aprobada`, datos: Buffer.from(d).toString("base64"), tipo: "image/jpeg" as const } : undefined;
  })));
}

/**
 * Una vuelta de Faro: diseña (o rehace con lo que hay que cambiar), dibuja, juzga y guarda la versión.
 * Devuelve la pieza y si conviene otra vuelta sola (no llegó a la vara y quedan vueltas).
 */
export async function vueltaDeFaro(id: string, pieza: PiezaFaro): Promise<PiezaFaro> {
  const f = (await leerFichas()).fichas[pieza.cliente];
  const d = f?.direccion;
  const pr = proyectosDe(d).find((x) => x.url === pieza.proyecto.url);
  if (!pr) throw new Error("Ese proyecto ya no está en «Su trabajo real» del cliente.");
  const referencias = hay(await Promise.all((d?.imagenes ?? []).slice(0, 6).map((m) => imagen(m.archivo, m.nota ?? "referencia de lo que es bueno"))));
  const ya = await aprobadas(pieza.cliente);
  const celular = pr.base.replace(/-1440\.jpg$/, "-390.jpg");
  const material = hay(await Promise.all([
    imagen(pr.base, "su web en computadora, lo primero que se ve y un poco más (1440 de ancho)"),
    imagen(celular, "su web en celular (390 de ancho)"),
    ...pr.paginas.filter((x) => x !== pr.base).slice(0, 4).map((x, i) => imagen(x, `tramo ${i + 1} de su web, al tamaño de un post (1080×1350)`)),
    pr.logo ? imagen(pr.logo, "su logo, sin fondo (PNG)") : undefined,
  ]));
  if (!material.length) throw new Error("No hay capturas de ese proyecto todavía. Abre la ficha del cliente para que se saquen.");
  const ultima = pieza.versiones.at(-1);
  const cambiar = pieza.estado === "cambio" && pieza.nota ? `Jay o Luna pidieron: ${pieza.nota}` : ultima && (ultima.nota ?? 10) < NOTA_PIEZA ? [ultima.motivos?.join(" · "), ultima.pedido].filter(Boolean).join("\n") : undefined;
  const anteriorImg = ultima?.laminas[0] ? await leerArte(MES_PIEZAS, ultima.laminas[0]).catch(() => undefined) : undefined;
  // Antes de la primera versión, Nova discute la pieza (sistema/124): tres caminos, sin clichés, y cuál seguir.
  let sparring: Sparring | undefined = ultima?.sparring;
  if (!ultima) {
    try { sparring = await sparringPieza({ nombreCliente: pieza.nombreCliente, proyecto: { nombre: pr.nombre, url: pr.url, nota: pr.nota, fondo: pr.fondo, tinta: pr.tinta, letra: pr.letra }, direccion: textoDireccionCliente(d), referencias, material }); }
    catch (e) { console.error(`[faro] ${id}: el sparring no respondió, Faro diseña sin él:`, (e as Error).message); }
  }
  const diseno = await disenarPieza({ sparring,
    nombreCliente: pieza.nombreCliente, proyecto: { url: pr.url, nombre: pr.nombre, nota: pr.nota, fondo: pr.fondo, tinta: pr.tinta, letra: pr.letra, logo: pr.logo }, direccion: textoDireccionCliente(d),
    referencias, aprobadas: ya, material,
    ...(cambiar && ultima ? { cambiar, anterior: { html: ultima.html, ...(anteriorImg ? { imagen: { archivo: "anterior.jpg", que: "tu versión anterior", datos: Buffer.from(anteriorImg).toString("base64"), tipo: "image/jpeg" as const } } : {}) } } : {}),
  });
  // Dibujar (sistema/126): el material se sirve aparte, no pegado en el HTML. Con varias capturas pegadas como texto
  // el HTML pesaba decenas de MB y el navegador del servidor se caía («Unable to capture screenshot»).
  const n = (pieza.versiones.at(-1)?.n ?? 0) + 1;
  const laminas = await dibujarLaminas(id, n, diseno.html, material);
  for (const l of laminas) await guardarArte(MES_PIEZAS, l.archivo, l.datos);
  // Juzgar al lado de las referencias. Si falla el juicio, la pieza se muestra igual, sin nota.
  let juicio: { nota: number; motivos: string[]; cambiar: string } | undefined;
  // Sin el trabajo real en ninguna lámina no llega (sistema/125): se rehace sin gastar en el juicio.
  if (!diseno.html.some((h) => /material:/.test(h))) juicio = { nota: 4, motivos: ["Error: ninguna lámina muestra el trabajo real del proyecto (su web, un tramo o su logo)."], cambiar: "Usa el material del proyecto en al menos una lámina, intervenido con diseño." };
  else try { juicio = await juzgarPieza({ laminas: laminas.map((l) => l.datos), referencias, aprobadas: ya, texto: diseno.texto, version: n }); }
  catch (e) { console.error(`[faro] ${id}: no se pudo juzgar:`, (e as Error).message); }
  return cambiarPiezaFaro(id, (p) => {
    p.formato = diseno.formato;
    p.versiones.push({ n, ...(sparring ? { sparring } : {}), html: diseno.html, laminas: laminas.map((l) => l.archivo), texto: diseno.texto, porQue: diseno.porQue, ...(juicio ? { nota: juicio.nota, motivos: juicio.motivos, pedido: juicio.cambiar || undefined } : {}), fecha: new Date().toISOString() });
    p.versiones = p.versiones.slice(-6);
    p.estado = "propuesta";
    delete p.nota;
  });
}

const ORIGEN_MATERIAL = "https://material.unmake.local/";

/** Dibuja las láminas sirviendo el material por la red del navegador. Si el navegador se cae, reintenta una vez con uno nuevo. */
export async function dibujarLaminas(id: string, n: number, html: string[], material: ImagenFaro[]): Promise<{ archivo: string; datos: Buffer }[]> {
  const bytes = new Map(material.map((m) => [m.archivo, { cuerpo: Buffer.from(m.datos, "base64"), tipo: m.tipo }]));
  const urls = Object.fromEntries(material.map((m) => [m.archivo, `${ORIGEN_MATERIAL}${m.archivo}`]));
  const laminas: { archivo: string; datos: Buffer }[] = [];
  for (let intento = 1; laminas.length < html.length; intento++) {
    const nav = await navegadorCapturas();
    try {
      const page = await nav.newPage();
      await page.route(`${ORIGEN_MATERIAL}**`, (r) => {
        const m = bytes.get(decodeURIComponent(r.request().url().slice(ORIGEN_MATERIAL.length)));
        return m ? r.fulfill({ status: 200, contentType: m.tipo, body: m.cuerpo }) : r.fulfill({ status: 404, body: "" });
      });
      for (let i = laminas.length; i < html.length; i++) laminas.push({ archivo: `${id}-v${n}-${i + 1}.jpg`, datos: await dibujar(page, { nombre: "", ancho: ANCHO_POST, alto: ALTO_POST, html: conMaterial(html[i]!, urls) }) });
    } catch (e) {
      console.error(`[faro] ${id}: no se pudo dibujar la lámina ${laminas.length + 1} (intento ${intento}):`, (e as Error).message);
      if (intento >= 2) throw new Error(`No se pudo dibujar la lámina ${laminas.length + 1}: el navegador del servidor se cayó dos veces. Vuelve a pedir la pieza.`);
    } finally {
      await nav.close().catch(() => {});
    }
  }
  return laminas;
}
