// La caja única de Atlas (sistema/95). GET: los clientes y qué se puede hacer con cada uno. POST: hace lo pedido.
// Nada sale hacia afuera: el mensaje se prepara y Jay o Luna lo mandan. Lo que usa IA pide confirmación primero.
// La lógica vive en lib/caja-ejecutar.ts: la conversación única de Atlas (sistema/106) la usa también.
import { estadoTareas, nombreDato, saberDe } from "@anonymo/pipeline";
import { mal, permiso } from "@/lib/clientes";
import { clientesCaja, ejecutarCaja, proyectoDe, type PedidoCaja } from "@/lib/caja-ejecutar";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const sinCache = { headers: { "cache-control": "no-store" } };

export async function GET() {
  const p = await permiso();
  if (p.error) return p.error;
  const clientes = (await clientesCaja()).map((f) => {
    const tareas = Object.fromEntries(estadoTareas(saberDe(f)).map((t) => [t.tarea, { listo: t.listo, faltan: t.faltan.map(nombreDato) }]));
    return { id: f.id, nombre: f.nombre, alias: f.guardada?.alias, tareas, prospecto: !!f.prospecto, proyecto: proyectoDe(f)?.id, web: !!(f.guardada?.web ?? f.contacto.web) };
  }).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  return Response.json({ clientes }, sinCache);
}

export async function POST(req: Request) {
  const p = await permiso();
  if (p.error) return p.error;
  let c: PedidoCaja;
  try { c = await req.json(); } catch { return mal("Pedido no válido."); }
  return ejecutarCaja(c, p.yo!, new URL(req.url).origin);
}
