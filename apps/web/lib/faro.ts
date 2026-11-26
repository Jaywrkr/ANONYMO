// Lo que Faro necesita para diseñar una pieza (sistema/123): las referencias de «qué es bueno» del cliente, las piezas
// ya aprobadas y el material real del proyecto, todo como imágenes. También dibuja y juzga una vuelta.
import {
  ALTO_POST, ANCHO_POST, MES_PIEZAS, NOTA_PIEZA, cambiarPiezaFaro, conMaterial, dibujar, disenarPieza, guardarArte, juzgarPieza,
  leerArte, leerFichas, leerMaterial, listarPiezasFaro, navegadorCapturas, proyectosDe, textoDireccionCliente, type ImagenFaro, type PiezaFaro,
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
  const diseno = await disenarPieza({
    nombreCliente: pieza.nombreCliente, proyecto: { url: pr.url, nombre: pr.nombre, nota: pr.nota }, direccion: textoDireccionCliente(d),
    referencias, aprobadas: ya, material,
    ...(cambiar && ultima ? { cambiar, anterior: { html: ultima.html, ...(anteriorImg ? { imagen: { archivo: "anterior.jpg", que: "tu versión anterior", datos: Buffer.from(anteriorImg).toString("base64"), tipo: "image/jpeg" as const } } : {}) } } : {}),
  });
  // Dibujar: el material va dentro del HTML (el navegador que dibuja no tiene sesión).
  const dataUrls = Object.fromEntries(material.map((m) => [m.archivo, `data:${m.tipo};base64,${m.datos}`]));
  const n = (pieza.versiones.at(-1)?.n ?? 0) + 1;
  const nav = await navegadorCapturas();
  const laminas: { archivo: string; datos: Buffer }[] = [];
  try {
    const page = await nav.newPage();
    for (const [i, h] of diseno.html.entries()) laminas.push({ archivo: `${id}-v${n}-${i + 1}.jpg`, datos: await dibujar(page, { nombre: "", ancho: ANCHO_POST, alto: ALTO_POST, html: conMaterial(h, dataUrls) }) });
  } finally {
    await nav.close().catch(() => {});
  }
  for (const l of laminas) await guardarArte(MES_PIEZAS, l.archivo, l.datos);
  // Juzgar al lado de las referencias. Si falla el juicio, la pieza se muestra igual, sin nota.
  let juicio: { nota: number; motivos: string[]; cambiar: string } | undefined;
  try { juicio = await juzgarPieza({ laminas: laminas.map((l) => l.datos), referencias, aprobadas: ya, texto: diseno.texto, version: n }); }
  catch (e) { console.error(`[faro] ${id}: no se pudo juzgar:`, (e as Error).message); }
  return cambiarPiezaFaro(id, (p) => {
    p.formato = diseno.formato;
    p.versiones.push({ n, html: diseno.html, laminas: laminas.map((l) => l.archivo), texto: diseno.texto, porQue: diseno.porQue, ...(juicio ? { nota: juicio.nota, motivos: juicio.motivos, pedido: juicio.cambiar || undefined } : {}), fecha: new Date().toISOString() });
    p.versiones = p.versiones.slice(-6);
    p.estado = "propuesta";
    delete p.nota;
  });
}
