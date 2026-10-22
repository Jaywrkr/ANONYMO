// Las preguntas de Atlas como cuestionario: lo que responde el cliente entra al pedido y deja de preguntarse.
import { bitacora, guardarProyecto, leerProyecto } from "./almacen.ts";

export function responder(id: string, respuestas: Record<string, string>, quien: "jay" | "luna" | "cliente") {
  const p = leerProyecto(id);
  const fecha = new Date().toISOString();
  const nuevas = Object.entries(respuestas)
    .map(([pregunta, respuesta]) => ({ pregunta, respuesta: respuesta.trim().slice(0, 2000), fecha, quien }))
    .filter((r) => r.respuesta && p.plan.preguntas.includes(r.pregunta));
  if (!nuevas.length) throw new Error("No hay respuestas nuevas.");
  p.pedido.contexto = { ...p.pedido.contexto, respuestas: [...(p.pedido.contexto?.respuestas ?? []), ...nuevas] };
  p.plan.preguntas = p.plan.preguntas.filter((q) => !nuevas.some((r) => r.pregunta === q));
  guardarProyecto(p);
  bitacora(id, `${quien === "cliente" ? "El cliente" : quien === "luna" ? "Luna" : "Jay"} respondió ${nuevas.length} pregunta(s) de Atlas.`);
  return nuevas;
}
