# Plan de implementación de ANONYMO

main contiene 0.47–0.50 (PR #78). La rama 52 incluye 0.51 y añade referencias creativas y comprobación de conexiones. Ninguna fase se considera operativa en producción solo por tener código o pruebas con IA falsa.

| Fase | Evidencia y trabajo preparado | Pendiente o bloqueo |
|---|---|---|
| 0 · Base en producción | 0.50 en main; diagnóstico de conexiones preparado en 0.52 y binario comprobado localmente | main está en 0.50. El despliegue posterior al merge y los servicios reales siguen por comprobar. El acceso de API desde este entorno ha respondido Forbidden |
| 1 · Ejecución fiable | Identificador y recibo de encargos; rechazo de versiones antiguas; límites de corrección; estado del control sin señales no se presenta como trabajo vivo | 0.52 prueba infra/cola.sql con PostgreSQL real: una reserva activa por proyecto, renovación, recuperación y límite de intentos. Falta integrar reservas y publicación condicional del estado en Storage y activar la migración; el ejecutor actual no ofrece esas garantías |
| 2 · Experiencia de Jay | Inicio móvil, búsqueda, fase, pendientes, acceso al equipo y comprobaciones bajo demanda; chat flotante de Atlas en 0.51 | Validación con uso real tras desplegar |
| 3 · Memoria y servicios | Requisitos con fuente, decisiones con fuentes válidas, versiones, catálogo de archivos y condiciones por servicio | 0.51 distingue decisiones confirmadas, históricas y desactualizadas y las reutiliza por contrato. Faltan memoria general de agencia, políticas comerciales y propagación transitiva completa de cambios |
| 4 · Chat de consulta | Atlas y agentes del proyecto; respuestas con fuentes, historial privado y resumen factual sin IA | Conexión de IA real no disponible en esta máquina. Consulta global entre proyectos y calibración de respuestas |
| 5 · Calidad ANONYMO | Controles por versión, capturas, mediciones y corrección limitada | 0.52 añade referencias visuales seleccionadas, copias compartidas y condiciones por referencia. Faltan calibración con casos reales y evidencia de calidad creativa de agencia líder |
| 6 · Web y textos | Producción y revisión existentes; requisitos y decisiones en el contexto del productor; controles funcionales de web en 0.50 | 0.50 prueba enlaces/anclas y casos de interacción de las webs; faltan recepción real de formularios, cobertura adicional por servicio, idiomas y validación factual |
| 7 · Identidad | Mira entrega SVG editables, rutas, variantes y revisión visual a tamaños pequeños | Calidad creativa, licencias y riesgos legales requieren evidencia real. Sin clave de IA no se valida producción real |
| 8 · Acciones por chat | Encargos internos acotados: ajustar, verificar, pausar, reanudar y continuar, con recibo y versión objetivo | Ejecución distribuida transaccional y autorización por presupuesto; no hay publicación ni aprobación automática desde el chat |
| 9 · GitHub y Vercel | Flujo y fuentes de verdad documentados; ramas publicadas; comprobación funcional incluida en CI | GitHub API bloqueada; Vercel no tiene autenticación disponible aquí. No se inventan enlaces de despliegue ni se consideran publicaciones completadas |
| 10 · Otros medios | Catálogo de archivos finales y comprobaciones por servicio | Proveedores de imagen/video/audio, herramientas de edición y datos de producción física no configurados |
| 11 · Operación comercial | Presupuesto, propuesta y portal existentes | Identidad fiscal, condiciones contractuales, cobros y proveedores requieren configuración y validación; no se envían documentos ni se cobran importes por inferencia |
| 12 · Mejora continua | Fallos y revisiones negativas generan incidencias agrupadas; seguimiento y prueba declarada al resolver | Investigación automática y cambios de código por PR requieren IA real y acceso GitHub; no se modifica software en producción sin validar |
| 13 · Servicios recurrentes | Bases de catálogo y memoria listas para construir recorridos repetibles | Depende de calidad demostrada, publicación, métricas, límites y permisos de los servicios correspondientes |

La evidencia de ejecución y los límites están en [validacion-49.md](validacion-49.md), [validacion-50.md](validacion-50.md) y [validacion-51.md](validacion-51.md) y [validacion-52.md](validacion-52.md).

## Chat y decisiones

El chat solo incluye fuentes del proyecto autenticado. Una explicación histórica requiere un registro creado al producir la entrega, con ids de requisitos o entregas realmente leídas. Una respuesta actual basada en IA no se presenta como la razón histórica del agente. Si la conexión falla, se muestra un resumen de los registros y se distingue de la respuesta de IA.

Consultar no ejecuta cambios. El modo de encargo convierte una instrucción explícita en una operación permitida. No puede aprobar entregas, publicar, borrar, mandar mensajes ni cambiar políticas. Los encargos se guardan antes de aplicarse; si el proyecto trabaja o cambió la versión, quedan bloqueados con su causa. El recibo se puede consultar y reintentar sin crear otro encargo.

La deduplicación de peticiones simultáneas del chat es por instancia del servidor. Los archivos privados permiten conservar solicitudes y resultados, pero no constituyen una transacción distribuida. La cola SQL necesita aplicación, integración y pruebas de concurrencia antes de afirmar garantías mayores.

## Producción vectorial

Mira puede entregar seis SVG: tres rutas, logo principal, monocromo y símbolo. Los archivos se guardan por tarea y versión, se validan contra scripts, imágenes raster y referencias externas, y se muestran como piezas editables. El control renderiza muestras a 16, 32 y 128 píxeles y sobre fondo oscuro; el revisor recibe las capturas. La ausencia de archivos o un SVG inválido solicita una corrección, con el límite de rondas ya existente.

La tipografía, las licencias, originalidad y adecuación al cliente no quedan demostradas por la mera validez de un SVG. Siguen siendo condiciones de aceptación.
