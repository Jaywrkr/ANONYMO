// Quién está viendo su muestra ahora mismo (sistema/72): el escritorio y la tanda lo preguntan cada medio minuto.
import { leerProspectos } from "@anonymo/pipeline";
import { mal, permiso, vistaLista } from "@/lib/clientes";
import { baseUrl } from "@/lib/base";
import { calientes, viendoAhora } from "@/lib/tanda";

export const dynamic = "force-dynamic";

export async function GET() {
  const p = await permiso();
  if (p.error) return p.error;
  try {
    const l = vistaLista(await leerProspectos(), await baseUrl());
    return Response.json({ ahora: viendoAhora(l.prospectos), quieren: calientes(l.prospectos) }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return mal((e as Error).message, 502);
  }
}
