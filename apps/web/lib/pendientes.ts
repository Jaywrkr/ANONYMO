// Lo que espera a Jay o Luna (sistema/35, /36): lo usan la campana, el contador de la barra y los avisos del navegador.
import { listarMeses, listarSolicitudes, nombreMes, nubeActiva, responsable, solicitudesEnNube, contratoPorId, type Proyecto, type TareaId } from "@anonymo/pipeline";
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
        clave: `${p.pedido.id}:${p.estado}:${t ?? p.faseActual}:${p.revision?.fecha ?? p.error?.fecha ?? ""}:${m.tono}:${m.parado ? (m.parado >= 14 ? "p14" : m.parado >= 7 ? "p7" : "p3") : ""}:${p.direcciones?.esperando ? p.direcciones.opciones.map((d) => d.nombre).join("") : ""}`,
        href: p.direcciones?.esperando ? `/estudio/${p.pedido.id}/direcciones` : t && p.estado === "esperando" ? `/estudio/${p.pedido.id}/${t.replace(".", "-")}` : `/estudio/${p.pedido.id}`,
        titulo: p.pedido.cliente,
        detalle: !p.direcciones?.esperando && t && p.estado === "esperando" ? `${m.parado ? `Lleva ${m.parado} días esperando. ` : ""}${agentePorId(t.split(".")[1])?.nombre} entregó ${contratoPorId(t as TareaId)?.entrega.toLowerCase()}. Revisa su entrega.` : m.ahora,
        punto,
      });
    }
    for (const n of p.pendientesCliente ?? [])
      avisos.push({ clave: `${p.pedido.id}:cliente:${n.fecha}`, href: `/estudio/${p.pedido.id}?ver=cliente#conversacion`, titulo: p.pedido.cliente, detalle: `Escribió en su portal: «${n.texto.slice(0, 90)}»`, punto });
  }
  // El mes de contenido le toca a quien lo revisa (sistema/117): las redes, a Luna salvo que digan otra cosa.
  try {
    for (const m of await listarMeses()) {
      if ((m.responsable ?? "luna") !== yo) continue;
      const por = m.piezas.filter((x) => x.estado === "propuesta").length;
      if (!por) continue;
      avisos.push({ clave: `mes:${m.id}:${por}`, href: `/estudio/contenido/${m.id}`, titulo: `${m.nombre} · ${nombreMes(m.mes)}`, detalle: `${por} ${por === 1 ? "publicación" : "publicaciones"} por revisar. Faro armó el mes.`, punto: "#8A3DFF" });
    }
  } catch {}
  if (solicitudes)
    avisos.push({ clave: `solicitudes:${solicitudes}`, href: "/estudio#te-toca", titulo: solicitudes === 1 ? "Un pedido nuevo desde la web" : `${solicitudes} pedidos nuevos desde la web`, detalle: "Atlas puede armar el plan con un toque.", punto: "#ff5a1f" });
  return { avisos, solicitudes, vivos };
}
