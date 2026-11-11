// Revisa la web de los negocios que faltan, de a varios por pedido (sistema/66). El navegador repite hasta que no quede ninguno.
import { cambiarProspectos, leerProspectos, porRevisar, revisarWeb, type RevisionWeb } from "@anonymo/pipeline";
import { mal, permiso, vistaLista } from "@/lib/clientes";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const POR_VEZ = 8;

export async function POST() {
  const p = await permiso();
  if (p.error) return p.error;
  try {
    const tanda = porRevisar(await leerProspectos()).slice(0, POR_VEZ);
    // La red primero, sin guardar; después un solo guardado con todo lo revisado.
    const hechas = await Promise.all(tanda.map(async (x) => [x.id, x.web!, await revisarWeb(x.web!)] as [string, string, RevisionWeb]));
    const { lista } = await cambiarProspectos((l) => {
      for (const [id, web, r] of hechas) {
        const x = l.prospectos[id];
        if (x && x.web === web) x.revision = r;
      }
    });
    return Response.json({ revisadas: hechas.length, quedan: porRevisar(lista).length, ...vistaLista(lista) }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return mal((e as Error).message, 502);
  }
}
