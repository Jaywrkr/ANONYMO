// La ficha se llena sola (sistema/93): se lee la web del negocio y su Instagram y se proponen datos con su fuente.
// La regla de saber.ts se mantiene: nada se inventa y nada cuenta hasta que Jay o Luna lo aprueban.
// Sin IA y sin costo: la web se lee como texto; Instagram, con la API oficial de Meta (Business Discovery),
// que solo funciona con la cuenta de ANONYMO conectada (INSTAGRAM_TOKEN e INSTAGRAM_CUENTA_ID en Vercel).
import { colorEnHtml } from "../prospectos/paleta.ts";
import { esCelular } from "../prospectos/puntaje.ts";
import { DATOS, type ClaveSaber, type ValorSaber } from "./saber.ts";

export type FuenteLeida = "web" | "instagram";

/** Un dato encontrado que espera que alguien lo apruebe. */
export interface PropuestaDato { clave: ClaveSaber; valor: string; fuente: FuenteLeida; /** Dónde salió: «página /servicios», «su biografía». */ detalle?: string }

export interface EstadoFuente { estado: "ok" | "fallo" | "sin-conexion"; motivo?: string; direccion?: string; paginas?: number }

/** Lo que se leyó la última vez y lo que se propone. Se guarda en la ficha hasta que se aprueba o se descarta. */
export interface LecturaFuentes {
  cuando: string;
  por?: string;
  web?: EstadoFuente;
  instagram?: EstadoFuente;
  propuestas: PropuestaDato[];
}

const MOVIL = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

const entidades = (t: string) =>
  t.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&aacute;/g, "á").replace(/&eacute;/g, "é").replace(/&iacute;/g, "í").replace(/&oacute;/g, "ó").replace(/&uacute;/g, "ú").replace(/&ntilde;/g, "ñ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&#?\w+;/g, " ");
const texto = (h: string) => entidades(h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

/** «593987654321», «+593 98 765 4321» o «098 765 4321» → «0987654321». Solo celulares de Ecuador. */
export function celularLocal(crudo: string | undefined): string | undefined {
  const d = (crudo ?? "").replace(/\D/g, "");
  const n = d.startsWith("593") ? `0${d.slice(3)}` : d;
  return /^09\d{8}$/.test(n) && esCelular(n) ? n : undefined;
}

/** «@clinica.sonrisa» de un enlace de Instagram. Descarta enlaces a publicaciones. */
export function usuarioInstagram(x: string | undefined): string | undefined {
  if (!x) return undefined;
  const m = x.match(/instagram\.com\/([A-Za-z0-9._]{1,30})/i)?.[1] ?? x.trim().match(/^@?([A-Za-z0-9._]{1,30})$/)?.[1];
  return m && !["p", "reel", "reels", "explore", "stories", "accounts", "tv"].includes(m.toLowerCase()) ? m.replace(/\.$/, "") : undefined;
}

const DIAS: Record<string, string> = { Mo: "Lunes", Tu: "Martes", We: "Miércoles", Th: "Jueves", Fr: "Viernes", Sa: "Sábado", Su: "Domingo" };
const DIA_LARGO: Record<string, string> = { Monday: "Lunes", Tuesday: "Martes", Wednesday: "Miércoles", Thursday: "Jueves", Friday: "Viernes", Saturday: "Sábado", Sunday: "Domingo" };

/** El horario de schema.org en palabras: «Mo-Fr 09:00-18:00» → «Lunes a Viernes: 09:00–18:00». */
function horarioSchema(h: unknown): string | undefined {
  const lineas: string[] = [];
  for (const x of Array.isArray(h) ? h : [h]) {
    if (typeof x === "string") {
      const m = x.match(/^([A-Z][a-z](?:[-,][A-Z][a-z])*)\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
      if (!m) continue;
      const dias = m[1].replace(/([A-Z][a-z])/g, (d) => DIAS[d] ?? d).replace(/-/g, " a ").replace(/,/g, ", ");
      lineas.push(`${dias}: ${m[2]}–${m[3]}`);
    } else if (x && typeof x === "object") {
      const o = x as { dayOfWeek?: unknown; opens?: string; closes?: string };
      const dias = (Array.isArray(o.dayOfWeek) ? o.dayOfWeek : [o.dayOfWeek]).map((d) => DIA_LARGO[String(d ?? "").split("/").pop() ?? ""]).filter(Boolean);
      if (dias.length && o.opens && o.closes) lineas.push(`${dias.join(", ")}: ${o.opens.slice(0, 5)}–${o.closes.slice(0, 5)}`);
    }
  }
  return lineas.length ? lineas.join(" · ") : undefined;
}

/** Los bloques de schema.org de la página, aplanados (incluye los que vienen dentro de @graph). */
function datosSchema(html: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const j = JSON.parse(m[1]);
      for (const x of [j].flat()) {
        if (x && typeof x === "object") {
          out.push(x);
          if (Array.isArray(x["@graph"])) out.push(...x["@graph"].filter((y: unknown) => y && typeof y === "object"));
        }
      }
    } catch {}
  }
  return out;
}

const SECCION_SERVICIOS = /servicios|tratamientos|especialidades|lo que hacemos|qu[eé] hacemos|nuestros productos|men[uú]\b|cat[aá]logo/i;
const NO_ES_SERVICIO = /contacto|ubicaci[oó]n|horario|nosotros|qui[eé]nes somos|blog|inicio|testimonio|opiniones|agenda|reserva|cita|preguntas|s[ií]guenos|redes|copyright|derechos|pol[ií]tica|t[eé]rminos|ver m[aá]s|leer m[aá]s|whatsapp|ll[aá]manos|escr[ií]benos|\bfaq\b/i;

/** Los servicios que la página nombra: los de schema.org, o los títulos y elementos bajo una sección «Servicios». */
function serviciosEn(html: string, schema: Record<string, unknown>[]): string[] {
  const lista: string[] = [];
  for (const s of schema) {
    const cat = s.hasOfferCatalog as { itemListElement?: unknown[] } | undefined;
    for (const o of [...(Array.isArray(s.makesOffer) ? s.makesOffer : []), ...(cat?.itemListElement ?? [])]) {
      const n = (o as { itemOffered?: { name?: string }; name?: string })?.itemOffered?.name ?? (o as { name?: string })?.name;
      if (typeof n === "string") lista.push(n);
    }
  }
  if (!lista.length) {
    // La sección empieza en un título que dice «Servicios» y termina en el siguiente título del mismo nivel.
    const t = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ");
    for (const m of t.matchAll(/<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi)) {
      if (!SECCION_SERVICIOS.test(texto(m[2]))) continue;
      const desde = (m.index ?? 0) + m[0].length;
      const resto = t.slice(desde);
      const fin = resto.search(new RegExp(`<h[1-${Math.max(Number(m[1]), 2)}][^>]*>`, "i"));
      const bloque = fin >= 0 ? resto.slice(0, fin) : resto.slice(0, 20_000);
      for (const x of bloque.matchAll(/<(h[3-5]|li)[^>]*>([\s\S]*?)<\/\1>/gi)) lista.push(texto(x[2]));
      if (lista.length >= 3) break;
      lista.length = 0;
    }
  }
  return [...new Set(lista.map((x) => x.replace(/\s*[|·•–-]\s*$/, "").trim()).filter((x) => x.length >= 3 && x.length <= 70 && !NO_ES_SERVICIO.test(x) && !/^\W*$/.test(x)))].slice(0, 12);
}

/** El logo: el de schema.org, o la primera imagen que se llama logo. Solo enlaces completos. */
function logoEn(html: string, schema: Record<string, unknown>[], base: string): string | undefined {
  const absoluta = (u: string | undefined) => { try { return u ? new URL(entidades(u), base).href : undefined; } catch { return undefined; } };
  for (const s of schema) {
    const l = s.logo as string | { url?: string } | undefined;
    const u = typeof l === "string" ? l : l?.url;
    if (u) return absoluta(u);
  }
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    if (!/logo/i.test(m[0])) continue;
    const src = m[0].match(/\s(?:src|data-src)=["']([^"']+)["']/i)?.[1];
    if (src && !src.startsWith("data:")) return absoluta(src);
  }
  return undefined;
}

/** Lo que una página de la web del negocio dice de sí misma. */
export function leerPaginaNegocio(html: string, direccion: string): { propuestas: PropuestaDato[]; enlaces: { texto: string; href: string }[]; redes: string[] } {
  const schema = datosSchema(html);
  const negocio = schema.find((s) => /LocalBusiness|Organization|Dentist|MedicalBusiness|Store|Restaurant|Clinic|Physician|LegalService|BeautySalon|HealthAndBeautyBusiness|ProfessionalService/i.test(String(s["@type"] ?? "")));
  const ruta = (() => { try { return new URL(direccion).pathname; } catch { return "/"; } })();
  const detalle = ruta === "/" || ruta === "" ? "página de inicio" : `página ${ruta}`;
  const p: PropuestaDato[] = [];
  const pon = (clave: ClaveSaber, valor: string | undefined, d = detalle) => { const v = valor?.split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean).join("\n"); if (v) p.push({ clave, valor: v.slice(0, 1200), fuente: "web", detalle: d }); };

  // Redes y WhatsApp: de los enlaces.
  const hrefs = [...html.matchAll(/href=["']([^"']+)["']/gi)].map((m) => entidades(m[1]));
  const redes = [...new Set(hrefs.filter((h) => /instagram\.com|facebook\.com|tiktok\.com|youtube\.com|linkedin\.com/i.test(h)).map((h) => h.replace(/\/$/, "")))];
  const ig = redes.map(usuarioInstagram).find(Boolean) ?? (Array.isArray(negocio?.sameAs) ? (negocio!.sameAs as string[]).map(usuarioInstagram).find(Boolean) : undefined);
  if (ig) pon("instagram", `@${ig}`);
  const nombresRed: [RegExp, string][] = [[/instagram\.com/i, "Instagram"], [/facebook\.com/i, "Facebook"], [/tiktok\.com/i, "TikTok"], [/youtube\.com/i, "YouTube"], [/linkedin\.com/i, "LinkedIn"]];
  const canales = nombresRed.filter(([re]) => redes.some((r) => re.test(r))).map(([, n]) => n);
  if (canales.length) pon("canales", canales.join(", "), `${detalle}, enlaces a sus redes`);
  const wa = hrefs.map((h) => h.match(/(?:wa\.me\/|api\.whatsapp\.com\/send\?phone=|whatsapp:\/\/send\?phone=)\+?(\d{9,15})/i)?.[1]).find(Boolean);
  const tel = hrefs.map((h) => h.match(/^tel:([+\d\s()-]{9,20})/i)?.[1]).map(celularLocal).find(Boolean);
  pon("celular", celularLocal(wa) ?? celularLocal(typeof negocio?.telephone === "string" ? negocio.telephone : undefined) ?? tel, wa ? `${detalle}, botón de WhatsApp` : detalle);

  if (negocio) {
    const a = negocio.address as Record<string, string> | string | undefined;
    pon("direccion", typeof a === "string" ? a : a ? [a.streetAddress, a.addressLocality].filter(Boolean).join(", ") : undefined, `${detalle}, datos para Google`);
    pon("horario", horarioSchema(negocio.openingHoursSpecification ?? negocio.openingHours), `${detalle}, datos para Google`);
  }
  const servicios = serviciosEn(html, schema);
  if (servicios.length >= 2) pon("servicios", servicios.join("\n"));
  const color = colorEnHtml(html);
  if (color) pon("color", color, `${detalle}, colores de la página`);
  const logo = logoEn(html, schema, direccion);
  if (logo) pon("logo", logo);

  // Enlaces internos para seguir leyendo: los que llevan a servicios.
  const enlaces = [...html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map((m) => ({ texto: texto(m[2]), href: (() => { try { return new URL(entidades(m[1]), direccion).href; } catch { return ""; } })() }))
    .filter((e) => e.href && SECCION_SERVICIOS.test(e.texto) && new URL(e.href).host === new URL(direccion).host && e.href.replace(/\/$/, "") !== direccion.replace(/\/$/, ""));
  return { propuestas: p, enlaces, redes };
}

/** Solo direcciones públicas: el estudio no lee máquinas internas (salvo en las pruebas locales). */
export function direccionPermitida(u: string, permitirLocal = process.env.ANONYMO_PERMITIR_LOCAL === "1"): boolean {
  let url: URL;
  try { url = new URL(u); } catch { return false; }
  if (!/^https?:$/.test(url.protocol)) return false;
  if (permitirLocal) return true;
  const h = url.hostname.toLowerCase();
  return !(h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h) || h.startsWith("[") );
}

async function bajar(u: string, f: typeof fetch, ms: number): Promise<{ html: string; final: string } | { motivo: string }> {
  if (!direccionPermitida(u)) return { motivo: "Esa dirección no se puede leer." };
  try {
    const r = await f(u, { redirect: "follow", signal: AbortSignal.timeout(ms), headers: { "user-agent": MOVIL, accept: "text/html,application/xhtml+xml", "accept-language": "es-EC,es;q=0.9" } });
    if (r.status >= 400) return { motivo: `La web da error (${r.status}).` };
    if (!/html/i.test(r.headers.get("content-type") ?? "text/html")) return { motivo: "Esa dirección no es una página web." };
    return { html: (await r.text()).slice(0, 600_000), final: r.url || u };
  } catch (e) {
    return { motivo: (e as Error)?.name === "TimeoutError" ? "La web no respondió a tiempo." : "La web no abre." };
  }
}

/** Lee la web del negocio: la portada y hasta dos páginas de servicios. */
export async function leerWebNegocio(direccion: string, f: typeof fetch = fetch, ms = 9000): Promise<{ estado: EstadoFuente; propuestas: PropuestaDato[] }> {
  const u = /^https?:\/\//i.test(direccion) ? direccion : `https://${direccion}`;
  if (/instagram\.com|facebook\.com|tiktok\.com|linktr\.ee/i.test(u)) return { estado: { estado: "fallo", direccion: u, motivo: "Esa dirección es una red social, no una web propia." }, propuestas: [] };
  const portada = await bajar(u, f, ms);
  if ("motivo" in portada) return { estado: { estado: "fallo", direccion: u, motivo: portada.motivo }, propuestas: [] };
  const inicio = leerPaginaNegocio(portada.html, portada.final);
  const otras = await Promise.all([...new Map(inicio.enlaces.map((e) => [e.href, e])).values()].slice(0, 2).map(async (e) => {
    const b = await bajar(e.href, f, ms);
    return "motivo" in b ? undefined : leerPaginaNegocio(b.html, b.final);
  }));
  const todas = [inicio, ...otras.filter((x): x is NonNullable<typeof x> => !!x)];
  // Por dato, gana la primera que lo trae; los servicios, la página que nombra más.
  const propuestas: PropuestaDato[] = [];
  for (const pg of todas) for (const p of pg.propuestas) {
    const ya = propuestas.findIndex((x) => x.clave === p.clave);
    if (ya < 0) propuestas.push(p);
    else if (p.clave === "servicios" && p.valor.split("\n").length > propuestas[ya].valor.split("\n").length) propuestas[ya] = p;
  }
  return { estado: { estado: "ok", direccion: portada.final, paginas: todas.length }, propuestas };
}

/** Las variables para leer Instagram con la API oficial. Sin ellas, Instagram queda «sin conexión». */
export const instagramConectado = () => !!process.env.INSTAGRAM_TOKEN && !!process.env.INSTAGRAM_CUENTA_ID;

interface Discovery {
  business_discovery?: {
    username?: string; name?: string; biography?: string; website?: string; followers_count?: number; media_count?: number;
    media?: { data?: { caption?: string; media_type?: string; timestamp?: string }[] };
  };
  error?: { message?: string; code?: number };
}

/** Lee una cuenta profesional de Instagram (Business Discovery). Las personales no se pueden leer. */
export async function leerInstagram(usuario: string, f: typeof fetch = fetch, ahora = new Date()): Promise<{ estado: EstadoFuente; propuestas: PropuestaDato[]; web?: string }> {
  const u = usuarioInstagram(usuario);
  if (!u) return { estado: { estado: "fallo", motivo: "No entendimos cuál es su cuenta." }, propuestas: [] };
  if (!instagramConectado()) return { estado: { estado: "sin-conexion", direccion: `@${u}`, motivo: "Falta conectar la cuenta de Instagram de ANONYMO." }, propuestas: [] };
  const base = (process.env.INSTAGRAM_API_URL ?? "https://graph.facebook.com/v25.0").replace(/\/$/, "");
  const campos = `business_discovery.username(${u}){username,name,biography,website,followers_count,media_count,media.limit(24){caption,media_type,timestamp}}`;
  const url = `${base}/${encodeURIComponent(process.env.INSTAGRAM_CUENTA_ID!)}?fields=${encodeURIComponent(campos)}&access_token=${encodeURIComponent(process.env.INSTAGRAM_TOKEN!)}`;
  let j: Discovery;
  try {
    const r = await f(url, { signal: AbortSignal.timeout(9000) });
    j = (await r.json()) as Discovery;
  } catch {
    return { estado: { estado: "fallo", direccion: `@${u}`, motivo: "Instagram no respondió." }, propuestas: [] };
  }
  const d = j.business_discovery;
  if (!d) {
    // El código 110/100 de Meta es «no existe o no es una cuenta profesional»; 190 es el permiso vencido. Nunca se muestra el token.
    const motivo = j.error?.code === 190 ? "El permiso de Instagram venció: hay que conectarlo de nuevo." : "No se pudo leer: la cuenta no existe o no es una cuenta de empresa o creador.";
    return { estado: { estado: "fallo", direccion: `@${u}`, motivo }, propuestas: [] };
  }
  const p: PropuestaDato[] = [];
  const pon = (clave: ClaveSaber, valor: string | undefined, detalle: string) => { const v = valor?.trim(); if (v) p.push({ clave, valor: v.slice(0, 1200), fuente: "instagram", detalle }); };
  pon("instagram", `@${d.username ?? u}`, `${d.followers_count ?? 0} seguidores, ${d.media_count ?? 0} publicaciones`);
  pon("canales", "Instagram", "tiene cuenta de empresa");
  const bio = d.biography ?? "";
  pon("celular", celularLocal(bio.match(/(?:\+?593|0)[\s.-]?9[\d\s.-]{8,12}/)?.[0]), "su biografía");
  const medios = d.media?.data ?? [];
  const fotos = medios.filter((m) => m.media_type === "IMAGE" || m.media_type === "CAROUSEL_ALBUM").length;
  if (fotos >= 3) pon("fotos", `${fotos} fotos en sus últimas ${medios.length} publicaciones de Instagram (@${d.username ?? u})`, "sus publicaciones");
  pon("logo", `Su foto de perfil de Instagram (@${d.username ?? u})`, "su perfil");
  // Cada cuánto publica hoy: las publicaciones de los últimos 60 días.
  const recientes = medios.filter((m) => m.timestamp && ahora.getTime() - Date.parse(m.timestamp) <= 60 * 864e5).length;
  const porSemana = (recientes / 60) * 7;
  const semana = Math.round(porSemana), mes = Math.max(1, Math.round(recientes / 2));
  const frecuencia = !recientes ? "No ha publicado en los últimos dos meses"
    : porSemana >= 1 ? (semana === 1 ? "Hoy publica más o menos una vez por semana" : `Hoy publica unas ${semana} veces por semana`)
    : mes === 1 ? "Hoy publica más o menos una vez al mes" : `Hoy publica unas ${mes} veces al mes`;
  if (medios.length) pon("frecuencia", frecuencia, "fechas de sus publicaciones");
  // El tono no se propone: «cómo habla la marca» es un juicio, no un dato que se pueda leer.
  return { estado: { estado: "ok", direccion: `@${d.username ?? u}` }, propuestas: p, web: d.website };
}

/** Qué leer de un cliente: su web y su Instagram, de lo que ya se sabe. */
export function fuentesDe(saber: Partial<Record<ClaveSaber, ValorSaber>>, web: string | undefined) {
  const w = web?.trim() && !/instagram\.com|facebook\.com|tiktok\.com/i.test(web) ? web.trim() : undefined;
  const ig = usuarioInstagram(saber.instagram?.valor) ?? usuarioInstagram(web);
  return { web: w, instagram: ig };
}

/** Lee todo lo que se pueda y arma las propuestas. Solo propone lo que falta o lo que dice otra cosa. */
export async function leerFuentes(
  entrada: { saber: Partial<Record<ClaveSaber, ValorSaber>>; web?: string },
  f: typeof fetch = fetch,
  ahora = new Date(),
): Promise<LecturaFuentes> {
  let { web, instagram } = fuentesDe(entrada.saber, entrada.web);
  const lectura: LecturaFuentes = { cuando: ahora.toISOString(), propuestas: [] };
  const todas: PropuestaDato[] = [];
  // Instagram primero: si no hay web anotada, su biografía puede traerla.
  if (instagram) {
    const r = await leerInstagram(instagram, f, ahora);
    lectura.instagram = r.estado;
    todas.push(...r.propuestas);
    if (!web && r.web && !/instagram\.com|linktr\.ee|facebook\.com/i.test(r.web)) web = r.web;
  }
  if (web) {
    const r = await leerWebNegocio(web, f);
    lectura.web = r.estado;
    todas.push(...r.propuestas);
    // Si la web lleva a un Instagram que no conocíamos, se lee también.
    const igWeb = usuarioInstagram(r.propuestas.find((p) => p.clave === "instagram")?.valor);
    if (!instagram && igWeb) {
      const i = await leerInstagram(igWeb, f, ahora);
      lectura.instagram = i.estado;
      todas.push(...i.propuestas);
    }
  }
  // Un dato por clave: gana Instagram para lo de la marca y la web para lo del negocio. «Canales» junta los dos.
  const porClave = new Map<ClaveSaber, PropuestaDato>();
  for (const p of todas) {
    const ya = porClave.get(p.clave);
    if (!ya) { porClave.set(p.clave, p); continue; }
    if (p.clave === "canales") porClave.set("canales", { ...ya, valor: [...new Set([...ya.valor.split(", "), ...p.valor.split(", ")])].join(", "), detalle: "su web y su Instagram" });
    else if (["horario", "direccion", "servicios", "color"].includes(p.clave) && p.fuente === "web") porClave.set(p.clave, p);
  }
  // Lo que ya se sabe «cubre» lo leído si dice lo mismo, o si ya trae cada línea (por ejemplo, servicios con uno de más).
  const cubre = (sabido: string, leido: string) => igual(sabido, leido) || leido.split("\n").every((l) => sabido.split("\n").some((x) => igual(x, l)));
  const igual = (a: string, b: string) => a.toLowerCase().replace(/[^a-z0-9áéíóúñ#]/g, "") === b.toLowerCase().replace(/[^a-z0-9áéíóúñ#]/g, "");
  lectura.propuestas = [...porClave.values()]
    .filter((p) => DATOS[p.clave] && !(entrada.saber[p.clave] && cubre(entrada.saber[p.clave]!.valor, p.valor)))
    .sort((a, b) => Object.keys(DATOS).indexOf(a.clave) - Object.keys(DATOS).indexOf(b.clave));
  return lectura;
}

export const NOMBRE_FUENTE_LEIDA: Record<FuenteLeida, string> = { web: "su web", instagram: "su Instagram" };
