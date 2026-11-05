// Calibración del juez en línea (sistema/55): pasos cortos encadenados, como las vueltas de trabajo.
// Cada paso califica referencias hasta su plazo, guarda el avance en _agencia y pide el siguiente.
import { nubeActiva, pasoCalibracion, subirRuta } from "@anonymo/pipeline";
import { conNube } from "@/lib/nube";
import { firmaTrabajo, origenActual } from "@/lib/trabajo";

const PLAZO_MS = 235_000;
export const FIRMA_CALIBRAR = "_calibrar";

/** Pide el siguiente paso. `despuesDe`: qué paso dejó el estado vigente (el siguiente lo exige, sistema/59). */
export async function lanzarCalibracion(origen?: string, despuesDe?: string) {
  const base = origen ?? (await origenActual());
  for (let intento = 1; intento <= 2; intento++) {
    try {
      const r = await fetch(`${base}/trabajo/calibrar`, { method: "POST", headers: { "x-anonymo-trabajo": firmaTrabajo(FIRMA_CALIBRAR), ...(despuesDe ? { "x-anonymo-despues": despuesDe } : {}) }, signal: AbortSignal.timeout(15_000), cache: "no-store" });
      if (r.ok) return;
      console.error(`[calibrar] lanzar: respuesta ${r.status} (intento ${intento})`);
    } catch (e) { console.error(`[calibrar] lanzar: ${(e as Error).message} (intento ${intento})`); }
  }
}

/**
 * Un paso. Si otro paso está trabajando (candado en en-curso.json), no hace nada: nunca dos calificando lo mismo.
 * Si bajó una copia más vieja que la que dejó el paso anterior, espera y vuelve a bajar (hasta ~40 s).
 */
export async function trabajarCalibracion(origen: string, despuesDe?: string) {
  const plazo = Date.now() + PLAZO_MS;
  for (let intento = 1; intento <= 8; intento++) {
    const r = await conNube(["_agencia"], async () => {
      // Cada tanda sube el avance: la página muestra «12 de 54» en vivo y el candado lo ven los demás pasos.
      const r = await pasoCalibracion({ plazo, despuesDe, alAvanzar: async () => { if (nubeActiva()) await subirRuta("_agencia/calibracion/en-curso.json"); } });
      console.log(`[calibrar] ${r.hechas}/${r.total}${r.terminado ? " · terminada" : ""}${r.ocupado ? " · otro paso sigue trabajando" : ""}${r.viejo ? ` · copia vieja (intento ${intento})` : ""}`);
      return r;
    });
    if (r.viejo) { await new Promise((x) => setTimeout(x, 5_000)); continue; }
    if (!r.terminado && !r.ocupado) await lanzarCalibracion(origen, r.paso);
    return;
  }
  console.error("[calibrar] el estado no se actualizó a tiempo: se puede seguir con «Seguir calibrando»");
}
