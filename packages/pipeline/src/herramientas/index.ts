// Corre las herramientas que pide el contrato antes de que el agente escriba. Funcionan igual en simulado y en real.
import { contratoPorId } from "../contratos.ts";
import type { Entrega, Pedido, ResultadoHerramienta, TareaId } from "../tipos.ts";
import { leerEntrega, leerProyecto } from "../almacen.ts";
import { estadoEntrega } from "../calidad.ts";
import { resumenAuditoria } from "./auditar.ts";
import { chequear, resumenChequeo } from "./dominios.ts";

export interface EntradaHerramientas {
  pedido: Pedido;
  tarea: TareaId;
  lecturas: Entrega[];
  /** El motor real (o quien escribe a mano) busca en la web por su cuenta. */
  motorReal: boolean;
}

export async function prepararHerramientas({ pedido, tarea, lecturas, motorReal }: EntradaHerramientas): Promise<ResultadoHerramienta[]> {
  const c = contratoPorId(tarea);
  const out: ResultadoHerramienta[] = [];
  for (const h of c?.herramientas ?? []) {
    try {
      if (h === "web") {
        out.push(
          motorReal
            ? { herramienta: h, ok: true, resumen: "Búsqueda web: el agente busca y cita sus fuentes en la entrega." }
            : { herramienta: h, ok: false, resumen: "Búsqueda web: se activa con la clave de Anthropic.", falta: "La clave de Anthropic para buscar en la web." },
        );
      } else if (h === "dominios" || h === "redes") {
        if (out.some((x) => x.herramienta === "dominios" || x.herramienta === "redes")) continue; // un solo chequeo para ambas
        const verba = lecturas.find((e) => e.tarea === "2.verba");
        const finalistas = Array.isArray(verba?.datos?.finalistas) ? (verba!.datos!.finalistas as string[]) : [];
        const nombres = finalistas.length ? finalistas : [pedido.cliente];
        const chequeo = await chequear(nombres);
        const pendientes = chequeo.flatMap((x) => x.dominios).filter((d) => d.estado === "verificar" && !d.dominio.endsWith(".ec")).length;
        out.push({
          herramienta: "dominios",
          ok: pendientes === 0,
          falta: pendientes ? `Revisar a mano ${pendientes} dominios (sin respuesta de RDAP).` : undefined,
          resumen: (finalistas.length ? "" : "Sin finalistas de Verba: reviso el nombre del cliente.\n\n") + resumenChequeo(chequeo),
          datos: chequeo,
        });
      } else if (h === "lighthouse") {
        const p = leerProyecto(pedido.id);
        const e = leerEntrega(pedido.id,"4.vector");
        const a = e?.calidad?.auditoria;
        if (!e || !a || !["verificado","aprobado"].includes(estadoEntrega(p,e))) {
          out.push({herramienta:h,ok:false,resumen:"La versión generada todavía no tiene una auditoría vigente. No se audita la web anterior del cliente.",falta:"Verificar la versión actual de la web."});
          continue;
        }
        out.push({herramienta:h,ok:true,resumen:resumenAuditoria(a),datos:a});
      } else if (h === "imagen") {
        out.push({ herramienta: h, ok: false, resumen: "Imágenes: por ahora el agente describe y arma referencias; la generación queda pendiente.", falta: "Bocetos a mano o generación de imágenes (pendiente)." });
      }
    } catch (e) {
      out.push({ herramienta: h, ok: false, resumen: `${h} falló: ${(e as Error).message.slice(0, 200)}`, falta: `Revisar por qué falló ${h}.` });
    }
  }
  return out;
}
