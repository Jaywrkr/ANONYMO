# Pipeline: cómo trabaja el equipo un pedido

Fase 5 del proyecto. Este documento cubre la 5.1 (el contrato) y deja escrito el plan de las siguientes.

## El flujo

1. **Entra el pedido.** Llega desde el formulario de la web o desde la terminal, con tipo (`web`, `marca`, `lanzamiento` o `todo`), cliente, descripción y lo que se sepa (rubro, ciudad, público, plazo).
2. **Atlas arma el plan.** Elige las fases (parte de `PEDIDOS` y ajusta: si el cliente no tiene marca, suma la 3; si no hay web, saca a Prisma), ordena las tareas y lista las preguntas para el cliente.
3. **Corren las tareas en orden.** Cada agente lee solo las entregas que su contrato dice (`usa`) y deja la suya en `entregas/`.
4. **Puerta al cerrar cada fase.** Sin pausas, o con pausa en la terminal: `s` sigue, `c` + nota rehace, `p` para. Por decidir con Jay.
5. **Jurado.** Trofeo pone nota con pesos Awwwards. Si queda bajo `NOTA_MINIMA` (7), la fase más débil se rehace con sus notas.
6. **Entrega.** Carpeta del proyecto completa + resumen. La sala de la web lee `estado.json`.

## Qué hay en la 5.1

`packages/pipeline/`

| Archivo | Qué es |
|---|---|
| `src/tipos.ts` | Pedido, Contrato, Plan, Entrega, Puerta, Proyecto y cómo se guarda una carpeta de proyecto |
| `src/contratos.ts` | 28 contratos: uno por agente y fase, con entrega, objetivo, qué lee, criterios y herramientas |
| `src/revisar.ts` | Comprueba que el contrato cuadre con el equipo e imprime el orden de cada tipo de pedido |

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

## Lo que sigue

| Sub-fase | Qué |
|---|---|
| 5.2 Atlas | Pedido → plan (fases, razones, preguntas). Simulado primero |
| 5.3 Ejecución | Corre el plan, guarda entregas, puertas y bitácora. Modo simulado sin clave |
| 5.4 Herramientas | Búsqueda web, dominios, redes, Lighthouse. En simulado quedan como pendientes |
| 5.5 Calidad | Nota del Jurado y vuelta atrás si no llega a 7 |
| 5.6 Caso dentistas | Pedido real de punta a punta y la sala mostrando el proyecto |

La clave de Anthropic la pone Jay en `ANTHROPIC_API_KEY`. Sin clave, todo corre en modo simulado.
