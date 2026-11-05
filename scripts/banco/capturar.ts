// Captura las referencias del banco a 1440 y 390 px, los logos y las piezas de redes, SOLO para medir al juez.
// Es lo mismo que el botón «Sacar capturas» del estudio (sistema/61), en una sola corrida y desde tu máquina.
// Las imágenes van a _banco/capturas en el almacén privado (Supabase) y nunca al repo (proyectos/ está ignorado).
// Uso: node --experimental-strip-types scripts/banco/capturar.ts [--disciplina web] [--id web-x] [--faltan] [--solo-arquetipos] [--sin-nube]
import "../../packages/pipeline/src/env.ts";
import { chromium } from "playwright";
import { capturables, capturarReferencia, motivoCaptura } from "../../packages/pipeline/src/capturas-banco.ts";
import { leerCapturas } from "../../packages/pipeline/src/banco.ts";
import { bajarProyecto, nubeConfigurada, subirRuta } from "../../packages/pipeline/src/nube.ts";

const arg = (k: string) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : undefined; };
const tiene = (k: string) => process.argv.includes(`--${k}`);
const nube = nubeConfigurada() && !tiene("sin-nube");
if (nube) await bajarProyecto("_agencia", fetch, false).catch(() => 0);

const ya = leerCapturas();
let refs = capturables();
if (arg("disciplina")) refs = refs.filter((r) => r.disciplina === arg("disciplina"));
if (arg("id")) refs = refs.filter((r) => r.id === arg("id"));
if (tiene("faltan")) refs = refs.filter((r) => !ya[r.id]?.length);
if (tiene("solo-arquetipos")) refs = refs.filter((r) => r.plantilla);

const nav = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
let bien = 0, mal = 0;
for (const r of refs) {
  try {
    const archivos = await capturarReferencia(nav, r);
    if (nube) for (const a of archivos) await subirRuta(`_banco/capturas/${a}`);
    bien++; console.log("✓", r.id);
  } catch (e) { mal++; console.log("✗", r.id, motivoCaptura(e)); }
}
await nav.close();
if (nube) await subirRuta("_agencia/banco-capturas.json");
console.log(`Listo: ${bien} capturadas, ${mal} con error${nube ? " · subidas al almacén privado" : " · solo en disco (sin nube)"}.`);
