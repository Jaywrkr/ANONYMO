// Avisos al celular de Jay y Luna (sistema/72), con Web Push. Las claves VAPID las pone Jay en Vercel:
// VAPID_PUBLICA y VAPID_PRIVADA (se generan con `npx web-push generate-vapid-keys`). Sin ellas, no se avisa y nada se rompe.
import webpush from "web-push";
import { leerCelulares, quitarCelulares } from "@anonymo/pipeline";

export const clavePublicaAvisos = () => process.env.VAPID_PUBLICA || undefined;
const listos = () => !!(process.env.VAPID_PUBLICA && process.env.VAPID_PRIVADA);

export interface Aviso { titulo: string; texto: string; url: string }

/** Manda el aviso a todos los celulares anotados. Nunca lanza: un aviso que falla no debe romper la muestra. */
export async function avisarCelulares(a: Aviso) {
  if (!listos()) return { enviados: 0 };
  let celulares;
  try { celulares = await leerCelulares(); } catch { return { enviados: 0 }; }
  const vencidos: string[] = [];
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
      if (r.status === 404 || r.status === 410) vencidos.push(c.endpoint);
      else if (r.ok) enviados++;
    } catch { /* un celular que no responde no detiene a los demás */ }
  }));
  if (vencidos.length) await quitarCelulares(vencidos).catch(() => {});
  return { enviados };
}
