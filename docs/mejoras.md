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
| web/07-movimiento-reducido | Con "reducir movimiento" (sistema) o el nuevo interruptor del pie: sin scroll suave, sin entradas ni transiciones, y los agentes quietos (no flotan, no saltan, el degradado no fluye); la elección se recuerda | Pie de página → "Movimiento" |
| web/08-imagenes-para-compartir | Imagen propia al compartir en WhatsApp y redes: inicio, sala y cada agente (en español e inglés), con los óvalos de degradado; tarjeta grande en X | Automático; poner `ANONYMO_URL` al publicar |
| web/09-transiciones-sala | En la sala, el fondo de la tarjeta elegida se desliza de un agente a otro, las tarjetas entran en cascada al cambiar de fase y el panel cambia con un deslizamiento corto, con el agente elegido en 3D junto a su nombre (todo se apaga con movimiento reducido) | `/sala` |
| web/10-cursor-agentes | En celular los agentes miran a tu dedo (al tocar o arrastrar) y, al hacer scroll, hacia donde va la página | Celular |
| web/11-buscador-equipo | Buscador en "Equipo": "¿quién hace logos?", "video", "precio", "who does photos"… por rol, superpoder y sinónimos, en los dos idiomas, combinable con el filtro por área | `/agentes` |
| web/12-precios-claros | Cada fase muestra su precio: rango calculado con horas típicas × tu tarifa si decides publicarlo (`PRECIOS_PUBLICOS=1`), o "Se cotiza en la fase 01" si no; Proceso explica que se paga solo lo que se usa | `.env.local`: `PRECIOS_PUBLICOS=1` y `TARIFA_HORA` |
| web/13-prueba-social | Sección "Lo que dicen los clientes" en inicio y casos: aparece sola cuando hay testimonios reales, que solo se pueden cargar en casos publicados con permiso y tal como los dijo el cliente | `pipeline testimonio <id> "texto" --autor "Nombre, cargo"` |
| web/14-modo-noche-manual | Interruptor de luz en el pie: automático (hora de Cuenca), noche o día; se recuerda | Pie de página → "Luz" |
| web/15-carga-inicial | Primera visita de la sesión: barra fina arriba y "Despertando agentes 12/22" abajo mientras carga el 3D; no tapa el contenido, se va sola y no aparece con movimiento reducido | Automático |
| web/16-sonido-opcional | Sonidos de Eco, apagados por defecto: al encender suena la firma de dos notas (Jay y Luna), cada agente suena con la nota de su área al tocarlo y la sala marca el cambio de fase. Sintetizados, sin archivos | Pie de página → "Sonido" |
| web/17-404-con-agente | 404 con Sonda recorriendo la pantalla con su lupa, en los dos idiomas, que sugiere la página más parecida al enlace roto ("¿Buscabas Orla?") y ofrece a dónde ir | Cualquier enlace roto |
| web/18-seo-tecnico | Mapa del sitio con los dos idiomas, robots que no indexa estudio ni portales, datos estructurados de la agencia (schema.org) y título y descripción propios en cada página y cada agente | `/sitemap.xml`, `/robots.txt` |
| web/19-analitica | Medición propia sin cookies ni IP (respeta "No rastrear"): visitas, páginas, origen, celular/escritorio, inglés, tiempo en la sala, agentes más vistos y pedidos; tablero de Pulso en el estudio; Plausible opcional | Estudio → "Métricas de la web" (`/estudio/analitica`) |
