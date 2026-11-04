// Proyecto de naming listo para trabajar en la nube falsa, sin que nadie lo arranque: la página lo arranca sola.
// Sirve para comprobar que el agente recibe el oficio y el criterio de la casa (sistema/54).
const pl: any = await import("../../packages/pipeline/src/index.ts");
const ped = { id: "oficio-cafe", cliente: "Café Norte", tipo: "marca", descripcion: "Una cafetería de barrio en Cuenca que necesita nombre.", creado: new Date().toISOString() };
pl.crear(ped, pl.planificar(ped, { tareas: ["2.verba"], preguntas: [] }), "plan");
const p = pl.leerProyecto(ped.id); p.modo = "paso"; p.estado = "en-curso"; pl.guardarProyecto(p);
console.log(pl.leerProyecto(ped.id).estado, await pl.espejarProyecto(ped.id));
