# Validación 0.54 · preparación del piloto

La comprobación de `/estudio/conexiones` ahora incluye el guardado y las reservas del piloto. Desactivado se presenta como un estado neutro, sin consultas SQL. Habilitado requiere una selección explícita antes de comprobar el esquema. La respuesta solo se acepta con protocolo 1 y seguridad booleana verdadera; no se muestran identificadores de proyectos, claves ni respuestas crudas del proveedor.

`anonymo_preparacion()` inspecciona el catálogo PostgreSQL: presencia de las funciones esperadas, RLS en las tres tablas, ausencia de permisos de lectura/escritura/ejecución para anon y authenticated y permisos de servicio requeridos. No lee filas de proyectos ni crea reservas. Es una comprobación de preparación, no un ensayo de escritura, recuperación o restauración.

Se añadió a GitHub Actions la instalación del navegador y el ensayo móvil del build real, con PostgreSQL efímero, Storage ficticio y generación simulada. El ensayo comprueba ahora también la tarjeta del piloto en el despliegue local. Configurar el workflow no demuestra que GitHub Actions haya pasado: revisar su ejecución en el PR.

## Evidencia local

- 100 pruebas del pipeline y 7 de web: sin fallos. Casos nuevos: piloto apagado sin consultas, activación sin selección rechazada por el diagnóstico, protocolo incompatible, permisos falsos y respuestas mal formadas.
- TypeScript de ambos paquetes y build de Next: correctos.
- PostgreSQL real efímero: preparación privada correcta y detección de un permiso SELECT concedido a anon; la prueba revoca ese permiso en su propia base. El rol anónimo no puede ejecutar la comprobación.
- Ensayo del estudio a 390 px: inicio de trabajo, reserva y publicación, diagnóstico autenticado del piloto, descarga privada de conflictos, comentario del portal y ausencia de desbordamiento horizontal.
- Regresión de scripts/pruebas: automático/web/ZIP, pedido nuevo con archivo, rescate, modo paso con pausa y reanudación, calidad/referencias/móvil, diseño/portal, Atlas/operaciones, SVG/memoria y funciones de web.

## Lo que sigue sin comprobar

El 30 de octubre de 2026 el acceso desde esta máquina a `https://anonymo-ecru.vercel.app/entrar` volvió a fallar en el túnel HTTP con 403. No se verificó el despliegue, no se aplicó SQL a producción ni se activó el piloto. No se introdujeron claves reales ni datos de clientes. La aceptación creativa y los proveedores reales requieren su propia validación.

0.53 ya está integrado en main mediante el PR #80; esta rama parte de ese estado. Para usar el diagnóstico nuevo, reaplicar `infra/publicaciones.sql` en el entorno de ensayo. Preparación y límites operativos: [publicacion-atomica.md](publicacion-atomica.md).
