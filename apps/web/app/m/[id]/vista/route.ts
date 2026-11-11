// El negocio abrió su muestra o tocó «Quiero esta web» (sistema/72): se anota en su historial y suena el celular de Jay y Luna.
// Si quien la abre es Jay o Luna con sesión en el estudio, no cuenta.
import { anotarQuiere, anotarVista, buscarPorMuestra, cambiarProspectos, idMuestraValido } from "@anonymo/pipeline";
import { portalActivo, quienEsta } from "@/lib/estudio";
import { avisarCelulares } from "@/lib/avisos-celular";

export const dynamic = "force-dynamic";

const nada = () => new Response(null, { status: 204, headers: { "cache-control": "no-store" } });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!portalActivo() || !idMuestraValido(id)) return nada();
  if (await quienEsta().catch(() => undefined)) return nada();
  let accion = "";
  try { accion = String(((await req.json()) as { accion?: unknown }).accion ?? ""); } catch { /* vista simple */ }
  try {
    const { valor } = await cambiarProspectos((l) => {
      const p = buscarPorMuestra(l.prospectos, id);
      if (!p || p.estado === "descartado") return undefined;
      const r = accion === "quiere" ? anotarQuiere(p) : anotarVista(p);
      return { ...r, nombre: p.nombre, telefono: p.telefono, quiere: accion === "quiere" };
    });
    if (valor?.avisar) {
      await avisarCelulares(valor.quiere
        ? { titulo: `${valor.nombre} quiere su web`, texto: "Tocó «Quiero esta web» en su muestra. Escríbele ahora.", url: "/estudio/clientes/tanda" }
        : { titulo: `${valor.nombre} está viendo su muestra`, texto: "Ahora es buen momento para llamarle o escribirle.", url: "/estudio/clientes/tanda" });
    }
  } catch { /* la muestra se ve igual aunque no se pueda anotar */ }
  return nada();
}
