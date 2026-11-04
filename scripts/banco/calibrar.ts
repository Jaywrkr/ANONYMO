// Calibra al juez contra el banco (sistema/55), desde la terminal. Necesita ANTHROPIC_API_KEY.
// Con SUPABASE_* en .env.local usa las capturas privadas y deja el informe en el almacén (lo ve el estudio).
// Uso: node --experimental-strip-types scripts/banco/calibrar.ts [--disciplina web] [--repetir 8] [--rondas 3] [--informe docs/calibracion.md]
import "../../packages/pipeline/src/env.ts";
import { appendFileSync, existsSync, writeFileSync } from "node:fs";
import { calibracionEnCurso, iniciarCalibracion, informeMarkdown, pasoCalibracion, type DisciplinaBanco } from "../../packages/pipeline/src/banco.ts";
import { claveAnthropic } from "../../packages/pipeline/src/ia.ts";
import { bajarProyecto, huellaProyecto, nubeConfigurada, subirDistintos } from "../../packages/pipeline/src/nube.ts";

const arg = (k: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : undefined; };
if (!claveAnthropic()) { console.error("Falta ANTHROPIC_API_KEY: la calibración necesita al juez de verdad."); process.exit(1); }
const nube = nubeConfigurada() && !process.argv.includes("--sin-nube");
if (nube) await bajarProyecto("_agencia", fetch, true).catch(() => 0);
const antes = nube ? huellaProyecto("_agencia") : undefined;

if (!calibracionEnCurso() || process.argv.includes("--de-nuevo")) {
  const d = arg("disciplina") as DisciplinaBanco | undefined;
  const c = iniciarCalibracion({ disciplinas: d ? [d] : undefined, repetir: arg("repetir") ? Number(arg("repetir")) : undefined, maxRondas: arg("rondas") ? Number(arg("rondas")) : undefined, quien: "jay" });
  console.log(`Calibración ${c.id}: ${c.pendientes.length} calificaciones en la ronda 1.`);
}
const salida = arg("informe");
if (salida && !existsSync(salida)) writeFileSync(salida, "# Calibración del juez\n\n## Informes\n");
for (;;) {
  const r = await pasoCalibracion({ plazo: Date.now() + 10 * 60_000 });
  console.log(`… ${r.hechas}/${r.total}`);
  if (r.informe) {
    const md = informeMarkdown(r.informe);
    console.log("\n" + md + "\n");
    if (salida) appendFileSync(salida, "\n" + md + "\n");
  }
  if (r.terminado) break;
}
if (nube && antes) { await subirDistintos("_agencia", antes, false); console.log("Informe guardado en el almacén privado: el estudio ya lo muestra."); }
