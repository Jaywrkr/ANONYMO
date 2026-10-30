# Validación de 0.52

30 de octubre de 2026. main continúa en 0.50; esta rama incluye la 0.51. Node 22 y build de producción de Next. Todos los proyectos e imágenes son ficticios y los proveedores del estudio son falsos; navegador, capturas, Lighthouse y PostgreSQL son reales.

- `npm run probar`: 97 pruebas del pipeline y 7 de web, todas pasaron.
- TypeScript de pipeline y web, lint, contratos y build.
- Referencias: copias inmutables, alcance por servicio, contexto invalidado al cambiar criterios, revisión antigua rechazada, retirada sin borrar historia, archivos y límites, integridad, reparación de una copia dañada al reseleccionar su original y bytes enviados al productor incluso al continuar. El revisor recibe una imagen seleccionada y registra su revisión en `calidad.ts`.
- Diagnóstico: no llama sin configuración, comprueba el protocolo esperado, rechaza respuestas inconclusas y contenedores públicos, no expone claves ni lee proyectos. La prueba móvil comprueba acceso autenticado y respuestas de los servicios falsos. No acredita producción.
- `cola.mjs`: PostgreSQL 17.10 real, clúster nuevo y propio, conexiones independientes, ocho carreras de reserva, índice único frente a una segunda escritura directa, recuperación de reserva vencida, rechazo del propietario anterior, renovación, cierre repetido, intentos agotados, entradas nulas, permisos públicos denegados y selección que omite una fila bloqueada. Se detiene el servidor temporal al terminar. No se usan bases existentes.
- Regresiones del estudio: automático/web/ZIP/biblioteca, nuevo pedido con archivo, recuperación, direcciones en estudio/impresión/portal, calidad y búsqueda móvil, Atlas/encargos/SVG y memoria con chat flotante.
- `e2e-paso.mjs`: vueltas de trabajo, aprobación, pausa, reanudación, recuperación y revisión móvil; sin errores de navegador ni respuestas 5xx.
- `funciones-web.ts`: navegador de servidor y sitios ficticios; enlaces, anclas, controles, formularios/conexiones sin recepción y recursos ausentes.

El nuevo ensayo SQL está preparado en CI y se ejecutó localmente. No se ha observado su ejecución en GitHub. La configuración de instalación y arranque de este entorno se guardó con el binario de PostgreSQL y la prueba aislada; también se guardó el dominio de la web de la agencia para una futura comprobación de despliegue. Guardar el borrador no lo publica ni modifica el acceso de esta máquina.

Accesos reales: Git funciona, pero REST/GraphQL de GitHub y la petición a la web de Vercel responden Forbidden desde este entorno. Las variables de IA, Supabase y Vercel de producción no están presentes aquí. No se crearon datos de clientes, no se aplicó SQL a producción y no se publicó ningún sitio.

Pendiente: conectar las reservas SQL con el estado y la publicación condicional de Storage antes de activar el nuevo ejecutor; verificar despliegue; calibrar la revisión creativa con IA real y casos aceptados/rechazados por Jay. Una referencia seleccionada o una conexión correcta no demuestra calidad de gran agencia.
