// Freno para lo que abren los negocios desde WhatsApp (sistema/78, compartido en sistema/80): la muestra y la propuesta.
// Vive en la memoria de cada servidor: no es perfecto, pero corta a un bot o a alguien recargando sin parar.
const visitas = new Map<string, number[]>();

/** true si esta clave ya pasó de `max` veces en el último minuto. */
export function frenar(clave: string, max: number) {
  const ahora = Date.now();
  const v = (visitas.get(clave) ?? []).filter((t) => ahora - t < 60_000);
  v.push(ahora);
  visitas.set(clave, v);
  if (visitas.size > 5000) visitas.clear();
  return v.length > max;
}

/** Bots y vistas previas (WhatsApp, Slack…): no cuentan como una persona abriendo el enlace. */
export const BOT = /bot|crawl|spider|preview|facebookexternalhit|whatsapp|slack|discord|telegram/i;

export const nada = () => new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
