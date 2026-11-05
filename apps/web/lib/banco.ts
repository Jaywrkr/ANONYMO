// Calibración del juez en línea (sistema/55): pasos cortos encadenados, como las vueltas de trabajo.
// Cada paso califica referencias hasta su plazo, guarda el avance en _agencia y pide el siguiente.
import { navegadorCapturas, nubeActiva, pasoCalibracion, pasoCapturas, subirRuta } from "@anonymo/pipeline";
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

// ——— Capturas del banco desde el estudio (sistema/61): mismos pasos encadenados, candado y relevo ———
export const FIRMA_CAPTURAS = "_capturas";
export async function lanzarCapturas(origen?: string, despuesDe?: string) {
  const base = origen ?? (await origenActual());
  for (let intento = 1; intento <= 2; intento++) {
    try {
      const r = await fetch(`${base}/trabajo/capturas`, { method: "POST", headers: { "x-anonymo-trabajo": firmaTrabajo(FIRMA_CAPTURAS), ...(despuesDe ? { "x-anonymo-despues": despuesDe } : {}) }, signal: AbortSignal.timeout(15_000), cache: "no-store" });
      if (r.ok) return;
      console.error(`[capturas] lanzar: respuesta ${r.status} (intento ${intento})`);
    } catch (e) { console.error(`[capturas] lanzar: ${(e as Error).message} (intento ${intento})`); }
  }
}
export async function trabajarCapturas(origen: string, despuesDe?: string) {
  const plazo = Date.now() + PLAZO_MS;
  for (let intento = 1; intento <= 8; intento++) {
    const r = await conNube(["_agencia"], async () => {
      // Cada captura se sube apenas se saca (imagen, índice de capturas y avance): si el paso se corta, no se pierde.
      const subir = async (archivos: string[]) => {
        if (!nubeActiva()) return;
        for (const a of archivos) await subirRuta(`_banco/capturas/${a}`);
        if (archivos.length) await subirRuta("_agencia/banco-capturas.json");
        await subirRuta("_agencia/capturas/en-curso.json").catch(() => {});
      };
      const r = await pasoCapturas({ plazo, despuesDe, navegador: navegadorCapturas, alGuardar: subir, timeoutMs: Number(process.env.ANONYMO_CAPTURA_TIMEOUT_MS) || undefined, esperaMs: process.env.ANONYMO_CAPTURA_TIMEOUT_MS ? 300 : undefined });
      console.log(`[capturas] ${r.hechas}/${r.total}${r.terminado ? " · terminadas" : ""}${r.ocupado ? " · otro paso sigue trabajando" : ""}${r.viejo ? ` · copia vieja (intento ${intento})` : ""}`);
      return r;
    });
    if (r.viejo) { await new Promise((x) => setTimeout(x, 5_000)); continue; }
    if (!r.terminado && !r.ocupado) await lanzarCapturas(origen, r.paso);
    return;
  }
  console.error("[capturas] el estado no se actualizó a tiempo: se puede seguir con «Seguir sacando capturas»");
}
