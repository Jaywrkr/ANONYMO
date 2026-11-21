// Hablarle a Atlas sobre un proyecto (sistema/97): lo usan el chat del proyecto y la caja única.
// Consultar es solo lectura. Un cambio (encargo) se interpreta, se aplica, queda en la memoria y, si el proyecto
// está en curso y nadie trabaja, se pone en marcha. Todo queda en la conversación del proyecto.
import { aplicarEncargo, consultarAtlas, interpretarEncargo, leerProyecto, recordarEncargo, type MensajeAtlas } from "@anonymo/pipeline";
import { conNube } from "@/lib/nube";
import { lanzar, trabajandoAhora } from "@/lib/trabajo";

type Quien = MensajeAtlas["quien"];

export function consultarProyecto(id: string, pregunta: string, quien: Quien, agente: string, solicitud: string) {
  return conNube([id], () => consultarAtlas(id, pregunta, quien, agente, solicitud));
}

export async function encargarProyecto(id: string, pedido: string, quien: Quien, agente: string, solicitud: string, origen: string) {
  await conNube([id], () => interpretarEncargo(id, pedido, agente, quien, solicitud));
  const resultado = await conNube([id], async () => {
    const e = await aplicarEncargo(id, solicitud);
    return recordarEncargo(id, { solicitud: e.id, pregunta: pedido, agente, quien, resultado: e.resultado ?? "El encargo queda guardado." });
  });
  const estado = await conNube([id], () => leerProyecto(id).estado);
  if (estado === "en-curso" && !(await trabajandoAhora(id))) await lanzar(id, origen);
  return resultado;
}
