# Clientes (sistema/66 y 70)

## La ficha de cada cliente (sistema/70)

Menú → **Clientes** abre la cartera. Cada ficha se arma sola uniendo, por el nombre del cliente o por el enlace guardado: el prospecto de Imán (si respondió, tiene reunión, es cliente o se volvió pedido), sus pedidos y proyectos (menos los de la papelera), sus videos y su kit de marca. A mano se agregan teléfono, correo, web, notas y otros nombres (alias): lo que tenga uno de esos nombres entra a la misma ficha. Código en `packages/pipeline/src/clientes/`; lo escrito a mano vive en `_clientes/lista/fichas.json` en la nube privada.

Recorrido: prospecto → «Convertir en pedido» → el proyecto nace con `pedido.ficha` y el prospecto pasa a «Cliente» con el id del proyecto → el proyecto tiene «Ficha de…» → la ficha muestra todo y su historia → desde el prospecto, «Ver el proyecto» y «Ficha del cliente».

# Clientes nuevos (sistema/66)

El escritorio de **Imán** (Ventas) dentro del estudio. Busca negocios que necesitan una web y deja listo el primer mensaje.

## Cómo se usa

1. Menú → **Clientes** → pestaña **Nuevos · Imán**.
2. Elige ciudad y rubros (Salud, Legal y contable, Belleza y bienestar) o escribe otras búsquedas separadas por coma.
3. «Que Imán busque»: por cada búsqueda trae hasta 20 negocios de Google Maps (60 con «Más resultados»). Después revisa la web de cada uno.
4. La lista sale ordenada por puntaje. Filtra por tipo de web, estado, puntaje o «Solo con celular».
5. **WhatsApp** abre el chat con el mensaje escrito y marca el negocio como contactado. «Más» deja editar el mensaje y las notas.
6. Cuando el negocio responde y hay trato, **Convertir en pedido** abre «Cuéntale a Atlas» con el negocio y lo que Imán encontró.

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
