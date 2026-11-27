// Una pieza de Faro (sistema/123). POST: una vuelta (diseñar, dibujar, juzgar); el navegador pide otra si no llegó.
// PATCH: aprobar o pedir un cambio con una nota (lo que se pide queda en lo aprendido del cliente).
import { NOTA_PIEZA, VUELTAS_PIEZA, cambiarPiezaFaro, idPiezaValido, leerPiezaFaro, ocultarClaves } from "@anonymo/pipeline";
import { quienEsta } from "@/lib/estudio";
import { reflejarEnMes, vueltaDeFaro } from "@/lib/faro";
import { anotarEnDireccion } from "@/lib/contenido";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
const mal = (error: string, status = 400) => Response.json({ error }, { status, headers: { "cache-control": "no-store" } });

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const yo = await quienEsta();
  if (!yo) return mal("Tu sesión terminó. Vuelve a entrar.", 403);
  const { id } = await params;
  const p = idPiezaValido(id) ? await leerPiezaFaro(id) : undefined;
  if (!p) return mal("No encontramos esa pieza.", 404);
  if (p.estado === "aprobada") return mal("Ya está aprobada.", 409);
  try {
    const nueva = await vueltaDeFaro(id, p);
    await reflejarEnMes(nueva, yo);
    const v = nueva.versiones.at(-1)!;
    // Otra vuelta sola si no llegó a la vara y no se pasó de las vueltas (contando desde el último pedido de Jay o Luna).
    const seguidas = nueva.versiones.slice().reverse().findIndex((x) => x.pedido?.startsWith("Jay o Luna")) + 1 || nueva.versiones.length;
    return Response.json({ pieza: nueva, otra: v.nota !== undefined && v.nota < NOTA_PIEZA && seguidas <= VUELTAS_PIEZA }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    const m = ocultarClaves((e as Error).message).slice(0, 240);
    console.error(`[faro] ${id}: ${m}`);
    await cambiarPiezaFaro(id, (x) => { if (x.estado === "trabajando" && !x.versiones.length) x.estado = "propuesta"; }).catch(() => {});
    return mal(/timeout|aborted/i.test(m) ? "Faro tardó demasiado. Vuelve a pedirla." : `Faro no pudo: ${m}`, 502);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const yo = await quienEsta();
  if (!yo) return mal("Tu sesión terminó. Vuelve a entrar.", 403);
  const { id } = await params;
  const c = (await req.json().catch(() => ({}))) as { accion?: string; nota?: string };
  const nota = String(c.nota ?? "").trim().slice(0, 600);
  if (c.accion === "cambio" && !nota) return mal("Cuenta qué hay que cambiar.");
  if (c.accion !== "aprobar" && c.accion !== "cambio") return mal("No entendí.");
  const p = await cambiarPiezaFaro(id, (x) => { x.estado = c.accion === "aprobar" ? "aprobada" : "cambio"; if (c.accion === "cambio") { x.nota = nota; const v = x.versiones.at(-1); if (v) v.pedido = `Jay o Luna: ${nota}`; } }).catch(() => undefined);
  if (!p) return mal("No encontramos esa pieza.", 404);
  if (c.accion === "cambio") await anotarEnDireccion(p.cliente, nota, yo, `pieza de ${p.proyecto.nombre}`);
  // Si es una publicación del mes, el calendario queda igual (sistema/127).
  await reflejarEnMes(p, yo);
  return Response.json({ pieza: p }, { headers: { "cache-control": "no-store" } });
}
