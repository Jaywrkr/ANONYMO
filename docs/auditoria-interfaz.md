# Auditoría de la interfaz (fase 1, sistema/116)

Medida con `scripts/pruebas/auditar-pantallas.mjs` (captura y mide las 32 pantallas del estudio en escritorio 1360 px y celular 390 px). La misma auditoría se repite en la fase 11.

## Lo que se encontró

| # | Dónde | Qué pasa | Qué se hizo / en qué fase |
|---|---|---|---|
| 1 | Todo el estudio | Los títulos de pantalla tenían 9 tamaños distintos (de 34 a 68 px); el nombre de la pantalla pesaba más que lo que hay que hacer | **Hecho:** un solo título (`titulo` en `lib/estudio.ts`): 26 px en celular, 32 en escritorio. Cifras grandes topadas en 36 |
| 2 | Menú de escritorio | 11 entradas al mismo nivel; Biblioteca, La oficina y Papelera junto al trabajo diario | **Hecho:** Inicio, Clientes, Producción (Contenido, Video), Atlas; todo lo demás dentro del **Taller** (antes «Mejorar el estudio») |
| 3 | Celular, barra de arriba | Un botón «Menú» con texto, gris y grande | **Hecho:** ícono de menú; arriba solo lo que dice dónde estás |
| 4 | Encabezados | Un párrafo de 2–3 líneas explicando cada pantalla (Video, Contenido, Gasto, Criterio…); en celular empujaba todo hacia abajo | **Hecho:** una línea, y solo en escritorio |
| 5 | Video | Enlaces duplicados arriba («El mes de contenido» ya está en el menú) | **Hecho:** quitado; «Marcas de video» como enlace chico |
| 6 | Inicio en celular | Los nombres de proyecto a 31 px: tres tarjetas llenaban la pantalla | **Hecho:** 22 px |
| 7 | Ficha del cliente | 3.900 px: 7 tarjetas de «Qué se puede hacer» con chips y los 22 datos abiertos | **Fase 2** (la ficha pasa a ser la Dirección del cliente) |
| 8 | Video | 2.000 px: lista, pedir guion y subir video, todo junto | **Fase 10** (video con el mismo molde) |
| 9 | Pedidos | Tres entradas para pedir algo (Nuevo pedido, Contar, Armar mes) | **Fase 3** (todo entra por el chat con Atlas) |
| 10 | Marca del cliente | Kits de marca en Video y datos de marca en la ficha, por separado | **Fase 2** |
| 11 | Banco de calibración | 9.400 px, 172 botones | Al Taller; no se invierte más (plan) |
| 12 | Proyecto en celular | El plan de Atlas con cifras grandes y la lista completa de agentes antes de la decisión | **Fase 4** (lo que te toca, de una en una) |

## Cómo correrla

```bash
bash scripts/pruebas/nube.sh
node scripts/pruebas/e2e-contenido.mjs /tmp/x; node scripts/pruebas/e2e-nuevo.mjs /tmp/x; node scripts/pruebas/e2e-video.mjs /tmp/x   # datos de prueba
node scripts/pruebas/auditar-pantallas.mjs /tmp/auditoria
```
