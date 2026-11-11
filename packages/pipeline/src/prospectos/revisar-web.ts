// Revisa la web de un negocio sin abrir un navegador (sistema/66): si existe, si abre, si sirve en celular y si está vieja.
import type { RevisionWeb } from "./tipos.ts";

const REDES: [RegExp, string][] = [
  [/instagram\.com/i, "Instagram"],
  [/facebook\.com|fb\.me|fb\.com/i, "Facebook"],
  [/wa\.me|whatsapp\.com/i, "WhatsApp"],
  [/linktr\.ee|linkin\.bio|beacons\.ai/i, "Linktree"],
  [/tiktok\.com/i, "TikTok"],
  [/doctoralia\./i, "Doctoralia"],
];

const red = (url: string) => REDES.find(([re]) => re.test(url))?.[1];

/** Las páginas de negocio de Google (business.site) se apagaron en 2024. */
const sitioGoogleCerrado = (url: string) => /business\.site/i.test(url);

const MOVIL = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

/** Lee el HTML ya bajado: lo separa de la red para poder probarlo sin internet. */
export function leerHtml(html: string, urlFinal: string, ms: number, hoy = new Date()): RevisionWeb {
  if (html.length < 300 || /domain (is )?for sale|este dominio est[aá]|parked domain|account suspended|cuenta suspendida/i.test(html.slice(0, 6000))) {
    return { estado: "rota", motivo: "Dominio vacío o suspendido" };
  }
  const celular = /<meta[^>]+name=["']?viewport/i.test(html);
  const titulo = (html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? "").trim().slice(0, 140);
  let hechaCon = html.match(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)/i)?.[1]?.split(/[\s;]/)[0];
  if (!hechaCon) {
    if (/wix\.com|wixstatic/i.test(html)) hechaCon = "Wix";
    else if (/wp-content/i.test(html)) hechaCon = "WordPress";
    else if (/squarespace/i.test(html)) hechaCon = "Squarespace";
  }
  const anios = [...html.matchAll(/(?:©|&copy;|copyright)\s*(?:\d{4}\s*[-–]\s*)?(20\d{2})/gi)]
    .map((m) => Number(m[1]))
    .filter((y) => y >= 2000 && y <= hoy.getFullYear());
  return { estado: "ok", https: urlFinal.startsWith("https://"), celular, titulo, hechaCon, anio: anios.length ? Math.max(...anios) : undefined, ms };
}

export async function revisarWeb(url: string, f: typeof fetch = fetch, esperaMs = 10_000): Promise<RevisionWeb> {
  const destino = /^https?:\/\//i.test(url) ? url : `http://${url}`;
  if (sitioGoogleCerrado(destino)) return { estado: "rota", motivo: "Su página de Google ya no existe" };
  const r0 = red(destino);
  if (r0) return { estado: "social", red: r0 };

  const desde = Date.now();
  let res: Response;
  try {
    res = await f(destino, {
      redirect: "follow",
      signal: AbortSignal.timeout(esperaMs),
      headers: { "user-agent": MOVIL, accept: "text/html,application/xhtml+xml", "accept-language": "es-EC,es;q=0.9" },
    });
  } catch (e) {
    return { estado: "rota", motivo: (e as Error)?.name === "TimeoutError" ? "La web no responde" : "La web no abre" };
  }
  const ms = Date.now() - desde;
  if (res.status >= 400) return { estado: "rota", motivo: `La web da error (${res.status})` };
  const final = res.url || destino;
  const r1 = red(final);
  if (r1) return { estado: "social", red: r1 };
  let html = "";
  try { html = (await res.text()).slice(0, 600_000); } catch { return { estado: "rota", motivo: "La web no termina de cargar" }; }
  return leerHtml(html, final, ms);
}
