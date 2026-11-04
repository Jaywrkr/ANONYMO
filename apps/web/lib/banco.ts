// Calibración del juez en línea (sistema/55): pasos cortos encadenados, como las vueltas de trabajo.
// Cada paso califica referencias hasta su plazo, guarda el avance en _agencia y pide el siguiente.
import { nubeActiva, pasoCalibracion, subirRuta } from "@anonymo/pipeline";
import { conNube } from "@/lib/nube";
import { firmaTrabajo, origenActual } from "@/lib/trabajo";

const PLAZO_MS = 235_000;
export const FIRMA_CALIBRAR = "_calibrar";

export async function lanzarCalibracion(origen?: string) {
  const base = origen ?? (await origenActual());
  for (let intento = 1; intento <= 2; intento++) {
    try {
      const r = await fetch(`${base}/trabajo/calibrar`, { method: "POST", headers: { "x-anonymo-trabajo": firmaTrabajo(FIRMA_CALIBRAR) }, signal: AbortSignal.timeout(15_000), cache: "no-store" });
      if (r.ok) return;
      console.error(`[calibrar] lanzar: respuesta ${r.status} (intento ${intento})`);
    } catch (e) { console.error(`[calibrar] lanzar: ${(e as Error).message} (intento ${intento})`); }
  }
}

/** Un paso. Si otro paso está trabajando (candado en en-curso.json), no hace nada: nunca dos calificando lo mismo. */
export async function trabajarCalibracion(origen: string) {
  const plazo = Date.now() + PLAZO_MS;
  const sigue = await conNube(["_agencia"], async () => {
    // Cada tanda sube el avance: la página muestra «12 de 54» en vivo y el candado lo ven los demás pasos.
    const r = await pasoCalibracion({ plazo, alAvanzar: async () => { if (nubeActiva()) await subirRuta("_agencia/calibracion/en-curso.json"); } });
    console.log(`[calibrar] ${r.hechas}/${r.total}${r.terminado ? " · terminada" : ""}${r.ocupado ? " · otro paso sigue trabajando" : ""}`);
    return !r.terminado && !r.ocupado;
  });
  if (sigue) await lanzarCalibracion(origen);
}
