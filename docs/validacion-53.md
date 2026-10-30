# Validación 0.53

Ensayo local del 30 de octubre de 2026. No se activó el piloto en producción, no se aplicó SQL a servicios reales y no se usaron datos de clientes. Main ya incluye 0.51 y 0.52 mediante el PR #79; 0.53 añade solo esta mejora.

- `npm run probar`: 98 pruebas del pipeline y 7 de la web, sin fallos. Incluye descarga paginada de más de mil archivos.
- TypeScript de web y pipeline y build de Next: correctos.
- `cola.mjs`: PostgreSQL 17.10 real efímero, conexiones independientes; ocho carreras, exclusión por proyecto, vencimiento, renovación, recuperación, límite de intentos, rechazo de propietario anterior y permisos.
- `publicaciones.mjs`: PostgreSQL real y Storage HTTP ficticio; conflicto entre dos copias, carrera inicial con conexiones independientes, reserva anterior rechazada, confirmación del índice y cierre en una transacción, reintento tras respuesta perdida, huella alterada rechazada, permisos, importación explícita de copia estable y conservación de señal de confirmación incierta.
- `PROBAR_ESTUDIO_VERSIONADO=1`: build real de Next, Chromium a 390 px, inicio desde formulario, cola, vuelta con generación simulada, índice confirmado y trabajo terminado. Descarga privada del conflicto, acceso sin sesión bloqueado, comentario del portal guardado mediante la copia aislada y sin desbordamiento horizontal.
- Modo paso a paso: señal, aprobación, doble aprobación, pausa durante trabajo, reanudación, rescate y revisión móvil; sin errores de JavaScript ni respuestas 5xx.
- Regresión del almacenamiento habitual con Supabase e IA ficticios: automático/web/ZIP/biblioteca, proyecto nuevo con archivo, rescate, calidad/móvil/requisitos/referencias, direcciones/portal, Atlas/encargos/SVG y chat/memoria. `funciones-web.ts` usa navegador real para enlaces y casos de interacción; no envía formularios.

Los revisores de calidad de estas pruebas responden con servicios falsos. La generación del piloto es simulada. Estas pruebas comprueban el protocolo y la experiencia técnica; no acreditan calidad creativa de agencia líder, disponibilidad de proveedores reales ni funcionamiento de un despliegue nuevo en Vercel.

Preparación, activación de ensayo y límites en [publicacion-atomica.md](publicacion-atomica.md). Las verificaciones no sustituyen ensayar migración, retención, restauración y carga en la infraestructura real.
