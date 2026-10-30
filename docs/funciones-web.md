# Comprobar que la web funciona · 0.50

Una captura bonita no demuestra que una web sirva. Vector debe entregar enlaces con destino y casos reproducibles para sus botones. La revisión ejecuta los casos en el navegador aislado, a 390 y 1440 píxeles, usando los archivos de esa versión.

## Lo que comprueba

- Los enlaces locales apuntan a archivos que existen. Las anclas se buscan en el documento renderizado, también si pertenecen a otra página. Se rechazan enlaces vacíos, `#` y protocolos de script. Los destinos externos y contactos se enumeran, pero no se visitan ni se consideran comprobados.
- Los recursos locales con respuestas de error aparecen como fallos.
- Cada botón visible y habilitado necesita un caso ejecutado con un cambio observable. Clicar un botón sin acción antes de otro que sí funciona no acredita el primero. El resultado debe pasar de no cumplir a cumplir tras el último paso; se permite abrir y cerrar con los pasos preparatorios necesarios.
- No se envían formularios. La presencia de un formulario o una conexión de datos sin completar queda pendiente hasta poder comprobar su destino y recepción real mediante una prueba autorizada. Mostrar una confirmación dentro de la página no demuestra recepción.
- Un fallo técnico solicita cambios antes de pagar una revisión visual de IA o repetir Lighthouse. Las comprobaciones incompletas quedan pendientes. Los casos, capturas e informes se vinculan a la versión y su huella; al cambiar el sitio o sus pruebas, deja de ser válida la revisión.

Los informes previos de Vector requieren verificarse de nuevo para aplicar esta política. No se invalidan por esta razón las entregas de otros agentes.

## Casos de Vector

`pruebas.json` se entrega como un archivo más del sitio:

```json
{"version":1,"pruebas":[{"nombre":"Abrir menú móvil","pagina":"index.html","ancho":390,"pasos":[{"accion":"clic","selector":"#abrir-menu"}],"resultado":{"selector":"#menu","visible":true}}]}
```

Acciones admitidas: `clic` y `rellenar` con `valor`. El resultado admite `visible` y `texto` exacto. Selectores únicos; no hay ejecución de código de prueba. Máximo 24 casos, doce por página y ancho, seis pasos por caso y 64 KB de archivo. Los formularios y la navegación externa están fuera de estos casos. La falta de casos para los controles restantes solicita una corrección; no se aprueban por falta de cobertura. Cada caso se inicia con la página recargada.

## Prueba

```bash
CHROMIUM=/usr/bin/chromium node --experimental-strip-types scripts/pruebas/funciones-web.ts
```

El script usa sitios ficticios, navegador real y una carpeta temporal aislada. Comprueba menú abierto/cerrado, casos triviales que no prueban nada, un botón sin acción encubierto por otro, enlaces y anclas rotos, casos inválidos, prohibición de enviar formularios y la puerta real de calidad. No necesita clave de IA.

La misma prueba queda incluida en CI para cada PR y push a main, usando el binario de Chromium fijado en dependencias. No necesita proveedores de IA ni servicios de clientes.

Ejecuta además AGENTS.md y los recorridos de HANDOFF.md. Para comprobar el binario incluido para servidor añade `VERCEL=1 TMPDIR=/tmp/anonymo-chromium-141`.

## Límites

Estos son casos acotados, no una prueba exhaustiva de cada comportamiento posible. No demuestran traducción correcta, precisión de textos, disponibilidad de destinos externos, recepción de mensajes ni conversión comercial. La calidad visual y adecuación al pedido siguen necesitando evaluación. La conexión real y el despliegue de las fases posteriores continúan pendientes.
