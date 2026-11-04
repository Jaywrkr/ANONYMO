# Guardado por revisión · 0.53

Piloto desactivado por defecto. No se aplicaron migraciones, variables ni despliegues de producción. No convierte una entrega generada en una entrega aprobada ni demuestra calidad creativa con IA real.

## Qué cambia

Cada archivo se sube a una ruta privada con su SHA-256. El proyecto visible es un índice de archivos: PostgreSQL cambia ese índice entero en una transacción, únicamente si sigue vigente la revisión desde la que se trabajó. Se comprueban tamaño y huella al leer; un fallo no recupera silenciosamente el guardado antiguo.

El ejecutor obtiene una reserva de la cola SQL, la renueva y publica con su propietario y número de reserva. El cambio de índice y el cierre del trabajo ocurren juntos. Un propietario anterior no puede confirmar resultados tras la recuperación de su reserva. Los reintentos de publicación usan el mismo identificador; perder la respuesta después del commit no genera otra revisión.

Si otra acción cambió el proyecto, se rechaza el reemplazo y se guarda el índice propuesto en privado. Ajustes → Revisar avances en conflicto permite descargar los archivos de los últimos veinte avances rechazados, con sesión del estudio. Las descargas son adjuntos, sin ejecutar HTML. 0.55 añade comparación y recuperación explícita de una copia completa, con pausa y revalidación, sin mezcla automática. Ver [recuperacion-y-avisos.md](recuperacion-y-avisos.md).

El pulso de la cola se presenta en el estudio y los errores de reserva/conflicto detienen el rescate automático. Un fallo de red que impide confirmar el recibo conserva la carpeta temporal privada y su identificador de publicación; el disco de Vercel sigue siendo temporal, no una copia durable garantizada. Una caída antes de registrar el índice puede dejar objetos sin índice: todavía falta reconciliación automática y limpieza segura.

## Ensayo antes de activar

1. Usar un bucket privado y una base de ensayo propios. Aplicar `infra/cola.sql` y después `infra/publicaciones.sql`, con copia y revisión previa de permisos. Las tablas y funciones solo admiten el rol de servicio; la clave nunca llega al navegador.
2. Configurar `ANONYMO_ALMACEN_VERSIONADO=1` y **`ANONYMO_PROYECTOS_VERSIONADOS=piloto-propio`**. Sin la segunda variable el piloto abarca todos los proyectos normales: no utilizarlo así en un almacén existente. Las carpetas internas que empiezan por `_` mantienen su protocolo anterior.
3. Empezar con un proyecto nuevo ficticio y comprobar inicio, aprobación, pausa, portal, vencimiento y conflicto. El almacenamiento actual sigue funcionando para los proyectos fuera de la selección.
4. Para un proyecto antiguo, detener todas las instancias y escritores antiguos, mantenerlo sin cambios y pausado y ejecutar explícitamente `importarProyectoVersionado(id)` desde el pipeline con la misma configuración privada. La función usa una carpeta temporal propia, rechaza estado en curso o señal reciente y vuelve a comparar el listado y cada archivo. No borra el origen. Esas comparaciones detectan cambios durante la copia, pero no sustituyen detener escritores ni son un candado distribuido sobre el protocolo antiguo.
5. Comprobar el índice, sus bytes y las descargas con la aplicación nueva antes de admitir nuevas acciones. Mantener la selección activa para ese proyecto: las rutas anteriores dejan de ser autoritativas.

**No desactivar la variable ni volver a un despliegue antiguo sobre un proyecto importado:** leería rutas antiguas desactualizadas. Todavía no hay exportación controlada para volver al protocolo anterior. Por eso esta rama no activa ni migra proyectos reales automáticamente.

## Comprobación desde el despliegue · 0.54

Conexiones del estudio añade una tarjeta para el piloto. Apagado no hace consultas SQL; habilitado exige una selección explícita y consulta `anonymo_preparacion()`. La versión 0.55 exige protocolo 2 y permisos privados comprobados; el esquema anterior no se presenta como preparado para las funciones nuevas. La función inspecciona el catálogo, sin leer proyectos ni crear reservas. Reaplicar `infra/publicaciones.sql` en ensayo para actualizarla; esquema ausente, permisos abiertos o conexión fallida aparecen como pendientes de revisar. No equivale a haber ensayado escritura, restauración o producción. CI repite el recorrido móvil después del build con servicios ficticios; sus resultados efectivos se consultan en la ejecución de GitHub Actions.

## Límites del piloto

- Cualquier cambio concurrente puede rechazar el resultado del agente. La recuperación de 0.55 exige comparar y confirmar; no mezcla semánticamente resultados.
- El propietario vencido puede seguir consumiendo IA hasta que termine su llamada; el control de reserva impide publicar, no cancela el proveedor.
- 0.55 guarda eventos dentro del índice confirmado y añade recibos y reservas por canal. El envío externo está desactivado por defecto y exige una acción explícita y configuración adicional. Los webhooks requieren deduplicación en el receptor. No hay política ni envío automático activado.
- La eliminación remota permanente está bloqueada para proyectos del piloto. El índice puede dejar de incluir archivos, pero sus objetos inmutables e historial siguen privados. Falta retención y purga verificable antes de utilizarlo con obligaciones de borrado reales.
- El esquema SQL no comprueba existencia ni huella de los objetos: el cliente de servicio sube y verifica bytes; PostgreSQL valida forma, proyecto, base y reserva. No admite escritores de servicio ajenos a este protocolo.
- Las acciones sobre varios proyectos no forman una única transacción. Solicitudes, analítica y subidas temporales usan el almacenamiento anterior.
- No hay publicación automática de sitios de clientes, cobros ni mensajes a terceros.

## Pruebas

Con Node 22 y binarios PostgreSQL propios para un clúster temporal local:

```bash
POSTGRES_BIN=/ruta/bin node scripts/pruebas/cola.mjs
POSTGRES_BIN=/ruta/bin node --experimental-strip-types scripts/pruebas/publicaciones.mjs
# Después de npm run build, con Chromium instalado:
PROBAR_ESTUDIO_VERSIONADO=1 POSTGRES_BIN=/ruta/bin CHROMIUM=/ruta/chromium node --experimental-strip-types scripts/pruebas/publicaciones.mjs
```

No acepta una conexión a una base existente: crea y detiene una base efímera. Storage y las identidades son ficticios. El modo de estudio lanza el build real de Next y un navegador móvil con generación simulada; no utiliza claves reales ni acredita calidad de producción.
