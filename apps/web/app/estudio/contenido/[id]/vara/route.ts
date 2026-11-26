// La revisión contra la vara (sistema/120): dibuja la pieza, la mira al lado de las capturas de la vara del cliente
// y, si no llega, Faro la reescribe y se vuelve a mirar, sola, hasta 2 veces. El planner la pide por cada pieza sin nota.
import { aplicarLamina, dibujar, estiloPara, ESTILOS, guardarVara, laminasHTML, leerFichas, leerMaterial, leerMesContenido, navegadorCapturas, NOTA_VARA, ocultarClaves, revisarConVara, RONDAS_VARA, textoDireccionCliente, varaDeDireccion, type Lamina } from "@anonymo/pipeline";
import { mal, permisoMes } from "@/lib/contenido";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = await permisoMes(id);
  if (p.error) return p.error;
  let c: { pieza?: unknown };
  try { c = await req.json(); } catch { return mal("Pedido no válido."); }
  const m = await leerMesContenido(id);
  const pz = m?.piezas.find((x) => x.id === c.pieza);
  if (!m || !pz) return mal("No encontramos esa pieza.", 404);
  if (!pz.lamina || !pz.plantilla) return mal("Esta pieza es de antes y no trae su arte.", 409);
  const direccion = (await leerFichas()).fichas[m.cliente]?.direccion;
  const vara = await varaDeDireccion(direccion, 3);
  const estilo = m.estiloArte ?? ((m.estilo && ESTILOS[m.estilo]) || estiloPara(m.cliente, m.nombre));
  const nSerie = m.piezas.filter((x) => x.serie === pz.serie && x.fecha <= pz.fecha).length;
  const imagenes: Record<string, string> = {};
  for (const a of [...new Set([pz.lamina.imagen, ...(pz.lamina.vistas ?? []), pz.lamina.logo].filter(Boolean) as string[])]) {
    const d = await leerMaterial(a).catch(() => undefined);
    if (d) imagenes[a] = `data:${a.endsWith(".png") ? "image/png" : "image/jpeg"};base64,${Buffer.from(d).toString("base64")}`;
  }
  const antes = { titulo: pz.lamina.titulo, texto: pz.texto, artes: (pz.artes ?? []).join(",") };
  let lamina: Lamina = pz.lamina, texto = pz.texto, rehecha = 0;
  const nav = await navegadorCapturas();
  try {
    const page = await nav.newPage();
    for (;;) {
      const arte: Buffer[] = [];
      for (const a of laminasHTML(estilo, { id: pz.id, formato: pz.formato, plantilla: pz.plantilla, lamina, serie: pz.serie, nSerie, historias: [], imagenes }).slice(0, 2)) arte.push(await dibujar(page, a));
      const r = await revisarConVara({ arte, vara, direccion: textoDireccionCliente(direccion), nombre: m.nombre, enfoque: m.enfoque, pieza: { texto, plantilla: pz.plantilla, formato: pz.formato, lamina, idea: pz.idea } });
      if (!r) return mal("Falta la clave de Anthropic: sin ella no se puede revisar contra la vara.", 503);
      const llega = r.nota >= NOTA_VARA;
      // Se rehace sola si no llega y Faro trajo algo nuevo; después de 2 vueltas queda como está, con sus motivos.
      if (llega || rehecha >= RONDAS_VARA || (!r.lamina && !r.texto)) {
        const mes = await guardarVara(id, pz.id, { antes, vara: { nota: r.nota, llega, motivos: r.motivos, rehecha, capturas: vara.length, fecha: new Date().toISOString() }, ...(rehecha ? { lamina, texto } : {}) });
        return Response.json({ mes }, { headers: { "cache-control": "no-store" } });
      }
      lamina = aplicarLamina(lamina, r.lamina);
      if (r.texto) texto = r.texto;
      rehecha++;
      console.error(`[vara] ${id} ${pz.id}: nota ${r.nota}, Faro la rehace (${rehecha}/${RONDAS_VARA})`);
    }
  } catch (e) {
    console.error(`[vara] ${id} ${pz.id} falló: ${ocultarClaves((e as Error).message).slice(0, 300)}`);
    return mal(`No se pudo revisar contra la vara: ${ocultarClaves((e as Error).message).slice(0, 200)}`, 502);
  } finally {
    await nav.close().catch(() => {});
  }
}
