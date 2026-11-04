# Banco de calibración: esquema del índice

Un archivo por disciplina: `web.json`, `identidad.json`, `naming.json`, `contenido.json`.
Cada archivo es un arreglo JSON de referencias. Solo metadatos, enlaces, notas y criterios: **nunca imágenes de terceros**.

```jsonc
{
  "id": "web-lando-norris",          // único, minúsculas y guiones, prefijo de disciplina
  "disciplina": "web",               // web | identidad | naming | contenido
  "rubro": "otro",                   // salud comida profesionales tienda espacios bienestar tecnologia educacion turismo creativos eventos otro
  "nombre": "Lando Norris",          // nombre del proyecto o, en naming, el nombre en sí
  "autor": "OFF+BRAND.",             // agencia/estudio; en arquetipos: "Arquetipo genérico"
  "anio": 2025,
  "premio": "Awwwards Site of the Year 2025",  // null si no tiene
  "fuente": "https://www.awwwards.com/...",    // enlace que respalda el premio o el caso; null en arquetipos
  "url": "https://landonorris.com",            // web: sitio vivo para capturar; otros: página del caso (opcional)
  "imagen": null,                    // identidad: enlace público a la imagen del logo (opcional; se descarga solo al almacén privado)
  "nota": 10,                        // nota de referencia 0–10
  "cumple": ["concepto", "movimiento"],        // ids de criterios (ver lista por disciplina)
  "falla": [],
  "porque": "Por qué tiene esta nota, en una o dos frases.",
  "descripcion": "Qué es y cómo se ve/funciona, concreto (3–5 frases). El juez lo lee cuando no hay imagen.",
  "razon": "Solo naming: la razón del nombre según el caso público.",
  "plantilla": "corporativa-azul"    // solo arquetipos de web e identidad: qué maqueta genérica se dibuja
}
```

Criterios por disciplina (ids; salen del oficio, `packages/pipeline/src/oficio.ts`):
- web: concepto, sin-plantilla, tipografia-oficio, direccion-arte, ritmo, movimiento, copy-especifico, accion, nivel
- identidad: concepto-marca, distintivo, construccion, sistema, memorable
- naming: estrategia-nombre, criterios-duros, evocador, historia, distintivo-nombre
- contenido: estrategia-contenido, ganchos, formatos-actuales, sin-generico, idea

Plantillas de arquetipo:
- web: corporativa-azul, landing-degradado, builder-generica (5–6); principiante, principiante-recargada (3–4)
- identidad: icono-literal, iniciales-circulo, swoosh-degradado (5–6); clipart, tipografia-sistema (3–4)

Escala: 9–10 premiadas (premio mayor) · 7–8 muy buenas sin premio mayor (mención, shortlist, caso reconocido) · 5–6 correctas pero genéricas o de plantilla · 3–4 de principiante.
