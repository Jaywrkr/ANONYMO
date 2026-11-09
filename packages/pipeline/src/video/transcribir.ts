// Transcripción (sistema/62): Whisper por API, con el tiempo de cada palabra. Es la base para cortar y subtitular.
// Variables (las pone Jay en Vercel): OPENAI_API_KEY. Opcionales: OPENAI_BASE_URL (pruebas) y ANONYMO_WHISPER_MODELO.
import { readFileSync, statSync } from "node:fs";
import { basename } from "node:path";
import type { Palabra, Transcripcion } from "./tipos.ts";

export const whisperConfigurado = () => !!process.env.OPENAI_API_KEY;

/** Límite de la API de Whisper por archivo. */
const LIMITE = 25 * 1024 * 1024;

/**
 * La pista para Whisper: con muletillas escritas, Whisper también las escribe (si no, las borra y los cortes
 * quedan corridos). El idioma se detecta solo.
 */
const PISTA = "Eh, bueno… mmm, o sea, este… ¿sabes? Ajá. Entonces, eh, lo que hacemos es esto.";

export async function transcribir(audio: string, o: { idioma?: string; f?: typeof fetch } = {}): Promise<Transcripcion> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("Falta la clave de transcripción (OPENAI_API_KEY). La pone Jay en Vercel.");
  if (statSync(audio).size > LIMITE) throw new Error("El audio pesa más de 25 MB: el video es demasiado largo para transcribirlo de una vez.");
  const base = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const modelo = process.env.ANONYMO_WHISPER_MODELO ?? "whisper-1";
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(readFileSync(audio))], { type: "audio/mpeg" }), basename(audio));
  form.append("model", modelo);
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "word");
  form.append("timestamp_granularities[]", "segment");
  form.append("prompt", PISTA);
  if (o.idioma) form.append("language", o.idioma);
  let r: Response | undefined;
  for (let intento = 0; intento < 3; intento++) {
    r = await (o.f ?? fetch)(`${base}/audio/transcriptions`, { method: "POST", headers: { authorization: `Bearer ${key}` }, body: form });
    if (r.status !== 429 && r.status < 500) break;
    await new Promise((ok) => setTimeout(ok, 2000 * (intento + 1)));
  }
  if (!r!.ok) {
    const t = (await r!.text()).slice(0, 200);
    throw new Error(r!.status === 401 ? "La clave de transcripción no es válida." : `La transcripción falló (${r!.status}). ${t}`);
  }
  return leerWhisper(await r!.json(), modelo);
}

interface RespuestaWhisper { language?: string; text?: string; words?: { word: string; start: number; end: number }[]; segments?: { text: string; start: number; end: number }[] }

/**
 * Convierte la respuesta de Whisper en nuestras palabras. Whisper deja la puntuación en el texto general,
 * no en cada palabra: se le devuelve a cada una para que los subtítulos corten en los puntos.
 */
export function leerWhisper(j: RespuestaWhisper, modelo?: string): Transcripcion {
  const crudas = (j.words ?? []).filter((w) => w && typeof w.word === "string" && Number.isFinite(w.start) && Number.isFinite(w.end));
  const texto = (j.text ?? "").trim();
  const palabras: Palabra[] = [];
  let cursor = 0;
  for (const w of crudas) {
    let t = w.word.trim();
    if (!t) continue;
    // Busca la palabra en el texto y toma los signos que la rodean («¿», «,», «.»…).
    const i = texto.toLowerCase().indexOf(t.toLowerCase(), cursor);
    if (i >= 0 && i - cursor < 40) {
      let a = i, b = i + t.length;
      while (a > cursor && /[¿¡"«(]/.test(texto[a - 1])) a--;
      while (b < texto.length && /[.,;:!?…»")]/.test(texto[b])) b++;
      t = texto.slice(a, b);
      cursor = b;
    }
    palabras.push({ texto: t, inicio: Math.max(0, w.start), fin: Math.max(w.start, w.end) });
  }
  return { idioma: j.language, texto, palabras, modelo };
}
