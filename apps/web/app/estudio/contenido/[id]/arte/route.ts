// El arte de una pieza del mes (sistema/107). POST: dibujarlo (láminas o portada e historias) con el navegador del estudio.
// GET ?pieza=…: todo el arte de esa pieza en un .zip, listo para subir a Instagram.
import { zipSync } from "fflate";
import { cambiarPieza, dibujarPieza, estiloPara, ESTILOS, guardarArte, leerArte, leerMaterial, leerMesContenido, navegadorCapturas, ocultarClaves } from "@anonymo/pipeline";
import { mal, permisoMes } from "@/lib/contenido";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
const sinCache = { headers: { "cache-control": "no-store" } };

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await permisoMes(id);
  if (p.error) return p.error;
  let c: { pieza?: unknown };
  try { c = await req.json(); } catch { return mal("Pedido no válido."); }
  const m = await leerMesContenido(id);
  const pz = m?.piezas.find((x) => x.id === c.pieza);
  if (!m || !pz) return mal("No encontramos esa pieza.", 404);
  if (!pz.lamina || !pz.plantilla) return mal("Esta pieza es de antes y no trae lo que va escrito en el arte. Arma el mes de nuevo para que Faro lo escriba.", 409);
  const estilo = m.estiloArte ?? ((m.estilo && ESTILOS[m.estilo]) || estiloPara(m.cliente, m.nombre));
  // «Nº» cuenta las piezas de su serie hasta esta, como en los planificadores.
  const nSerie = m.piezas.filter((x) => x.serie === pz.serie && x.fecha <= pz.fecha).length;
  // Las capturas del trabajo real van dentro del arte (sistema/118): el navegador que dibuja no tiene la sesión.
  const imagenes: Record<string, string> = {};
  for (const a of [pz.lamina.imagen, pz.lamina.imagen?.replace(/-1440\.jpg$/, "-390.jpg")].filter(Boolean) as string[]) {
    const d = await leerMaterial(a).catch(() => undefined);
    if (d) imagenes[a] = `data:image/jpeg;base64,${Buffer.from(d).toString("base64")}`;
  }
  if (pz.lamina.imagen && !imagenes[pz.lamina.imagen]) return mal("Falta la captura de este trabajo. Abre la ficha del cliente para que se capture de nuevo.", 409);
  const nav = await navegadorCapturas();
  try {
    const page = await nav.newPage();
    const hechos = await dibujarPieza(page, estilo, { id: pz.id, formato: pz.formato, plantilla: pz.plantilla, lamina: pz.lamina, serie: pz.serie, nSerie, historias: pz.historias, imagenes });
    for (const h of hechos) await guardarArte(id, h.archivo, h.datos);
    return Response.json({ mes: await cambiarPieza(id, pz.id, { artes: hechos.map((h) => h.archivo) }, p.yo!) }, sinCache);
  } catch (e) {
    return mal(`No se pudo dibujar: ${ocultarClaves((e as Error).message).slice(0, 200)}`, 502);
  } finally {
    await nav.close().catch(() => {});
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await permisoMes(id);
  if (p.error) return p.error;
  const pieza = new URL(req.url).searchParams.get("pieza") ?? "";
  const m = await leerMesContenido(id);
  const pz = m?.piezas.find((x) => x.id === pieza);
  if (!m || !pz?.artes?.length) return mal("Esa pieza todavía no tiene arte dibujado.", 404);
  const archivos: Record<string, Uint8Array> = {};
  for (const a of pz.artes) { const d = await leerArte(id, a); if (d) archivos[a] = d; }
  // El texto para pegar en Instagram va dentro del .zip, junto a las imágenes.
  archivos["texto.txt"] = new TextEncoder().encode([pz.texto, "", ...(pz.historias ?? []).map((h, i) => `Historia ${i + 1}: ${h.texto}${h.sticker ? ` (sticker ${h.sticker}${h.opciones?.length ? `: ${h.opciones.join(" / ")}` : ""})` : ""}`)].join("\n"));
  const zip = zipSync(archivos, { level: 0 });
  return new Response(Buffer.from(zip), { headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="${m.cliente}-${pz.fecha}-${pz.id}.zip"`, "cache-control": "no-store" } });
}
