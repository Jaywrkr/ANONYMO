// Whisper falso (sistema/62): responde como la API de transcripción, con tiempos por palabra.
// El guion de prueba tiene una pausa larga, una muletilla y silencio al principio y al final.
import http from "node:http";
const GUION = [
  ["Hola,", 0.9, 1.3], ["eh,", 1.4, 1.7], ["somos", 1.8, 2.15], ["ANONYMO.", 2.2, 2.9],
  ["Hoy", 4.6, 4.85], ["te", 4.9, 5.0], ["mostramos", 5.05, 5.6], ["cómo", 5.65, 5.9], ["editar", 5.95, 6.3], ["un", 6.35, 6.45], ["video", 6.5, 6.9], ["sin", 6.95, 7.15], ["complicarte.", 7.2, 7.9],
];
const registro = [];
http.createServer(async (req, res) => {
  const cuerpo = await new Promise((r) => { const c = []; req.on("data", (d) => c.push(d)); req.on("end", () => r(Buffer.concat(c))); });
  if (req.method === "GET" && req.url === "/__registro") { res.end(JSON.stringify(registro)); return; }
  if (req.method !== "POST" || !req.url.endsWith("/audio/transcriptions")) { res.writeHead(404).end(); return; }
  if (req.headers.authorization !== "Bearer sk-prueba-whisper") { res.writeHead(401).end("{}"); return; }
  const texto = cuerpo.toString("latin1");
  registro.push({ bytes: cuerpo.length, palabras: /timestamp_granularities\[\]"\r\n\r\nword/.test(texto), modelo: /name="model"\r\n\r\n([^\r]+)/.exec(texto)?.[1] });
  await new Promise((r) => setTimeout(r, Number(process.env.PAUSA ?? 1500)));
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify({ language: "spanish", text: GUION.map((g) => g[0]).join(" "), words: GUION.map(([w, start, end]) => ({ word: w.replace(/[.,]/g, ""), start, end })) }));
}).listen(Number(process.env.PUERTO ?? 45889), () => console.log("whisper falso en", process.env.PUERTO ?? 45889));
