# Calibración del juez

**Estado (0.56, 4 nov 2026): todavía sin calibración real.** En la máquina donde se armó el banco no había `ANTHROPIC_API_KEY` y la red no dejaba abrir los sitios premiados, así que no hay capturas de terceros ni notas del juez de verdad. Las cifras de abajo salen solo de pruebas con una IA falsa y **no dicen nada de la calidad del juez**.

## Paso que falta (una vez, en una máquina con internet y `.env.local` con la clave de IA y Supabase)

```bash
npm install
npm run banco:capturar -- --faltan                          # capturas privadas 1440/390 y logos → Supabase (_banco/capturas)
npm run banco:calibrar -- --informe docs/calibracion.md     # hasta 3 rondas; agrega aquí el informe de cada ronda
```

Después, en el estudio (Menú → Banco de calibración) se ve el mismo informe y la nota calibrada empieza a aparecer en cada revisión. También se puede calibrar desde el botón **Volver a calibrar** del estudio, sin terminal (usa las capturas que ya estén en el almacén).

Costo estimado: unas 230 calificaciones por ronda con las 4 disciplinas (≈ US$ 3–6 con Sonnet); el informe muestra el costo real.

## Cómo leer el informe
- **Diferencia promedio**: cuántos puntos se aleja, en promedio, la nota del juez de la nota de referencia. Meta ≤ 1.
- **Bien clasificadas**: premiadas que reciben 9 o más + genéricas y de principiante que reciben 6 o menos. Meta ≥ 90 %.
- **Variación al repetir**: la misma pieza calificada dos veces. Meta ≤ 1 punto.
- **Sesgo por nivel**: si el juez sube o baja siempre a un nivel (por ejemplo, +2 en las genéricas = las sobrevalora). De ahí salen los ajustes de la ronda siguiente.
- **Con corrección**: la diferencia después de aplicar la recta `a + b × nota`. Se mide con las mismas referencias con que se ajusta, así que es optimista: lo que vale es la diferencia sin corrección y la tendencia entre rondas.

## Informes
<!-- npm run banco:calibrar -- --informe docs/calibracion.md agrega cada ronda debajo de esta línea. -->
