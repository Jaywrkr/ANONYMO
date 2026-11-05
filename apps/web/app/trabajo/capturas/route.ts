import { after } from "next/server";
import { quienEsta } from "@/lib/estudio";
import { firmaValida } from "@/lib/trabajo";
import { FIRMA_CAPTURAS, trabajarCapturas } from "@/lib/banco";

export const dynamic = "force-dynamic";
// Un paso de capturas del banco: menos de 5 minutos (sistema/61).
export const maxDuration = 300;

export async function POST(req: Request) {
  if (!firmaValida(FIRMA_CAPTURAS, req.headers.get("x-anonymo-trabajo")) && !(await quienEsta())) return new Response(null, { status: 404 });
  const origen = new URL(req.url).origin;
  const despues = req.headers.get("x-anonymo-despues") ?? "";
  after(() => trabajarCapturas(origen, /^[0-9a-f-]{36}$/.test(despues) ? despues : undefined).catch((e) => console.error("[capturas]", (e as Error).message)));
  return Response.json({ ok: true }, { status: 202 });
}
