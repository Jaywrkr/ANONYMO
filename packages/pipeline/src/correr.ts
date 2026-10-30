import {adjuntosReferencias} from './estandar.ts';
// Corre un proyecto hasta la siguiente pausa y maneja las decisiones de Jay y Luna.
import {guardarPiezas} from "./piezas.ts";
import {registrarDecisiones,detectarMejora,capturarContextoDecision,contextoTrabajo,memoriaPara} from "./operaciones.ts";
import { agentePorId, FASES, NOMBRE_SOCIO, RESPONSABLE_FASE } from "@anonymo/agentes";
import { bitacora, crear, guardarEntrega, guardarPedido, guardarProyecto, leerEntrega, leerProyecto } from "./almacen.ts";
import { entenderPedido, leerPausas, planificar, resolverPausas } from "./atlas.ts";
import { contratoPorId, dependientes, lecturas } from "./contratos.ts";
import { avisar } from "./avisos.ts";
import { estimar, textoEntrada } from "./costo.ts";
import { consejosPara } from "./plantillas.ts";
import { controlInicial, controlar, puedeAprobar, estadoEntrega } from "./calidad.ts";
import { condicionesDe } from "./requisitos.ts";
import { guardarImagenesDirecciones, guardarSitio } from "./sitio.ts";
import { listarArchivos, rutaArchivo } from "./archivos.ts";
import { evaluar, RONDAS_MAX } from "./jurado.ts";
import { prepararHerramientas } from "./herramientas/index.ts";
import { elegirMotor, type Latido, type Motor } from "./motor.ts";
import { type Direccion, type Entrega, type ModoTrabajo, type Pedido, type Proyecto, type Puerta, type TareaId } from "./tipos.ts";

/** Lo que va pasando. Puede ser asíncrono: en línea se usa para subir a la nube cada tarea apenas termina. */
export type Aviso = (texto: string) => void | Promise<void>;
const nombreFase = (n: number) => FASES.find((f) => f.n === n)?.nombre ?? `Fase ${n}`;
const faseDe = (t: TareaId) => Number(t.split(".")[0]);
const quienNombre = (q: Puerta["quien"]) => ({ jay: "Jay", luna: "Luna", auto: "Atlas", cliente: "El cliente" })[q];
const ultimaPuerta = (p: Proyecto, fase: number) => [...p.puertas].reverse().find((x) => x.fase === fase);

/** Cómo trabaja el equipo en este proyecto. Los proyectos de antes no tienen modo: se detienen por fases. */
export const modoDe = (p: Pick<Proyecto, "modo">): ModoTrabajo => p.modo ?? "fase";

/** Cómo correr una vuelta de trabajo (sistema/36). */
export interface OpcionesAvanzar {
  /** Cuántas tareas trabajar en esta llamada. Sin valor: hasta la próxima pausa (terminal). 0: solo deja todo listo para trabajar. */
  max?: number;
  /** Hora límite (ms) de la vuelta: el agente guarda lo que lleva antes de pasarla y sigue en la próxima. */
  plazo?: number;
  /** Señal de vida del agente que trabaja. */
  latido?: (tarea: TareaId, x: Latido) => void;
}

/** ¿Queda trabajo por hacer sin esperar a nadie? */
export const hayPendientes = (p: Proyecto) => !!p.controlPendiente || p.plan.tareas.some((t) => p.tareas[t] !== "lista");

export async function nuevo(pedido: Pedido, motor: Motor = elegirMotor(), aviso: Aviso = console.log) {
  const plan = planificar(pedido);
  const p = crear(pedido, plan);
  bitacora(pedido.id, `Pedido de ${pedido.cliente} (${pedido.tipo}). Atlas planificó fases ${plan.fases.join(", ")}; pausas en ${plan.pausas.join(", ") || "ninguna"}.`);
  return avanzar(p.pedido.id, motor, aviso);
}

/** Jay o Luna dicen «que empiecen»: el plan queda aprobado y el equipo trabaja hasta la primera pausa. */
export async function empezar(id: string, quien: "jay" | "luna", motor: Motor = elegirMotor(), aviso: Aviso = console.log, op: OpcionesAvanzar = {}) {
  const p = leerProyecto(id);
  if (p.estado !== "plan") throw new Error("Este proyecto ya empezó.");
  p.estado = "en-curso";
  guardarProyecto(p);
  bitacora(id, `${quien === "luna" ? "Luna" : "Jay"} aprobó el plan: trabajan ${p.plan.tareas.length} tareas (${({ paso: "un agente a la vez, con tu revisión", fase: "por fases", auto: "en automático" })[modoDe(p)]}).`);
  return avanzar(id, motor, aviso, op);
}

/**
 * Antes de empezar, Jay o Luna corrigen el plan con palabras («sin video», «sí necesita naming»).
 * Atlas vuelve a leer todo con el ajuste y rehace el plan. Después de empezar, los cambios van por «Pedir cambios».
 */
export async function replanear(id: string, ajuste: string, quien: "jay" | "luna") {
  const p = leerProyecto(id);
  if (p.estado !== "plan") throw new Error("El plan solo se ajusta antes de empezar. Ahora usa «Pedir cambios».");
  const texto = ajuste.trim();
  if (!texto) throw new Error("Escribe qué cambiar del plan.");
  const quienN = quien === "luna" ? "Luna" : "Jay";
  const descripcion = `${p.pedido.descripcion}\n\nAjuste de ${quienN}: ${texto}`;
  const l = await entenderPedido(descripcion, { cliente: p.pedido.cliente });
  const pedido = {
    ...p.pedido,
    descripcion,
    tipo: l.tipo,
    contexto: { ...p.pedido.contexto, ...Object.fromEntries(Object.entries(l.contexto).filter(([, v]) => v !== undefined)) },
    idioma: l.idioma ?? p.pedido.idioma,
    plantilla: l.plantilla ?? p.pedido.plantilla,
  };
  p.pedido = pedido;
  p.plan = planificar(pedido, l.eleccion);
  p.faseActual = p.plan.fases[0];
  p.tareas = Object.fromEntries(p.plan.tareas.map((t) => [t, "por-empezar"])) as typeof p.tareas;
  guardarPedido(pedido);
  guardarProyecto(p);
  bitacora(id, `${quienN} ajustó el plan («${texto.slice(0, 120)}»). Ahora trabajan ${p.plan.tareas.length} tareas.`);
  return p;
}

/** Presentar solo después del control: la aprobación humana sigue siendo una decisión aparte. */
async function presentar(p: Proyecto, e: Entrega, proponer: boolean): Promise<boolean> {
  const id = p.pedido.id;
  const t = e.tarea;
  if (p.estado === "parado" || p.papelera) return true;
  if (proponer) {
    p.direcciones = { tarea: t, version:e.version, opciones: (e.datos?.direcciones as Direccion[] | undefined) ?? [], esperando: true };
    p.estado = "esperando";
    delete p.revision;
    guardarProyecto(p);
    await avisar({proyecto:id,cliente:p.pedido.cliente,tipo:"espera",titulo:"Direcciones listas para elegir",texto:"Revisa los resultados y elige una dirección."});
    return true;
  }
  if (modoDe(p) === "paso") {
    p.estado = "esperando";
    p.revision = {tarea:t,fecha:new Date().toISOString()};
    guardarProyecto(p);
    return true;
  }
  return false;
}

/** Vuelve a comprobar los mismos archivos; no los genera de nuevo. */
export function pedirControl(id: string, tarea: TareaId) {
  const p = leerProyecto(id);
  if (p.estado === "en-curso") throw new Error("Espera a que termine el trabajo actual antes de volver a verificar.");
  const e = leerEntrega(id,tarea);
  if (!e || !p.plan.tareas.includes(tarea)) throw new Error("No hay una entrega para revisar.");
  delete p.error;
  p.controlPendiente = {tarea,version:e.version,proponer:!!e.datos?.direcciones};
  p.faseActual=faseDe(tarea);
  delete p.revision;
  p.estado = "en-curso";
  guardarProyecto(p);
}

function aprobarEntrega(p: Proyecto, t: TareaId, quien: string) {
  const e = leerEntrega(p.pedido.id,t);
  if (!e) throw new Error("Falta una entrega para aprobar.");
  if (!puedeAprobar(p,e)) throw new Error("Esta versión todavía no está verificada. Revisa sus comprobaciones antes de aprobar.");
  if (e.calidad && e.modo !== "simulado") {
    e.calidad = {...e.calidad,estado:"aprobado",aprobadoPor:quien};
    guardarEntrega(p.pedido.id,e);
  }
}

/**
 * Ejecuta tareas pendientes en orden. Se detiene al cerrar una fase con pausa (modo fase),
 * después de cada entrega (modo paso) o al llegar a `op.max` tareas en esta vuelta (en línea: una por pedido).
 */
export async function avanzar(id: string, motor: Motor = elegirMotor(), aviso: Aviso = console.log, op: OpcionesAvanzar = {}, cuenta = { n: 0 }): Promise<Proyecto> {
  const p = leerProyecto(id);
  if (p.papelera) throw new Error("El proyecto está en la papelera: sácalo primero.");
  if (p.estado === "parado") throw new Error("El proyecto está parado.");
  if (p.estado === "esperando" || p.estado === "plan") return p;
  p.estado = "en-curso";

  if (p.controlPendiente) {
    if (op.max === 0) return p;
    const q = p.controlPendiente;
    p.faseActual=faseDe(q.tarea);
    const e = leerEntrega(id,q.tarea);
    if (!e || e.version !== q.version) {
      delete p.controlPendiente;
      p.estado="esperando";
      p.revision=e?{tarea:e.tarea,fecha:new Date().toISOString()}:undefined;
      bitacora(id,"La versión cambió mientras esperaba revisión. Verifica la entrega actual.");
      guardarProyecto(p);
      return p;
    }
    delete p.error;
    op.latido?.(e.tarea,{fase:"revisando",palabras:0});
    e.calidad = await controlar(p,e,q.proponer,op.plazo);
    guardarEntrega(id,e);
    if(e.calidad.estado==="cambios"||e.calidad.estado==="pendiente")detectarMejora(id,{tipo:e.calidad.estado==="cambios"?"calidad":"limitacion",tarea:e.tarea,version:e.version,titulo:`Revisión de ${e.titulo}: ${e.calidad.estado}`,detalle:e.calidad.resumen+"\n"+e.calidad.comprobaciones.filter(c=>c.estado!=="cumple").map(c=>c.evidencia).join("\n")});
    if(e.calidad.uso) p.costos={...p.costos,[e.tarea]:[...(p.costos?.[e.tarea]??[]),{...e.calidad.uso,busquedas:0,estimado:false,fecha:e.calidad.fecha}]};
    Object.assign(p,fusionar(p,leerProyecto(id)));
    delete p.controlPendiente;
    if ((p.estado as string) === "parado" || p.papelera) { p.controlPendiente=q; guardarProyecto(p); return p; }
    const intentos=p.controlIntentos?.[`${e.tarea}:${e.version}`]??0;
    if(e.calidad.estado==="pendiente" && /otra vuelta|Faltó tiempo|Falta tiempo/.test(e.calidad.resumen) && intentos<6) {
      p.controlIntentos={...p.controlIntentos,[`${e.tarea}:${e.version}`]:intentos+1};
      p.controlPendiente=q;
      guardarProyecto(p);
      return p;
    }
    const claveRonda=`${e.tarea}:${q.proponer?"direcciones":"entrega"}`;
    const rondas = p.controlRondas?.[claveRonda] ?? 0;
    if (e.calidad.estado === "cambios" && rondas < 2) {
      p.controlRondas = {...p.controlRondas,[claveRonda]:rondas+1};
      p.tareas[e.tarea] = "rehacer";
      p.cambios[faseDe(e.tarea)] = `Control de calidad, corrección ${rondas+1}: ${e.calidad.resumen}\n${e.calidad.comprobaciones.filter(c => c.estado !== "cumple").map(c => `${c.texto}: ${c.evidencia}`).join("\n")}`;
      if (q.proponer && p.direcciones) p.direcciones.pedidas = true;
      bitacora(id,`Revisión de ${e.titulo}: necesita cambios. Corrección automática ${rondas+1} de 2.`);
    } else if (!puedeAprobar(p,e)) {
      p.estado = "esperando";
      p.revision = {tarea:e.tarea,fecha:new Date().toISOString(),calidad:e.calidad.estado==="cambios"?"cambios":"pendiente"};
      bitacora(id,`Revisión de ${e.titulo}: ${e.calidad.resumen}`);
    } else { await presentar(p,e,q.proponer); }
    guardarProyecto(p);
    // Cierra la fase y prepara el siguiente paso sin producir otra pieza en esta vuelta.
    if(p.estado === "en-curso" && !p.controlPendiente) return avanzar(id,motor,aviso,{...op,max:0},cuenta);
    return p;
  }

  const { tareas } = p.plan;
  for (let i = 0; i < tareas.length; i++) {
    const t = tareas[i];
    const fase = faseDe(t);
    p.faseActual = fase;

    if (p.tareas[t] !== "lista") {
      // Ya trabajó lo que tocaba en esta vuelta: queda en curso y sigue en la próxima.
      if (op.max !== undefined && cuenta.n >= op.max) {
        guardarProyecto(p);
        return p;
      }
      cuenta.n++;
      const c = contratoPorId(t)!;
      // Una tarea que quedó «en curso» de una vuelta cortada y ya tenía entrega también es un rehacer.
      const rehace = p.tareas[t] === "rehacer" || (p.tareas[t] === "en-curso" && !!leerEntrega(id, t));
      const ahora = new Date().toISOString();
      const sigue = p.parciales?.[t];
      p.tareas[t] = "en-curso";
      p.inicios = { ...p.inicios, [t]: sigue && p.inicios?.[t] ? p.inicios[t] : ahora };
      p.vueltas = { ...p.vueltas, [t]: ahora };
      delete p.error;
      guardarProyecto(p);
      // Aviso de inicio: en línea sube el estado para que la oficina muestre quién está trabajando.
      await aviso(`  … ${agentePorId(c.agente)?.nombre?.padEnd(7)} ${c.entrega}`);
      const previa = leerEntrega(id, t);
      const version = (previa?.version ?? 0) + 1;
      // Direcciones de diseño (sistema/37): el diseñador primero propone 3; con una elegida, todos la siguen.
      const elegida = p.direcciones?.elegida !== undefined ? p.direcciones.opciones[p.direcciones.elegida] : undefined;
      const proponer = !!c.direcciones && !elegida && (!previa || !!p.direcciones?.pedidas);
      const leidas = lecturas(t, tareas).map((u) => leerEntrega(id, u)).filter((e): e is Entrega => !!e);
      const cambio = rehace ? p.cambios[fase] : undefined;
      const herramientas = await prepararHerramientas({ pedido: p.pedido, tarea: t, lecturas: leidas, motorReal: motor.nombre !== "simulado" });
      for (const h of herramientas) bitacora(id, `${h.herramienta}: ${h.ok ? "ok" : "pendiente"}.`);
      const memoria=memoriaPara(id,t),capturado=capturarContextoDecision(id,t,p,leidas);capturado.memoria=memoria.map(d=>d.id);
      const contexto=contextoTrabajo(id,t,version,capturado,!!sigue);
      const r = await motor.trabajar({ pedido: p.pedido, tarea: t, lecturas: leidas, cambio, version, preguntas: p.plan.preguntas, herramientas, cliente: (p.notasCliente ?? []).map((n) => n.texto),
        consejos: [...(consejosPara(p.pedido.plantilla, c.agente) ?? []), ...(c.agente === "ledger" && p.presupuesto?.horasJay ? [`Jay fijó ${p.presupuesto.horasJay} h reales para todo el proyecto: reparte tus horas para que sumen eso.`] : [])],
        archivos: listarArchivos(id).map((a) => ({ nombre: a.nombre, nota: a.nota, tipo: a.tipo, ruta: rutaArchivo(id, a.nombre) })),
        condiciones: condicionesDe(p,t), referencias:adjuntosReferencias(id,t), memoria, marca: p.marca, parcial: sigue, plazo: op.plazo, direccion: proponer ? "proponer" : elegida, directo: (p.reintentos?.[t] ?? 0) > 0, latido: op.latido ? (x) => op.latido!(t, x) : undefined });
      const { uso, pendiente, sitio, piezas, ...resto } = r;
      // Mientras trabajaba, Jay o Luna pudieron pausar, cambiar el modo o la marca: eso manda (sistema/36).
      Object.assign(p, fusionar(p, leerProyecto(id)));
      // Se acabó el tiempo de la vuelta: lo escrito queda guardado y la próxima vuelta sigue desde ahí.
      if (pendiente !== undefined) {
        if (uso) p.costos = { ...p.costos, [t]: [...(p.costos?.[t] ?? []), { ...uso, fecha: new Date().toISOString() }] };
        // Si no escribió nada (se le fue la vuelta pensando o buscando), la próxima va directo a escribir.
        // Solo si tampoco así avanza, se detiene y se avisa: nunca se insiste para siempre.
        const antes = (sigue ?? "").trim().length;
        if (pendiente.trim().length - antes < 1) {
          const n = (p.reintentos?.[t] ?? 0) + 1;
          p.reintentos = { ...p.reintentos, [t]: n };
          if (sigue) p.parciales = { ...p.parciales, [t]: sigue };
          guardarProyecto(p);
          if (n > 2) throw new Error(`${agentePorId(c.agente)?.nombre} no alcanzó a escribir en ${n} vueltas seguidas: la IA no respondió a tiempo. Continúa en un momento.`);
          bitacora(id, `${agentePorId(c.agente)?.nombre} se pasó la vuelta pensando sin escribir: la próxima va directo a escribir.`);
          await aviso(`  ⋯ ${agentePorId(c.agente)?.nombre?.padEnd(7)} ${c.entrega} (directo a escribir)`);
          return p;
        }
        p.parciales = { ...p.parciales, [t]: pendiente };
        guardarProyecto(p);
        bitacora(id, `${agentePorId(c.agente)?.nombre} lleva ${pendiente.split(/\s+/).filter(Boolean).length} palabras de ${c.entrega}: sigue en la próxima vuelta.`);
        await aviso(`  ⋯ ${agentePorId(c.agente)?.nombre?.padEnd(7)} ${c.entrega} (sigue)`);
        return p;
      }
      const entrega: Entrega = { tarea: t, agente: c.agente, titulo: c.entrega, estado: "lista", version, creado: new Date().toISOString(), ...resto, datos:{...resto.datos,...(herramientas.some(h=>!h.ok)?{herramientasPendientes:herramientas.filter(h=>!h.ok).map(h=>h.falta??h.resumen)}:{})} };
      guardarEntrega(id, entrega);
      // La web como archivos de verdad, por versión (sistema/42).
      if (sitio && Object.keys(sitio).length) guardarSitio(id, version, sitio);
      if(piezas&&Object.keys(piezas).length)guardarPiezas(id,t,version,piezas);
      if(proponer)guardarImagenesDirecciones(id,version,JSON.stringify(r.datos?.direcciones??[]));
      entrega.calidad = controlInicial(p,entrega);
      guardarEntrega(id,entrega);
      registrarDecisiones(id,entrega,contexto);
      // Costo: real si vino de la API; si no, lo que costaría con el motor real.
      const gasto = uso ?? estimar(textoEntrada(leidas, p.pedido.descripcion + (cambio ?? "")), 1800, c.herramientas?.includes("web") ? 4 : 0);
      p.costos = { ...p.costos, [t]: [...(p.costos?.[t] ?? []), { ...gasto, fecha: new Date().toISOString() }] };
      p.tareas[t] = "lista";
      if (p.inicios) delete p.inicios[t];
      if (p.vueltas) delete p.vueltas[t];
      if (p.parciales) delete p.parciales[t];
      if (p.reintentos) delete p.reintentos[t];
      // Presupuesto vivo: Ledger fija las horas base; si otro agente suma horas, Ledger vuelve a calcular.
      const extra = Number(r.datos?.horasExtra ?? 0);
      // Cuando Ledger da un total nuevo, ese total ya incluye los ajustes anteriores.
      if (t.endsWith(".ledger") && typeof r.datos?.horas === "number")
        p.presupuesto = { ...p.presupuesto, horas: r.datos.horas as number, ajustes: (p.presupuesto?.ajustes ?? []).map((a) => ({ ...a, incluido: true })) };
      if (extra > 0) {
        const motivo = cambio ?? "Cambio en la entrega";
        p.presupuesto = { ...p.presupuesto, horas: p.presupuesto?.horas, ajustes: [...(p.presupuesto?.ajustes ?? []), { tarea: t, horas: extra, motivo, fecha: new Date().toISOString() }] };
        if (tareas.includes("1.ledger") && t !== "1.ledger") {
          p.tareas["1.ledger"] = "rehacer";
          p.cambios[1] = `Ajuste de presupuesto: ${agentePorId(c.agente)?.nombre} suma ${extra} h (${motivo.slice(0, 120)}).`;
        }
        bitacora(id, `${agentePorId(c.agente)?.nombre} suma ${extra} h al proyecto. Ledger recalcula.`);
      }
      guardarProyecto(p);
      bitacora(id, `${agentePorId(c.agente)?.nombre} entregó ${c.entrega} v${version} (${r.modo}).`);
      await aviso(`  ✓ ${agentePorId(c.agente)?.nombre?.padEnd(7)} ${c.entrega} v${version}`);
      if (proponer) p.direcciones = {tarea:t,version,opciones:(r.datos?.direcciones as Direccion[] | undefined) ?? [],esperando:false};
      if (r.modo !== "simulado") {
        p.controlPendiente = {tarea:t,version,proponer};
        guardarProyecto(p);
        bitacora(id,`${c.entrega} generada: falta verificar la versión ${version}.`);
        return p;
      }
      if (await presentar(p,entrega,proponer)) return p;
    }

    // ¿Se cerró la fase?
    const cierra = i === tareas.length - 1 || faseDe(tareas[i + 1]) !== fase;
    if (!cierra) continue;
    const ultima = ultimaPuerta(p, fase);
    if (ultima?.decision === "sigue") continue;
    if (p.plan.pausas.includes(fase) && modoDe(p) === "fase") {
      p.estado = "esperando";
      guardarProyecto(p);
      bitacora(id, `Pausa al cerrar ${nombreFase(fase)}.`);
      await avisar({ proyecto: id, cliente: p.pedido.cliente, tipo: "espera", titulo: `Terminó ${nombreFase(fase)} · le toca a ${NOMBRE_SOCIO[responsable(p, fase)]}`, texto: `El equipo terminó la fase y espera la decisión de ${NOMBRE_SOCIO[responsable(p, fase)]}: aprobar, pedir cambios o parar.` });
      return p;
    }
    puerta(p, { fase, decision: "sigue", quien: "auto" });
    delete p.cambios[fase];
    guardarProyecto(p);
  }

  // Algo quedó por rehacer en una fase ya pasada (por ejemplo, Ledger tras un ajuste de horas): otra vuelta.
  if (p.plan.tareas.some((t) => p.tareas[t] === "rehacer")) {
    guardarProyecto(p);
    return avanzar(id, motor, aviso, op, cuenta);
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
      return avanzar(id, motor, aviso, op, cuenta);
    }
    p.estado = "esperando";
    p.esperaJurado = true;
    p.faseActual = 6;
    guardarProyecto(p);
    bitacora(id, `${v.cambio} ${conTrabajo ? `Sin mejora suficiente tras ${RONDAS_MAX} rondas` : "No hay tareas que rehacer en este plan"}: decide Jay o Luna.`);
    await avisar({ proyecto: id, cliente: p.pedido.cliente, tipo: "jurado", titulo: `Nota ${v.nota.final}`, texto: v.cambio });
    return p;
  }

  const sinAprobar = p.plan.tareas.find(t => { const e = leerEntrega(id,t); return e && e.modo !== "simulado" && estadoEntrega(p,e) !== "aprobado"; });
  if (sinAprobar) {
    p.estado = "esperando";
    p.faseActual=faseDe(sinAprobar);
    p.revision = {tarea:sinAprobar,fecha:new Date().toISOString()};
    guardarProyecto(p);
    return p;
  }
  p.estado = "listo";
  p.esperaJurado = false;
  p.cambios = {};
  guardarProyecto(p);
  if (v) bitacora(id, `Jurado: ${v.nota.final}${v.aprobado ? "" : " (aceptado por Jay o Luna)"}.`);
  bitacora(id, "Proyecto listo.");
  await avisar({ proyecto: id, cliente: p.pedido.cliente, tipo: "listo", titulo: v ? `Jurado ${v.nota.final}` : "Todas las entregas listas", texto: "El equipo terminó todas las tareas del plan." });
  return p;
}

/** A quién le toca aprobar una fase de este proyecto. */
export const responsable = (p: Proyecto, fase: number) => p.pedido.responsables?.[fase] ?? RESPONSABLE_FASE[fase] ?? "jay";

/** Cambia quién aprueba una fase en este proyecto. */
export function cambiarResponsable(id: string, fase: number, socio: "jay" | "luna") {
  const p = leerProyecto(id);
  p.pedido.responsables = { ...p.pedido.responsables, [fase]: socio };
  guardarProyecto(p);
  bitacora(id, `${NOMBRE_SOCIO[socio]} aprueba ahora la fase ${fase}.`);
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

export async function aprobar(id: string, quien: Puerta["quien"], nota?: string, motor?: Motor, aviso?: Aviso, forzar = false, op: OpcionesAvanzar = {}) {
  const p = esperando(id);
  if (p.direcciones?.esperando) throw new Error("Primero elige una de las direcciones de diseño (o pide otras).");
  const toca = responsable(p, p.revision ? faseDe(p.revision.tarea) : p.faseActual);
  if ((quien === "jay" || quien === "luna") && quien !== toca && !forzar && !p.esperaJurado)
    throw new Error(`Esta fase la aprueba ${NOMBRE_SOCIO[toca]}. Si igual quieres aprobarla, usa forzar (terminal: --forzar).`);
  // Modo paso: se aprueba una entrega y sigue el siguiente agente.
  if (p.revision && !p.esperaJurado) {
    aprobarEntrega(p,p.revision.tarea,quien);
    const c = contratoPorId(p.revision.tarea);
    bitacora(id, `${quienNombre(quien)} aprobó ${c?.entrega ?? p.revision.tarea} de ${agentePorId(c?.agente ?? "")?.nombre ?? ""}${nota ? `: ${nota}` : ""}.`);
    delete p.revision;
    p.estado = "en-curso";
    guardarProyecto(p);
    return avanzar(id, motor, aviso, op);
  }
  const lote=p.plan.tareas.filter(t=>faseDe(t)===p.faseActual && p.tareas[t]==="lista");
  if(lote.some(t=>{const e=leerEntrega(id,t);return !e||!puedeAprobar(p,e);})) throw new Error("Faltan entregas verificadas en esta fase. Revisa sus comprobaciones antes de aprobar.");
  for (const t of lote) aprobarEntrega(p,t,quien);
  delete p.revision;
  if (p.esperaJurado) {
    p.juradoAceptado = true;
    p.esperaJurado = false;
  }
  puerta(p, { fase: p.faseActual, decision: "sigue", quien, nota });
  delete p.cambios[p.faseActual];
  p.estado = "en-curso";
  guardarProyecto(p);
  bitacora(id, `${quienNombre(quien)} aprobó ${nombreFase(p.faseActual)}${nota ? `: ${nota}` : ""}.`);
  return avanzar(id, motor, aviso, op);
}

/** Rehace la fase actual (o solo un agente) con la nota. Vuelve a pausar al terminar. */
export async function cambiar(id: string, quien: Puerta["quien"], nota: string, agente?: string, motor?: Motor, aviso?: Aviso, op: OpcionesAvanzar = {}) {
  const p = esperando(id);
  // Modo paso: el cambio es para la entrega que se está revisando.
  const rev = p.revision;
  const fase = rev ? faseDe(rev.tarea) : p.faseActual;
  if (rev && !agente) agente = rev.tarea.split(".")[1];
  delete p.revision;
  const objetivo = p.plan.tareas.filter((t) => faseDe(t) === fase && (!agente || t === `${fase}.${agente}`));
  if (!objetivo.length) throw new Error(`${agente} no tiene tarea en ${nombreFase(fase)}.`);
  puerta(p, { fase, decision: "cambia", quien, nota });
  p.cambios[fase] = nota;
  for (const t of objetivo) p.tareas[t] = "rehacer";
  p.estado = "en-curso";
  // La fase se revisa de nuevo aunque no tuviera pausa (en modo paso, cada entrega ya se revisa sola).
  if (modoDe(p) === "fase" && !p.plan.pausas.includes(fase)) p.plan.pausas = [...p.plan.pausas, fase].sort((a, b) => a - b);
  guardarProyecto(p);
  bitacora(id, `${quienNombre(quien)} pidió cambios en ${nombreFase(fase)}${agente ? ` (${agente})` : ""}: ${nota}`);
  return avanzar(id, motor, aviso, op);
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
  // En modo paso o automático sigue solo si no hay nada que revisar; por fases vuelve a esperar tu decisión.
  p.estado = modoDe(p) !== "fase" && !p.revision && !p.esperaJurado && !p.direcciones?.esperando && hayPendientes(p) ? "en-curso" : "esperando";
  guardarProyecto(p);
  bitacora(id, "Proyecto reanudado.");
  return p;
}

/** Eligen una de las direcciones de diseño: el diseñador la desarrolla completa y todo lo que dependía se rehace con ella (sistema/37). */
export async function elegirDireccion(id: string, n: number, quien: Puerta["quien"], nota?: string, motor?: Motor, aviso?: Aviso, op: OpcionesAvanzar = {}) {
  const p = leerProyecto(id);
  const d = p.direcciones;
  if (!d?.opciones[n]) throw new Error("Esa dirección no existe.");
  if (p.estado === "en-curso") throw new Error(`"${id}" no está esperando una decisión (estado: en-curso).`);
  aprobarEntrega(p,d.tarea,quien);
  const t = d.tarea;
  const fase = faseDe(t);
  p.direcciones = { ...d, elegida: n, esperando: false, pedidas: false, quien, fecha: new Date().toISOString() };
  for (const x of dependientes([t], p.plan.tareas)) if (x === t || p.tareas[x] === "lista") p.tareas[x] = "rehacer";
  p.cambios[fase] = `Eligieron la dirección «${d.opciones[n].nombre}».${nota ? ` ${quienNombre(quien)} agrega: ${nota}` : ""} Desarróllala completa y respétala en todo.`;
  delete p.revision;
  p.estado = "en-curso";
  guardarProyecto(p);
  bitacora(id, `${quienNombre(quien)} eligió la dirección «${d.opciones[n].nombre}»${nota ? `: ${nota}` : ""}.`);
  return avanzar(id, motor, aviso, op);
}

/** Pide (otra vez) direcciones de diseño, con una nota opcional. Lo que dependía del diseño se rehará al elegir. */
export async function pedirDirecciones(id: string, quien: Puerta["quien"], nota?: string, motor?: Motor, aviso?: Aviso, op: OpcionesAvanzar = {}) {
  const p = leerProyecto(id);
  const t = p.plan.tareas.find((x) => contratoPorId(x)?.direcciones);
  if (!t) throw new Error("Este plan no tiene diseño de web: no hay direcciones que pedir.");
  if (p.estado === "en-curso") throw new Error(`"${id}" no está esperando una decisión (estado: en-curso).`);
  if (p.estado === "plan") throw new Error("Primero di «que empiecen».");
  const fase = faseDe(t);
  p.direcciones = { tarea: t, opciones: p.direcciones?.opciones ?? [], pedidas: true, nota };
  p.tareas[t] = leerEntrega(id, t) ? "rehacer" : "por-empezar";
  p.cambios[fase] = nota ? `Propón 3 direcciones nuevas. ${quienNombre(quien)} dice: ${nota}` : "Propón 3 direcciones nuevas, distintas de las anteriores.";
  delete p.revision;
  p.esperaJurado = false;
  p.estado = "en-curso";
  guardarProyecto(p);
  bitacora(id, `${quienNombre(quien)} pidió ${p.direcciones.opciones.length ? "otras " : ""}3 direcciones de diseño${nota ? `: ${nota}` : ""}.`);
  return avanzar(id, motor, aviso, op);
}

/** El cliente marca en su portal la dirección que le gusta. Jay o Luna confirman (sistema/37). */
export function direccionDelCliente(id: string, n: number, nota?: string) {
  const p = leerProyecto(id);
  if (!p.direcciones?.esperando || !p.direcciones.opciones[n]) throw new Error("Ya no hay direcciones por elegir.");
  const e=leerEntrega(id,p.direcciones.tarea);
  if(!e || !puedeAprobar(p,e)) throw new Error("Las direcciones todavía necesitan una revisión vigente.");
  p.direcciones.cliente = { n, nota: nota?.slice(0, 600), fecha: new Date().toISOString() };
  guardarProyecto(p);
  bitacora(id, `El cliente prefiere la dirección «${p.direcciones.opciones[n].nombre}»${nota ? `: ${nota}` : ""}.`);
  return p;
}

/** Cambia cómo trabaja el equipo (sistema/36). Si estaba esperando solo por la pausa de fase, queda libre para seguir. */
export function cambiarModo(id: string, modo: ModoTrabajo) {
  const p = leerProyecto(id);
  p.modo = modo;
  if (p.estado === "esperando" && !p.revision && !p.esperaJurado && !p.direcciones?.esperando && modo !== "fase" && hayPendientes(p)) p.estado = "en-curso";
  guardarProyecto(p);
  bitacora(id, `Modo de trabajo: ${({ paso: "un agente a la vez, con revisión", fase: "por fases", auto: "automático" })[modo]}.`);
  return p;
}

/**
 * Junta el estado que dejó una vuelta de trabajo con el que está en la nube (sistema/36).
 * Mientras un agente trabaja, Jay o Luna pueden cambiar la marca, anotar algo del cliente, pausar o cambiar el modo:
 * eso se respeta. La vuelta solo pone lo suyo: tareas, costos, tiempos, fase y lo que dispara el trabajo.
 */
export function fusionar(vuelta: Proyecto, nube: Proyecto): Proyecto {
  const detenido = nube.estado === "parado" || !!nube.papelera;
  return {
    ...nube,
    tareas: vuelta.tareas,
    controlPendiente: vuelta.controlPendiente,
    controlRondas: vuelta.controlRondas,
    controlIntentos: vuelta.controlIntentos,
    costos: vuelta.costos,
    inicios: vuelta.inicios,
    vueltas: vuelta.vueltas,
    parciales: vuelta.parciales,
    reintentos: vuelta.reintentos,
    faseActual: vuelta.faseActual,
    revision: vuelta.revision,
    puertas: vuelta.puertas,
    cambios: vuelta.cambios,
    rondasJurado: vuelta.rondasJurado,
    esperaJurado: vuelta.esperaJurado,
    juradoAceptado: vuelta.juradoAceptado,
    error: vuelta.error,
    direcciones: vuelta.direcciones,
    plan: nube.plan,
    presupuesto: vuelta.presupuesto || nube.presupuesto ? { ...nube.presupuesto, horas: vuelta.presupuesto?.horas, ajustes: vuelta.presupuesto?.ajustes ?? nube.presupuesto?.ajustes ?? [] } : undefined,
    estado: detenido ? nube.estado : vuelta.estado,
    actualizado: new Date().toISOString(),
  };
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

/** Vuelve a una versión anterior de una entrega: queda como versión nueva con el contenido viejo. */
export function restaurar(id: string, tarea: TareaId, version: number) {
  const p = leerProyecto(id);
  if (!p.plan.tareas.includes(tarea)) throw new Error(`${tarea} no está en el plan.`);
  const vieja = leerEntrega(id, tarea, version);
  const actual = leerEntrega(id, tarea);
  if (!vieja || !actual) throw new Error(`No existe la versión ${version} de ${tarea}.`);
  if (vieja.version === actual.version) throw new Error("Esa ya es la versión actual.");
  const nueva = actual.version + 1;
  guardarEntrega(id, { ...vieja, version: nueva, creado: new Date().toISOString(), contenido: vieja.contenido });
  bitacora(id, `${agentePorId(vieja.agente)?.nombre}: se volvió a la v${version} de ${vieja.titulo} (queda como v${nueva}).`);
  // Lo que se armó sobre la versión que se descarta conviene revisarlo.
  return { nueva, revisar: dependientes([tarea], p.plan.tareas).filter((t) => t !== tarea && !t.startsWith("6.")) };
}

/** Publica (o retira) el proyecto como caso en la web. Exige decir cómo se obtuvo el permiso del cliente. */
export function publicarCaso(id: string, permiso: string | undefined, resumen?: string, retirar = false) {
  const p = leerProyecto(id);
  if (retirar) {
    p.caso = { ...(p.caso ?? { permiso: "", fecha: "" }), publico: false };
    guardarProyecto(p);
    bitacora(id, "El caso se retiró de la web.");
    return p;
  }
  if (!permiso || permiso.trim().length < 5) throw new Error('Falta el permiso del cliente. Ej.: --permiso "Correo de Gabriela del 22/10/2026"');
  p.caso = { publico: true, permiso: permiso.trim(), fecha: new Date().toISOString(), resumen };
  guardarProyecto(p);
  bitacora(id, `Publicado como caso (permiso: ${permiso.trim()}).`);
  return p;
}

/** Lo que dijo el cliente sobre el trabajo, con su nombre. Solo para casos públicos y tal como lo escribió. */
export function testimonio(id: string, texto: string, autor: string, logo?: string) {
  const p = leerProyecto(id);
  if (!p.caso?.publico) throw new Error("Primero publica el caso con permiso del cliente: pipeline caso <id> --permiso \"...\"");
  if (texto.trim().length < 10 || autor.trim().length < 2) throw new Error("Falta el texto (tal cual lo dijo el cliente) o el autor.");
  p.caso.testimonio = { texto: texto.trim(), autor: autor.trim(), logo };
  guardarProyecto(p);
  bitacora(id, `Testimonio agregado (${autor.trim()}).`);
  return p;
}
