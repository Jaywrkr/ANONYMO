// Cada prueba trabaja en una carpeta temporal: nunca toca proyectos reales.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.ANONYMO_PROYECTOS = mkdtempSync(join(tmpdir(), "anonymo-pruebas-"));
delete process.env.ANTHROPIC_API_KEY;
delete process.env.AVISOS_WEBHOOK;
delete process.env.RESEND_API_KEY;
