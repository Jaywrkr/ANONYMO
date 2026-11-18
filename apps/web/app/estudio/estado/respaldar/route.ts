// «Hacer una copia ahora» desde la página de estado (sistema/78). Solo Jay y Luna.
import { anotarError, respaldar } from "@anonymo/pipeline";
import { mal, permiso } from "@/lib/clientes";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  const p = await permiso();
  if (p.error) return p.error;
  try {
    return Response.json(await respaldar(), { headers: { "cache-control": "no-store" } });
  } catch (e) {
    await anotarError("Copia manual", (e as Error).message);
    return mal((e as Error).message, 502);
  }
}
