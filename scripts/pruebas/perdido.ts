// Simula «Que empiecen» cuyo arranque se perdió: el proyecto queda en curso y nadie lo trabaja.
const pl = await import("../../packages/pipeline/src/index.ts");
const id = "gabriela-abril";
await pl.bajarProyecto(id, fetch, true);
const p = pl.leerProyecto(id); p.modo = "paso"; p.prueba = true; pl.guardarProyecto(p);
await pl.empezar(id, "jay", pl.elegirMotor({ simulado: true }), undefined, { max: 0 });
console.log(pl.leerProyecto(id).estado, await pl.espejarProyecto(id));
