// Imán busca un rubro en Google Maps y suma lo que encuentra a la lista (sistema/66). Una búsqueda por pedido.
import { buscarLugares, CIUDADES, cambiarProspectos, sumarLugares } from "@anonymo/pipeline";
import { mal, permiso, vistaLista } from "@/lib/clientes";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const p = await permiso();
  if (p.error) return p.error;
  let c: { busqueda?: unknown; ciudad?: unknown; paginas?: unknown };
  try { c = await req.json(); } catch { return mal("Pedido no válido."); }
  const busqueda = String(c.busqueda ?? "").trim().slice(0, 60);
  const ciudad = String(c.ciudad ?? "Cuenca");
  if (!busqueda) return mal("Escribe qué buscar.");
  if (!CIUDADES[ciudad]) return mal("Esa ciudad no está en la lista.");
  try {
    const lugares = await buscarLugares(busqueda, ciudad, Number(c.paginas) || 1);
    const { lista, valor: nuevos } = await cambiarProspectos((l) => sumarLugares(l, lugares, busqueda, ciudad, p.yo!));
    return Response.json({ encontrados: lugares.length, nuevos, ...vistaLista(lista) }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return mal((e as Error).message, 502);
  }
}
