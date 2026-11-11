# Experiencia: reglas que no se rompen (sistema/67)

Valen igual en el estudio, video, clientes nuevos, contenido y el portal. Cada regla tiene que tener una prueba en `scripts/pruebas/`: si algo la rompe, la rama no se entrega.

1. **Nunca te saca de donde estás.** Toda acción vuelve a la misma pestaña, filtro y posición. Si cambia de lugar (crear un pedido), el botón dice a dónde lleva.
2. **Atrás es Atrás.** Pestañas, filtros y vistas viven en la dirección de la página (`?ver=`, `?filtro=`); los resultados («guardado», errores) no. Atrás lleva a la vista anterior, nunca a un aviso viejo.
3. **Un botón principal por pantalla.** Lo que se espera de ti ahora es lo más visible; lo demás es secundario o vive en «Más».
4. **Todo botón se gana su lugar.** Si no cambia algo que importe en ese momento, se va. Lo de mantenimiento vive en el Taller.
5. **Siempre sabes qué pasa.** Al tocar: respuesta inmediata; mientras trabaja: quién, qué y cuánto suele tardar; al terminar: qué cambió, en palabras simples. Una sola forma de esperar en todo el sistema.
6. **Las mismas palabras para lo mismo.** «Aprobar», «Pedir cambio», «Enviar» significan lo mismo en todos los departamentos.
7. **Comentar sobre la pieza.** El comentario queda pegado al punto exacto de la web, la imagen o el segundo del video.
8. **Deshacer antes que confirmar.** Lo que se puede revertir se hace al momento con «Deshacer»; la confirmación queda para lo que no tiene vuelta (borrar, publicar, mandar al cliente).

## Celular y escritorio

El celular es para capturar, decidir y contactar; el escritorio, para revisar a fondo y configurar. En celular lo que no sirve se esconde, no se encoge.

| Tarea | Celular | Escritorio |
|---|---|---|
| Ver qué me toca, aprobar o pedir cambio | Principal, de una en una | Sí |
| Contar un pedido a Atlas (texto, voz, fotos) | Principal | Sí |
| Subir fotos, videos, referencias | Principal, desde «Compartir» | Sí, arrastrando |
| Escribir a prospectos por WhatsApp | Principal: la tanda del día | Preparar la lista |
| Video: subir y pedir cambios | Sí | Sí |
| Revisar una web o una dirección | Vista previa y comentar | Principal: comparar lado a lado |
| Calificar referencias del banco | Una a la vez | Principal, en lote |
| Marca, propuesta, criterio, conexiones | No se muestra | Principal |

Barra de abajo en celular: **Inicio** · **Clientes** · **＋ Capturar** · **Video** · **Atlas**. Sin botón flotante de Atlas en celular.

## Fallas encontradas al auditar (11 nov 2026, 0.67)

| Dónde | Qué pasa | Causa |
|---|---|---|
| Proyecto → Ajustes, Cliente | Pausar, reanudar, pedir el enlace del portal o cambiar quién aprueba te devuelve a Resumen (arreglado en 0.69) | 14 de las 28 llamadas a `correr()` en `app/estudio/acciones.ts` no pasan `ruta` |
| Avisos | `?ok=` y `?error=` viajan en la dirección y suman pasos al historial | `redirect()` con el texto del aviso (desde 0.69 reemplaza el paso del historial) |
| Celular, barra de abajo | Lleva a Proyectos, Buscar y Pendientes; Video y Clientes nuevos solo por el menú | `components/estudio/Marco.tsx` |
| Celular, proyecto | 3 pestañas visibles, el resto en «Más opciones»; el botón de Atlas tapa la fila de pestañas | Pestañas de escritorio encogidas |
| Escritorio, menú | Herramientas diarias al mismo nivel que Banco, Conexiones y Métricas | El menú creció por agregado |
| Banco en celular | 23.030 px de alto | Muestra todas las referencias a la vez |
| Video | El que edita se llama Atlas aunque existe Corte (Video) | El departamento nació antes de asignarle agente |
| Clientes nuevos | «Convertir en pedido» no deja rastro en el prospecto | Primera versión |
