// Anota este celular para recibir avisos (sistema/72): cuando un negocio abre su muestra.
import { sumarCelular, suscripcionValida, quitarCelulares } from "@anonymo/pipeline";
import { mal, permiso } from "@/lib/clientes";
import { avisarCelulares, clavePublicaAvisos } from "@/lib/avisos-celular";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const p = await permiso();
  if (p.error) return p.error;
  if (!clavePublicaAvisos()) return mal("Los avisos todavía no están configurados. Jay pone VAPID_PUBLICA y VAPID_PRIVADA en Vercel.", 409);
  let c: { suscripcion?: unknown; equipo?: unknown; probar?: unknown };
  try { c = await req.json(); } catch { return mal("Pedido no válido."); }
  if (!suscripcionValida(c.suscripcion)) return mal("Este navegador no dio una suscripción válida. Prueba con Chrome en Android, o instala el estudio en la pantalla de inicio del iPhone.");
  const s = c.suscripcion;
  try {
    await sumarCelular({ endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth }, socio: p.yo!, agregado: new Date().toISOString(), equipo: typeof c.equipo === "string" ? c.equipo.slice(0, 60) : undefined });
    // El aviso de prueba va solo a este celular y dice qué pasó (sistema/74).
    const r = c.probar === false ? { enviados: 0, fallas: [] } : await avisarCelulares({ titulo: "Aviso de prueba", texto: "Así te va a sonar cuando un negocio abra su muestra.", url: "/estudio/clientes/tanda" }, s.endpoint);
    return Response.json({ ok: true, ...r }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return mal((e as Error).message, 502);
  }
}

export async function DELETE(req: Request) {
  const p = await permiso();
  if (p.error) return p.error;
  let c: { endpoint?: unknown };
  try { c = await req.json(); } catch { return mal("Pedido no válido."); }
  if (typeof c.endpoint !== "string") return mal("Falta el celular.");
  try {
    await quitarCelulares([c.endpoint]);
    return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    return mal((e as Error).message, 502);
  }
}
