# Jurado · resumen de la fase 4

Tres rondas de un jurado independiente con criterios de Awwwards (Diseño 40 %, Usabilidad 30 %, Creatividad 20 %, Contenido 10 %), a partir de capturas.

| Ronda | Diseño | Usabilidad | Creatividad | Contenido | Ponderada |
|---|---|---|---|---|---|
| 1 (fase 3) | 7,0 | 6,5 | 7,5 | 6,0 | **6,85** |
| 2 | 7,4 | 7,6 | 7,8 | 6,2 | **7,42** |
| 3 | 7,6 | 7,8 | 8,0 | 6,3 | **7,61** |

Veredicto de la ronda 3: en el umbral de Site of the Day. Para pasar con margen faltan contenido real y nombre.

Después de la ronda 3 se corrigieron también: agentes que se veían con un solo ojo, el faro de Faro tapado, el tono lavado de Prisma, el amarillo de Crecimiento, Sonda sola en la Sala móvil y el corte seco del modo noche. No se volvió a evaluar.

## Lo que falta y no depende del código

1. **Portafolio:** 2–3 proyectos previos de Jay y Luna, con imagen a sangre y un resultado concreto.
2. **Personas:** retratos de Jay y Luna, y fotos reales de shootings y eventos para "También juntamos gente".
3. **Nombre y logo:** hoy la marca es "ANONYMO*" en mono pequeño; falta logotipo, pantalla de carga y favicon.

## Automático

axe: 0 fallas en las 8 páginas. Lighthouse (escritorio): accesibilidad, buenas prácticas y SEO en 100. Rendimiento sin medir de forma válida (aquí no hay GPU); pendiente en un enlace de prueba con celular real.

Para repetirlo: `npm run build && npm run start -w @anonymo/web -- -p 3311` y luego `npm run jurado -w @anonymo/web -- http://localhost:3311`.
