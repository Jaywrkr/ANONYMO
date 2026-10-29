// Lo que ve el cliente y lo que es solo del equipo (sistema/37).
// Hay entregas enteras internas (contrato «interna»: presupuesto con horas, investigación, jurado, calendario y riesgos,
// el código de la web) y, dentro de las demás, secciones internas que se quitan solas: riesgos, dudas, márgenes y
// todo lo que el agente pone bajo «## Para el equipo».
import { contratoPorId } from "./contratos.ts";
import type { TareaId } from "./tipos.ts";

/** Títulos de sección que nunca van al cliente. */
const INTERNAS = /^(para el equipo|notas? (para|del|internas?)|riesgos?|lo que falta saber|dudas|preguntas abiertas|horas|m[aá]rgen|costo interno|precio interno|datos de herramientas|siguiente paso|qu[eé] necesito|necesita)\b/i;

export const esInterna = (t: string) => !!contratoPorId(t as TareaId)?.interna;

/** La versión para el cliente de una entrega en markdown: sin secciones internas ni notas al equipo. */
export function versionCliente(md: string): string {
  const lineas = md.split("\n");
  const fuera: string[] = [];
  let saltando = 0; // nivel del título que se está saltando (0 = no)
  for (const l of lineas) {
    const h = l.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const nivel = h[1].length;
      if (saltando && nivel > saltando) continue;
      saltando = INTERNAS.test(h[2].replace(/[*_`]/g, "").trim()) ? nivel : 0;
      if (saltando) continue;
    } else if (saltando) continue;
    // Avisos del sistema y del modo de prueba: no son para el cliente.
    if (/^>\s*(⚠️|Modo simulado|Simulated mode|Revisado tras el cambio)/.test(l)) continue;
    fuera.push(l);
  }
  return fuera.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
