// Pedirle una pieza a Faro (sistema/123): se crea vacía y el navegador pide las vueltas una por una.
import { crearPiezaFaro } from "@anonymo/pipeline";
import { quienEsta } from "@/lib/estudio";
import { proyectosParaPiezas } from "@/lib/faro";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const yo = await quienEsta();
  if (!yo) return Response.json({ error: "Tu sesión terminó. Vuelve a entrar." }, { status: 403 });
  const c = (await req.json().catch(() => ({}))) as { cliente?: string; url?: string };
  const pr = (await proyectosParaPiezas()).find((x) => x.cliente === c.cliente && x.url === c.url);
  if (!pr) return Response.json({ error: "No encontramos ese proyecto." }, { status: 404 });
  const p = await crearPiezaFaro({ cliente: pr.cliente, nombreCliente: pr.nombreCliente, proyecto: { url: pr.url, nombre: pr.nombre }, por: yo });
  return Response.json({ pieza: p }, { headers: { "cache-control": "no-store" } });
}
