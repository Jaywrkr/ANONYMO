// Avisos: cuando un proyecto espera tu decisión, termina o el cliente comenta.
// Siempre quedan en proyectos/<id>/avisos.md. Además, si están configurados:
//   RESEND_API_KEY + AVISOS_CORREO (+ AVISOS_DE)  → correo vía Resend
//   AVISOS_WEBHOOK                                  → POST JSON (Slack, Make, Zapier, un bot de WhatsApp...)
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { carpeta } from "./almacen.ts";

export type TipoAviso = "espera" | "listo" | "comentario" | "jurado" | "prueba";

export interface AvisoProyecto {
  proyecto: string;
  cliente: string;
  tipo: TipoAviso;
  titulo: string;
  texto: string;
  enlace?: string;
}

const ASUNTO: Record<TipoAviso, string> = {
  espera: "Espera tu decisión",
  listo: "Proyecto listo",
  comentario: "El cliente comentó",
  jurado: "El Jurado no llegó al mínimo",
  prueba: "Prueba de avisos",
};

export function canalesActivos() {
  return {
    correo: !!(process.env.RESEND_API_KEY && process.env.AVISOS_CORREO),
    webhook: !!process.env.AVISOS_WEBHOOK,
  };
}

/** Nunca rompe el flujo: si un canal falla, se anota y se sigue. */
export async function avisar(a: AvisoProyecto): Promise<string[]> {
  const enlace = a.enlace ?? `${process.env.ANONYMO_URL ?? "http://localhost:3000"}/estudio/${a.proyecto}`;
  const hechos: string[] = ["archivo"];
  try {
    const dir = join(carpeta(), a.proyecto);
    mkdirSync(dir, { recursive: true });
    const ruta = join(dir, "avisos.md");
    if (!existsSync(ruta)) writeFileSync(ruta, "# Avisos\n\n");
    appendFileSync(ruta, `- ${new Date().toISOString().slice(0, 16).replace("T", " ")} · ${ASUNTO[a.tipo]}: ${a.titulo}\n`);
  } catch {
    hechos[0] = "archivo no disponible";
  }

  const c = canalesActivos();
  if (c.correo) {
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
        body: JSON.stringify({
          from: process.env.AVISOS_DE ?? "Anonymo <avisos@resend.dev>",
          to: process.env.AVISOS_CORREO!.split(",").map((x) => x.trim()),
          subject: `${a.cliente} · ${ASUNTO[a.tipo]}`,
          text: `${a.titulo}\n\n${a.texto}\n\n${enlace}`,
        }),
        signal: AbortSignal.timeout(10000),
      });
      hechos.push(r.ok ? "correo" : `correo falló (${r.status})`);
    } catch (e) {
      hechos.push(`correo falló (${(e as Error).message.slice(0, 40)})`);
    }
  }
  if (c.webhook) {
    try {
      const r = await fetch(process.env.AVISOS_WEBHOOK!, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...a, asunto: ASUNTO[a.tipo], enlace, text: `${a.cliente} · ${ASUNTO[a.tipo]}: ${a.titulo} ${enlace}` }),
        signal: AbortSignal.timeout(10000),
      });
      hechos.push(r.ok ? "webhook" : `webhook falló (${r.status})`);
    } catch (e) {
      hechos.push(`webhook falló (${(e as Error).message.slice(0, 40)})`);
    }
  }
  return hechos;
}
