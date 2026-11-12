// Avisos al celular de Jay y Luna (sistema/72), con Web Push. Las claves VAPID las pone Jay en Vercel:
// VAPID_PUBLICA y VAPID_PRIVADA (se generan con `npx web-push generate-vapid-keys`). Sin ellas, no se avisa y nada se rompe.
import webpush from "web-push";
import { leerCelulares, quitarCelulares } from "@anonymo/pipeline";

export const clavePublicaAvisos = () => process.env.VAPID_PUBLICA || undefined;
const listos = () => !!(process.env.VAPID_PUBLICA && process.env.VAPID_PRIVADA);

export interface Aviso { titulo: string; texto: string; url: string }

export interface Falla { status: number; detalle: string }

/** Manda el aviso a los celulares anotados (o solo a uno). Nunca lanza: un aviso que falla no debe romper la muestra.
 *  Devuelve cuántos salieron y por qué fallaron los otros, y deja el error en el registro de Vercel. */
export async function avisarCelulares(a: Aviso, solo?: string): Promise<{ enviados: number; fallas: Falla[] }> {
  if (!listos()) return { enviados: 0, fallas: [{ status: 0, detalle: "Faltan VAPID_PUBLICA y VAPID_PRIVADA" }] };
  let celulares;
  try { celulares = await leerCelulares(); } catch (e) { return { enviados: 0, fallas: [{ status: 0, detalle: (e as Error).message }] }; }
  if (solo) celulares = celulares.filter((c) => c.endpoint === solo);
  const vencidos: string[] = [];
  const fallas: Falla[] = [];
  let enviados = 0;
  await Promise.all(celulares.map(async (c) => {
    try {
      // Se arma el pedido con web-push y se envía con fetch: así funciona igual con el servicio real y con el de prueba.
      const d = webpush.generateRequestDetails({ endpoint: c.endpoint, keys: c.keys }, JSON.stringify(a), {
        TTL: 60 * 60,
        urgency: "high",
        vapidDetails: { subject: process.env.VAPID_CORREO || "mailto:hola@anonymo.ec", publicKey: process.env.VAPID_PUBLICA!, privateKey: process.env.VAPID_PRIVADA! },
      });
      const r = await fetch(d.endpoint, { method: d.method, headers: d.headers as Record<string, string>, body: d.body as BodyInit | null, signal: AbortSignal.timeout(8000) });
      if (r.ok) { enviados++; return; }
      if (r.status === 404 || r.status === 410) vencidos.push(c.endpoint);
      const detalle = (await r.text().catch(() => "")).slice(0, 200);
      fallas.push({ status: r.status, detalle });
      console.error(`[avisos] ${new URL(c.endpoint).host} respondió ${r.status}: ${detalle}`);
    } catch (e) {
      fallas.push({ status: 0, detalle: (e as Error).message });
      console.error(`[avisos] no se pudo enviar: ${(e as Error).message}`);
    }
  }));
  if (vencidos.length) await quitarCelulares(vencidos).catch(() => {});
  return { enviados, fallas };
}
