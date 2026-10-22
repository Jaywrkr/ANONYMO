// Entrada al estudio en línea: solo Jay y Luna, cada uno con su clave.
// Las claves y el secreto viven en las variables de entorno (Vercel o .env.local), nunca en el repo:
//   ESTUDIO_CLAVE_JAY, ESTUDIO_CLAVE_LUNA  la clave de cada uno (al menos 12 caracteres)
//   ESTUDIO_SECRETO                        firma las sesiones (al menos 32 caracteres al azar)
// Funciona igual en el proxy y en el servidor (usa Web Crypto).

export type Socio = "jay" | "luna";
export const COOKIE = "anonymo_estudio";
export const DURACION = 30 * 24 * 3600; // 30 días, en segundos

const codificar = new TextEncoder();

const claveDe = (q: Socio) => (q === "luna" ? process.env.ESTUDIO_CLAVE_LUNA : process.env.ESTUDIO_CLAVE_JAY);
const secreto = () => process.env.ESTUDIO_SECRETO ?? "";

/** Hay entrada configurada: secreto largo y al menos una clave larga. */
export const sesionConfigurada = () =>
  secreto().length >= 32 && [claveDe("jay"), claveDe("luna")].some((c) => (c?.length ?? 0) >= 12);

const b64url = (b: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function firmar(texto: string) {
  const k = await crypto.subtle.importKey("raw", codificar.encode(secreto()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", k, codificar.encode(texto)));
}

/** Compara sin filtrar por tiempo cuánto se parecen (resume ambos con SHA-256 y compara byte a byte). */
async function iguales(a: string, b: string) {
  const [x, y] = await Promise.all([a, b].map((t) => crypto.subtle.digest("SHA-256", codificar.encode(t))));
  const u = new Uint8Array(x), v = new Uint8Array(y);
  let d = 0;
  for (let i = 0; i < u.length; i++) d |= u[i] ^ v[i];
  return d === 0;
}

/** Revisa la clave. Si alguien no tiene clave configurada (o es corta), no puede entrar. */
export async function claveValida(quien: Socio, clave: string) {
  const c = claveDe(quien);
  if (!sesionConfigurada() || !c || c.length < 12) return false;
  return iguales(clave, c);
}

/** Valor de la cookie: quién.vence.firma. La firma incluye la clave: si cambias tu clave, se cierran tus sesiones abiertas. */
export async function crearSesion(quien: Socio, ahora = Date.now()) {
  const vence = Math.floor(ahora / 1000) + DURACION;
  return `${quien}.${vence}.${await firmar(`${quien}.${vence}.${claveDe(quien)}`)}`;
}

/** Devuelve quién entró, o undefined si la cookie no sirve (falsa, vencida o de alguien sin clave). */
export async function leerSesion(valor: string | undefined, ahora = Date.now()): Promise<Socio | undefined> {
  if (!valor || !sesionConfigurada()) return;
  const [quien, vence, firma] = valor.split(".");
  if ((quien !== "jay" && quien !== "luna") || !vence || !firma) return;
  if (Number(vence) * 1000 < ahora) return;
  if ((claveDe(quien)?.length ?? 0) < 12) return;
  return (await iguales(firma, await firmar(`${quien}.${vence}.${claveDe(quien)}`))) ? quien : undefined;
}
