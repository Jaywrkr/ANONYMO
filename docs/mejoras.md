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
| sistema/14-roles-jay-luna | Cada fase tiene quién la aprueba (Jay: arranque, web, jurado, crecimiento; Luna: naming, identidad, lanzamiento), cambiable por proyecto; los avisos dicen a quién le toca | Estudio → "Aprueba" en cada fase; `pipeline responsables <id> 4=luna`; `aprobar --forzar` |
| sistema/15-presupuesto-vivo | Ledger fija las horas base; cuando un cambio suma horas (el agente lo declara), queda como ajuste y Ledger recalcula solo | Estudio → "Presupuesto vivo"; `pipeline presupuesto <id>`; `TARIFA_HORA` en `.env` |
| sistema/16-buscar-en-proyectos | Buscador en todas las entregas de todos los proyectos, sin importar tildes | Estudio → buscador arriba; `pipeline buscar "paleta"` |
| sistema/17-almacen-privado | Copia de cada proyecto en un bucket privado de Supabase (subir, bajar, listar) y un candado que impide hacer commit de archivos de clientes | `pipeline subir <id>` / `bajar <id>` / `nube`; el candado se instala solo con `npm install` |
| sistema/18-pruebas-automaticas | 20 pruebas del pipeline (contrato, Atlas, pausas, roles, portal, archivos, versiones, cuestionario, búsqueda) en carpetas temporales, y CI en GitHub Actions | `npm run probar`; corre solo en cada PR |
| sistema/19-revisar-sistema | `doctor`: revisa Node, dependencias, contrato, carpeta, candado, clave (con `--en-vivo` la prueba), navegador, avisos, nube y tarifa, y dice cómo arreglar lo que falta. Un solo `.env.local` en la raíz para web y terminal | `npm run pipeline -- doctor` |
| sistema/20-entregas-en-ingles | Proyectos en inglés: los agentes escriben en inglés y el portal y el PDF salen en inglés | `pipeline nuevo ... --idioma en`; `pipeline idioma <id> en` |

## Web

| Rama | Qué hace | Cómo se usa |
|---|---|---|
| web/01-rendimiento-movil | three.js en su propio paquete, lienzo creado cuando el navegador está libre, calidad según el equipo (resolución, antialias, caras), óvalos planos de respaldo y nada de 3D con ahorro de datos. Lighthouse celular aquí (sin GPU): 45 → 57 en inicio, 63 en equipo | Automático |
| web/02-formulario-real | "Enviar a Atlas" funciona: valida, frena bots y spam, guarda la solicitud y avisa; en el estudio aparece con "Crear proyecto" (eligiendo plantilla) o "Descartar" | `/contacto` → estudio "Solicitudes desde la web" |
| web/03-caso-dentistas | Páginas de caso `/casos/<id>` armadas desde el proyecto (pedido, lo que dijo el cliente, lo que dijo cada agente) que reemplazan los huecos "Tu proyecto aquí". Solo con permiso del cliente; la sala pública ahora muestra solo proyectos publicados y nunca las entregas internas | `pipeline caso gabriela-y-sebastian --permiso "correo del 22/10" --resumen "..."` |
| web/04-sala-compartible | La sala guarda proyecto, fase y agente en el enlace (`/sala?fase=4&agente=orla`) y tiene "Compartir lo que dijo…" (copia el enlace o abre compartir en el celular) | `/sala` |
| web/05-ingles | Versión en inglés bajo `/en` (inicio, equipo, fichas de los 22 agentes, proceso, sala con el proyecto de la agencia traducido, casos, contacto), selector ES/EN que mantiene la página, `lang` correcto y enlaces alternos para buscadores | `/en` y el botón EN/ES del menú |
| web/06-foco-teclado | Foco visible en todo, "Saltar al contenido" con el primer Tab, fases de la sala con flechas, Inicio y Fin (patrón de pestañas), y menú móvil que atrapa el foco y se cierra con Escape | Teclado |
