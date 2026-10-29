// Proyectos de prueba para recorrer el estudio (sin IA). Se corre con ANONYMO_PROYECTOS apuntando a una carpeta temporal.
import { readFileSync } from "node:fs";
const pl: any = await import("../../packages/pipeline/src/index.ts");
const base = (id: string, cliente: string, tipo: string, descripcion?: string) => ({ id, cliente, tipo, descripcion: descripcion ?? `${cliente} quiere algo memorable. Le gusta lo sobrio y elegante, en español e inglés.`, creado: new Date().toISOString() });
const img = readFileSync(new URL("./imagen.png", import.meta.url));

// Web con entregas y comentarios.
const a = base("clinica-sonrisa", "Clínica Sonrisa", "web");
pl.crear(a, pl.planificar(a, { tareas: ["1.atlas", "1.ledger", "1.sonda", "4.orla", "4.vector", "4.kine", "6.trofeo"], preguntas: ["¿Tienen fotos propias del consultorio?", "¿Para cuándo lo necesitan?"] }));
await pl.avanzar("clinica-sonrisa", pl.simulado, () => {});
pl.anotar("clinica-sonrisa", "Que se sienta cercano, nada de clínica fría.", "luna", ["orla"]);
await pl.comentarioPortal("clinica-sonrisa", "¿Se puede poner un botón de WhatsApp grande?");
pl.tokenPortal("clinica-sonrisa");
pl.guardarArchivo("clinica-sonrisa", "logo-actual.png", img, "Logo actual del consultorio");

// Marca esperando «Que empiecen» (la usa e2e-paso.mjs con la IA lenta).
const b = base("cafe-lento", "Café Lento", "marca");
pl.crear(b, pl.planificar(b, { tareas: ["1.ledger", "3.mira", "3.rhea", "2.verba"], preguntas: ["¿Tienen nombre para la carta?"] }), "plan");

// Web trabada a mitad de camino (para ver «se detuvo»).
const c = base("hotel-cuenca", "Hotel Cuenca", "web");
pl.crear(c, pl.planificar(c, { tareas: ["1.ledger", "4.orla", "4.vector", "4.lumen", "5.lente", "5.faro"] }));
const p = pl.leerProyecto("hotel-cuenca");
p.tareas["1.ledger"] = "lista"; p.tareas["4.orla"] = "en-curso"; p.faseActual = 4; pl.guardarProyecto(p);

// Web con direcciones y sitio (la usa e2e-auto-web.mjs).
const d = base("dental-norte", "Dental Norte", "web", "Clínica dental en Cuenca. Quieren una web cálida y profesional, bilingüe, para pacientes de 30 a 60 años.");
pl.crear(d, pl.planificar(d, { tareas: ["1.atlas", "1.ledger", "4.orla", "4.vector", "4.kine"], preguntas: ["¿Tienen fotos propias?"] }), "plan");
pl.tokenPortal("dental-norte");
pl.guardarArchivo("dental-norte", "consultorio.png", img, "Foto del consultorio");

await pl.guardarSolicitud({ tipo: "web", nombre: "Panadería Norte", correo: "hola@panaderianorte.ec", mensaje: "Queremos una web sencilla con pedidos por WhatsApp.", origen: "web" }).catch(() => {});
console.log("semilla lista");
