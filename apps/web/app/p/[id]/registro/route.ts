// El negocio abrió su propuesta o tocó «Aceptar» (sistema/80): se anota en su historial y suena el celular de Jay y Luna.
// Si quien la abre es Jay o Luna con sesión en el estudio, no cuenta. Mismo freno que la muestra.
import { anotarError, anotarPropuesta, buscarPorMuestra, cambiarProspectos, idMuestraValido } from "@anonymo/pipeline";
import { portalActivo, quienEsta } from "@/lib/estudio";
import { avisarCelulares } from "@/lib/avisos-celular";
import { BOT, frenar, nada } from "@/lib/freno";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!portalActivo() || !idMuestraValido(id)) return nada();
  if (await quienEsta().catch(() => undefined)) return nada();
  const quien = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "?";
  if (BOT.test(req.headers.get("user-agent") ?? "") || frenar(`p:${id}`, 6) || frenar(`ip:${quien}`, 30)) return nada();
  let accion: "vista" | "acepto" = "vista";
  try { if (((await req.json()) as { accion?: unknown }).accion === "acepto") accion = "acepto"; } catch { /* vista simple */ }
  try {
    const { valor } = await cambiarProspectos((l) => {
      const p = buscarPorMuestra(l.prospectos, id);
      if (!p || p.estado === "descartado") return undefined;
      return { ...anotarPropuesta(p, accion), nombre: p.nombre };
    });
    if (valor?.avisar) {
      await avisarCelulares(accion === "acepto"
        ? { titulo: `${valor.nombre} aceptó la propuesta`, texto: "Escríbele hoy para el primer pago (50 %) y arrancar.", url: "/estudio/clientes/tanda" }
        : { titulo: `${valor.nombre} está viendo su propuesta`, texto: "Está mirando el precio. Buen momento para escribirle.", url: "/estudio/clientes/tanda" });
    }
  } catch (e) { await anotarError("Propuesta", (e as Error).message); }
  return nada();
}
