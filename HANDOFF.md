# HANDOFF: cómo seguir ANONYMO

Para quien siga el desarrollo (Codex u otro agente de código). Escrito el 29 de octubre de 2026, en la versión **0.44**.
Primero lee [README.md](README.md) (qué hay y cómo correrlo) y [AGENTS.md](AGENTS.md) (reglas del repo).


**Trabajo 0.50 para revisión:** las webs añaden comprobaciones de enlaces locales, anclas, recursos y casos de interacción de `pruebas.json` a 390 y 1440 px. La última acción de un caso debe cambiar su condición; los pasos preparatorios no acreditan otros botones. Los formularios quedan pendientes hasta comprobar recepción real. Fallos técnicos piden cambios antes de gastar en la revisión de IA; formularios y conexiones sin verificar quedan pendientes. Los informes antiguos de Vector se invalidan por cambio de política. Detalles y prueba nueva en [docs/funciones-web.md](docs/funciones-web.md). Incluye 47–49, aún pendientes en main.

**Trabajo 0.49 para revisión:** chat por proyecto `/estudio/[id]/atlas`, con fuentes e historial. Consultar es solo lectura; encargar permite ajustar, verificar, pausar, reanudar y continuar, con recibos y bloqueo por cambio de versión. Decisiones registradas al producir y fallos agrupados en memoria privada. Mira guarda seis SVG editables por versión y el control renderiza muestras a 16/32/128 px. No se ha demostrado calidad creativa con IA real: esta máquina no tiene la clave. El esquema `infra/cola.sql` es preparatorio, sin aplicar ni integrar. Estado de las 14 fases y bloqueos en [docs/plan-agencia.md](docs/plan-agencia.md). Esta rama incluye las mejoras 47 y 48 todavía pendientes en main.

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
