# Clientes (sistema/66 y 70)

## La ficha de cada cliente (sistema/70)

Menú → **Clientes** abre la cartera. Cada ficha se arma sola uniendo, por el nombre del cliente o por el enlace guardado: el prospecto de Imán (si respondió, tiene reunión, es cliente o se volvió pedido), sus pedidos y proyectos (menos los de la papelera), sus videos y su kit de marca. A mano se agregan teléfono, correo, web, notas y otros nombres (alias): lo que tenga uno de esos nombres entra a la misma ficha. Código en `packages/pipeline/src/clientes/`; lo escrito a mano vive en `_clientes/lista/fichas.json` en la nube privada.

Recorrido: prospecto → «Convertir en pedido» → el proyecto nace con `pedido.ficha` y el prospecto pasa a «Cliente» con el id del proyecto → el proyecto tiene «Ficha de…» → la ficha muestra todo y su historia → desde el prospecto, «Ver el proyecto» y «Ficha del cliente».

## La tanda de hoy y lo que vio Sonda (sistema/71)

- Clientes → Nuevos abre en **«La tanda de hoy»**: los negocios nuevos con celular y puntaje de 50 o más, los mejores primero, hasta completar 20 mensajes en el día (hora de Cuenca). Arriba dice cuántos van. Al llegar a 20, las tarjetas nuevas muestran «Tope de hoy» en lugar de WhatsApp. El tope es `TANDA_DIARIA` en `packages/pipeline/src/prospectos/tipos.ts`. Los demás filtros siguen en el selector.
- Al revisar una web, **Sonda** guarda cómo se describe el negocio (meta description), de qué habla (títulos h1 y h2) y sus redes (`revision.sonda`). Se ve en «Más» → «Lo que Sonda vio en su web» y sirve para escribir un mensaje que no suene genérico.

## La muestra, el aviso y la tanda de celular (sistema/72)

- **La muestra**: cada prospecto tiene una idea de su web en `/m/<nombre>-<huella>` (pública, sin índice en Google). Se arma sin IA con lo que ya se sabe: nombre, rubro, ciudad, dirección, teléfono, estrellas, y lo que Sonda leyó en su web (cómo se describe y de qué habla). Lo que no se sabe va como texto de ejemplo y la página lo dice. No usa fotos ni reseñas de Google. Los colores salen del rubro (salud, legal, belleza, otro). Si el prospecto se descarta, la muestra deja de abrirse.
- **El primer mensaje lleva el enlace**: «Les preparé una idea de cómo podría verse su web, sin compromiso: …».
- **El aviso**: cuando el negocio la abre, se anota en su historial («Abrió su muestra», «Volvió a ver su muestra») y suena el celular de quienes activaron «Avisarme en este celular». Recargar no vuelve a avisar (30 minutos de pausa). Si la abre Jay o Luna con sesión, no cuenta. La vista previa de WhatsApp tampoco: solo cuenta un navegador de verdad.
- **«Quiero esta web»**: la barra de abajo de la muestra dice plazo y precio (de `docs/oferta.md`) y abre el WhatsApp de ANONYMO (Ajustes → «WhatsApp de ANONYMO») con el mensaje listo. Es la señal más fuerte: avisa y queda primera en «Ahora mismo».
- **Ahora mismo**: arriba del escritorio y de la tanda, quién está viendo su muestra (última media hora) y quién quiere su web, con Llamar y WhatsApp. Se actualiza solo cada medio minuto.
- **La tanda de celular** (`/estudio/clientes/tanda`): un negocio por pantalla, el de más puntaje primero, con su muestra y el mensaje. «Enviar por WhatsApp» abre el chat y lo marca como contactado; «Saltar» lo deja para el final; «Descartar» lo saca. Respeta el tope de 20 al día.
- **Avisos al celular**: Web Push. En Android basta Chrome. En iPhone hay que agregar el estudio a la pantalla de inicio (Compartir → «Agregar a inicio») y activarlo desde ahí. Las claves son `VAPID_PUBLICA` y `VAPID_PRIVADA` (`npx web-push generate-vapid-keys`); los celulares quedan en `_avisos/lista/celulares.json` en la nube privada.
- Código: `packages/pipeline/src/prospectos/muestra.ts`, `packages/pipeline/src/avisos-celular.ts`, `packages/pipeline/src/oferta.ts`, `apps/web/app/m/[id]/`, `apps/web/app/estudio/clientes/tanda/`, `apps/web/app/estudio/avisos/`, `apps/web/lib/tanda.ts`, `apps/web/lib/avisos-celular.ts`. Pruebas: `test/muestra.test.ts` y `scripts/pruebas/e2e-muestra.mjs` (en una nube recién levantada).

# Clientes nuevos (sistema/66)

El escritorio de **Imán** (Ventas) dentro del estudio. Busca negocios que necesitan una web y deja listo el primer mensaje.

## Cómo se usa

1. Menú → **Clientes** → pestaña **Nuevos · Imán**.
2. Elige ciudad y rubros (Salud, Legal y contable, Belleza y bienestar) o escribe otras búsquedas separadas por coma.
3. «Que Imán busque»: por cada búsqueda trae hasta 20 negocios de Google Maps (60 con «Más resultados»). Después revisa la web de cada uno.
4. La lista sale ordenada por puntaje. Filtra por tipo de web, estado, puntaje o «Solo con celular».
5. **WhatsApp** abre el chat con el mensaje escrito y marca el negocio como contactado. «Más» deja editar el mensaje y las notas.
6. Cuando el negocio responde y hay trato, **Convertir en pedido** abre «Cuéntale a Atlas» con el negocio y lo que Imán encontró.

## Plantillas de la muestra

Cada muestra sale con una de cinco plantillas, repartidas parejo, para ver cuál convence más:

- **Color**: marco del color de la marca, nombre enorme, sello con su nota de Google.
- **Sereno**: papel claro, serif suave al centro, la imagen en un arco.
- **Mosaico**: todo en fichas redondeadas, como una app.
- **Revista**: blanco, negro y su color; titular condensado y una cinta de servicios.
- **Noche**: oscura, con un resplandor de su color.

Para cambiarla en un negocio: «Más» → «Plantilla de su muestra». Para verlas: Clientes → **Plantillas**.

**Qué trae cada muestra (sistema/87)**: portada, servicios, la frase, «por qué aquí», **«Así de fácil»** (tres pasos para agendar), **«Lo que dicen»** (su nota real de Google y tres reseñas de ejemplo, marcadas «Ejemplo»), dos espacios que dicen «La foto de tu equipo» y «La foto de tu trabajo» hasta que suba las suyas, **preguntas frecuentes** y «Ven a vernos».

**Movimiento**: el nombre entra palabra por palabra, la imagen se abre y baja más lento que la página, las fichas se mecen, el punto de «abierto hoy» late, un brillo cruza el botón principal, cada sección aparece al llegar a ella, la frase grande se enciende palabra por palabra y la nota de Google cuenta desde cero. Si el celular pide menos movimiento, o el navegador no corre el código, todo se ve quieto y completo: nada depende del movimiento para leerse. Código: `components/muestra/Movimiento.tsx` (al bajar), `Cielo.tsx` (`EstilosMuestra`, `Palabras`, `Lee`, `Cuenta`, `Punto`) y `Secciones.tsx` (las secciones compartidas; cada plantilla las viste con su `Tema`). Para que algo aparezca al bajar se le pone `data-aparece` (o `"escala"`, `"lado"`, `"corta"` para imágenes).

**Colores**: se respeta el color del negocio. Sale de su web si la tiene; si lo ves en su Instagram o su letrero, ponlo en «Más» → «Color de su marca»; si no se sabe, va el de su rubro.

**De la muestra al pedido**: «Crear el pedido» le cuenta a Atlas la plantilla, los colores, los servicios, el horario, las fotos y lo acordado, para que la web final parta de lo que el cliente ya vio.

## Recordatorio y propuesta (sistema/80)

- A los **3 días** sin respuesta, la tanda pone primero el recordatorio: un mensaje corto con el enlace a su **propuesta**. Se manda una sola vez y no cuenta para el tope diario.
- La propuesta (`/p/<id>`) dice precio, plazo, qué incluye, cómo sigue, el plan mensual y los extras. Sale de `packages/pipeline/src/oferta.ts`.
- Cuando el negocio la abre, suena el celular. Si toca **Aceptar**, suena otra vez, pasa a «Respondió», queda primero en «Ahora mismo» y se abre el WhatsApp de ANONYMO con «acepto la propuesta». Lo siguiente es cobrar el 50 % y convertirlo en pedido.
- En cada negocio, «Más» → «Su propuesta» para mandarla antes si preguntan el precio.

## Cerrar la venta (sistema/81)

- La muestra lleva el **horario real** del negocio (el de Google). Si Google no lo tiene, va uno de ejemplo y la franja de arriba lo dice.
- En el recordatorio de la tanda, **Ya respondió** lo pasa a «Respondió» y no se le recuerda.
- Cuando alguien acepta la propuesta, «Ahora mismo» ofrece **Cobrar el 50 %** (abre su WhatsApp con el monto) y **Crear el pedido**.
- Clientes → Plantillas → **Cuál funciona mejor**: enviadas, abiertas, «quiero» y aceptadas por plantilla. Espera unas 40 enviadas antes de decidir.

## Precio y fotos (sistema/82)

- **Precio por negocio**: «Más» → «Precio de su web». Cámbialo antes de mandar la propuesta. Vale para su muestra, su propuesta y el mensaje de cobro.
- **Fotos**: en su muestra, el negocio toca «Verla con mis fotos» y sube hasta 3. La página se rehace con ellas y te suena el celular. Si alguna no va, «Más» → «Quitarlas de la muestra».

## Puntaje (0 a 100)

Sin IA, reglas fijas en `packages/pipeline/src/prospectos/puntaje.ts`:

| Situación | Base |
|---|---|
| Web rota, dominio vacío o página de Google cerrada | 85 |
| Solo redes (Instagram, Facebook, WhatsApp, Linktree, TikTok, Doctoralia) | 75 |
| Sin web | 70 |
| Web propia | 15 + no sirve en celular 30, sin https 15, sin actualizar 2 años o más 15, carga en más de 4 s 10, sin título 5, Joomla y similares 10, Wix y similares 5 |

Reputación: 4,5 estrellas o más con 20 reseñas o más, +15 («Muy buena fama»); 4,2 con 10, +8; 80 reseñas o más, +5; menos de 3,5 estrellas, −10.

## Dónde vive

- Lista: `_prospectos/lista/lista.json` en la nube privada (en tu máquina, `proyectos/_prospectos/`). Nunca en el repo: son negocios reales.
- Rutas: `/estudio/clientes/nuevos` (página), `/buscar` (una búsqueda), `/revisar` (8 webs por vez; el navegador repite hasta terminar), `/[id]` (estado, notas, mensaje), `/ajustes` (firma).
- La revisión de webs no abre navegador: baja el HTML con `fetch` y busca viewport, título, generador, año del copyright y tiempo de respuesta.

## Clave

`GOOGLE_PLACES_API_KEY` en Vercel (la pone Jay). En Google Cloud: activar **Places API (New)**, crear la clave y restringirla a esa API. Pide los campos de teléfono, web y reseñas, que Google cobra en su nivel más alto: cada página de 20 resultados es una consulta. Una pasada por los tres rubros son 14 consultas (42 con «Más resultados»).

## Pruebas

`node --test packages/pipeline/test/prospectos.test.ts`: puntaje, mensajes, números de WhatsApp, lectura del HTML, revisión con una red falsa, búsqueda con un Google falso y la lista guardada.
