// "pipeline doctor": qué está listo y qué falta configurar antes de trabajar con clientes.
import { execSync } from "node:child_process";
import { accessSync, constants, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { AGENTES, FASES } from "@anonymo/agentes";
import { CARPETA, RAIZ } from "./almacen.ts";
import { contratoPorId } from "./contratos.ts";
import { canalesActivos } from "./avisos.ts";

export type Nivel = "ok" | "falta" | "opcional";
export interface Chequeo { nombre: string; nivel: Nivel; detalle: string; arreglo?: string }

export async function revisarSistema(enVivo = false): Promise<Chequeo[]> {
  const c: Chequeo[] = [];
  const [ma, mi] = process.versions.node.split(".").map(Number);
  c.push(ma > 22 || (ma === 22 && mi >= 18)
    ? { nombre: "Node", nivel: "ok", detalle: process.versions.node }
    : { nombre: "Node", nivel: "falta", detalle: process.versions.node, arreglo: "Instala Node 22.18 o más nuevo (corre TypeScript sin compilar)." });

  c.push(existsSync(join(RAIZ, "node_modules", "next"))
    ? { nombre: "Dependencias", nivel: "ok", detalle: "instaladas" }
    : { nombre: "Dependencias", nivel: "falta", detalle: "faltan", arreglo: "npm install" });

  const faltan = FASES.flatMap((f) => f.agentes.filter((a) => !contratoPorId(`${f.n}.${a}`)).map((a) => `${f.n}.${a}`));
  c.push(!faltan.length
    ? { nombre: "Contrato", nivel: "ok", detalle: `${AGENTES.length} agentes con tarea` }
    : { nombre: "Contrato", nivel: "falta", detalle: `sin contrato: ${faltan.join(", ")}`, arreglo: "npm run revisar" });

  try {
    mkdirSync(CARPETA, { recursive: true });
    accessSync(CARPETA, constants.W_OK);
    c.push({ nombre: "Carpeta de proyectos", nivel: "ok", detalle: CARPETA });
  } catch {
    c.push({ nombre: "Carpeta de proyectos", nivel: "falta", detalle: CARPETA, arreglo: "Revisa permisos o define ANONYMO_PROYECTOS." });
  }

  try {
    const ignorado = execSync(`git check-ignore -q proyectos/x/estado.json && echo si || echo no`, { cwd: RAIZ }).toString().trim();
    const hook = execSync("git config core.hooksPath || true", { cwd: RAIZ }).toString().trim();
    c.push(ignorado === "si" && hook === ".githooks"
      ? { nombre: "Proyectos fuera del repo", nivel: "ok", detalle: ".gitignore y candado de commits activos" }
      : { nombre: "Proyectos fuera del repo", nivel: "falta", detalle: `gitignore: ${ignorado} · candado: ${hook || "no"}`, arreglo: "npm install (instala el candado)" });
  } catch {
    c.push({ nombre: "Proyectos fuera del repo", nivel: "opcional", detalle: "no es un repo git" });
  }

  if (!process.env.ANTHROPIC_API_KEY) c.push({ nombre: "Agentes con IA", nivel: "opcional", detalle: "sin clave: modo simulado o manual", arreglo: "ANTHROPIC_API_KEY en .env.local" });
  else if (!enVivo) c.push({ nombre: "Agentes con IA", nivel: "ok", detalle: "clave presente (usa --en-vivo para probarla)" });
  else {
    try {
      const { preguntarClaude } = await import("./ia.ts");
      const r = await preguntarClaude("Responde solo: ok", "ok", 5);
      c.push({ nombre: "Agentes con IA", nivel: "ok", detalle: `la API respondió (${(r ?? "").trim().slice(0, 10)})` });
    } catch (e) {
      c.push({ nombre: "Agentes con IA", nivel: "falta", detalle: (e as Error).message, arreglo: "Revisa la clave y el modelo (ANTHROPIC_MODEL)." });
    }
  }

  try {
    const { chromium } = await import("playwright");
    const b = await chromium.launch();
    await b.close();
    c.push({ nombre: "Navegador para auditorías y PDF", nivel: "ok", detalle: "Chromium listo" });
  } catch {
    c.push({ nombre: "Navegador para auditorías y PDF", nivel: "falta", detalle: "Chromium no está", arreglo: "npx playwright install chromium" });
  }

  const av = canalesActivos();
  c.push({ nombre: "Avisos", nivel: av.correo || av.webhook ? "ok" : "opcional", detalle: `correo ${av.correo ? "sí" : "no"} · webhook ${av.webhook ? "sí" : "no"}`, arreglo: av.correo || av.webhook ? undefined : "RESEND_API_KEY + AVISOS_CORREO o AVISOS_WEBHOOK" });
  c.push({ nombre: "Almacén privado", nivel: process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY ? "ok" : "opcional", detalle: process.env.SUPABASE_URL ? "Supabase configurado" : "sin nube: solo copia local", arreglo: process.env.SUPABASE_URL ? undefined : "SUPABASE_URL + SUPABASE_SERVICE_KEY" });
  c.push({ nombre: "Estudio y portal", nivel: "ok", detalle: process.env.ESTUDIO === "1" || process.env.PORTAL === "1" ? "activados para npm run start" : "solo con npm run dev (o ESTUDIO=1)" });
  c.push({ nombre: "Precio por hora", nivel: process.env.TARIFA_HORA ? "ok" : "opcional", detalle: process.env.TARIFA_HORA ? `$${process.env.TARIFA_HORA}/h` : "sin tarifa", arreglo: process.env.TARIFA_HORA ? undefined : "TARIFA_HORA en .env.local" });
  return c;
}
