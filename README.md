# ANONYMO

Agencia creativa de Jay y Luna, con un equipo de 22 agentes de IA.

## Estructura

```
apps/web           Web del cliente (Next.js 16, Tailwind v4, React Three Fiber, Motion, GSAP)
packages/agentes   El equipo: agentes, áreas y fases. Lo usan la web y, después, el pipeline
data/nombres.json  Matriz de 108 nombres con dominio libre
docs/              Plan por fases y dirección de arte
```

## Páginas

`/` inicio · `/agentes` equipo por área · `/agentes/[id]` ficha · `/proceso` qué recibes en cada fase · `/sala` proyecto en vivo · `/casos` · `/contacto` · `/sistema` dirección de arte

## Correr en local

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
```

## Flujo de trabajo

Cada fase va en su propia rama (`fase-N/...`). Claude hace commit y push; Jay abre el PR y hace el merge.
