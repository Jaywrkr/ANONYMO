# Validación 0.55

Ensayo local del 30 de octubre de 2026. No se activó el piloto ni se aplicaron migraciones a servicios reales. No se enviaron correos ni webhooks reales.

- 103 pruebas del pipeline y 7 de la web: sin fallos. Tres casos nuevos validan reservas completas y evitan trabajo sin propietario confirmado; también impiden cerrar un proyecto recuperado con entregas reales pendientes y comprueban que se revise la siguiente después de aprobar la primera.
- TypeScript de web y pipeline, contratos, lint y build de Next: correctos.
- PostgreSQL real efímero: publicación concurrente, propietario antiguo, respuesta perdida, importación y permisos; restauración con base vigente, pausa, conservación de gastos/comentarios/portal/avisos, retirada de aprobaciones y cierre atómico de reservas. Repetir el formulario no crea otra revisión; repetir un commit no cancela reservas posteriores. Un cambio concurrente prevalece sobre una recuperación desactualizada.
- Salida de avisos con proveedor falso: evento sin confirmar rechazado, dos solicitudes concurrentes con una entrega, acuse perdido con la misma clave, destino cambiado bloqueado, envío apagado sin llamadas, recuperación de reserva y rechazo de propietario antiguo y límite de intentos. El proveedor falso respeta la deduplicación; no acredita el comportamiento de proveedores reales.
- Next y navegador real a 390 px: comparación, confirmación escrita, recuperación en pausa, descargas privadas y denegación sin sesión; página de avisos con envío desactivado, diagnóstico y comentario del portal; sin desbordamiento horizontal.
- Regresión de scripts/pruebas: automático/web/ZIP/biblioteca, pedido nuevo con adjunto, rescate, modo paso con pausa/reanudación y móvil, calidad/requisitos/referencias, diseño/portal, Atlas/operaciones/SVG/memoria y funciones de web.

Storage, clientes, generación y evaluación de IA son ficticios. Las capturas y los navegadores son reales. Las pruebas no acreditan calidad creativa de agencia líder, disponibilidad real ni recepción de mensajes de un servicio externo.

El acceso HTTP al despliegue de Vercel siguió respondiendo 403 desde este entorno. Las credenciales de Supabase, IA y Vercel no estaban disponibles aquí. Git volvió a permitir publicar 0.54; la API de creación de PR seguía respondiendo Forbidden. Esta rama incluye 0.54 mientras siga pendiente de main.

Preparación y límites: [recuperacion-y-avisos.md](recuperacion-y-avisos.md). Falta validación real, retención/purga verificable y activación controlada; no se presenta el conjunto de la agencia como operativo solo por pasar estas pruebas.
