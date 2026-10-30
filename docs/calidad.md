# Requisitos, revisión y estudio móvil · 0.48

En el teléfono se entra con la misma clave del estudio. El inicio muestra proyectos, fase, trabajo actual y últimos avances. La búsqueda filtra el resumen; «Buscar todo» consulta la biblioteca completa. «Por revisar» muestra decisiones pendientes. La barra inferior permite volver a proyectos, buscar o abrir pendientes. El equipo completo y las secciones secundarias del proyecto quedan bajo demanda. El resumen se actualiza cada ocho segundos mientras la página está visible; si falla la conexión, lo indica.

## Antes de producir

El pedido se divide en requisitos con su fuente. Se incorporan respuestas, comentarios y referencias del cliente, además de las condiciones de cada contrato. En «Requisitos y calidad» Jay o Luna pueden añadir condiciones generales y por entrega. El productor recibe esas condiciones antes de trabajar. No se modifican las respuestas originales. Cambiar condiciones, marca o archivos invalida las revisiones afectadas.

## Tres pasos diferentes

1. **Generado:** existe una entrega, todavía sin comprobaciones completas.
2. **Verificado:** la revisión automática completó todas las condiciones con evidencia, alcanzó 8/10 y pasó los controles técnicos aplicables. No es aprobación humana.
3. **Aprobado:** Jay, Luna o el cliente autorizado tomaron la decisión sobre esa versión verificada.

Las simulaciones se identifican como tales y nunca se presentan como una verificación real. Las entregas antiguas sin informe aparecen sin verificar; pueden volver a verificarse desde su ficha. No hay una migración que las apruebe automáticamente.

Cada entrega real se revisa en una vuelta separada, antes de presentarla para aprobación. Si hay fallos, vuelve al productor con los arreglos concretos, hasta dos correcciones por etapa. Si falta una herramienta, hay una revisión incompleta o se agotan las correcciones, espera una decisión. Forzar el responsable no permite saltarse las comprobaciones. El proyecto conserva archivos y versiones.

## Qué se revisa realmente

- Documentos: contenido frente a requisitos y condiciones mediante una llamada distinta a la del productor. Una condición omitida, duplicada o sin evidencia queda pendiente.
- Direcciones: las tres portadas HTML, renderizadas completas a 1440 y 390 px; errores JS, imágenes y accesibilidad; capturas enviadas al revisor visual.
- Web: archivos de la versión generada, todas sus páginas HTML (hasta doce por revisión), capturas a ambos tamaños, axe y Lighthouse móvil/escritorio. Se exige rendimiento móvil ≥85, accesibilidad móvil ≥90 y ninguna incidencia de axe en la auditoría.
- Prisma consume la auditoría vigente de Vector. No utiliza la URL anterior del cliente como evidencia del sitio nuevo.
- Una descripción de logo, animación o audio sin archivos reproducibles queda pendiente; esta rama no construye el servicio completo de producción de logos, video o sonido.

Las capturas, auditoría, huella de los archivos y huella de los requisitos se guardan por versión. Las fotos usadas por direcciones y sitios se copian con esa versión. Las imágenes de las direcciones tienen enlaces firmados; las capturas del control requieren sesión del estudio. El portal no muestra propuestas sin revisión vigente.

Lighthouse es una medición de laboratorio. Las capturas no demuestran que un formulario envía mensajes ni que un pago funciona. La revisión automática tampoco sustituye el criterio final de dirección de arte, la comprobación de hechos o una revisión legal.

## Runtime y recuperación

Node 22. Chromium 141 está fijado junto con Playwright 1.56. En local se usa CHROMIUM o /usr/bin/chromium; en Vercel se utiliza @sparticuz/chromium, incluido en la función de trabajo. Para Lighthouse se desactiva el modo de proceso único, porque no registra las capturas de la carga necesarias para la medición. No se desactiva ningún criterio de auditoría.

Las páginas y mediciones completadas se guardan en un punto de reanudación vinculado a la huella de los archivos. Si se acaba la vuelta, continúa sin repetirlas, con un máximo de seis continuaciones automáticas. Si no puede completarse, permanece pendiente. El despliegue en Vercel debe comprobarse después de incorporar esta rama; probar su binario en esta máquina no equivale a verificar el despliegue.

## Pruebas

Ejecuta los comandos de AGENTS.md y todos los recorridos de HANDOFF.md. Con nube.sh levantado:

```bash
ANONYMO_NUBE=1 SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SERVICE_KEY=x SUPABASE_BUCKET=proyectos ANONYMO_PROYECTOS=/tmp/anonymo-pruebas/calidad ANTHROPIC_BASE_URL=http://127.0.0.1:45888 ANTHROPIC_API_KEY=sk-ant-prueba-falsa node --experimental-strip-types scripts/pruebas/calidad.ts
CHROMIUM=/usr/bin/chromium node scripts/pruebas/e2e-calidad-movil.mjs
```

Los valores de este comando son exclusivamente de los servicios falsos locales. calidad.ts exige esas direcciones: captura y mide una web ficticia con navegador y Lighthouse reales, usando revisión de IA falsa. Para comprobar el binario de servidor en local, añade VERCEL=1 y usa un directorio temporal limpio si anteriormente se extrajo otra versión de Chromium.

La prueba móvil comprueba autenticación, búsqueda, avance, capturas, invalidación al cambiar requisitos, nueva verificación y aprobación humana. Guarda capturas en /tmp/anonymo-pruebas. Ejecuta parar.sh en un comando separado.
