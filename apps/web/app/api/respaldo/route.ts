// La copia diaria (sistema/78): Vercel la llama una vez al día (vercel.json → crons) con CRON_SECRET.
// Copia prospectos, fichas, guiones y celulares a _respaldos/dia-NN/ (14 ranuras que rotan).
import { anotarError, respaldar } from "@anonymo/pipeline";
import { avisarCelulares } from "@/lib/avisos-celular";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  const secreto = process.env.CRON_SECRET;
  // Sin CRON_SECRET no se abre a nadie: así nadie de afuera puede disparar copias.
  if (!secreto || req.headers.get("authorization") !== `Bearer ${secreto}`) return new Response("No.", { status: 401 });
  try {
    const r = await respaldar();
    return Response.json(r, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    const que = (e as Error).message;
    await anotarError("Copia diaria", que);
    await avisarCelulares({ titulo: "La copia diaria falló", texto: que.slice(0, 120), url: "/estudio/estado" });
    return Response.json({ error: que }, { status: 500 });
  }
}
