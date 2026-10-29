import { after } from "next/server";
import { quienEsta } from "@/lib/estudio";
import { firmaValida, trabajarVuelta } from "@/lib/trabajo";

export const dynamic = "force-dynamic";
// Una vuelta de trabajo: un agente, menos de 5 minutos (sistema/36).
export const maxDuration = 300;

// Responde al momento y trabaja después: quien pidió la vuelta no espera a que el agente termine.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9_-]+$/.test(id)) return new Response(null, { status: 404 });
  if (!firmaValida(id, req.headers.get("x-anonymo-trabajo")) && !(await quienEsta())) return new Response(null, { status: 404 });
  const origen = new URL(req.url).origin;
  after(() => trabajarVuelta(id, origen).catch((e) => console.error("[trabajo]", id, (e as Error).message)));
  return Response.json({ ok: true }, { status: 202 });
}
