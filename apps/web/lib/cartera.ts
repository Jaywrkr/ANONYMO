// Junta lo que existe de cada cliente para armar las fichas (sistema/70). Si una parte no responde, las demás siguen.
import { construirCartera, leerFichas, leerProspectos, listarKits, listarVideos, type Ficha } from "@anonymo/pipeline";
import { resumenProyectos } from "@/lib/nube";

const seguro = async <T,>(p: Promise<T>, vacio: T, que: string, fallas: string[]) => {
  try { return await p; } catch (e) { fallas.push(`${que}: ${(e as Error).message}`); return vacio; }
};

export async function cartera(): Promise<{ fichas: Ficha[]; fallas: string[] }> {
  const fallas: string[] = [];
  const [proyectos, videos, kits, prospectos, guardadas] = await Promise.all([
    seguro(resumenProyectos(), [], "proyectos", fallas),
    seguro(listarVideos(), [], "videos", fallas),
    seguro(listarKits(), [], "marcas", fallas),
    seguro(leerProspectos(), { actualizado: "", firma: "", prospectos: {} }, "clientes nuevos", fallas),
    seguro(leerFichas(), { actualizado: "", fichas: {} }, "fichas", fallas),
  ]);
  const fichas = construirCartera({
    proyectos: proyectos.filter((p) => !p.pedido.id.startsWith("_")).map((p) => ({ id: p.pedido.id, cliente: p.pedido.cliente, ficha: p.pedido.ficha, tipo: p.pedido.tipo, estado: p.estado, creado: p.pedido.creado, actualizado: p.actualizado, papelera: !!p.papelera })),
    videos: videos.map((v) => ({ id: v.id, nombre: v.nombre, cliente: v.cliente, estado: v.estado, formatos: v.resultados.length, creado: v.creado, actualizado: v.actualizado })),
    kits: kits.map((k) => ({ id: k.id, nombre: k.nombre, color: k.color, actualizado: k.actualizado })),
    prospectos: Object.values(prospectos.prospectos),
    guardadas: Object.values(guardadas.fichas),
  });
  return { fichas, fallas };
}
