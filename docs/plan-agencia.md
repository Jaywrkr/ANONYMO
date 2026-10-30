# Plan de implementación de ANONYMO

La rama 49 conserva las mejoras 47 y 48 pendientes de integrar en main. Ninguna fase se considera operativa en producción solo por tener código o pruebas con IA falsa.

| Fase | Evidencia y trabajo preparado | Pendiente o bloqueo |
|---|---|---|
| 0 · Base en producción | 0.48 probada localmente; binario de servidor y empaquetado comprobados | main continúa en 0.46. API de GitHub responde Forbidden; no se puede integrar ni comprobar un despliegue nuevo con los accesos actuales |
| 1 · Ejecución fiable | Identificador y recibo de encargos; rechazo de versiones antiguas; límites de corrección; estado del control sin señales no se presenta como trabajo vivo | Cola distribuida con reserva transaccional: esquema infra/cola.sql preparado, sin aplicar ni validar contra PostgreSQL. El ejecutor actual no se sustituye ni se declara exactamente-una-vez |
| 2 · Experiencia de Jay | Inicio móvil, búsqueda, fase, pendientes, acceso al equipo y comprobaciones bajo demanda | Validación con uso real tras desplegar |
| 3 · Memoria y servicios | Requisitos con fuente, decisiones con fuentes válidas, versiones, catálogo de archivos y condiciones por servicio | Jerarquía completa de decisiones sustituidas, memoria general de marca y políticas comerciales |
| 4 · Chat de consulta | Atlas y agentes del proyecto; respuestas con fuentes, historial privado y resumen factual sin IA | Conexión de IA real no disponible en esta máquina. Consulta global entre proyectos y calibración de respuestas |
| 5 · Calidad ANONYMO | Controles por versión, capturas, mediciones y corrección limitada | Biblioteca visual de referencia y calibración con evaluación real; no hay evidencias para prometer calidad creativa de agencia líder |
| 6 · Web y textos | Producción y revisión existentes; requisitos y decisiones en el contexto del productor | Ampliar pruebas funcionales por servicio, idiomas, formularios y validación factual |
| 7 · Identidad | Mira entrega SVG editables, rutas, variantes y revisión visual a tamaños pequeños | Calidad creativa, licencias y riesgos legales requieren evidencia real. Sin clave de IA no se valida producción real |
| 8 · Acciones por chat | Encargos internos acotados: ajustar, verificar, pausar, reanudar y continuar, con recibo y versión objetivo | Ejecución distribuida transaccional y autorización por presupuesto; no hay publicación ni aprobación automática desde el chat |
| 9 · GitHub y Vercel | Flujo y fuentes de verdad documentados; ramas publicadas | GitHub API bloqueada; Vercel no tiene autenticación disponible aquí. No se inventan enlaces de despliegue ni se consideran publicaciones completadas |
| 10 · Otros medios | Catálogo de archivos finales y comprobaciones por servicio | Proveedores de imagen/video/audio, herramientas de edición y datos de producción física no configurados |
| 11 · Operación comercial | Presupuesto, propuesta y portal existentes | Identidad fiscal, condiciones contractuales, cobros y proveedores requieren configuración y validación; no se envían documentos ni se cobran importes por inferencia |
| 12 · Mejora continua | Fallos y revisiones negativas generan incidencias agrupadas; seguimiento y prueba declarada al resolver | Investigación automática y cambios de código por PR requieren IA real y acceso GitHub; no se modifica software en producción sin validar |
| 13 · Servicios recurrentes | Bases de catálogo y memoria listas para construir recorridos repetibles | Depende de calidad demostrada, publicación, métricas, límites y permisos de los servicios correspondientes |

La evidencia de ejecución y los límites están en [validacion-49.md](validacion-49.md).

## Chat y decisiones

El chat solo incluye fuentes del proyecto autenticado. Una explicación histórica requiere un registro creado al producir la entrega, con ids de requisitos o entregas realmente leídas. Una respuesta actual basada en IA no se presenta como la razón histórica del agente. Si la conexión falla, se muestra un resumen de los registros y se distingue de la respuesta de IA.

Consultar no ejecuta cambios. El modo de encargo convierte una instrucción explícita en una operación permitida. No puede aprobar entregas, publicar, borrar, mandar mensajes ni cambiar políticas. Los encargos se guardan antes de aplicarse; si el proyecto trabaja o cambió la versión, quedan bloqueados con su causa. El recibo se puede consultar y reintentar sin crear otro encargo.

La deduplicación de peticiones simultáneas del chat es por instancia del servidor. Los archivos privados permiten conservar solicitudes y resultados, pero no constituyen una transacción distribuida. La cola SQL necesita aplicación, integración y pruebas de concurrencia antes de afirmar garantías mayores.

## Producción vectorial

Mira puede entregar seis SVG: tres rutas, logo principal, monocromo y símbolo. Los archivos se guardan por tarea y versión, se validan contra scripts, imágenes raster y referencias externas, y se muestran como piezas editables. El control renderiza muestras a 16, 32 y 128 píxeles y sobre fondo oscuro; el revisor recibe las capturas. La ausencia de archivos o un SVG inválido solicita una corrección, con el límite de rondas ya existente.

La tipografía, las licencias, originalidad y adecuación al cliente no quedan demostradas por la mera validez de un SVG. Siguen siendo condiciones de aceptación.
