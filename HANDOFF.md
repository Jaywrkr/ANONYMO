# HANDOFF: cómo seguir ANONYMO

Para quien siga el desarrollo (Codex u otro agente de código). Escrito el 29 de octubre de 2026, en la versión **0.44**.
Primero lee [README.md](README.md) (qué hay y cómo correrlo) y [AGENTS.md](AGENTS.md) (reglas del repo).


**Trabajo 0.72 para revisión (sistema/71-agentes-en-su-lugar):** fase 3 de [docs/mapa-agencia.md](docs/mapa-agencia.md), menos la muestra automática. `packages/pipeline/src/video/guiones.ts`: `escribirGuion` (Faro, herramienta `escribir_guion`), `aprobarGuion`, `unirGuionAVideo`, `guionParaCorte`; tienda `_guiones/lista/guiones.json`; rutas `app/estudio/video/guiones/` (POST) y `guiones/[gid]` (PATCH aprobar); componente `Guiones.tsx`. `TrabajoVideo.guion` une el video a su guion y `mensajeAtlasVideo` se lo pasa a Corte (el prompt de video ahora es de Corte). Prospectos: `revision.sonda` (descripción, títulos, redes) desde `leerSonda`, y `TANDA_DIARIA = 20` con el filtro «La tanda de hoy» por defecto. Pruebas: `test/guiones.test.ts`, `e2e-guiones.mjs` (pedido → Faro → aprobar → subir → Corte lee el guion), `e2e-clientes.mjs` amplía con tanda y Sonda. Siguiente: muestra automática y fase 4 (contenido mensual de ANONYMO).

**Trabajo 0.71 para revisión (sistema/70-ficha-cliente, va encima de 0.70):** fase 2 de [docs/mapa-agencia.md](docs/mapa-agencia.md). `packages/pipeline/src/clientes/`: `construirCartera()` arma las fichas uniendo proyectos (por `pedido.ficha` o por nombre), prospectos (por `proyecto` o, si ya hay relación, por nombre), videos y kits (por nombre) y lo escrito a mano (`_clientes/lista/fichas.json`: notas, contacto, alias). El id de la ficha es `idFicha(nombre)` = `slug`. `Pedido.ficha` nuevo y opcional; los prospectos guardan `historial`. Páginas: `/estudio/clientes` (cartera), `/estudio/clientes/nuevos` (Imán, antes en `/estudio/clientes`), `/estudio/cliente/[id]` (ficha, acciones en `app/estudio/cliente/acciones.ts`). `accionNuevoProyecto` recibe `ficha` y `prospecto` y deja el prospecto como cliente. Pruebas: `test/fichas.test.ts` y `e2e-clientes.mjs` (ahora crea el pedido y recorre proyecto → ficha → prospecto). `e2e-video-atlas` falló una vez corriendo detrás de otras pruebas (botón de subir sin habilitar) y pasó sola. Siguiente: fase 3 (cada función con sus agentes).

**Trabajo 0.70 para revisión (sistema/69-una-sola-espera, sale de main con 0.69):** cierra la fase 1 de [docs/mapa-agencia.md](docs/mapa-agencia.md). `Trabajando.tsx` escucha `submit` en captura: todo formulario de acción del servidor (campo `$ACTION_ID_…`) muestra el aviso chico hasta que cambia la página; el texto sale de `data-trabajando` del botón o de lo que dice el botón; `data-sin-espera` en el formulario lo excluye; `error.tsx` emite `anonymo:liberar`. Pestañas del proyecto: todas visibles en una fila con desplazamiento (`PestanaVisible` centra la actual). Banco: en celular, carrusel por nivel con `scroll-snap`. `e2e-navegacion.mjs` cubre las tres cosas. Siguiente: fase 2 del mapa, la ficha única del cliente.

**Trabajo 0.69 para revisión (sistema/68-pulir-base, va encima de 0.68):** fase 1 de [docs/mapa-agencia.md](docs/mapa-agencia.md), primera parte. `correr()` en `app/estudio/acciones.ts`: sin `ruta`, vuelve a la página y pestaña desde donde se envió el formulario (`origen()`, lee el `referer` y quita `ok`, `error`, `fiesta`, `vista`, `pendiente`); `ruta: "."` = página principal del proyecto (aprobar, pedir cambio, elegir o pedir direcciones). Todas las redirecciones de acciones usan `RedirectType.replace`. Menú: departamentos arriba, «Taller» plegable (abierto en sus páginas). Celular: barra Inicio · Clientes · nuevo pedido · Video · Atlas (evento `anonymo:atlas`), sin botón flotante de Atlas. Prueba nueva: `scripts/pruebas/e2e-navegacion.mjs`; se ajustaron `e2e-atlas`, `e2e-memoria`, `e2e-oficio` y `e2e-banco` al menú y la barra nuevos. Lo que faltaba de la fase 1 se hizo en 0.70. En esta máquina `calidad.ts` no corre (Chromium/Lighthouse da ENOENT), así que `e2e-calidad-movil` y `e2e-estandar` no se pudieron comprobar; el resto de las pruebas de punta a punta pasan.

**Trabajo 0.68 para revisión (sistema/67-mapa-agencia, va encima de 0.67):** solo documentación. Jay pidió pensar ANONYMO como una agencia completa y pulir antes de sumar. Nuevo norte del producto en [docs/mapa-agencia.md](docs/mapa-agencia.md) (funciones de una agencia, estado de cada una, recorrido del cliente, orden de construcción) y reglas de interacción con las fallas encontradas al auditar en [docs/experiencia.md](docs/experiencia.md). **Lo siguiente es la fase 1, «Pulir lo que existe»**: empieza por las 14 llamadas a `correr()` sin `ruta` en `app/estudio/acciones.ts` (te devuelven a Resumen; mejor que cada formulario mande su dirección de origen y `correr` vuelva ahí siempre) y los avisos fuera de la dirección. Las prioridades de diseño de la sección 2 siguen vigentes, pero van después de la fase 1.

**Trabajo 0.67 para revisión (sistema/66-clientes-nuevos, sale de main con 0.66):** nace el escritorio de Imán, «Clientes nuevos» (Menú → Clientes nuevos, `/estudio/clientes`). Busca negocios en Google Maps (Places API nueva, `GOOGLE_PLACES_API_KEY`, la pone Jay), revisa su web sin navegador (`revisarWeb`: redes, rota, celular, https, año, generador, tiempo), puntúa 0–100 con reglas fijas (`puntuar`) y arma el mensaje de WhatsApp (`mensajeInicial`). La lista vive en `_prospectos/lista/lista.json` en la nube privada (nunca en el repo) y se cambia leyendo lo último antes de guardar. «Convertir en pedido» abre `/estudio/nuevo?q=…&cliente=…` (el formulario ahora acepta `cliente`). `GOOGLE_PLACES_URL` solo para pruebas. Código en `packages/pipeline/src/prospectos/`. Ver [docs/clientes.md](docs/clientes.md). Pruebas: `test/prospectos.test.ts` y `scripts/pruebas/e2e-clientes.mjs` (levanta su propio Google y webs falsas en 45999).

**Trabajo 0.66 para revisión (sistema/65-video-motion-marca, misma rama `claude/sweet-curie-imkk01`, va encima de 0.65):** fase 3 del video con FFmpeg (sin Remotion). `Edicion` suma `motion` (zoomAlterno, zoomPartes, transicion) y `marca` (logoEsquina, cierre, cierreSegundos, musica, volumenMusica); `edicionSegura` completa los videos viejos. Kits en `_marcas/<id>/` (`marcas-video.ts`, página `/estudio/video/marcas`). `filtrosRender` arma zoom por tramo, `xfade`/`acrossfade`, logo con `overlay`, cierre con `color` + logo (o nombre con libass) y música con `sidechaincompress`. La huella del resultado incluye la marca y la fecha del kit. Atlas suma acciones `zoom`, `transicion` y `marca`. Prueba nueva: `scripts/pruebas/e2e-video-marca.mjs`.

**Trabajo 0.65 para revisión (sistema/64-video-sin-transcripcion, misma rama `claude/sweet-curie-imkk01`, va encima de 0.64):** Jay pidió no usar Whisper/OpenAI. El análisis (`analizarVideo`) mide el volumen, detecta silencios con `silencedetect` y divide el video en partes (`partesDesdeSilencios`); `hojaDeCuadros` saca una miniatura numerada por parte (`cuadros.jpg`, números con libass porque ffmpeg-static no trae drawtext). `Edicion.quitadas` son índices de partes. Atlas recibe la hoja como imagen (`pedirEstructura` acepta bloques). Se eliminaron transcripción, subtítulos, muletillas, Whisper falso y `OPENAI_API_KEY`. Ver [docs/video.md](docs/video.md).

**Trabajo 0.64 para revisión (sistema/63-video-atlas, misma rama `claude/sweet-curie-imkk01`, va encima de 0.63):** fase 2 del departamento de video: Atlas convierte el pedido de Luna en acciones sobre el JSON de edición (`atlas-video.ts`, herramienta `editar_video` por la API de Anthropic); las acciones se aplican sin IA (`aplicarAcciones` + `edicionSegura`). Pedido al subir (se aplica al terminar la transcripción y arma los formatos pedidos), chat en el editor, «Deshacer lo de Atlas», conversación en `trabajo.json`. Cambio compartido: `pedirEstructura` ya no fuerza la herramienta en Sonnet/Opus 5.5 y Fable/Mythos 5.1–5.2 (respondían 400 y se repetía el pedido). La transcripción sigue en Whisper (OpenAI): la API de Anthropic no recibe audio. Prueba nueva: `scripts/pruebas/e2e-video-atlas.mjs`.

**Trabajo 0.63 para revisión (sistema/62-video-base, rama `claude/sweet-curie-imkk01`, sale de main con 0.62):** nace el departamento de video, fase 1 de 4 (ver [docs/video.md](docs/video.md)). Menú → Video: subir directo a la nube (`_videos/<id>/`, no es un proyecto), transcripción Whisper con tiempos por palabra (`OPENAI_API_KEY`, la pone Jay), cortes de pausas y muletillas, editar tocando el texto, subtítulos con 3 plantillas, vista previa instantánea en el navegador y render FFmpeg por formato (9:16, 1:1, 16:9) con −14 LUFS. `ffmpeg-static` solo se incluye en `/estudio/video/*/paso` (se busca por ruta, no con import, para no meter 80 MB en cada función). Siguiente: fase 2, Atlas convierte el pedido en el JSON de edición (`Edicion`, validado por `edicionSegura`). Pruebas: `test/video.test.ts` y `scripts/pruebas/e2e-video.mjs` (nube.sh ahora levanta un Whisper falso).

**Trabajo 0.62 para revisión (sistema/61-capturas-estudio, sale de la 60):** botón «Sacar capturas» en el banco. La lógica pasó de `scripts/banco/capturar.ts` al pipeline (`capturas-banco.ts`, maquetas en `arquetipos.ts`); el script la reutiliza. En línea corre en pasos de `/trabajo/capturas` con el Chromium del servidor (`navegadorCalidad`, @sparticuz en Vercel), el mismo candado y relevo que la calibración, y sube cada imagen apenas la saca (`_banco/capturas`, índice `_agencia/banco-capturas.json`, avance `_agencia/capturas/en-curso.json`). No empieza una captura si quedan menos de 70 s del paso. Enlaces editables por referencia (`cambiarEnlacesBanco`). En pruebas, `ANONYMO_CAPTURA_TIMEOUT_MS` acorta la espera de sitios sin internet. Algunos sitios premiados pueden bloquear navegadores automáticos: quedan listados con el motivo.

**Trabajo 0.61 para revisión (sistema/60-redes-visual):** Jay señaló que en redes la imagen pesa tanto como la idea y la rúbrica de contenido no tenía criterio visual. Se agregó `visual` al oficio de contenido (aplica también a piezas descritas, para no dejar pendientes las entregas de texto). `contenidoArquetipo()` dibuja un feed de 9 publicaciones por plantilla (frase-canva, carrusel-tips, producto-plano, foto-banco, oferta-recargada, logo-gigante, texto-largo) y `capturar.ts` ahora incluye contenido: arquetipo dibujado, `imagen` → `-pieza.png`, o la página del caso (`url`). El juez recibe la orden de ignorar premios o logos de festivales que aparezcan en la imagen. Criterios editables por referencia (`cambiarCriteriosBanco`, `_agencia/banco.json` → `criterios`); `deducirRubrica` cuenta solo las referencias que opinan sobre cada criterio. Las campañas reales todavía no tienen `visual` marcado ni capturas: Redes no se calibra hasta tenerlas. También: `e2e-nuevo.mjs` fallaba ~1 de 3 veces (la frase rápida devuelve el foco a la caja de texto un cuadro después y el nombre del cliente caía ahí); ahora espera ese cuadro y sale con error si no se crea el proyecto, en vez de pasar en silencio.

**Integrado en main: 0.60 (sistema/59-calibrar-por-disciplina):** en producción la ronda 2 quedó en «0 de 54»: los registros de Vercel mostraron que el paso siguiente bajó un `en-curso.json` viejo («44/54» con el candado del paso anterior) y se detuvo. Ahora cada paso escribe `paso` (uuid) en en-curso y lo pasa al siguiente (`x-anonymo-despues`); si el siguiente baja otra identidad, espera 5 s y vuelve a bajar (hasta 8 veces). `bajarProyecto` pide `cache: "no-store"` y las subidas mandan `cache-control: no-cache`. El banco: cada pestaña calibra, muestra y reinicia solo su disciplina (`ultimoInforme(d)`, `rondasCalibracion(d)`, `reiniciarJuez(d)`), y las acciones vuelven a la misma pestaña.

**Integrado en main: 0.59 (sistema/58-escala-juez):** segunda calibración de naming (con el encuadre de 0.58): diferencia 1,65, consistencia 0, sesgo premiadas −1,8 y genéricas −2,7 (el juez ponía 2–3 a nombres descriptivos que el banco califica 5–6). La escala de `calibracion()` en oficio.ts decía «6–7 genérico, 5 o menos principiante»; ahora es la del banco (5–6 genérico, 3–4 principiante, ser genérico no lo vuelve principiante). `ENCUADRE_VERSION` = 3 y el reinicio de ajustes/corrección se hace también al empezar cada paso: en producción los 3 ajustes viejos sobrevivieron y cortaron la calibración en la ronda 1. Esto cambia también la nota de las entregas reales.

**Integrado en main: 0.58 (sistema/57-juez-pieza-terminada):** la primera calibración real de naming dio −4 en premiadas porque el juez trataba cada referencia como entrega de cliente («nombre ya existente, es copia», «un solo nombre, sin alternativas», «MARCA vacío»). Ahora `calificarCiega` antepone `ENCUADRE_REFERENCIA` (pieza terminada, no resta por ser conocida ni por no traer brief) y MARCA dice «No aplica». Las instrucciones de calificación (`textoJuez`) no cambian. Al iniciar una calibración con otro `ENCUADRE_VERSION` se descartan ajustes y corrección viejos. Falta recalibrar naming para confirmarlo.

**Integrado en main: 0.57 (sistema/56-calibracion-en-vivo):** la calibración sube su avance después de cada tanda y usa un candado (`ocupadoHasta` en `en-curso.json`): un segundo paso no trabaja mientras otro está vivo. Antes, un reintento de `lanzarCalibracion` podía correr dos pasos a la vez y uno pisaba el `juez.json` del otro. El estudio muestra el sesgo por nivel, las 10 referencias con más error y la clasificación con nota calibrada. Primera calibración real (naming, 4 nov): el juez acierta 23/23 genéricas pero 0/15 premiadas (les pone ~3 puntos menos); con la corrección, diferencia ≈ 1. Siguiente: revisar las referencias con más error y decidir si se ajusta el juez o las notas.

**Integrado en main: 0.56 (sistema/55-banco-calibracion, incluye sistema/54-oficio):** banco de calibración con 188 referencias (web 46, identidad 42, naming 50, redes 50) en `data/banco/*.json` (solo índice; capturas privadas en `_banco/capturas`). La rúbrica (pesos que suman 10) se deduce del banco y la lee el juez; la calibración a ciegas usa el mismo `textoJuez` de calidad.ts, mide diferencia, clasificación y consistencia, ajusta al juez por rondas y guarda la corrección de la nota (`_agencia/juez.json`). Comparación a ciegas por pares desde Requisitos y calidad. **Falta la calibración real**: en esta máquina no hubo clave de IA ni acceso a los sitios. Pasos en [docs/banco.md](docs/banco.md). Pruebas nuevas: `test/banco.test.ts`, `scripts/pruebas/banco.ts` + `e2e-banco.mjs`.

**Trabajo 0.54 de oficio, va con 0.56 (sistema/54-oficio):** estándar de oficio por disciplina (web, identidad, naming, contenido, textos), cómo comunica cada uno de 11 rubros (reconocido solo por el pedido) y «Criterio de la casa» editable por Jay y Luna. Lo leen el agente antes de producir y el revisor al calificar, con una escala donde 8 = estudio líder y cualquier recurso de plantilla no pasa de 6. Ver [docs/oficio.md](docs/oficio.md). Siguiente: calibrar con entregas reales que Jay acepte o rechace.

**Trabajo 0.55 para revisión:** historial privado de copias, comparación por archivo y recuperación con revisión base, pausa y confirmación escrita. Publica una revisión nueva y cierra las reservas anteriores en la misma transacción; retira aprobaciones y conserva gastos, comentarios, portal y cola actual de avisos. Los avisos del piloto se guardan con el proyecto, con envío manual habilitable, destinos fijados y recibos por canal; reintentos limitados y webhook sujeto a deduplicación del receptor. No se activó producción ni se enviaron mensajes reales. Incluye 0.54 pendiente de main. Ver [docs/recuperacion-y-avisos.md](docs/recuperacion-y-avisos.md).

**Trabajo 0.54 para revisión:** el diagnóstico autenticado distingue piloto apagado, selección ausente, esquema incompatible y permisos inseguros. La nueva función `anonymo_preparacion` solo inspecciona el catálogo de PostgreSQL; no lee proyectos ni escribe reservas. Reaplicar `infra/publicaciones.sql` en ensayo para disponer de ella. CI incorpora el build real del estudio con navegador móvil y servicios ficticios, además de las carreras SQL. El acceso HTTP a Vercel sigue bloqueado con 403 desde este entorno; no se validó ni activó producción. 0.53 ya está integrado en main mediante el PR #80; despliegue por comprobar. Ver [docs/validacion-54.md](docs/validacion-54.md). El push de `sistema/54-ensayo-del-piloto` se restableció y la rama ya está publicada. La creación del PR por API sigue respondiendo Forbidden.

**Integrado en main: 0.53 (PR #80):** integra las reservas SQL con el ejecutor y el guardado del proyecto mediante archivos inmutables y un índice confirmado junto con el cierre del trabajo. Piloto desactivado por defecto; requiere aplicar ambos esquemas SQL en ensayo y seleccionar proyectos explícitamente. Las copias desactualizadas se archivan y pueden descargarse desde Ajustes → Revisar avances en conflicto. Correos/webhooks y eliminación remota quedan bloqueados en el piloto hasta contar con salida transaccional y purga segura. No se ha activado ni migrado producción. 0.51 y 0.52 ya están en main mediante el PR #79; despliegue por comprobar. Ver [docs/publicacion-atomica.md](docs/publicacion-atomica.md).

**Integrado en main: 0.52 (PR #79, incluye 0.51):** selección de hasta cuatro referencias privadas de web/identidad, con copias inmutables y criterios explícitos. El productor las recibe incluso al continuar; el revisor recibe las mismas imágenes y una condición por referencia. Cambiar la selección invalida las revisiones afectadas, sin borrar copias históricas. `/estudio/conexiones` permite comprobar desde el despliegue una respuesta breve del modelo y la configuración privada del almacén, sin leer proyectos ni mostrar claves. El esquema de cola se comprobó en PostgreSQL real con conexiones independientes, sin aplicarlo ni conectarlo al ejecutor actual. No certifica calidad creativa ni ejecución distribuida. La fusión se comprobó en main; el despliegue posterior requiere verificación. Ver [docs/estandar-creativo.md](docs/estandar-creativo.md).

**Trabajo 0.51 para revisión:** chat flotante en la esquina inferior derecha de todo el estudio, con contexto de proyecto, borrador persistente al cerrar, Enter/Shift+Enter, Escape y opciones bajo demanda. La página `/atlas` se dedica a memoria y decisiones.  decisiones con vigencia calculada por versión, contexto, fuentes directas y aprobación de la entrega. El productor recibe solo las confirmadas de sus lecturas; puede citarlas por id. El contexto se fija antes de producir y se conserva entre vueltas; si se mezcla o falta, los motivos no adquieren vigencia comprobada y se registra una mejora. Atlas y la vista móvil distinguen propuestas e historia y enlazan la entrega original. Los registros antiguos sin evidencia se conservan, sin confirmarlos por inferencia. Ver [docs/memoria.md](docs/memoria.md).

**Integrado en main: 0.50 (PR #78):** las webs añaden comprobaciones de enlaces locales, anclas, recursos y casos de interacción de `pruebas.json` a 390 y 1440 px. La última acción de un caso debe cambiar su condición; los pasos preparatorios no acreditan otros botones. Los formularios quedan pendientes hasta comprobar recepción real. Fallos técnicos piden cambios antes de gastar en la revisión de IA; formularios y conexiones sin verificar quedan pendientes. Los informes antiguos de Vector se invalidan por cambio de política. Detalles y prueba nueva en [docs/funciones-web.md](docs/funciones-web.md). Incluye 47–49. La fusión se comprobó en main; el despliegue posterior debe verificarse por separado.

**Trabajo 0.49 para revisión:** chat por proyecto `/estudio/[id]/atlas`, con fuentes e historial. Consultar es solo lectura; encargar permite ajustar, verificar, pausar, reanudar y continuar, con recibos y bloqueo por cambio de versión. Decisiones registradas al producir y fallos agrupados en memoria privada. Mira guarda seis SVG editables por versión y el control renderiza muestras a 16/32/128 px. No se ha demostrado calidad creativa con IA real: esta máquina no tiene la clave. El esquema `infra/cola.sql` es preparatorio, sin aplicar ni integrar. Estado de las 14 fases y bloqueos en [docs/plan-agencia.md](docs/plan-agencia.md). Las mejoras 47–50 ya están integradas en main.

Pruebas nuevas (con `nube.sh` iniciado y Node 22):
```bash
TMPDIR=/tmp/anonymo-chromium-141 VERCEL=1 ANONYMO_NUBE=1 SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SERVICE_KEY=x SUPABASE_BUCKET=proyectos ANONYMO_PROYECTOS=/tmp/anonymo-pruebas/operaciones ANTHROPIC_BASE_URL=http://127.0.0.1:45888 ANTHROPIC_API_KEY=sk-ant-prueba-falsa node --experimental-strip-types scripts/pruebas/operaciones.ts
CHROMIUM=/usr/bin/chromium node scripts/pruebas/e2e-atlas.mjs
```
Estos servicios y la identidad son ficticios. El navegador y las capturas son reales; la evaluación semántica procede de la API falsa. No confundir una comprobación técnica con aceptación creativa.

**Trabajo 0.48 para revisión:** requisitos con fuente y condiciones por entrega; estados generado → verificado → aprobado; revisión automática en una vuelta separada, con capturas y auditoría de la versión real. El inicio móvil prioriza búsqueda, avance y pendientes. Ver [docs/calidad.md](docs/calidad.md) para el flujo, límites y pruebas nuevas. `p.controlPendiente` mantiene la revisión en cola y `e.calidad` guarda evidencias y huellas por versión; `tareas[t] === "lista"` solo indica que se generó la entrega. Chromium 141 se incluye en la función de trabajo; su binario se comprobó en esta máquina, no en un despliegue nuevo de Vercel.

---

## 1. Estado actual en una página

**Funciona (probado de punta a punta en la nube falsa y en producción):**
- Crear pedido con archivos, plan de Atlas y «Que empiecen» con modo (un agente a la vez, por fases, automático).
- Trabajo en segundo plano por vueltas de menos de 5 minutos, con señal en vivo, continuación si se alarga, candado (nunca dos vueltas a la vez), pausa y reanudar.
- Revisión por agente (aprobar, pedir cambio, rehacer), notificaciones, campana.
- 3 direcciones de diseño antes de la web; el cliente puede elegir desde su portal.
- Vector entrega la web como archivos; se ve funcionando y se baja en .zip; Biblioteca → «Diseño y web».
- PDF por entrega (cliente / interno), dossier, propuesta editable, marca del cliente, presupuesto vivo, costo de IA.
- Nube (Supabase): sube por contenido (0.43). Arranque seguro, pantalla bloqueada mientras una acción responde y página que se actualiza sola (0.44).

**Lo que Jay quiere ahora, en orden de importancia:**
1. **Diseños de primer nivel** (lo más importante, sección 2).
2. **Un panel de diseño que califique y mande a rehacer** antes de que Jay vea nada (sección 3).
3. **Interacciones extremadamente claras**: si hay que esperar, la persona espera y sabe por qué (sección 4).
4. Después: publicar la web del cliente en GitHub y Vercel con un botón, y un lienzo o moodboard para ver diseños (sección 6).

Proyecto real en curso: **Sebastián Silva y Gabriela Abril** (odontólogos, Cuenca), una web para cada uno, bilingües. Vive en la nube de producción, no en el repo.

---

## 2. PRIORIDAD 1: diseños de primer nivel, no plantillas

### El problema (palabras de Jay)
> «Los diseños que me está dando son diseños web de principiante de hace 4 años y parecen plantilla… no tomó en consideración en lo más mínimo lo que se había planteado que quería el cliente… no podemos salir con algo que parece de niños.»

### Por qué pasa (causas encontradas en el código)
1. **Las direcciones se dibujan con 4 plantillas fijas.** `apps/web/components/estudio/Maqueta.tsx` pinta cada dirección con uno de 4 layouts escritos a mano (`editorial`, `minimal`, `audaz`, `calido`). La IA solo llena colores, 2 fuentes, un titular y 3 items (`packages/pipeline/src/direcciones.ts`, `PEDIDO_DIRECCIONES` y `normalizar`). Por eso las 3 direcciones se ven iguales a cualquier plantilla, sea cual sea el cliente.
2. **A Vector se le prohíbe lo moderno.** `packages/pipeline/src/sitio.ts`, `PEDIDO_SITIO`, dice «sin frameworks ni npm», sitio estático plano. Sale HTML/CSS básico, sin movimiento serio, sin scroll trabajado, sin tipografía expresiva.
3. **Poco contexto del cliente donde importa.** El contrato de Orla (`4.orla` en `contratos.ts`) lee `1.nova, 1.sonda, 3.mira, 3.rhea`. En una web sin fases de marca (como la de Gabriela), Orla recibe solo el pedido: ni el plan de Atlas (`1.atlas`) ni el presupuesto entran. Las referencias del cliente (fotos, webs que le gustan, enlaces) llegan como lista o adjunto, pero el prompt no obliga a usarlas ni a justificar cada decisión con lo que pidió el cliente.
4. **No hay control de calidad de diseño antes de mostrar.** El jurado (Prisma y Trofeo, fase 6) llega al final. Las direcciones y la primera web pasan sin filtro.

### Qué hacer
- **Direcciones como diseño real, no plantilla.** Que cada dirección sea una portada real (HTML/CSS/JS propio por dirección, como hace Vector con el sitio) renderizada en un iframe aislado, o una composición libre descrita con más detalle (grid, escala tipográfica, ritmo, tratamiento de imagen, movimiento). Mantener el json para colores y fuentes (lo usan el PDF y el portal), pero el dibujo no puede salir de 4 moldes. Las 3 deben ser distintas de verdad y cada una explicar qué parte del pedido del cliente resuelve.
- **Permitir librerías modernas y gratuitas por CDN con versión fija** (jsDelivr/cdnjs). Por ejemplo: GSAP + ScrollTrigger (gratis desde 2025), Lenis (scroll suave), SplitType (texto), Three.js u OGL si el concepto 3D lo pide, Swiper o Embla si hay carruseles. También CSS actual: `clamp()`, container queries, `view-transition`, `@property`, fuentes variables, `prefers-reduced-motion`. Sin build (sigue siendo estático y publicable tal cual), sin dependencias pagas, con un presupuesto de peso y rendimiento (Lighthouse móvil ≥ 85).
- **Prompts de Orla y Vector con estándar alto y explícito.** Que vean referencias de nivel Awwwards/SOTD (por rubro), tengan una lista de lo que hace que un diseño se vea «de plantilla» (hero centrado con botón, 3 tarjetas iguales, iconos genéricos, degradados por defecto, stock) y que lo eviten. Deben justificar cada decisión con el pedido y las respuestas del cliente.
- **Más contexto**: agregar `1.atlas` (y lo que exista de marca) al `usa` de `4.orla` y `4.vector`. Pasar las referencias del cliente (imágenes ya van adjuntas, máximo 8 / 8 MB) con una instrucción clara: «esto es lo que le gusta al cliente; tu diseño tiene que dialogar con esto».
- Archivos clave: `packages/pipeline/src/direcciones.ts`, `sitio.ts`, `contratos.ts` (4.orla, 4.vector, 4.kine, 4.lumen), `motor.ts` (arma el prompt), `apps/web/components/estudio/Maqueta.tsx`, `MiniWeb.tsx`, `VistaWeb.tsx`, `apps/web/app/estudio/[id]/direcciones/page.tsx`, `apps/web/app/imprimir/[id]/direcciones/page.tsx`.

---

## 3. PRIORIDAD 2: panel de diseño que califica y manda a rehacer

Jay quiere que el diseño ya venga calificado: un panel revisa y, si no da la talla, lo vuelve a mandar a diseñar **antes** de que Jay o el cliente lo vean.

Propuesta (ajustable):
- Nuevo paso automático después de `4.orla` (direcciones) y después de `4.vector` (web): **panel de diseño** con 2 o 3 miradas (por ejemplo Trofeo como director de arte, Mira como sistema visual y Prisma como usabilidad y rendimiento).
- **Rúbrica con nota de 1 a 10**: fidelidad al pedido del cliente, originalidad (no parece plantilla), tipografía y jerarquía, composición y ritmo, uso de la imagen, movimiento e interacción, celular, accesibilidad y rendimiento. Cada nota con su razón y 3 arreglos concretos.
- **Umbral**: si la nota queda bajo 8 (configurable), se rehace sola con las notas del panel, hasta 2 rondas. Si después de 2 rondas no llega, para y se lo muestra a Jay con la nota y lo que falta (igual que hoy `esperaJurado` en `jurado.ts`).
- **Que el panel vea el diseño, no solo el código**: capturas de escritorio y celular. Ojo: en Vercel no hay navegador (ver `apps/web/app/estudio/[id]/pdf/route.ts`). Opciones: `@sparticuz/chromium` en una función, un servicio de capturas, o un paso que corra en otra máquina. Si no se puede, como mínimo que evalúe el HTML/CSS más las direcciones.
- Mostrar la nota del panel en el estudio, junto a cada dirección y cada versión de la web, y guardar el historial de rondas.
- Reutilizar lo que ya existe: `jurado.ts` (nota ponderada, rondas, `NOTA_MINIMA`), `correr.ts` (`avanzar`, `cambiar` con nota, puertas `revision` / `direcciones`), `fusionar` (respeta lo que Jay cambie mientras trabajan).

---

## 4. PRIORIDAD 3: interacciones extremadamente claras

Lo que pidió Jay: «que queden todas las interacciones extremadamente claras, que haga esperar a la gente si tienen que esperar… que sea útil». Lo que lo frustró: tocar y no saber si pasó algo, tocar varias veces, ver «se detuvo» cuando el equipo trabajaba y enterarse tarde de que un agente terminó.

**Ya hecho (0.42 a 0.44):** pantalla bloqueada con aviso en toda acción (`components/estudio/Trabajando.tsx`, evento `anonymo:trabajando` desde `app/estudio/nuevo/Enviar.tsx`); el gran aviso de espera cuando la IA trabaja dentro de la acción; panel «Ahora» en vivo (`AhoraEnVivo.tsx`: fase, palabras, cuánto lleva, si la IA tarda); `EquipoVivo.tsx` consulta cada 3 s (8 s si espera) y refresca la página cuando una vuelta empieza o termina, o cuando cambia el estado; arranque automático si un arranque se pierde (`rescatar` en `lib/trabajo.ts`); «se detuvo» solo con certeza (`lib/camino.ts`); barra por fases (`components/estudio/Camino.tsx`).

**Falta:**
- **Revisar todos los botones del estudio y del portal**, no solo los que usan `Enviar`: `Confirmar`, formularios del portal, subida de archivos, marca, propuesta, direcciones. Toda acción: estado de carga inmediato, bloqueo hasta que responde y resultado claro (éxito o error en palabras simples).
- **Antes de que la página esté lista (hidratación)**, un clic no da señal. Mostrar los botones deshabilitados o con indicador hasta que estén listos.
- **Tiempo esperado por agente** (ya existe `segundosEstimados` en `lib/duracion.ts`): mostrarlo siempre («Orla suele tardar 3 min · lleva 1:20») y avisar cuando se pasa.
- **Aviso fuerte al terminar**: notificación del navegador (ya existe `Vigia`), sonido opcional y título de la pestaña («● Orla entregó»), para que Jay se entere aunque esté en otra pestaña.
- **Un solo lugar que diga qué pasa**: hoy el estado se repite en varias partes (inicio, barra lateral, campana, proyecto). Revisar que todas digan lo mismo al mismo tiempo (todas usan `momento()` de `lib/camino.ts`; la página del proyecto le pasa la señal en vivo, las listas no).
- Probar en celular.

---

## 5. Mapa técnico rápido

- **Vueltas de trabajo**: `apps/web/app/trabajo/[id]/route.ts` (POST con firma HMAC, responde 202 y trabaja en `after()`); `apps/web/lib/trabajo.ts` (`trabajarVuelta`, `lanzar` con reintento, `rescatar`, `vivo.json` con pulso cada 10 s, candado de 1,5 s, `fusionar` antes de subir el estado). Una tarea por vuelta (`avanzar(..., { max: 1, plazo })`). `PLAZO_MS` 235 s.
- **Nube**: `apps/web/lib/nube.ts` (`traer` deduplicado por generación, `aislado` = carpeta privada por pedido, `conNube` = bajar → acción → subir lo que cambió por contenido); `packages/pipeline/src/nube.ts` (`huellaProyecto`, `subirDistintos`, `bajarProyecto` atómico, subidas firmadas).
- **Estados del proyecto**: `plan` → `en-curso` ↔ `esperando` (revisión, direcciones, jurado) → `listo`; `parado` = en pausa. `p.modo` paso | fase | auto. Puertas: `p.revision` (por agente), `p.direcciones.esperando`, `p.esperaJurado`. A medias: `p.parciales`. Errores: `p.error`.
- **Motor de IA**: `packages/pipeline/src/motor.ts` + `envivo.ts` (streaming, continúa si se corta por `max_tokens`, guarda lo escrito si se acaba la vuelta), `ia.ts` (`sinPensar` para vueltas apuradas). Modelo: `ANTHROPIC_MODEL` (por defecto `claude-sonnet-5-5`).
- **Lo interno del cliente**: contratos con `interna: true`; `privado.ts` (`versionCliente`) quita secciones internas del PDF y del portal.
- **Qué se muestra en cada momento**: `apps/web/lib/camino.ts` (`momento`, `siguienteTarea`).
- **Límites de Vercel Hobby**: 300 s por función, registros de 1 hora (MCP/CLI: `vercel logs`; buscar `[vuelta` y `[trabajo]`).

---

## 6. Después (no empezado)

- **Publicar la web del cliente**: botón que crea un repo en GitHub con los archivos de `sitio/vN` y lo despliega en Vercel. Necesita tokens de GitHub y Vercel que pone Jay (nunca en el código). Preguntar a Jay antes de publicar nada.
- **Lienzo o moodboard**: ver direcciones, capturas de la web y referencias del cliente en un tablero, comentar encima y comparar versiones.
- Hoy el PDF no se puede armar en línea (no hay navegador en Vercel); se saca en local con `npm run pipeline -- pdf <id>`.

---

## Cómo probar

```bash
npm install
npm run probar                     # 52 pruebas del pipeline + 4 de la web
npx tsc -p apps/web --noEmit && npx tsc -p packages/pipeline --noEmit
cd apps/web && npx next build && cd ../..
```

Estudio «en línea» de prueba (Supabase falso, IA falsa lenta, puerto 3100, clave `prueba-clave-jay`):

```bash
bash scripts/pruebas/nube.sh
node scripts/pruebas/e2e-auto-web.mjs        # automático + direcciones + web + zip + biblioteca
node scripts/pruebas/e2e-nuevo.mjs scripts/pruebas/imagen.png   # proyecto nuevo queda guardado
ANONYMO_NUBE=1 SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SERVICE_KEY=x SUPABASE_BUCKET=proyectos \
  ANONYMO_PROYECTOS=/tmp/anonymo-pruebas/perdido node --experimental-strip-types scripts/pruebas/perdido.ts
sleep 22 && node scripts/pruebas/e2e-rescate.mjs   # arranque perdido + aprobar bloquea + página al día
bash scripts/pruebas/parar.sh                # en un comando aparte

bash scripts/pruebas/nube.sh                 # de nuevo, limpio
node scripts/pruebas/e2e-paso.mjs /tmp/anonymo-pruebas   # un agente a la vez con IA lenta: en vivo, revisión, pausa, celular
bash scripts/pruebas/parar.sh
```

Banco de calibración (0.56), con `nube.sh` levantado:
```bash
ANONYMO_NUBE=1 SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SERVICE_KEY=x SUPABASE_BUCKET=proyectos ANONYMO_PROYECTOS=/tmp/anonymo-pruebas/banco node --experimental-strip-types scripts/pruebas/banco.ts
node scripts/pruebas/e2e-banco.mjs
```
Si la máquina no tiene `/usr/bin/chromium`, exporta `CHROMIUM=/ruta/al/chromium` **antes** de `nube.sh`: el servidor de prueba lo usa para verificar webs (sin eso, la re-verificación de `e2e-calidad-movil` falla). `e2e-estandar.mjs` va justo después de `e2e-calidad-movil.mjs`, en el mismo estudio.

Todas pasan en 0.44. Registro del servidor de prueba: `/tmp/anonymo-pruebas/next.log`. Si Chromium no está donde Playwright lo busca: `CHROMIUM=/ruta`.
Cuidado: `parar.sh` mata procesos por patrón; si va en la misma línea que otros comandos puede matar tu propia terminal.

---

## Reglas que no se rompen

- Jay revisa y hace el merge. El agente trabaja en una rama nueva, hace commit y push, y le da el enlace del PR.
- Nada de proyectos de clientes en el repo (es público). Nada de claves en código, chat o registros.
- No publicar nada (web de cliente, posts, correos) sin que Jay lo diga.
- Preguntar antes de borrar o mandar a la papelera.
- Probar de punta a punta antes de entregar. A Jay le frustra que «una cosa se arregla y otra se daña»: cada cambio se prueba con `scripts/pruebas/` además de las pruebas unitarias.
- La interfaz en español, simple, directa, sin jerga.
