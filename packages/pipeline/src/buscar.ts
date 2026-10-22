// Buscar en todas las entregas de todos los proyectos ("¿qué paleta usamos con X?").
import { leerEntrega, listar } from "./almacen.ts";
import type { TareaId } from "./tipos.ts";

const normal = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export interface Hallazgo { proyecto: string; cliente: string; tarea: TareaId; titulo: string; agente: string; fragmento: string; puntaje: number }

/** Todas las palabras deben aparecer. Sin tildes ni mayúsculas. Ordena por cantidad de coincidencias. */
export function buscar(consulta: string, limite = 30): Hallazgo[] {
  const palabras = normal(consulta).split(/\s+/).filter((w) => w.length > 1);
  if (!palabras.length) return [];
  const out: Hallazgo[] = [];
  for (const p of listar()) {
    for (const t of p.plan.tareas) {
      const e = leerEntrega(p.pedido.id, t);
      if (!e) continue;
      const texto = `${e.titulo}\n${e.dice}\n${e.contenido}`;
      const n = normal(texto);
      if (!palabras.every((w) => n.includes(w))) continue;
      const puntaje = palabras.reduce((s, w) => s + n.split(w).length - 1, 0) + (normal(e.titulo).includes(palabras[0]) ? 5 : 0);
      // Fragmento: la línea donde aparece la primera palabra.
      const linea = texto.split("\n").find((l) => normal(l).includes(palabras[0])) ?? e.dice;
      out.push({ proyecto: p.pedido.id, cliente: p.pedido.cliente, tarea: t, titulo: e.titulo, agente: e.agente, fragmento: linea.replace(/[#>*|`]/g, "").trim().slice(0, 220), puntaje });
    }
  }
  return out.sort((a, b) => b.puntaje - a.puntaje).slice(0, limite);
}
