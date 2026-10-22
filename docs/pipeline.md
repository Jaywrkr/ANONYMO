# Pipeline: cómo trabaja el equipo un pedido

Fase 5 del proyecto. Este documento cubre la 5.1 (el contrato) y deja escrito el plan de las siguientes.

## El flujo

1. **Entra el pedido.** Llega desde el formulario de la web o desde la terminal, con tipo (`web`, `marca`, `lanzamiento` o `todo`), cliente, descripción y lo que se sepa (rubro, ciudad, público, plazo).
2. **Atlas arma el plan.** Elige las fases (parte de `PEDIDOS` y ajusta: si el cliente no tiene marca, suma la 3; si no hay web, saca a Prisma), ordena las tareas y lista las preguntas para el cliente.
3. **Corren las tareas en orden.** Cada agente lee solo las entregas que su contrato dice (`usa`) y deja la suya en `entregas/`.
4. **Pausas por proyecto.** Al cerrar una fase con pausa, el sistema se detiene y guarda dónde quedó. Jay o Luna deciden: aprobar, cambiar (con nota, toda la fase o un agente) o parar.
5. **Jurado.** Trofeo pone nota con pesos Awwwards. Si queda bajo `NOTA_MINIMA` (7), la fase más débil se rehace con sus notas.
6. **Entrega.** Carpeta del proyecto completa + resumen. La sala de la web lee `estado.json`.

## Pausas

Cada proyecto tiene las suyas. Se eligen al crearlo y se cambian cuando quieras.

| Valor | Qué hace |
|---|---|
| `clave` (por defecto) | Las que propone Atlas: web 1 y 4 · marca 1, 2 y 3 · lanzamiento 1 y 5 · todo 1 a 4 |
| `nunca` | Corre de una; se revisa al final |
| `cada-fase` | Se detiene al cerrar cada fase |
| `1,4` | Solo al cerrar esas fases |

Si pides un cambio en una fase sin pausa, esa fase pasa a tener pausa para que revises cómo quedó.

## Cómo se usa

```bash
# Nuevo pedido (sin clave corre en modo simulado)
npm run pipeline -- nuevo --cliente "Clínica Sonrisa" --tipo web \
  --descripcion "Web para una clínica dental con citas en línea" --ciudad Cuenca --pausas clave

npm run pipeline -- estado clinica-sonrisa
npm run pipeline -- aprobar clinica-sonrisa
npm run pipeline -- cambiar clinica-sonrisa --nota "Más cálido, menos clínico" --agente nova --quien luna
npm run pipeline -- pausas clinica-sonrisa nunca
npm run pipeline -- parar clinica-sonrisa --nota "Esperando al cliente"
npm run pipeline -- reanudar clinica-sonrisa
npm run pipeline -- lista
```

Atlas ajusta el plan: si el cliente no tiene marca (`--sin-marca`), suma Identidad; si no hay web, saca a Prisma. Las preguntas que falten al cliente salen al final del resumen.

## Herramientas (5.4)

Corren antes de que el agente escriba, en simulado y en real. Lo que traen queda en la entrega, en "Datos de herramientas", y en `datos` para el siguiente agente.

| Herramienta | Quién | Cómo |
|---|---|---|
| Búsqueda web | Sonda (investigación) | Con clave: búsqueda web de Anthropic, con fuentes. Sin clave: pendiente |
| Dominios y redes | Sonda (naming), Chispa | RDAP público para .com, .co y .studio. El .ec y las redes se revisan a mano con los enlaces que deja |
| Auditoría | Prisma | Lighthouse en celular y escritorio + axe, sobre la URL del proyecto (`--url` o `pipeline url <id> <url>`) |
| Imágenes | Mira | Pendiente: por ahora describe y arma referencias |

Verba deja sus finalistas en `datos.finalistas` y Sonda revisa esos nombres. Sin finalistas, revisa el nombre del cliente.

También se usan sueltas:

```bash
npm run pipeline -- dominios "Corsivo" "Lucciola"
npm run pipeline -- auditar https://ejemplo.com
```

## Calidad (5.5)

Al final del proyecto se lee la nota de Trofeo (diseño 40, usabilidad 30, creatividad 20, contenido 10) y la auditoría de Prisma.

1. Nota de 7 o más y sin errores de accesibilidad: proyecto listo.
2. Si no: se busca el criterio más bajo y su responsable en el plan (diseño → Orla o Mira; usabilidad → Vector o Kine; creatividad → Lumen u Orla; contenido → Rhea o Faro). Errores de accesibilidad mandan a Vector.
3. Se rehacen esos agentes con la nota del jurado, todo lo que depende de ellos y el Jurado otra vez. Se evita rehacer el brief (fase 1), porque arrastra todo el proyecto.
4. Hasta 2 rondas automáticas. Si no llega, el proyecto espera: `aprobar` cierra así, `cambiar --agente trofeo` recalifica con tu nota, `parar` lo detiene.

Todo queda en la bitácora: nota de cada ronda, criterio más bajo y quién rehizo.

## Qué hay en la 5.1 y la 5.2

`packages/pipeline/`

| Archivo | Qué es |
|---|---|
| `src/tipos.ts` | Pedido, Contrato, Plan, Entrega, Puerta, Proyecto y cómo se guarda una carpeta de proyecto |
| `src/contratos.ts` | 28 contratos: uno por agente y fase, con entrega, objetivo, qué lee, criterios y herramientas |
| `src/revisar.ts` | Comprueba que el contrato cuadre con el equipo e imprime el orden de cada tipo de pedido |
| `src/atlas.ts` | Pedido → plan: fases, razones, tareas quitadas, pausas y preguntas |
| `src/motor.ts` | Simulado (estructura y checklist por agente) y real (API de Anthropic, sin probar hasta tener clave) |
| `src/correr.ts` | Ejecuta hasta la próxima pausa; aprobar, cambiar, parar, reanudar, cambiar pausas |
| `src/almacen.ts` | Lee y escribe la carpeta de cada proyecto |
| `src/cli.ts` | Los comandos de la terminal |
| `src/jurado.ts` | Lee la nota, decide qué se rehace y cuántas rondas |
| `src/herramientas/` | Dominios y redes, auditoría Lighthouse + axe, y quién usa qué |

`SERVICIO` y `PEDIDOS` pasaron a `@anonymo/agentes` para que la web y el pipeline usen los mismos datos.

```bash
npm run revisar -w @anonymo/pipeline
```

## Cómo se guarda un proyecto (prototipo, archivos del repo)

```
proyectos/<id>/
  pedido.json
  plan.json
  estado.json        fase actual, estado de cada tarea, puertas
  entregas/1-sonda.md
  bitacora.md
```

Cada entrega es markdown con frontmatter: agente, título, lo que "dice" en la sala, lo que necesita, estado, modo (`simulado` o `real`) y versión.

## Caso dentistas (5.6) y motor manual

Con `--manual`, cada agente usa el borrador de `proyectos/<id>/borradores/<fase>-<agente>.md` (mismo frontmatter que una entrega: `dice`, `necesita`, `nota`, `datos`). Sirve para escribir las entregas a mano o en una sesión con Claude mientras no hay clave. Las herramientas corren igual.

```bash
npm run pipeline -- nuevo --id gabriela-y-sebastian --cliente "Gabriela y Sebastián" --tipo web --sin-marca --pausas nunca --manual --descripcion "..."
```

La sala lee `proyectos/*/estado.json` al compilar: aparece un selector de proyecto, las fases que no aplican se tachan y cada entrega se lee completa en `/sala/<proyecto>/<fase>-<agente>`.

Los proyectos de clientes están en `.gitignore`: el repo es público y no se suben sin permiso del cliente.

## Lo que sigue

| Sub-fase | Qué |
|---|---|
| 5.2 + 5.3 | Atlas y ejecución con pausas por proyecto. **Hecho** |
| 5.4 Herramientas | Búsqueda web, dominios, redes, auditoría. **Hecho** (búsqueda web se activa con la clave) |
| 5.5 Calidad | Nota del Jurado y vuelta atrás si no llega a 7. **Hecho** |
| 5.6 Caso dentistas | Pedido real de punta a punta y la sala mostrando el proyecto. **Hecho** (contenido escrito en sesión; fuera del repo) |

La clave de Anthropic la pone Jay en `ANTHROPIC_API_KEY`. Sin clave, todo corre en modo simulado. Con clave, `--simulado` fuerza el modo simulado. El modelo se cambia con `ANTHROPIC_MODEL`.
