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
  leerRemoto, nubeActiva, ocultarClaves, subirCambiados, subirRuta, type Proyecto, type TareaId,
} from "@anonymo/pipeline";
import { aislado, traer } from "./nube";

/** Lo que se ve en vivo de una vuelta: quién trabaja, qué hace y cuándo dio la última señal. */
export interface Vivo {
  vuelta: string;
  tarea?: string;
  fase?: "preparando" | "pensando" | "buscando" | "escribiendo";
  palabras?: number;
  /** Última señal (ISO). */
  latido: string;
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
    await fetch(`${base}/trabajo/${id}`, { method: "POST", headers: { "x-anonymo-trabajo": firmaTrabajo(id) }, signal: AbortSignal.timeout(15_000), cache: "no-store" });
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
  const plazo = Date.now() + PLAZO_MS;
  await traer(id);
  // Desde aquí, lo que cambie en disco es de esta vuelta: es lo único que se sube al final.
  const inicio = Date.now();
  if (!existe(id)) return;
  const p = leerProyecto(id);
  if (p.estado !== "en-curso" || p.papelera) return;
  if (vivoActivo(leerVivo(id))) return;

  const ahora = () => new Date().toISOString();
  const vivo: Vivo = { vuelta: randomUUID(), fase: "preparando", palabras: 0, latido: ahora(), desde: ahora() };
  escribirVivo(id, vivo);
  await subirVivo(id);
  let ultimaSubida = 0;
  const latido = (t: TareaId, x: { fase: Vivo["fase"]; palabras: number }) => {
    Object.assign(vivo, { tarea: t, fase: x.fase, palabras: x.palabras, latido: ahora() });
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
      await Promise.all([subirRuta(`${id}/estado.json`).catch(() => {}), subirVivo(id)]);
    }
  };

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
      const remoto = await leerRemoto(id, "estado.json");
      if (remoto) guardarProyecto(fusionar(leerProyecto(id), JSON.parse(remoto) as Proyecto));
      await subirCambiados(id, inicio);
    } catch (e) {
      console.error("[trabajo] no se pudo subir", id, (e as Error).message);
    }
  }
  vivo.fin = ahora();
  vivo.latido = vivo.fin;
  escribirVivo(id, vivo);
  await subirVivo(id);

  const q = leerProyecto(id);
  if (!fallo && q.estado === "en-curso" && !q.papelera && hayPendientes(q)) await lanzar(id, origen);
}
