# Dirección de arte · fase 1

Sacada de lo que Jay guarda en MyMind (websites, posters, flyers, gif, ui).

## Principios

1. **Base calma.** Hueso `#efede8` y tinta `#121214`. Mucho aire. Grano de impresión sobre todo.
2. **El color vive en los agentes.** Óvalos de degradado mate con grano y dos puntos por ojos (referencia: la grilla de 9 óvalos). Cada área tiene su degradado: luz, medio, sombra y un acento que fluye.
3. **Golpes de tipografía.** Big Shoulders Display condensada, en peso ligero: grita por tamaño, no por grosor. Geist para leer, Geist Mono para datos.
4. **Objetos de estudio.** Cada agente lleva un objeto 3D mate de su oficio (referencia: Hot Lunch, CW&T).
5. **Movimiento con peso.** Entradas rápidas que frenan seco. Agentes que respiran, parpadean y miran al cursor.
6. **Capa de eventos.** Degradados psicodélicos con grano, solo en la sección de Luna.

## Técnica

- Un solo lienzo WebGL para toda la web (`components/escena/Lienzo.tsx`); cada agente se pinta en su hueco con `View` de drei.
- Shader propio de la esfera en `components/escena/material.ts`.
- Objetos en `components/escena/Prop.tsx`.

## Pantallas

`capturas/fase-1/`: inicio, equipo, fases, sala, ficha, sistema y móvil.

## Fase 2 · agentes 3D

- Objetos corregidos: micrófono curvo de Atlas, visera de Ledger inclinada hacia adelante, corona de laurel de Trofeo con baya dorada.
- Interacción: al pasar el cursor, el agente se eleva, abre los ojos y mueve su objeto; al hacer clic, rebota.
- Carácter en reposo: Kine y Chispa dan saltitos, Eco se balancea, Lumen flota más alto, Atlas casi no se mueve.
- Mirada: los ojos siguen el cursor; si nadie lo mueve en 3 s (o en un celular), miran alrededor solos.
- Sombra de contacto que se achica cuando el agente sube.
- Rendimiento: una sola geometría compartida, esfera de 56 segmentos, shader con un solo ruido en el fragmento y resolución que baja sola si los fps caen de 45. En GPU por software el equipo completo pasó de 3,3 a 5,3 fps; falta medir en un celular real.
