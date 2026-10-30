# Validación de 0.49

Entorno de desarrollo del 30 de octubre de 2026. Node 22, build de producción de Next; todos los proyectos, claves y respuestas del proveedor de los recorridos son ficticios. Chromium de servidor 141 ejecutado localmente; esto no verifica un despliegue de Vercel.

- `npm run probar`: 79 pruebas del pipeline y 7 de web.
- TypeScript de pipeline y web, `npm run lint`, `npm run revisar` y `npm run build`.
- `e2e-auto-web.mjs`: automático, selección de dirección, continuación sin duplicar trabajo, sitio, ZIP y biblioteca; sin errores de navegador.
- `e2e-nuevo.mjs`: alta con archivo y presencia en lista tras nueva consulta.
- `perdido.ts` y `e2e-rescate.mjs`: arranque perdido, aviso al aprobar y siguiente entrega visible sin recargar.
- `diseno.ts` y `e2e-diseno.mjs`: portada propia e interacción en estudio, impresión y portal; aislamiento y celular sin desbordamiento.
- `calidad.ts` y `e2e-calidad-movil.mjs`: captura y Lighthouse reales de una web ficticia; búsqueda móvil, evidencia, invalidación, nueva comprobación y aprobación.
- `e2e-paso.mjs`: señal en vivo, entrega entre vueltas, aprobación, pausa, reanudación, recuperación y revisión móvil. Sin errores de navegador ni respuestas 5xx.
- `operaciones.ts`: seis SVG ficticios, doce capturas reales y comprobaciones de navegador. El revisor semántico es falso.
- `e2e-atlas.mjs`: acceso protegido, consulta con fuentes, persistencia y reintentos; encargo de pausa, decisión registrada, incidencia y galería de seis SVG con enlaces firmados. Celular a 390 px, sin desbordamiento ni errores de navegador.

No se ejecutaron: migración SQL, concurrencia distribuida, generación y evaluación creativa con IA real, despliegue en Vercel, proveedores audiovisuales ni operaciones comerciales reales. El entorno no dispone de sus conexiones. El esquema SQL no está conectado al ejecutor. El recibo y la deduplicación por instancia no ofrecen transacciones distribuidas.

Git lee main (0.46) por el acceso de la plataforma. Las API REST y GraphQL de GitHub responden `Forbidden`; no se considera creado un PR mediante un enlace de comparación. No se integró main ni se publicó ningún sitio de cliente.
