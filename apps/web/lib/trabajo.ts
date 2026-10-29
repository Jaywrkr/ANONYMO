// El equipo trabaja en segundo plano (sistema/36).
// Cada vuelta es un pedido aparte al servidor: trabaja UN agente (menos de 5 minutos) y, si queda trabajo
// que no espera a nadie, el servidor se llama a sí mismo para la siguiente. Así nada se corta por tiempo
// y el trabajo sigue aunque cierres la pestaña.
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { headers } from "next/headers";
import {
  avanzar, bitacora, carpeta, elegirMotor, existe, fusionar, guardarProyecto, hayPendientes, leerEntrega, leerProyecto,
  huellaProyecto, leerRemoto, nubeActiva, ocultarClaves, subirDistintos, subirRuta, type Proyecto, type TareaId,
} from "@anonymo/pipeline";
import { aislado, traer } from "./nube";

/** Lo que se ve en vivo de una vuelta: quién trabaja, qué hace y cuándo dio la última señal. */
export interface Vivo {
  vuelta: string;
  tarea?: string;
  fase?: "preparando" | "esperando" | "pensando" | "buscando" | "escribiendo";
  palabras?: number;
  /** Última señal de la vuelta (ISO): se renueva cada pocos segundos mientras la vuelta está viva. */
  latido: string;
  /** Última vez que la IA mandó algo (ISO): si pasa mucho, la IA está tardando en responder. */
  ia?: string;
  desde: string;
  /** La vuelta terminó (ISO). */
  fin?: string;
}

/** Cuánto dura como máximo una vuelta trabajando (Vercel corta a los 300 s; se deja margen para guardar y subir). */
const PLAZO_MS = Number(process.env.ANONYMO_PLAZO_MS ?? 235_000);
/** Sin señal por más de esto, una vuelta se da por muerta. */
export const SIN_SENAL_MS = 75_000;

const rutaVivo = (id: string) => join(carpeta(), id, "vivo.json");
export function leerVivo(id: string): Vivo | undefined {
  try { return existsSync(rutaVivo(id)) ? (JSON.parse(readFileSync(rutaVivo(id), "utf8")) as Vivo) : undefined; } catch { return undefined; }
}
function escribirVivo(id: string, v: Vivo) {
  mkdirSync(join(carpeta(), id), { recursive: true });
  writeFileSync(rutaVivo(id), JSON.stringify(v));
}
const subirVivo = (id: string) => (nubeActiva() ? subirRuta(`${id}/vivo.json`).catch(() => {}) : Promise.resolve());

/** La vuelta sigue viva: dio señal hace poco y no terminó. */
export const vivoActivo = (v?: Vivo) => !!v && !v.fin && Date.now() - Date.parse(v.latido) < SIN_SENAL_MS;

/** ¿Hay una vuelta trabajando ahora en este proyecto? Lee la señal de la nube (o del disco en tu máquina). */
export async function trabajandoAhora(id: string): Promise<Vivo | undefined> {
  try {
    if (nubeActiva()) {
      const t = await leerRemoto(id, "vivo.json");
      const v = t ? (JSON.parse(t) as Vivo) : undefined;
      return vivoActivo(v) ? v : undefined;
    }
    const v = leerVivo(id);
    return vivoActivo(v) ? v : undefined;
  } catch {
    return undefined;
  }
}

/** Firma de las llamadas internas: solo el propio servidor puede pedir una vuelta sin sesión. */
export const firmaTrabajo = (id: string) => createHmac("sha256", process.env.ESTUDIO_SECRETO ?? "anonymo-local").update(`trabajo:${id}`).digest("hex");
export function firmaValida(id: string, firma: string | null) {
  if (!firma) return false;
  const a = Buffer.from(firma);
  const b = Buffer.from(firmaTrabajo(id));
  return a.length === b.length && timingSafeEqual(a, b);
}

/** La dirección de este servidor, desde el pedido actual (para llamarse a sí mismo). */
export async function origenActual() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Pide una vuelta de trabajo. Solo espera el «recibido» (la vuelta corre aparte). */
export async function lanzar(id: string, origen?: string) {
  try {
    const base = origen ?? (await origenActual());
    // Si el servidor no lo recibe, se intenta otra vez; y queda escrito en el registro (sistema/44).
    for (let intento = 1; intento <= 2; intento++) {
      try {
        const r = await fetch(`${base}/trabajo/${id}`, { method: "POST", headers: { "x-anonymo-trabajo": firmaTrabajo(id) }, signal: AbortSignal.timeout(15_000), cache: "no-store" });
        if (r.ok) return;
        console.error(`[trabajo] lanzar ${id}: respuesta ${r.status} (intento ${intento})`);
      } catch (e) {
        console.error(`[trabajo] lanzar ${id}: ${(e as Error).message} (intento ${intento})`);
      }
    }
  } catch (e) {
    console.error("[trabajo] no se pudo lanzar", id, (e as Error).message);
  }
}

/**
 * Una vuelta: trabaja un agente (o sigue el que quedó a medias) y, si queda trabajo que no espera a nadie, pide la siguiente.
 * Si ya hay otra vuelta viva en este proyecto, no hace nada (nunca dos agentes pisándose).
 */
export async function trabajarVuelta(id: string, origen: string) {
  // Cada vuelta trabaja en su propia copia del proyecto: ninguna página la puede pisar mientras el agente escribe.
  return aislado(() => vuelta(id, origen));
}

async function vuelta(id: string, origen: string) {
  const inicioVuelta = Date.now();
  const plazo = inicioVuelta + PLAZO_MS;
  await traer(id);
  // Desde aquí, lo que cambie en disco es de esta vuelta: es lo único que se sube al final (por contenido, sistema/43).
  const antes = huellaProyecto(id);
  const nada = (por: string) => console.log(`[vuelta ${id}] no trabaja: ${por}`);
  if (!existe(id)) return nada("el proyecto no está en la nube");
  const p = leerProyecto(id);
  if (p.estado !== "en-curso" || p.papelera) return nada(`estado ${p.estado}${p.papelera ? " (papelera)" : ""}`);
  if (vivoActivo(leerVivo(id))) return nada("ya hay otra vuelta trabajando");

  const ahora = () => new Date().toISOString();
  const vivo: Vivo = { vuelta: randomUUID(), fase: "preparando", palabras: 0, latido: ahora(), desde: ahora() };
  escribirVivo(id, vivo);
  await subirVivo(id);
  // Candado (sistema/42): si dos vueltas arrancaron casi a la vez, gana la última que escribió su señal; la otra se va.
  if (nubeActiva()) {
    await new Promise((ok) => setTimeout(ok, 1500));
    try {
      const t = await leerRemoto(id, "vivo.json");
      const otra = t ? (JSON.parse(t) as Vivo) : undefined;
      if (otra && otra.vuelta !== vivo.vuelta && !otra.fin) {
        console.log(`[vuelta ${id} ${vivo.vuelta.slice(0, 6)}] otra vuelta (${otra.vuelta.slice(0, 6)}) ya trabaja: esta no sigue`);
        return;
      }
    } catch {}
  }
  const juntarConNube = async () => {
    try {
      const remoto = await leerRemoto(id, "estado.json");
      if (remoto) guardarProyecto(fusionar(leerProyecto(id), JSON.parse(remoto) as Proyecto));
    } catch {}
  };
  let ultimaSubida = 0;
  // Registro en Vercel (sistema/39): qué hizo cada vuelta, para poder revisar si algo falla.
  const log = (texto: string) => console.log(`[vuelta ${id} ${vivo.vuelta.slice(0, 6)}] ${Math.round((Date.now() - inicioVuelta) / 1000)}s ${texto}`);
  const latido = (t: TareaId, x: { fase: Vivo["fase"]; palabras: number }) => {
    Object.assign(vivo, { tarea: t, fase: x.fase, palabras: x.palabras, latido: ahora(), ...(x.fase !== "esperando" ? { ia: ahora() } : {}) });
    escribirVivo(id, vivo);
    if (Date.now() - ultimaSubida > 4000) { ultimaSubida = Date.now(); void subirVivo(id); }
  };
  // Al empezar cada agente, la nube sabe quién trabaja (la barra y la oficina lo muestran).
  const aviso = async (texto: string) => {
    const t = texto.trimStart();
    if (t.startsWith("…") && nubeActiva()) {
      const q = leerProyecto(id);
      const enCurso = Object.entries(q.tareas).find(([, e]) => e === "en-curso")?.[0];
      if (enCurso) Object.assign(vivo, { tarea: enCurso, fase: "preparando", latido: ahora() });
      escribirVivo(id, vivo);
      // Antes de subir el estado, se junta con el de la nube: si Jay pausó hace un segundo, la pausa no se pisa (sistema/43).
      await juntarConNube();
      await Promise.all([subirRuta(`${id}/estado.json`).catch(() => {}), subirVivo(id)]);
    }
  };

  // Pulso propio (sistema/40): aunque la IA tarde en responder, la vuelta dice que sigue viva.
  // Así nadie la da por muerta ni arranca otra encima.
  let pulsos = 0;
  const pulso = setInterval(() => {
    vivo.latido = ahora();
    escribirVivo(id, vivo);
    void subirVivo(id);
    if (++pulsos % 3 === 0) log(`${vivo.tarea ?? "-"} ${vivo.fase} · ${vivo.palabras ?? 0} palabras · la IA habló hace ${vivo.ia ? Math.round((Date.now() - Date.parse(vivo.ia)) / 1000) + "s" : "—"}`);
  }, 10_000);
  log(`empieza · ${Object.entries(p.tareas).filter(([, e]) => e !== "lista").map(([t]) => t).join(", ")}`);
  let fallo: string | undefined;
  try {
    await avanzar(id, elegirMotor({ simulado: p.prueba }), aviso, { max: 1, plazo, latido });
  } catch (e) {
    fallo = ocultarClaves((e as Error).message);
    // Lo que estaba en curso vuelve a quedar pendiente: «Continuar» lo retoma.
    const q = leerProyecto(id);
    const tarea = Object.entries(q.tareas).find(([, e]) => e === "en-curso")?.[0] as TareaId | undefined;
    if (tarea) {
      q.tareas[tarea] = leerEntrega(id, tarea) ? "rehacer" : "por-empezar";
      if (q.vueltas) delete q.vueltas[tarea];
    }
    q.error = { mensaje: fallo.slice(0, 400), tarea, fecha: ahora() };
    guardarProyecto(q);
    bitacora(id, `No se pudo trabajar${tarea ? ` en ${tarea}` : ""}: ${fallo.slice(0, 200)}`);
  }

  // Lo que cambiaron Jay o Luna mientras tanto (marca, notas, pausa, modo) se respeta; se sube solo lo nuevo.
  if (nubeActiva()) {
    try {
      await juntarConNube();
      // Sin borrar nada en la nube: la vuelta solo agrega o cambia lo suyo.
      await subirDistintos(id, antes, false);
    } catch (e) {
      console.error("[trabajo] no se pudo subir", id, (e as Error).message);
    }
  }
  clearInterval(pulso);
  {
    const q = leerProyecto(id);
    log(`termina · estado ${q.estado}${fallo ? ` · error: ${fallo.slice(0, 200)}` : ""}${q.revision ? ` · revisar ${q.revision.tarea}` : ""}${Object.keys(q.parciales ?? {}).length ? ` · a medias ${Object.keys(q.parciales ?? {}).join(",")}` : ""}${Object.keys(q.reintentos ?? {}).length ? ` · directo ${Object.keys(q.reintentos ?? {}).join(",")}` : ""}`);
  }
  vivo.fin = ahora();
  vivo.latido = vivo.fin;
  escribirVivo(id, vivo);
  await subirVivo(id);

  const q = leerProyecto(id);
  if (!fallo && q.estado === "en-curso" && !q.papelera && hayPendientes(q)) await lanzar(id, origen);
}

/** Últimos arranques automáticos por proyecto (en este servidor): nunca más de uno por minuto. */
const rescates = new Map<string, number>();

/**
 * Red de seguridad (sistema/44): si el proyecto tiene trabajo pendiente que no espera a nadie y nadie trabaja
 * hace un rato, se pide la vuelta solo. Así un arranque que se perdió no deja el proyecto parado.
 * Lo llama la página del proyecto cada pocos segundos. El candado de las vueltas evita dos a la vez.
 */
export async function rescatar(p: Proyecto, vivo: Vivo | undefined, origen: string): Promise<boolean> {
  const id = p.pedido.id;
  if (p.estado !== "en-curso" || p.papelera || p.error || p.revision || p.esperaJurado || p.direcciones?.esperando) return false;
  if (!hayPendientes(p) || vivoActivo(vivo)) return false;
  // Una tarea que quedó «en curso» sin texto a medias es una vuelta que murió: eso lo decide Jay con «Continuar».
  if (Object.entries(p.tareas).some(([t, e]) => e === "en-curso" && !p.parciales?.[t])) return false;
  const quieto = Date.now() - Math.max(Date.parse(vivo?.fin ?? vivo?.latido ?? "") || 0, Date.parse(p.actualizado ?? "") || 0);
  if (quieto < 20_000) return false;
  if (Date.now() - (rescates.get(id) ?? 0) < 60_000) return false;
  rescates.set(id, Date.now());
  console.log(`[trabajo] ${id}: nadie trabajaba hace ${Math.round(quieto / 1000)}s con trabajo pendiente; se arranca solo`);
  await lanzar(id, origen);
  return true;
}
