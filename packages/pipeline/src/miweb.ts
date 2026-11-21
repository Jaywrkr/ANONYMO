// «Mi web» (sistema/98): la web del cliente en vivo, con los cambios que hace él mismo desde su portal.
// La web del equipo no se toca: los cambios viven aparte (miweb/estado.json) y se aplican al servirla.
// Así cada cambio se publica al instante, se puede deshacer y una versión nueva del equipo no los borra.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { carpeta, leerProyecto } from "./almacen.ts";
import { aplicarCambios, editablesDe, fotosDe, type CambiosPagina, type PreguntaAsistente } from "./miweb-html.ts";
import { PLANES, type PlanMensual } from "./oferta.ts";
import { numeroInternacional } from "./prospectos/puntaje.ts";
import { archivosSitio, rutaSitio, versionesSitio } from "./sitio.ts";

export type QuienMiWeb = "cliente" | "jay" | "luna";
export interface PasoMiWeb { cuando: string; quien: QuienMiWeb; que: string; antes?: Pick<EstadoMiWeb, "paginas"> }
export interface EstadoMiWeb {
  /** La versión de la web del equipo que está en vivo. */
  base: number;
  /** El nombre del negocio, para el asistente. */
  negocio: string;
  activa: boolean;
  plan: PlanMensual;
  paginas: Record<string, CambiosPagina>;
  asistente: { activo: boolean; preguntas: PreguntaAsistente[]; whatsapp?: string };
  historia: PasoMiWeb[];
  creado: string;
  actualizado: string;
}

const dir = (id: string) => join(carpeta(), id, "miweb");
const archivo = (id: string) => join(dir(id), "estado.json");
export const REL_MIWEB = "miweb/estado.json";

export function leerMiWeb(id: string): EstadoMiWeb | undefined {
  try { return existsSync(archivo(id)) ? (JSON.parse(readFileSync(archivo(id), "utf8")) as EstadoMiWeb) : undefined; } catch { return; }
}
function guardar(id: string, e: EstadoMiWeb) {
  mkdirSync(dir(id), { recursive: true });
  e.actualizado = new Date().toISOString();
  e.historia = e.historia.slice(-40);
  const tmp = `${archivo(id)}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(e));
  renameSync(tmp, archivo(id));
  return e;
}
const paso = (e: EstadoMiWeb, quien: QuienMiWeb, que: string, conAntes = false) =>
  e.historia.push({ cuando: new Date().toISOString(), quien, que, ...(conAntes ? { antes: { paginas: JSON.parse(JSON.stringify(e.paginas)) } } : {}) });

/** Pone la web en vivo con la versión más nueva del equipo. Solo Jay o Luna: publicar es decisión de ellos. */
export function activarMiWeb(id: string, quien: "jay" | "luna", plan: PlanMensual = "cuidado"): EstadoMiWeb {
  const v = versionesSitio(id)[0];
  if (!v) throw new Error("Este proyecto todavía no tiene web: el equipo tiene que construirla primero.");
  const ahora = new Date().toISOString();
  const e = leerMiWeb(id) ?? { base: v, negocio: leerProyecto(id).pedido.cliente, activa: true, plan, paginas: {}, asistente: { activo: false, preguntas: [] }, historia: [], creado: ahora, actualizado: ahora };
  const era = e.activa && e.historia.length;
  e.activa = true;
  e.plan = plan;
  paso(e, quien, era ? `Cambió el plan a ${PLANES[plan].nombre}` : `Puso la web en vivo (versión ${e.base}, plan ${PLANES[plan].nombre})`);
  return guardar(id, e);
}

export function apagarMiWeb(id: string, quien: "jay" | "luna") {
  const e = leerMiWeb(id);
  if (!e) throw new Error("Esta web no está en vivo.");
  e.activa = false;
  paso(e, quien, "Sacó la web de línea");
  return guardar(id, e);
}

/** Pasa a la versión más nueva del equipo. Los cambios del cliente que ya no encajan se avisan, no se pierden. */
export function usarVersionNueva(id: string, quien: "jay" | "luna") {
  const e = leerMiWeb(id);
  const v = versionesSitio(id)[0];
  if (!e || !v) throw new Error("Esta web no está en vivo.");
  if (v === e.base) return { estado: e, sinEncajar: 0 };
  e.base = v;
  paso(e, quien, `Pasó a la versión ${v} del equipo`);
  guardar(id, e);
  return { estado: e, sinEncajar: revisarMiWeb(id).reduce((n, p) => n + p.sinEncajar.length, 0) };
}

/** Las páginas de la versión en vivo, con lo editable y los cambios que hay. */
export function revisarMiWeb(id: string) {
  const e = leerMiWeb(id);
  if (!e) return [];
  return archivosSitio(id, e.base).filter((a) => a.ruta.endsWith(".html")).map((a) => {
    const html = readFileSync(rutaSitio(id, e.base, a.ruta)!, "utf8");
    const c = e.paginas[a.ruta] ?? {};
    return { pagina: a.ruta, editables: editablesDe(html), fotos: fotosDe(html), cambios: c, sinEncajar: aplicarCambios(html, c).sinEncajar };
  });
}

const MAX_TEXTO = 600;
/** Guarda lo que cambió el cliente en una página. Lo que vuelve a decir lo original deja de ser un cambio. */
export function guardarCambios(id: string, pagina: string, c: CambiosPagina, quien: QuienMiWeb): EstadoMiWeb {
  const e = leerMiWeb(id);
  if (!e?.activa) throw new Error("Esta web no está en vivo.");
  if (quien === "cliente" && !PLANES[e.plan].editaCliente) throw new Error(`Tu plan ${PLANES[e.plan].nombre} incluye cambios hechos por nosotros. Escríbenos y lo cambiamos.`);
  const r = rutaSitio(id, e.base, pagina);
  if (!r || !pagina.endsWith(".html")) throw new Error("No encontramos esa página.");
  const html = readFileSync(r, "utf8");
  const editables = new Map(editablesDe(html).map((x) => [x.clave, x]));
  const fotos = new Set(fotosDe(html).map((f) => f.src));
  const actual = e.paginas[pagina] ?? {};
  const textos = { ...actual.textos };
  const fotosNuevas = { ...actual.fotos };
  let n = 0;
  for (const [k, v] of Object.entries(c.textos ?? {})) {
    const ed = editables.get(k);
    if (!ed) continue;
    const t = String(v).replace(/\r/g, "").trim();
    if (!t) throw new Error(`«${ed.texto.slice(0, 40)}» no puede quedar vacío.`);
    if (t.length > MAX_TEXTO) throw new Error(`Un texto es muy largo: máximo ${MAX_TEXTO} letras.`);
    if (t === ed.texto) { if (textos[k] !== undefined) { delete textos[k]; n++; } continue; }
    if (textos[k] !== t) { textos[k] = t; n++; }
  }
  for (const [src, f] of Object.entries(c.fotos ?? {})) {
    if (!fotos.has(src) || !/^mw-[a-z0-9]+\.(webp|jpe?g|png)$/.test(f.nuevo)) continue;
    if (!existsSync(join(dir(id), "img", f.nuevo))) throw new Error("La foto nueva no se subió bien. Vuelve a elegirla.");
    fotosNuevas[src] = { nuevo: f.nuevo, ...(f.alt?.trim() ? { alt: f.alt.trim().slice(0, 160) } : {}) };
    n++;
  }
  if (!n) return e;
  paso(e, quien, `Cambió ${n} ${n === 1 ? "cosa" : "cosas"} en ${pagina}`, true);
  e.paginas[pagina] = { ...(Object.keys(textos).length ? { textos } : {}), ...(Object.keys(fotosNuevas).length ? { fotos: fotosNuevas } : {}) };
  return guardar(id, e);
}

/** Vuelve atrás el último cambio. */
export function deshacerMiWeb(id: string, quien: QuienMiWeb): EstadoMiWeb {
  const e = leerMiWeb(id);
  const i = e ? e.historia.map((h) => !!h.antes).lastIndexOf(true) : -1;
  if (!e || i < 0) throw new Error("No hay cambios para deshacer.");
  const h = e.historia[i]!;
  e.paginas = h.antes!.paginas;
  delete h.antes;
  paso(e, quien, `Deshizo: ${h.que.charAt(0).toLowerCase()}${h.que.slice(1)}`);
  return guardar(id, e);
}

const MAX_FOTO = 3 * 1024 * 1024;
/** Guarda una foto que subió el cliente. Devuelve su nombre (mw-…), que es lo que se pone en la web. */
export function guardarFotoMiWeb(id: string, datos: Uint8Array, tipo: string): string {
  const ext = ({ "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" } as Record<string, string>)[tipo];
  if (!ext) throw new Error("La foto tiene que ser JPG, PNG o WebP.");
  if (datos.byteLength > MAX_FOTO) throw new Error("La foto pesa mucho: máximo 3 MB.");
  if (datos.byteLength < 100) throw new Error("La foto llegó vacía. Vuelve a elegirla.");
  const nombre = `mw-${createHash("sha256").update(datos).digest("hex").slice(0, 16)}.${ext}`;
  mkdirSync(join(dir(id), "img"), { recursive: true });
  writeFileSync(join(dir(id), "img", nombre), datos);
  return nombre;
}

/** El asistente de su web: preguntas y respuestas que escribe el cliente. */
export function guardarAsistente(id: string, a: { activo: boolean; preguntas: PreguntaAsistente[]; whatsapp?: string }, quien: QuienMiWeb) {
  const e = leerMiWeb(id);
  if (!e?.activa) throw new Error("Esta web no está en vivo.");
  if (quien === "cliente" && !PLANES[e.plan].asistente) throw new Error(`El asistente viene en los planes ${PLANES.autonomo.nombre} y ${PLANES.pro.nombre}.`);
  const preguntas = a.preguntas.map((p) => ({ pregunta: String(p.pregunta ?? "").trim().slice(0, 160), respuesta: String(p.respuesta ?? "").trim().slice(0, 600) })).filter((p) => p.pregunta && p.respuesta).slice(0, 30);
  if (a.activo && !preguntas.length) throw new Error("Escribe al menos una pregunta con su respuesta para encender el asistente.");
  const wa = numeroInternacional(a.whatsapp);
  e.asistente = { activo: a.activo, preguntas, ...(wa ? { whatsapp: wa } : {}) };
  paso(e, quien, `${a.activo ? "Asistente encendido" : "Asistente apagado"} con ${preguntas.length} ${preguntas.length === 1 ? "respuesta" : "respuestas"}`);
  return guardar(id, e);
}

/** Si el asistente sale en la web: encendido, con respuestas y con un plan que lo incluye. */
export const asistenteVisible = (e: EstadoMiWeb) => e.activa && e.asistente.activo && e.asistente.preguntas.length > 0 && !!PLANES[e.plan].asistente;

/** La misma búsqueda que responderAsistente, en JavaScript simple para la web del cliente (sin librerías). */
export const CODIGO_RESPONDER = `var VACIAS=new Set("a al algo como con cual cuales cuando de del donde el ella en es esta este hay la las lo los me mi mis o para pero por que quien se si sin su sus te tu tus un una uno y ya yo usted ustedes tienen tiene hacen hace puedo puede quiero".split(" "));
function palabras(s){return s.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").replace(/[^a-z0-9ñ ]/g," ").split(/\\s+/).filter(function(w){return w.length>1&&!VACIAS.has(w)}).map(function(w){return w.length>4?w.replace(/(es|s)$/,""):w})}
function responder(P,t){var q=new Set(palabras(t));if(!q.size)return;var mejor,puntos=0;P.forEach(function(p){var w=new Set(palabras(p.pregunta)),c=0;q.forEach(function(x){if(w.has(x))c++});var s=c/Math.max(1,Math.min(q.size,w.size));if(c&&s>puntos){puntos=s;mejor=p}});return puntos>=0.5?mejor:undefined}`;

/** El asistente que se suma a la web en vivo: un botón abajo a la derecha y un panel accesible. */
export function scriptAsistente(e: EstadoMiWeb, negocio: string) {
  const datos = JSON.stringify({ p: e.asistente.preguntas, wa: e.asistente.whatsapp ?? "", n: negocio }).replace(/</g, "\\u003c");
  return `(function(){${CODIGO_RESPONDER}
var D=${datos};if(document.getElementById("mw-asistente"))return;
var css="#mw-asistente{position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom));z-index:2147483000;font:15px/1.45 system-ui,-apple-system,sans-serif;color:#1a1816}#mw-asistente button{font:inherit}#mw-abrir{min-height:48px;padding:0 18px;border:0;border-radius:999px;background:#1a1816;color:#fff;box-shadow:0 10px 30px -10px rgba(0,0,0,.45);cursor:pointer}#mw-panel{position:absolute;right:0;bottom:60px;width:min(360px,calc(100vw - 32px));max-height:min(480px,70vh);display:flex;flex-direction:column;background:#fff;border-radius:18px;box-shadow:0 20px 60px -20px rgba(0,0,0,.45);overflow:hidden}#mw-panel[hidden]{display:none}#mw-msgs{flex:1;overflow:auto;padding:14px;display:grid;gap:8px;align-content:start}.mw-yo{justify-self:end;background:#1a1816;color:#fff;padding:8px 12px;border-radius:14px 14px 4px 14px;max-width:85%}.mw-el{background:#f2efe9;padding:8px 12px;border-radius:14px 14px 14px 4px;max-width:90%;white-space:pre-wrap}.mw-el a{color:inherit;font-weight:600}#mw-form{display:flex;gap:8px;padding:10px;border-top:1px solid #eee}#mw-form input{flex:1;min-height:44px;border:1px solid #ddd;border-radius:12px;padding:0 12px;font:inherit}#mw-form button{min-height:44px;border:0;border-radius:12px;background:#1a1816;color:#fff;padding:0 14px;cursor:pointer}.mw-sug{display:flex;flex-wrap:wrap;gap:6px}.mw-sug button{border:1px solid #ddd;background:#fff;border-radius:999px;padding:6px 10px;cursor:pointer;font-size:13px}";
var st=document.createElement("style");st.textContent=css;document.head.appendChild(st);
var r=document.createElement("div");r.id="mw-asistente";
r.innerHTML='<div id="mw-panel" role="dialog" aria-label="Preguntas frecuentes" hidden><div id="mw-msgs" aria-live="polite"></div><form id="mw-form"><input id="mw-q" aria-label="Escribe tu pregunta" placeholder="Escribe tu pregunta" autocomplete="off"><button type="submit">Enviar</button></form></div><button id="mw-abrir" type="button" aria-expanded="false" aria-controls="mw-panel">Preguntas</button>';
document.body.appendChild(r);
var panel=r.querySelector("#mw-panel"),abrir=r.querySelector("#mw-abrir"),msgs=r.querySelector("#mw-msgs"),q=r.querySelector("#mw-q");
function di(t,yo,html){var e=document.createElement("div");e.className=yo?"mw-yo":"mw-el";if(html)e.innerHTML=html;else e.textContent=t;msgs.appendChild(e);msgs.scrollTop=msgs.scrollHeight;return e}
function wa(){return D.wa?'<a href="https://wa.me/'+D.wa+'" target="_blank" rel="noopener">Escríbenos por WhatsApp</a>':""}
var inicio=false;function empezar(){if(inicio)return;inicio=true;di("Hola, soy el asistente de "+D.n+". Pregúntame lo que necesites.");var s=document.createElement("div");s.className="mw-sug";D.p.slice(0,4).forEach(function(p){var b=document.createElement("button");b.type="button";b.textContent=p.pregunta;b.onclick=function(){preguntar(p.pregunta)};s.appendChild(b)});msgs.appendChild(s)}
function preguntar(t){t=String(t||"").trim();if(!t)return;di(t,true);var m=responder(D.p,t);if(m)di(m.respuesta);else di("",false,"No tengo esa respuesta todavía."+(D.wa?" "+wa()+" y te respondemos.":""))}
abrir.onclick=function(){var ab=panel.hidden;panel.hidden=!ab;abrir.setAttribute("aria-expanded",String(ab));abrir.textContent=ab?"Cerrar":"Preguntas";if(ab){empezar();q.focus()}};
r.querySelector("#mw-form").onsubmit=function(ev){ev.preventDefault();preguntar(q.value);q.value=""};
document.addEventListener("keydown",function(ev){if(ev.key==="Escape"&&!panel.hidden){abrir.click();abrir.focus()}});
})();`;
}

/** La página en vivo: la del equipo con los cambios del cliente y, si está encendido, el asistente. */
export function paginaEnVivo(html: string, e: EstadoMiWeb, pagina: string, rutaAsistente: string) {
  let salida = aplicarCambios(html, e.paginas[pagina] ?? {}).html;
  if (asistenteVisible(e)) salida = /<\/body>/i.test(salida) ? salida.replace(/<\/body>/i, `<script src="${rutaAsistente}" defer></script></body>`) : `${salida}<script src="${rutaAsistente}" defer></script>`;
  return salida;
}
