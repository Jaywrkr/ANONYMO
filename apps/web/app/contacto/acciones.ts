"use server";
// El formulario de contacto: el pedido llega a Atlas como solicitud y Jay o Luna reciben el aviso.
import { headers } from "next/headers";
import { PEDIDOS, type TipoPedido } from "@anonymo/agentes";
import { avisar, canalesActivos, guardarSolicitud } from "@anonymo/pipeline";

export interface EstadoEnvio { ok: boolean; mensaje: string; campos?: Record<string, string> }

// Límite simple por IP: 5 envíos por hora (en memoria del servidor).
const envios = new Map<string, number[]>();

export async function enviarPedido(_: EstadoEnvio | null, f: FormData): Promise<EstadoEnvio> {
  const tipo = String(f.get("tipo") ?? "") as TipoPedido;
  const nombre = String(f.get("nombre") ?? "").trim().slice(0, 80);
  const correo = String(f.get("correo") ?? "").trim().slice(0, 120);
  const mensaje = String(f.get("mensaje") ?? "").trim().slice(0, 3000);
  const campos = { nombre, correo, mensaje };

  // Trampa para bots: un campo que las personas no ven.
  if (String(f.get("sitio") ?? "")) return { ok: true, mensaje: "Gracias." };
  if (!(tipo in PEDIDOS)) return { ok: false, mensaje: "Elige qué necesitas.", campos };
  if (nombre.length < 2) return { ok: false, mensaje: "Escribe tu nombre.", campos };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) return { ok: false, mensaje: "Revisa tu correo: parece incompleto.", campos };
  if (mensaje.length < 10) return { ok: false, mensaje: "Cuéntanos un poco más (al menos una frase).", campos };

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const ahora = Date.now();
  const recientes = (envios.get(ip) ?? []).filter((t) => ahora - t < 3600_000);
  if (recientes.length >= 5) return { ok: false, mensaje: "Recibimos varios pedidos desde aquí. Intenta en un rato.", campos };
  envios.set(ip, [...recientes, ahora]);

  try {
    await guardarSolicitud({ tipo, nombre, correo, mensaje, origen: "web" });
  } catch {
    // Sin disco (por ejemplo, un hosting estático): al menos el aviso.
    const c = canalesActivos();
    if (!c.correo && !c.webhook) return { ok: false, mensaje: "No pudimos recibir tu pedido ahora. Intenta en unos minutos.", campos };
    await avisar({ proyecto: "_solicitudes", cliente: nombre, tipo: "comentario", titulo: `Nueva solicitud: ${tipo}`, texto: `${nombre} <${correo}>\n\n${mensaje}` });
  }
  return { ok: true, mensaje: `Listo, ${nombre.split(" ")[0]}. Atlas ya tiene tu pedido y Jay o Luna te escriben en menos de 24 horas.` };
}
