// Corre un proyecto hasta la siguiente pausa y maneja las decisiones de Jay y Luna.
import { agentePorId, FASES } from "@anonymo/agentes";
import { bitacora, crear, guardarEntrega, guardarProyecto, leerEntrega, leerProyecto } from "./almacen.ts";
import { leerPausas, planificar, resolverPausas } from "./atlas.ts";
import { contratoPorId, lecturas } from "./contratos.ts";
import { evaluar, RONDAS_MAX } from "./jurado.ts";
import { prepararHerramientas } from "./herramientas/index.ts";
import { elegirMotor, type Motor } from "./motor.ts";
import { type Entrega, type Pedido, type Proyecto, type Puerta, type TareaId } from "./tipos.ts";

export type Aviso = (texto: string) => void;
const nombreFase = (n: number) => FASES.find((f) => f.n === n)?.nombre ?? `Fase ${n}`;
const faseDe = (t: TareaId) => Number(t.split(".")[0]);
const quienNombre = (q: Puerta["quien"]) => ({ jay: "Jay", luna: "Luna", auto: "Atlas", cliente: "El cliente" })[q];
const ultimaPuerta = (p: Proyecto, fase: number) => [...p.puertas].reverse().find((x) => x.fase === fase);

export async function nuevo(pedido: Pedido, motor: Motor = elegirMotor(), aviso: Aviso = console.log) {
  const plan = planificar(pedido);
  const p = crear(pedido, plan);
  bitacora(pedido.id, `Pedido de ${pedido.cliente} (${pedido.tipo}). Atlas planificó fases ${plan.fases.join(", ")}; pausas en ${plan.pausas.join(", ") || "ninguna"}.`);
  return avanzar(p.pedido.id, motor, aviso);
}

/** Ejecuta tareas pendientes en orden. Se detiene al cerrar una fase con pausa. */
export async function avanzar(id: string, motor: Motor = elegirMotor(), aviso: Aviso = console.log): Promise<Proyecto> {
  const p = leerProyecto(id);
  if (p.estado === "parado") throw new Error("El proyecto está parado.");
  if (p.estado === "esperando") return p;
  p.estado = "en-curso";

  const { tareas } = p.plan;
  for (let i = 0; i < tareas.length; i++) {
    const t = tareas[i];
    const fase = faseDe(t);
    p.faseActual = fase;

    if (p.tareas[t] !== "lista") {
      const c = contratoPorId(t)!;
      const rehace = p.tareas[t] === "rehacer";
      p.tareas[t] = "en-curso";
      guardarProyecto(p);
      const previa = leerEntrega(id, t);
      const version = (previa?.version ?? 0) + 1;
      const leidas = lecturas(t, tareas).map((u) => leerEntrega(id, u)).filter((e): e is Entrega => !!e);
      const cambio = rehace ? p.cambios[fase] : undefined;
      const herramientas = await prepararHerramientas({ pedido: p.pedido, tarea: t, lecturas: leidas, motorReal: motor.nombre !== "simulado" });
      for (const h of herramientas) bitacora(id, `${h.herramienta}: ${h.ok ? "ok" : "pendiente"}.`);
      const r = await motor.trabajar({ pedido: p.pedido, tarea: t, lecturas: leidas, cambio, version, preguntas: p.plan.preguntas, herramientas, cliente: (p.notasCliente ?? []).map((n) => n.texto) });
      guardarEntrega(id, { tarea: t, agente: c.agente, titulo: c.entrega, estado: "lista", version, creado: new Date().toISOString(), ...r });
      p.tareas[t] = "lista";
      guardarProyecto(p);
      bitacora(id, `${agentePorId(c.agente)?.nombre} entregó ${c.entrega} v${version} (${r.modo}).`);
      aviso(`  ✓ ${agentePorId(c.agente)?.nombre?.padEnd(7)} ${c.entrega} v${version}`);
    }

    // ¿Se cerró la fase?
    const cierra = i === tareas.length - 1 || faseDe(tareas[i + 1]) !== fase;
    if (!cierra) continue;
    const ultima = ultimaPuerta(p, fase);
    if (ultima?.decision === "sigue") continue;
    if (p.plan.pausas.includes(fase)) {
      p.estado = "esperando";
      guardarProyecto(p);
      bitacora(id, `Pausa al cerrar ${nombreFase(fase)}.`);
      return p;
    }
    puerta(p, { fase, decision: "sigue", quien: "auto" });
    delete p.cambios[fase];
    guardarProyecto(p);
  }

  // 5.5 Calidad: si el Jurado no llega al mínimo, se rehace lo más débil.
  const ronda = (p.rondasJurado ?? 0) + 1;
  const v = evaluar(p.plan, leerEntrega(id, "6.trofeo"), leerEntrega(id, "6.prisma"), ronda);
  if (v && !v.aprobado && !p.juradoAceptado) {
    const conTrabajo = v.rehacer.some((t) => !t.startsWith("6."));
    if (conTrabajo && ronda <= RONDAS_MAX) {
      p.rondasJurado = ronda;
      for (const t of v.rehacer) p.tareas[t] = "rehacer";
      for (const f of new Set(v.rehacer.map(faseDe))) p.cambios[f] = v.cambio;
      guardarProyecto(p);
      bitacora(id, `${v.cambio} Rehacen: ${v.rehacer.join(", ")}.`);
      aviso(`\n  ↺ ${v.cambio}\n    Rehacen: ${v.rehacer.map((t) => agentePorId(t.split(".")[1])?.nombre).join(", ")}\n`);
      return avanzar(id, motor, aviso);
    }
    p.estado = "esperando";
    p.esperaJurado = true;
    p.faseActual = 6;
    guardarProyecto(p);
    bitacora(id, `${v.cambio} ${conTrabajo ? `Sin mejora suficiente tras ${RONDAS_MAX} rondas` : "No hay tareas que rehacer en este plan"}: decide Jay o Luna.`);
    return p;
  }

  p.estado = "listo";
  p.esperaJurado = false;
  p.cambios = {};
  guardarProyecto(p);
  if (v) bitacora(id, `Jurado: ${v.nota.final}${v.aprobado ? "" : " (aceptado por Jay o Luna)"}.`);
  bitacora(id, "Proyecto listo.");
  return p;
}

function puerta(p: Proyecto, x: Omit<Puerta, "fecha">) {
  p.puertas.push({ ...x, fecha: new Date().toISOString() });
}

function esperando(id: string) {
  const p = leerProyecto(id);
  if (p.estado !== "esperando") throw new Error(`"${id}" no está esperando una decisión (estado: ${p.estado}).`);
  return p;
}

export async function aprobar(id: string, quien: Puerta["quien"], nota?: string, motor?: Motor, aviso?: Aviso) {
  const p = esperando(id);
  if (p.esperaJurado) {
    p.juradoAceptado = true;
    p.esperaJurado = false;
  }
  puerta(p, { fase: p.faseActual, decision: "sigue", quien, nota });
  delete p.cambios[p.faseActual];
  p.estado = "en-curso";
  guardarProyecto(p);
  bitacora(id, `${quienNombre(quien)} aprobó ${nombreFase(p.faseActual)}${nota ? `: ${nota}` : ""}.`);
  return avanzar(id, motor, aviso);
}

/** Rehace la fase actual (o solo un agente) con la nota. Vuelve a pausar al terminar. */
export async function cambiar(id: string, quien: Puerta["quien"], nota: string, agente?: string, motor?: Motor, aviso?: Aviso) {
  const p = esperando(id);
  const fase = p.faseActual;
  const objetivo = p.plan.tareas.filter((t) => faseDe(t) === fase && (!agente || t === `${fase}.${agente}`));
  if (!objetivo.length) throw new Error(`${agente} no tiene tarea en ${nombreFase(fase)}.`);
  puerta(p, { fase, decision: "cambia", quien, nota });
  p.cambios[fase] = nota;
  for (const t of objetivo) p.tareas[t] = "rehacer";
  p.estado = "en-curso";
  // La fase se revisa de nuevo aunque no tuviera pausa.
  if (!p.plan.pausas.includes(fase)) p.plan.pausas = [...p.plan.pausas, fase].sort((a, b) => a - b);
  guardarProyecto(p);
  bitacora(id, `${quienNombre(quien)} pidió cambios en ${nombreFase(fase)}${agente ? ` (${agente})` : ""}: ${nota}`);
  return avanzar(id, motor, aviso);
}

export function parar(id: string, quien: Puerta["quien"], nota?: string) {
  const p = leerProyecto(id);
  puerta(p, { fase: p.faseActual, decision: "para", quien, nota });
  p.estado = "parado";
  guardarProyecto(p);
  bitacora(id, `${quienNombre(quien)} paró el proyecto${nota ? `: ${nota}` : ""}.`);
  return p;
}

export function reanudar(id: string) {
  const p = leerProyecto(id);
  if (p.estado !== "parado") return p;
  p.estado = "esperando";
  guardarProyecto(p);
  bitacora(id, "Proyecto reanudado.");
  return p;
}

/** Cambia dónde se detiene, en cualquier momento. */
export function cambiarPausas(id: string, valor: string) {
  const p = leerProyecto(id);
  const pausas = leerPausas(valor);
  p.pedido.pausas = pausas;
  p.plan.pausas = resolverPausas(pausas, p.pedido.tipo, p.plan.fases);
  // Si estaba detenido en una fase que ya no pausa, queda libre para seguir.
  if (p.estado === "esperando" && !p.plan.pausas.includes(p.faseActual)) p.estado = "en-curso";
  guardarProyecto(p);
  bitacora(id, `Pausas cambiadas a ${p.plan.pausas.join(", ") || "ninguna"}.`);
  return p;
}

/** Agrega o cambia la URL que audita Prisma. */
export function cambiarUrl(id: string, url: string) {
  if (!/^https?:\/\//.test(url)) throw new Error("La URL debe empezar con http:// o https://");
  const p = leerProyecto(id);
  p.pedido.contexto = { ...p.pedido.contexto, url };
  guardarProyecto(p);
  bitacora(id, `URL para auditar: ${url}`);
  return p;
}
