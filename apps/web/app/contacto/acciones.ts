"use server";
// El formulario de contacto: el pedido llega a Atlas como solicitud y Jay o Luna reciben el aviso.
import { headers } from "next/headers";
import { PEDIDOS, type TipoPedido } from "@anonymo/agentes";
import { avisar, canalesActivos, guardarSolicitud } from "@anonymo/pipeline";
import { conNube } from "@/lib/nube";

export interface EstadoEnvio { ok: boolean; mensaje: string; campos?: Record<string, string> }

// Límite simple por IP: 5 envíos por hora (en memoria del servidor).
const envios = new Map<string, number[]>();

export async function enviarPedido(_: EstadoEnvio | null, f: FormData): Promise<EstadoEnvio> {
  const tipo = String(f.get("tipo") ?? "") as TipoPedido;
  const nombre = String(f.get("nombre") ?? "").trim().slice(0, 80);
  const correo = String(f.get("correo") ?? "").trim().slice(0, 120);
  const mensaje = String(f.get("mensaje") ?? "").trim().slice(0, 3000);
  const campos = { nombre, correo, mensaje };
  const en = f.get("idioma") === "en";
  const m = (es: string, ingles: string) => (en ? ingles : es);

  // Trampa para bots: un campo que las personas no ven.
  if (String(f.get("sitio") ?? "")) return { ok: true, mensaje: m("Gracias.", "Thanks.") };
  if (!(tipo in PEDIDOS)) return { ok: false, mensaje: m("Elige qué necesitas.", "Pick what you need."), campos };
  if (nombre.length < 2) return { ok: false, mensaje: m("Escribe tu nombre.", "Write your name."), campos };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) return { ok: false, mensaje: m("Revisa tu correo: parece incompleto.", "Check your email: it looks incomplete."), campos };
  if (mensaje.length < 10) return { ok: false, mensaje: m("Cuéntanos un poco más (al menos una frase).", "Tell us a bit more (at least one sentence)."), campos };

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const ahora = Date.now();
  const recientes = (envios.get(ip) ?? []).filter((t) => ahora - t < 3600_000);
  if (recientes.length >= 5) return { ok: false, mensaje: m("Recibimos varios pedidos desde aquí. Intenta en un rato.", "We got several requests from here. Try again in a while."), campos };
  envios.set(ip, [...recientes, ahora]);

  try {
    await conNube(["_solicitudes"], () => guardarSolicitud({ tipo, nombre, correo, mensaje, origen: en ? "web-en" : "web" }));
  } catch {
    // Sin disco (por ejemplo, un hosting estático): al menos el aviso.
    const c = canalesActivos();
    if (!c.correo && !c.webhook) return { ok: false, mensaje: m("No pudimos recibir tu pedido ahora. Intenta en unos minutos.", "We couldn't receive your request right now. Try again in a few minutes."), campos };
    await avisar({ proyecto: "_solicitudes", cliente: nombre, tipo: "comentario", titulo: `Nueva solicitud: ${tipo}`, texto: `${nombre} <${correo}>\n\n${mensaje}` });
  }
  return { ok: true, mensaje: m(`Listo, ${nombre.split(" ")[0]}. Atlas ya tiene tu pedido y Jay o Luna te escriben en menos de 24 horas.`, `Done, ${nombre.split(" ")[0]}. Atlas has your request and Jay or Luna will write within 24 hours.`) };
}
