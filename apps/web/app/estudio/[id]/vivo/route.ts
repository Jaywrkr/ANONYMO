// Estado liviano de un proyecto para la oficina en vivo: solo estado.json (en línea, sin bajar todo el proyecto).
import { existe, leerProyecto, leerRemoto, nubeActiva, type Proyecto } from "@anonymo/pipeline";
import { quienEsta } from "@/lib/estudio";
import type { ProyectoOficina } from "@/lib/oficina";
import { segundosEstimados } from "@/lib/duracion";
import { leerVivo, rescatar, type Vivo } from "@/lib/trabajo";

export const dynamic = "force-dynamic";

// Además de la oficina: cuándo empezó cada tarea en curso y cuánto suele tardar (sistema/35).
// Y la señal del agente que trabaja (sistema/36): qué hace, cuántas palabras lleva y cuándo dio la última señal.
const ligero = (p: Proyecto, vivo?: Vivo) => ({
  id: p.pedido.id, nombre: p.pedido.cliente, estado: p.estado, faseActual: p.faseActual, tareas: p.tareas,
  inicios: p.inicios ?? {},
  vueltas: p.vueltas ?? {},
  estimados: Object.fromEntries(Object.keys(p.tareas).map((t) => [t, segundosEstimados(t)])),
  controlPendiente:p.controlPendiente, revision: p.revision, error: p.error, actualizado: p.actualizado,
  vivo,
}) satisfies ProyectoOficina & Record<string, unknown>;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await quienEsta())) return new Response(null, { status: 404 });
  const { id } = await params;
  if (!/^[a-z0-9_-]+$/.test(id)) return new Response(null, { status: 404 });
  try {
    let p: Proyecto | undefined;
    let vivo: Vivo | undefined;
    if (nubeActiva()) {
      const [t, v] = await Promise.all([leerRemoto(id, "estado.json"), leerRemoto(id, "vivo.json").catch(() => undefined)]);
      p = t ? (JSON.parse(t) as Proyecto) : undefined;
      try { vivo = v ? (JSON.parse(v) as Vivo) : undefined; } catch {}
    } else if (existe(id)) {
      p = leerProyecto(id);
      vivo = leerVivo(id);
    }
    if (!p) return new Response(null, { status: 404 });
    // Si el trabajo quedó sin arrancar, arranca solo (sistema/44).
    if (nubeActiva() || process.env.ANONYMO_RESCATE) await rescatar(p, vivo, new URL(req.url).origin).catch(() => false);
    return Response.json(ligero(p, vivo), { headers: { "cache-control": "no-store" } });
  } catch {
    return new Response(null, { status: 503 });
  }
}
