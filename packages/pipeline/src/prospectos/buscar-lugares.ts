// Busca negocios en Google Maps (Places API nueva, «Text Search») (sistema/66). La clave la pone Jay en Vercel.
import { CIUDADES } from "./tipos.ts";

export interface Lugar {
  id: string;
  nombre: string;
  direccion: string;
  estrellas?: number;
  resenas: number;
  web?: string;
  telefono?: string;
  mapa?: string;
}

const CAMPOS = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.rating",
  "places.userRatingCount",
  "places.websiteUri",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.googleMapsUri",
  "places.businessStatus",
  "nextPageToken",
].join(",");

/** Solo las pruebas cambian a dónde se pregunta (un Google falso). */
const urlPlaces = () => process.env.GOOGLE_PLACES_URL?.trim() || "https://places.googleapis.com";

export const clavePlaces = () => process.env.GOOGLE_PLACES_API_KEY?.trim() || undefined;

interface RespuestaPlaces {
  places?: {
    id: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    rating?: number;
    userRatingCount?: number;
    websiteUri?: string;
    nationalPhoneNumber?: string;
    internationalPhoneNumber?: string;
    googleMapsUri?: string;
    businessStatus?: string;
  }[];
  nextPageToken?: string;
  error?: { message?: string };
}

/** Hasta 20 lugares por página; `paginas` 1 a 3 (cada página es una consulta pagada a Google). */
export async function buscarLugares(busqueda: string, ciudad: string, paginas = 1, f: typeof fetch = fetch): Promise<Lugar[]> {
  const clave = clavePlaces();
  if (!clave) throw new Error("Falta la clave de Google Maps (GOOGLE_PLACES_API_KEY). La pone Jay en Vercel.");
  const centro = CIUDADES[ciudad];
  const lugares: Lugar[] = [];
  let pagina: string | undefined;
  for (let i = 0; i < Math.max(1, Math.min(paginas, 3)); i++) {
    const cuerpo: Record<string, unknown> = { textQuery: `${busqueda} en ${ciudad}, Ecuador`, languageCode: "es", regionCode: "EC", pageSize: 20 };
    if (centro) cuerpo.locationBias = { circle: { center: { latitude: centro.lat, longitude: centro.lng }, radius: 15000 } };
    if (pagina) cuerpo.pageToken = pagina;
    const r = await f(`${urlPlaces()}/v1/places:searchText`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": clave, "x-goog-fieldmask": CAMPOS },
      body: JSON.stringify(cuerpo),
    });
    const j = (await r.json().catch(() => ({}))) as RespuestaPlaces;
    if (!r.ok) throw new Error(errorPlaces(r.status, j.error?.message, (j.error as { status?: string } | undefined)?.status));
    for (const p of j.places ?? []) {
      if (p.businessStatus && p.businessStatus !== "OPERATIONAL") continue;
      lugares.push({
        id: p.id,
        nombre: p.displayName?.text ?? "Sin nombre",
        direccion: p.formattedAddress ?? "",
        estrellas: p.rating,
        resenas: p.userRatingCount ?? 0,
        web: p.websiteUri,
        telefono: p.internationalPhoneNumber ?? p.nationalPhoneNumber,
        mapa: p.googleMapsUri,
      });
    }
    pagina = j.nextPageToken;
    if (!pagina) break;
  }
  return lugares;
}

/** Lo que pasó con Google, en palabras simples (sistema/78): el cupo, la clave o la cuenta. */
export function errorPlaces(status: number, mensaje = "", codigo = "") {
  const m = `${codigo} ${mensaje}`.toLowerCase();
  if (status === 429 || /resource_exhausted|quota/.test(m))
    return "Se acabó el cupo de búsquedas de Google por hoy. Mañana sigue solo; si lo necesitas antes, sube el límite en Google Cloud → Places API (New) → Cuotas.";
  if (/billing/.test(m)) return "Google pide revisar la facturación del proyecto ANONYMO (la tarjeta o la cuenta de pago). Mientras tanto no se puede buscar.";
  if (status === 403 || status === 400 && /api key|api_key/.test(m) || /permission_denied|api key not valid|api_key_invalid/.test(m))
    return "Google rechazó la clave. Revisa en Vercel que GOOGLE_PLACES_API_KEY sea la de ANONYMO y que tenga permitida Places API (New).";
  return `Google Maps no respondió bien (${status}${mensaje ? `: ${mensaje.slice(0, 120)}` : ""}). Vuelve a intentar en un momento.`;
}
