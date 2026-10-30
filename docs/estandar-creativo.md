# Referencias creativas y conexiones · 0.52

Cada referencia debe aportar un criterio: qué aprender y qué evitar. Jay o Luna eligen una imagen ya subida al proyecto, su servicio (web o identidad), título y origen. La selección está bajo demanda en «Requisitos y calidad», con hasta cuatro imágenes PNG/JPG/WebP de hasta 1 MB cada una.

Se guarda una copia por contenido y una revisión de la selección. Retirar una referencia no borra su imagen ni el historial. Los formularios incluyen la revisión leída: un formulario antiguo se rechaza en vez de sustituir una selección más reciente. Esto no añade transacciones entre servidores al almacén actual.

## Productor y revisor

Orla y Vector reciben las referencias de web; Mira, las de identidad. Las imágenes seleccionadas se adjuntan incluso al continuar una entrega o escribir en modo de rescate. Los otros archivos del cliente siguen sujetos al presupuesto existente; el mensaje indica cuáles se adjuntaron realmente, evitando afirmar que se vieron los omitidos.

El revisor recibe las mismas copias que el productor y una condición por referencia, con id `ref-…`, criterio y límite de no copiar. Una condición omitida queda pendiente según el control existente. Las referencias no son recursos autorizados para incluir en la entrega.

La selección y sus bytes forman parte del contexto de calidad de las tareas aplicables. Cambiarla deja pendientes sus revisiones y decisiones afectadas. Una copia ausente o alterada no se omite en silencio. El informe registra qué referencias y revisión se usaron; sus imágenes históricas continúan accesibles solo con sesión.

Hasta 8 MB de imágenes en la revisión, sumando capturas y referencias. Si se supera el límite, queda pendiente para dividir el material; no se descartan pruebas sin avisar.

## Comprobar el despliegue

Menú → «Conexiones del estudio» muestra versión y build. «Comprobar conexiones» hace una llamada breve al modelo configurado y consulta la configuración del contenedor de Supabase. Solo muestra conexión comprobada si el modelo devuelve la respuesta esperada y el contenedor se identifica como privado. No lee ni escribe proyectos, no muestra valores de claves y no considera una variable presente como prueba de acceso.

La prueba consume una llamada breve de IA. No verifica calidad creativa, escritura del almacén, publicación en GitHub/Vercel ni recuperación distribuida. La comprobación se ejecuta desde el despliegue donde se abre; una prueba en la nube falsa no certifica producción.

## Validación

Pruebas unitarias: copia inmutable, vigencia por ámbito, retirada sin borrado, revisión antigua, archivos inválidos, límites, transporte al productor en continuación, integridad y respuestas reales del protocolo de conexión mediante proveedores falsos.

Con nube.sh iniciado, `calidad.ts` prepara una web con referencia, casos funcionales, capturas y auditoría. Ejecuta primero `e2e-calidad-movil.mjs` y luego `e2e-estandar.mjs`, porque esta última cambia la selección para comprobar la invalidación y el acceso al historial.

## Pendiente

La selección no calibra por sí sola al jurado. Aún hay que evaluar con IA real casos aceptados y rechazados por Jay, medir falsos aprobados y ajustar los criterios. La cola SQL se comprobó con PostgreSQL real aislado, pero no está integrada con las escrituras del ejecutor ni activada. No se ha comprobado un nuevo despliegue desde esta máquina: las conexiones y el acceso externo no están disponibles aquí. No se promete nivel creativo de gran agencia a partir de estas pruebas técnicas.


## Fiabilidad de la cola SQL

`infra/cola.sql` ahora limita a una reserva activa por proyecto mediante un candado transaccional y un índice único que también impide una segunda reserva por escritura directa, permite renovar solo la reserva vigente y convierte el agotamiento de intentos en un error visible. El propietario anterior no puede renovar ni finalizar después de una recuperación con revisión nueva. Los roles públicos no tienen acceso.

Se prueba con conexiones independientes y PostgreSQL 17.10 real, en un clúster temporal propio que el script inicia y detiene. No acepta una URL de base existente. Preparación fuera del repo:

```bash
npm install --prefix /workspace/anonymo-postgres --cache /tmp/anonymo-npm-cache --no-audit --no-fund @embedded-postgres/linux-x64@17.10.0-beta.17
POSTGRES_BIN=/workspace/anonymo-postgres/node_modules/@embedded-postgres/linux-x64/native/bin node scripts/pruebas/cola.mjs
```

El sufijo beta identifica el paquete distribuidor; el binario comprobado informa PostgreSQL 17.10. La prueba quedó preparada en CI y se ejecutó localmente. No equivale a ejecución distribuida del sistema: falta integrar la reserva con el estado autoritativo y las escrituras en Storage para impedir que un ejecutor antiguo publique sus resultados. No se aplica este esquema al Supabase de producción desde la prueba.
