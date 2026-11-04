// Calibración del juez en línea (sistema/55): pasos cortos encadenados, como las vueltas de trabajo.
// Cada paso califica referencias hasta su plazo, guarda el avance en _agencia y pide el siguiente.
import { calibracionEnCurso, calibracionViva, pasoCalibracion } from "@anonymo/pipeline";
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

/** Un paso. Si otro paso está vivo, no hace nada (nunca dos calificando lo mismo). */
export async function trabajarCalibracion(origen: string, forzar = false) {
  const plazo = Date.now() + PLAZO_MS;
  const sigue = await conNube(["_agencia"], async () => {
    const c = calibracionEnCurso();
    if (!c) return false;
    if (!forzar && calibracionViva(c) && Date.now() - Date.parse(c.pulso) > 5_000) { console.log("[calibrar] otro paso sigue vivo"); return false; }
    const r = await pasoCalibracion({ plazo });
    console.log(`[calibrar] ${r.hechas}/${r.total}${r.terminado ? " · terminada" : ""}`);
    return !r.terminado;
  });
  if (sigue) await lanzarCalibracion(origen);
}
