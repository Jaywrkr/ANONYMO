# Validación de 0.50

30 de octubre de 2026. Node 22, build de producción de Next. Datos, proyectos y proveedores ficticios; navegador, capturas y Lighthouse reales. No equivale a validación de calidad creativa con IA real ni a despliegue de Vercel.

- `npm run probar`: 79 pruebas del pipeline y 7 de web, todas pasaron.
- TypeScript de pipeline y web, lint, contratos y build de producción.
- `funciones-web.ts`: enlaces y anclas, abrir/cerrar menú, rechazo de condiciones ya cumplidas, rechazo de cobertura falsa mediante un botón anterior, casos inválidos, formularios sin envío y puerta de calidad integrada. También comprueba una confirmación falsa de envío tras una conexión bloqueada y un recurso CSS ausente. Fallos → cambios; recepción no probada → pendiente; sin nota inventada ni gasto de IA para tapar el fallo.
- La prueba funcional se ejecutó con Chromium de servidor 141 y desde un directorio de binario limpio, con el mismo comando añadido al flujo de CI. La ejecución en los servidores de GitHub queda pendiente del acceso al PR; no se afirma haberla observado.
- `calidad.ts`: una web ficticia con botón y pruebas.json superó casos de interacción a 390/1440 px, capturas, Lighthouse y revisión de IA falsa.
- `e2e-paso.mjs`: entrega entre vueltas, aprobación, pausa, reanudación, recuperación y revisión móvil; sin errores de navegador ni respuestas 5xx.
- Regresiones: automático/web, nuevo pedido con archivo, rescate de arranque perdido, direcciones en estudio/impresión/portal, calidad/móvil, identidad SVG y Atlas con fuentes y encargos.

La nueva política invalida los informes anteriores de Vector. No se comprueba recepción real de formularios, destinos externos, calidad de las traducciones, precisión factual ni aceptación creativa del cliente con estas pruebas. Esos límites permanecen documentados en docs/funciones-web.md y docs/plan-agencia.md.
