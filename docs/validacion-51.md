# Validación de 0.51

30 de octubre de 2026. main contiene la 0.50 (PR #78); esta rama incorpora el chat flotante y la memoria vigente. Datos, claves y proveedores ficticios en los recorridos; navegador, archivos y capturas reales. No se ha comprobado el despliegue de esta rama ni la interpretación semántica con IA real.

- `npm run probar`: 89 pruebas del pipeline y 7 de web, todas pasaron. Diez casos nuevos de memoria cubren aprobación, versiones, requisitos, bytes, fuentes directas cambiadas o añadidas, contexto inicial, continuaciones, legado, simulaciones y transmisión al productor.
- TypeScript de pipeline y web, lint, contratos y build de producción.
- `memoria.ts` y `e2e-memoria.mjs`: historial privado, decisiones confirmadas/históricas/sin contexto y enlace a la versión original; chat en esquina inferior derecha, entrada con Enter y Shift+Enter, cierre con Escape, borrador conservado, respuesta recibida con ventana cerrada y una sola petición. Conversaciones aisladas al cambiar de proyecto.
- Pruebas visuales del chat a 1440×960 y 390×844. Se redujo el visor a 390×500 para comprobar que ventana y entrada siguieran dentro del área visible. Esto no sustituye una comprobación del teclado físico en dispositivos iOS/Android.
- Regresiones: automático/web/ZIP/biblioteca, nuevo pedido con archivo, rescate, direcciones en estudio/impresión/portal, revisión y búsqueda móvil, Atlas con encargos y galería de SVG.
- `e2e-paso.mjs`: señal y entrega entre vueltas, aprobación, pausa, reanudación, recuperación y revisión móvil; sin errores de navegador ni respuestas 5xx.
- `funciones-web.ts` con Chromium de servidor: enlaces, anclas, menús, casos inválidos, formularios y conexiones no comprobadas, confirmaciones falsas y recursos ausentes.

No se aplicaron migraciones SQL, no se publicó ningún sitio de cliente ni se modificaron sus proyectos reales. Las conexiones de IA/Supabase/Vercel de producción no están disponibles en esta máquina. Los límites de memoria están en docs/memoria.md; el estado del plan completo está en docs/plan-agencia.md.
