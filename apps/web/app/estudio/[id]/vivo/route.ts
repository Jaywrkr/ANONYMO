// Estado liviano de un proyecto para la oficina en vivo: solo estado.json (en línea, sin bajar todo el proyecto).
import { existe, leerProyecto, leerRemoto, nubeActiva, type Proyecto } from "@anonymo/pipeline";
import { quienEsta } from "@/lib/estudio";
import type { ProyectoOficina } from "@/lib/oficina";
import { segundosEstimados } from "@/lib/duracion";

export const dynamic = "force-dynamic";

// Además de la oficina: cuándo empezó cada tarea en curso y cuánto suele tardar (sistema/35).
const ligero = (p: Proyecto): ProyectoOficina & { inicios: Record<string, string>; estimados: Record<string, number> } => ({
  id: p.pedido.id, nombre: p.pedido.cliente, estado: p.estado, faseActual: p.faseActual, tareas: p.tareas,
  inicios: p.inicios ?? {},
  estimados: Object.fromEntries(Object.keys(p.tareas).map((t) => [t, segundosEstimados(t)])),
});

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await quienEsta())) return new Response(null, { status: 404 });
  const { id } = await params;
  if (!/^[a-z0-9_-]+$/.test(id)) return new Response(null, { status: 404 });
  try {
    let p: Proyecto | undefined;
    if (nubeActiva()) {
      const t = await leerRemoto(id, "estado.json");
      p = t ? (JSON.parse(t) as Proyecto) : undefined;
    } else if (existe(id)) p = leerProyecto(id);
    if (!p) return new Response(null, { status: 404 });
    return Response.json(ligero(p), { headers: { "cache-control": "no-store" } });
  } catch {
    return new Response(null, { status: 503 });
  }
}
