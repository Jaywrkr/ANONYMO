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
