# Las 40 mejoras

Una rama por mejora, en cadena (cada una sale de la anterior). Estado y cómo se usa cada una.

## Sistema

| Rama | Qué hace | Cómo se usa |
|---|---|---|
| sistema/01-panel-web | Panel del estudio: proyectos, aprobar, cambiar, parar, pausas, bitácora | `npm run dev` → `/estudio` (o `ESTUDIO=1 npm run start`) |
| sistema/02-portal-cliente | Enlace privado del cliente: ve sus entregas (sin las internas), aprueba fases y comenta | Estudio → "Crear enlace", o `npm run pipeline -- portal <id>`; necesita `PORTAL=1` o `ESTUDIO=1` |
| sistema/03-comentarios-desde-panel | Escribir lo que dijo el cliente (o traer lo que comentó en su portal), ver a quién lo manda Atlas, ajustar agentes y mandarlo | Estudio → proyecto → "Lo que dijo el cliente" |
| sistema/04-comparar-versiones | Cada entrega guarda sus versiones anteriores; en el estudio se ven y se comparan línea por línea | Estudio → entrega → "Versiones" / "comparar" |
| sistema/05-volver-version | Volver a una versión anterior de una entrega (queda como versión nueva) y avisa qué conviene revisar | Estudio → entrega → ver una versión → "Volver a esta versión", o `pipeline volver <id> 3-mira 1` |
| sistema/06-avisos | Aviso cuando un proyecto espera tu decisión, termina, el Jurado no llega o el cliente comenta: archivo `avisos.md`, correo (Resend) y/o webhook | Variables en `.env.example`; prueba con `pipeline avisos <id>` |
| sistema/07-subir-archivos | Fotos, logos y PDFs del cliente en `proyectos/<id>/archivos/`; los agentes visuales ven las imágenes (modo real) y todos ven la lista | Estudio → "Archivos del cliente", portal del cliente, o `pipeline adjuntar <id> foto.jpg --nota "..."` |
| sistema/08-cuestionario-cliente | Las preguntas de Atlas se vuelven un cuestionario en el portal (o las anotas tú); las respuestas entran al pedido y todos los agentes las leen | Portal → "Antes de seguir, cuéntanos"; estudio; o `pipeline responder <id> <n> "..."` |
| sistema/09-exportar-pdf | PDF con portada, índice y las entregas listas, con la tipografía de la agencia (sin las internas, salvo que lo pidas) | Estudio → "PDF para el cliente", o `pipeline pdf <id> [--internas]` |
| sistema/10-calendario-visual | Línea de tiempo por fase con fechas reales (las aprobadas) y estimadas (por duración típica, en días hábiles), con la fecha de hoy | Estudio y portal del cliente; `pipeline calendario <id>` |
| sistema/11-costo-por-proyecto | Costo de IA por entrega y por proyecto (cada rehacer cuenta): real con la API, estimado en simulado o manual | Estudio → "Costo de IA"; `pipeline costo <id>`; precios en `.env` |
| sistema/12-atlas-inteligente | Con clave, Atlas lee el comentario completo y elige agentes con una razón; sin clave usa palabras clave. `ANTHROPIC_BASE_URL` permite probar contra un servidor falso | Estudio → "Ver a quién va"; `pipeline cliente <id> "..." --ver` |
| sistema/13-plantillas-por-rubro | Cinco puntos de partida (salud, comida, profesionales, tienda, espacios): preguntas propias del rubro y consejos de oficio para cada agente | `pipeline nuevo ... --plantilla salud`; `pipeline plantillas` |
