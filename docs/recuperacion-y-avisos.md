# Recuperación y avisos · 0.55

No se activaron migraciones ni envíos reales. El piloto sigue desactivado por defecto. Preparación: aplicar en ensayo `infra/cola.sql` y después la versión actualizada de `infra/publicaciones.sql`, configurar un bucket privado y seleccionar proyectos ficticios. El diagnóstico de 0.55 exige protocolo 2 para detectar esquemas anteriores incompletos. Mantener la selección y el protocolo nuevo para los proyectos ya importados.

## Recuperar una copia

Proyecto → Ajustes → Revisar copias y avances. Se muestran las últimas cincuenta revisiones confirmadas y avances rechazados; sus archivos pueden descargarse con sesión del estudio. Cada copia tiene una comparación de archivos recuperados, cambiados y retirados de la revisión visible. Los índices completos permanecen guardados; no hay borrado físico.

Primero se pausa el proyecto. Recuperar exige una confirmación escrita y la revisión desde la que se abrió la comparación. Si el proyecto cambió entretanto, no se sustituye: se conserva el avance y se pide revisar. Se comprueban las huellas de los bytes descargados antes de preparar la copia.

La recuperación crea una revisión nueva, registra origen y actor, termina las reservas anteriores en la misma transacción y deja el proyecto en pausa. Retira puertas y aprobaciones vigentes; las entregas reales quedan pendientes de verificar. Conserva los gastos, presupuesto, comentarios, enlace privado y avisos actuales. No recupera permisos de caso público ni reanuda agentes. Los requisitos y el contenido vuelven a la copia elegida: hay que revisarlos antes de continuar. Las variantes históricas de entregas mantienen su procedencia, sin convertirse en aprobaciones actuales por restaurar.

Perder la respuesta del commit no repite la restauración ni cancela reservas posteriores. La repetición inmediata del mismo formulario reconoce el recibo si la revisión recuperada sigue siendo la vigente. Al reanudar se programan los controles pendientes y se pide aprobación de las entregas reales antes de continuar. No hay mezcla automática, exportación al protocolo antiguo ni garantía de restauración tras purgar objetos; la purga sigue bloqueada.

## Avisos confirmados

En el piloto, `avisar()` escribe el registro interno y un evento privado en `avisos-cola/`. No envía nada. El evento solo resulta enviable cuando su archivo pertenece al índice confirmado del proyecto; un trabajo rechazado no puede enviar sus eventos por esa vía.

Proyecto → Ajustes → Revisar avisos pendientes muestra veinte avisos por página, su texto bajo demanda, los destinos comprobados, sus canales y estado. No genera destinatarios retroactivamente: si no había canales habilitados al producirlo, añadir un destino después no envía ese aviso. Los destinos y la conexión de correo se fijan mediante huella, sin guardar claves ni la URL privada del webhook en el evento. Si cambian, el envío se bloquea para revisar.

El envío exige `ANONYMO_AVISOS_VERSIONADOS=1`, la configuración del canal y una acción autenticada con confirmación escrita. El webhook también exige `ANONYMO_WEBHOOK_IDEMPOTENTE=1`, después de comprobar que el receptor respeta `Idempotency-Key`. Esa variable es una declaración de configuración; no demuestra por sí misma que un servicio externo descarte duplicados. Sin ello no se preparan eventos para ese canal.

Cada evento y canal tiene un recibo único y una reserva de sesenta segundos. Dos solicitudes concurrentes no envían a la vez. El propietario vencido no confirma el envío de otro. Se reutiliza la clave del proveedor tras un acuse perdido; los intentos se limitan a tres dentro de veintitrés horas desde el primero. Después requieren revisión. Un envío sin confirmación puede haber llegado al proveedor: el estado no afirma que no se envió. La exclusión local no garantiza entrega exactamente una vez si el proveedor no conserva o no respeta la clave.

No se ejecutó un envío externo real ni se programó un despachador automático. El protocolo se probó con PostgreSQL real efímero y proveedores falsos que respetan las claves. Faltan prueba de recepción y política de destinatarios/reintentos en los servicios reales antes de activar envíos.

## Límites para producción

Faltan validación del despliegue y credenciales utilizables de Supabase, proveedor de IA y Vercel en este entorno. La disponibilidad de claves aquí no determina su configuración en producción. Retención y purga verificable siguen pendientes; los objetos inmutables y el historial crecen y la eliminación permanente permanece bloqueada en el piloto. La calidad creativa no se acredita con pruebas de protocolo ni con generación simulada.
