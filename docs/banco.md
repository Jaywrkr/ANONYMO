# Banco de calibración · 0.55

Para saber si lo que produce ANONYMO tiene nivel de las mejores agencias, sin confiar solo en la opinión de la IA. Nos comparamos con trabajo premiado, con notas y criterios escritos.

Código: `packages/pipeline/src/banco.ts` (banco, rúbrica, calibración, comparación) y `juez.ts` (lo que el juez aprendió). Índice: `data/banco/*.json` (formato en `data/banco/ESQUEMA.md`). Estudio: Menú → **Banco de calibración** (`/estudio/banco`).

## Qué hay en el banco

| Disciplina | Total | 9–10 premiadas | 7–8 muy buenas | 5–6 genéricas | 3–4 principiante | Reales con fuente |
|---|---|---|---|---|---|---|
| Web | 46 | 14 | 10 | 12 | 10 | 24 |
| Identidad y logo | 42 | 15 | 5 | 12 | 10 | 20 |
| Naming | 50 | 15 | 12 | 12 | 11 | 27 |
| Redes y contenido | 50 | 16 | 12 | 12 | 10 | 28 |

- **9–10**: con premio mayor de 2023–2026 (Awwwards Site of the Year/Month/Day, Webby, D&AD Pencil, Cannes Lions, Brand Impact, Transform…) o casos clásicos de naming con la razón documentada (Lexicon, Landor, Interbrand…). Cada una lleva el enlace a la fuente.
- **7–8**: reconocimiento menor (mención, nominación, bronce, shortlist) o caso sólido sin premio mayor.
- **5–6 y 3–4**: arquetipos genéricos (plantilla corporativa, landing con degradado, tema de constructor, web y logo de principiante). No nombran ni exponen a ningún negocio real. Las maquetas que se ven se dibujan con `scripts/banco/arquetipos.ts`.
- Faltan para llegar a 50: web 4, identidad 8 (todas de 7–8). Se acabaron las búsquedas web de la sesión y no se inventó ninguna. Se pueden agregar desde el estudio.
- La investigación se hizo con búsquedas web (los sitios de premios no se podían abrir desde la máquina). Algunas autorías o años son menos firmes; están anotados en el informe de la rama y conviene que Jay los mire: Siena Film Foundation, Røroshotellene, Terminal Industries, Hôtel des Horlogers, Slosh Seltzer (web); Franki, Stack Overflow, Drawn to D&AD (identidad); Corteva, Adura (naming); IKEA «u up?», Molson, Santander, Heinz Seemingly Ranch (redes).

### Derechos
Las capturas son **solo para medir**. Se guardan en el almacén privado (`_banco/capturas/` en Supabase), se ven solo con sesión del estudio y nunca se usan como material para clientes. En el repo va solo el índice (metadatos, enlaces, notas y criterios). Una prueba (`test/banco.test.ts`) falla si aparece una imagen en `data/banco/`.

## La rúbrica sale del banco
Los criterios son los del oficio (`OFICIO` en `oficio.ts`), sin duplicarlos. Se sumaron cinco que la investigación mostró que separan a las premiadas: *movimiento* (web), *memorable* (identidad), *evocador*, *historia* y *distintivo-nombre* (naming), *idea* (redes). Los que solo aplican a una propuesta con varias opciones (rutas distintas, variedad, disponibilidad) no cuentan para una pieza terminada.

Peso de cada criterio = cuánto más lo cumplen las de 9–10 que las de 5–6 (más un mínimo), repartido para que sume 10. Con el banco actual:

- **Web**: movimiento 1.4 · nivel 1.4 · concepto 1.3 · sin plantilla 1.3 · dirección de arte 1.3 · ritmo 1.2 · tipografía 1.1 · copy específico 0.9 · acción visible 0.1 (las plantillas también la tienen: no distingue).
- **Identidad**: concepto 2.8 · distintivo 2.8 · sistema 2.2 · memorable 1.9 · construcción 0.3.
- **Naming**: estrategia 2.7 · distintivo 2.6 · historia 2.3 · evocador 2.1 · criterios duros 0.3.
- **Redes**: idea 3.3 · sin genérico 3.0 · ganchos 2.5 · formatos actuales 0.9 · estrategia 0.3.

Lo que comparten las premiadas y les falta a las genéricas: una idea propia del cliente y oficio en el detalle. Lo que tienen todas (acción visible, formatos correctos, un nombre corto) casi no pesa. Una pieza correcta sin nada distintivo queda cerca de 4,5: la escala `nota ≈ a + b × suma de pesos` también sale del banco (diferencia media 0,6–0,8 con las notas de referencia).

El juez recibe estos pesos y la escala en sus instrucciones (`calibracion()` → `textoCalibrado()`), en cada revisión de entrega.

## Calibrar al juez
- **A ciegas**: el juez es el mismo de las entregas (`textoJuez` y `llamarJuez` de `calidad.ts`). Recibe la pieza (capturas si hay y una descripción neutra; en naming, el nombre y su razón), nunca su nota, premio, autor ni nombre. Las referencias van mezcladas.
- **Acuerdo**: diferencia promedio con la nota de referencia; premiadas que reciben 9 o más; genéricas y de principiante que reciben 6 o menos. Meta: diferencia ≤ 1 y ≥ 90 % bien clasificadas.
- **Consistencia**: una muestra de cada nivel se califica dos veces; no puede variar más de 1 punto.
- **Rondas**: si no llega a la meta, se agregan instrucciones según hacia dónde se equivoca (por ejemplo, «sobrevaloras lo genérico») y se repite, hasta 3 rondas. Cada ronda queda guardada en `_agencia/calibracion/` y se ve en el estudio.
- **Nota calibrada**: con los resultados se ajusta una recta `nota de referencia ≈ a + b × nota del juez` por disciplina. Desde ese momento cada revisión guarda también la nota calibrada.
- Si Jay o Luna cambian una nota, agregan o quitan una referencia, la rúbrica se recalcula al instante y el estudio avisa que hay que volver a calibrar.

En el estudio corre en segundo plano, en pasos de menos de 5 minutos (`/trabajo/calibrar`), y la página muestra el avance. Calibrar todo son unas 230 llamadas por ronda (≈ US$ 3–6 con Sonnet; el informe da el costo real).

## Comparación a ciegas de cada entrega
En Proyecto → Requisitos y calidad, cada entrega de web, identidad, naming o redes tiene **Comparar con el banco**. El juez compara la entrega contra 3 a 5 piezas de 9 o más (primero las del mismo rubro y, si la nuestra tiene capturas, las que también tienen), con A y B al azar y sin saber cuál es la nuestra. Resultado: gana / empata / pierde contra piezas de 9, la nota calibrada y los 3 arreglos que más la acercan a un 10 (primero los de las comparaciones que perdió).

Límites: en naming se compara nuestra lista con un solo nombre premiado; y en web el juez puede reconocer una marca famosa en la captura. Por eso cuenta más la tendencia (cuántas pierde) que una comparación suelta.

## Lo que falta (necesita la máquina de Jay o un despliegue con clave)
En esta máquina no hubo `ANTHROPIC_API_KEY` ni acceso a los sitios de premios, así que **no hay capturas reales ni calibración real todavía**. Paso exacto, en una máquina con internet y el `.env.local` (clave de IA y Supabase):

```bash
npm run banco:capturar -- --faltan        # capturas 1440 y 390 px y logos → almacén privado
npm run banco:calibrar -- --informe docs/calibracion.md   # 3 rondas como máximo; agrega el informe al archivo
```

O desde el estudio: Menú → Banco de calibración → **Volver a calibrar** (usa las capturas que ya estén en el almacén; sin capturas, califica por la descripción).

Las referencias de identidad no traen enlace directo al logo: conviene agregarlos (campo `imagen` en `data/banco/identidad.json`) para que el juez vea los logos y no solo los lea. Sin `url` confirmada quedaron 11 webs reales: se pueden completar en el mismo archivo.

## Pruebas
- `packages/pipeline/test/banco.test.ts`: índice válido y sin imágenes, rúbrica que suma 10, juez a ciegas, rondas que ajustan al juez hasta la meta, recta de corrección, cambios de Jay y Luna, comparación por pares.
- Con `nube.sh` levantado:

```bash
ANONYMO_NUBE=1 SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_SERVICE_KEY=x SUPABASE_BUCKET=proyectos ANONYMO_PROYECTOS=/tmp/anonymo-pruebas/banco node --experimental-strip-types scripts/pruebas/banco.ts
node scripts/pruebas/e2e-banco.mjs   # miniaturas privadas, filtro, cambiar nota, quitar, calibrar, comparar, celular
```
