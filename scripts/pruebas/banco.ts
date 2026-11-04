// Prepara la prueba del banco de calibración (sistema/55) en la nube falsa: capturas de arquetipos (privadas, solo en
// la nube) y un proyecto de naming con una entrega real para compararla a ciegas. Antes: nube.sh. Con las variables de nube.
import { execFileSync } from "node:child_process";
const pl: any = await import("../../packages/pipeline/src/index.ts");
execFileSync(process.execPath, ["--experimental-strip-types", "scripts/banco/capturar.ts", "--solo-arquetipos", "--disciplina", "web"], { stdio: "inherit", env: process.env });
const ped = { id: "banco-pan", cliente: "Pan Norte", tipo: "marca", descripcion: "Una panadería de barrio en Cuenca que necesita nombre.", creado: new Date().toISOString() };
pl.crear(ped, pl.planificar(ped, { tareas: ["2.verba"], preguntas: [] }), "plan");
const p = pl.leerProyecto(ped.id); p.estado = "esperando"; pl.guardarProyecto(p);
pl.guardarEntrega(ped.id, { tarea: "2.verba", agente: "verba", titulo: "Lista de nombres", contenido: "## Finalistas\n- Miga: la parte suave del pan.\n- Horno Norte", dice: "Listo.", necesita: "—", estado: "lista", modo: "real", version: 1, creado: new Date().toISOString() });
console.log(await pl.espejarProyecto(ped.id));
