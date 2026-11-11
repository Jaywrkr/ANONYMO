// La dirección pública del estudio (sistema/72): para los enlaces que salen hacia afuera (la muestra en WhatsApp).
// ANONYMO_URL manda si está puesta (un dominio propio); si no, la del pedido actual.
import { headers } from "next/headers";

export async function baseUrl() {
  const fija = process.env.ANONYMO_URL?.replace(/\/+$/, "");
  if (fija) return fija;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (/^(localhost|127\.)/.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}
