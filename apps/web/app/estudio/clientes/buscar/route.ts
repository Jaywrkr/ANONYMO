// Imán busca un rubro en Google Maps y suma lo que encuentra a la lista (sistema/66). Una búsqueda por pedido.
import { anotarError, buscarLugares, CIUDADES, cambiarProspectos, contarGoogle, sumarLugares } from "@anonymo/pipeline";
import { mal, permiso, vistaLista } from "@/lib/clientes";
import { baseUrl } from "@/lib/base";

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
  // Cada consulta a Google cuenta para el cupo del día (sistema/78): la página de estado lo muestra.
  let consultas = 0;
  const contando: typeof fetch = (u, i) => { consultas++; return fetch(u, i); };
  try {
    const lugares = await buscarLugares(busqueda, ciudad, Number(c.paginas) || 1, contando);
    const { lista, valor: nuevos } = await cambiarProspectos((l) => sumarLugares(l, lugares, busqueda, ciudad, p.yo!));
    return Response.json({ encontrados: lugares.length, nuevos, ...vistaLista(lista, await baseUrl()) }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    await anotarError("Buscar en Google", (e as Error).message);
    return mal((e as Error).message, 502);
  } finally {
    await contarGoogle(consultas);
  }
}
