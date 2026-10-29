// Lo que espera a Jay o Luna (sistema/35, /36): lo usan la campana, el contador de la barra y los avisos del navegador.
import { listarSolicitudes, nubeActiva, responsable, solicitudesEnNube, contratoPorId, type Proyecto, type TareaId } from "@anonymo/pipeline";
import { agentePorId } from "@anonymo/agentes";
import { momento } from "./camino";
import { espacio } from "./espacio";
import { resumenProyectos } from "./nube";

export interface AvisoPendiente {
  /** Identifica el aviso: si cambia, es algo nuevo (para no avisar dos veces lo mismo). */
  clave: string;
  href: string;
  titulo: string;
  detalle: string;
  punto: string;
}

export async function pendientes(yo: "jay" | "luna", todos?: Proyecto[]) {
  const lista = todos ?? (await resumenProyectos().catch(() => [] as Proyecto[]));
  const vivos = lista.filter((p) => !p.papelera);
  let solicitudes = 0;
  try { solicitudes = nubeActiva() ? await solicitudesEnNube() : listarSolicitudes().length; } catch {}
  const avisos: AvisoPendiente[] = [];
  for (const p of vivos) {
    const m = momento(p, yo, responsable(p, p.faseActual));
    const punto = espacio(p.pedido.id, p.marca).punto;
    if (m.teToca) {
      const t = p.revision?.tarea;
      avisos.push({
        clave: `${p.pedido.id}:${p.estado}:${t ?? p.faseActual}:${p.revision?.fecha ?? p.error?.fecha ?? ""}:${m.tono}`,
        href: t && p.estado === "esperando" ? `/estudio/${p.pedido.id}/${t.replace(".", "-")}` : `/estudio/${p.pedido.id}`,
        titulo: p.pedido.cliente,
        detalle: t && p.estado === "esperando" ? `${agentePorId(t.split(".")[1])?.nombre} entregó ${contratoPorId(t as TareaId)?.entrega.toLowerCase()}. Revisa su entrega.` : m.ahora,
        punto,
      });
    }
    for (const n of p.pendientesCliente ?? [])
      avisos.push({ clave: `${p.pedido.id}:cliente:${n.fecha}`, href: `/estudio/${p.pedido.id}?ver=cliente#conversacion`, titulo: p.pedido.cliente, detalle: `Escribió en su portal: «${n.texto.slice(0, 90)}»`, punto });
  }
  if (solicitudes)
    avisos.push({ clave: `solicitudes:${solicitudes}`, href: "/estudio#te-toca", titulo: solicitudes === 1 ? "Un pedido nuevo desde la web" : `${solicitudes} pedidos nuevos desde la web`, detalle: "Atlas puede armar el plan con un toque.", punto: "#ff5a1f" });
  return { avisos, solicitudes, vivos };
}
