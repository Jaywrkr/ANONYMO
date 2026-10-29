// La cara de cada agente en 2D (sistema/32): el óvalo con su color, sus ojos según el carácter
// y su distintivo (el mismo «prop» del 3D). Sale como SVG para usarlo en cualquier tamaño.
import { AREAS, agentePorId } from "@anonymo/agentes";

const K = "#1a1816";
const W = "#ffffff";

// [detrás del cuerpo, delante del cuerpo]. viewBox 120×130, cuerpo centrado en 60,76.
const PROP: Record<string, [string, string]> = {
  atlas: [`<path d='M28 56 Q60 14 92 56' stroke='${K}' stroke-width='3.5' fill='none'/>`, `<rect x='88' y='60' width='10' height='18' rx='5' fill='${K}'/><path d='M93 78 Q90 96 72 97' stroke='${K}' stroke-width='2.5' fill='none'/><circle cx='71' cy='97' r='3.5' fill='${K}'/>`],
  ledger: ["", `<path d='M27 52 Q60 34 93 52 L97 59 Q60 46 23 59 Z' fill='#2bb673' opacity='.85'/><path d='M27 52 Q60 34 93 52' stroke='${K}' stroke-width='2' fill='none'/>`],
  nova: ["", `<polygon points='96,6 99.5,15 109,15.5 101.5,21.5 104,31 96,25.5 88,31 90.5,21.5 83,15.5 92.5,15' fill='#ffe066' stroke='${K}' stroke-width='1.5'/>`],
  sonda: ["", `<circle cx='96' cy='94' r='12' fill='rgba(255,255,255,.4)' stroke='${K}' stroke-width='3.5'/><line x1='104.5' y1='102.5' x2='116' y2='114' stroke='${K}' stroke-width='5' stroke-linecap='round'/>`],
  verba: ["", `<rect x='80' y='6' width='36' height='24' rx='12' fill='${W}' stroke='${K}' stroke-width='2'/><polygon points='88,29 84,38 96,29' fill='${W}' stroke='${K}' stroke-width='2' stroke-linejoin='round'/><circle cx='90' cy='18' r='2' fill='${K}'/><circle cx='98' cy='18' r='2' fill='${K}'/><circle cx='106' cy='18' r='2' fill='${K}'/>`],
  mira: ["", `<ellipse cx='54' cy='38' rx='31' ry='9' fill='${K}' transform='rotate(-10 54 38)'/><circle cx='54' cy='27' r='3.5' fill='${K}'/>`],
  rhea: ["", `<g transform='rotate(-38 92 40)'><rect x='78' y='37' width='30' height='7' fill='#ffd43d' stroke='${K}' stroke-width='1.5'/><polygon points='108,37 118,40.5 108,44' fill='#f3d9b1' stroke='${K}' stroke-width='1.5'/><rect x='74' y='37' width='5' height='7' fill='#ff8fb1' stroke='${K}' stroke-width='1.5'/></g>`],
  orla: ["", `<polygon points='90,70 116,112 90,112' fill='rgba(255,255,255,.55)' stroke='${K}' stroke-width='2'/><polygon points='95,88 104,106 95,106' fill='none' stroke='${K}' stroke-width='1.5'/>`],
  lumen: ["", `<rect x='38' y='63' width='19' height='14' rx='4' fill='#ff4d6d' opacity='.85' stroke='${K}' stroke-width='2'/><rect x='63' y='63' width='19' height='14' rx='4' fill='#2ee6ff' opacity='.85' stroke='${K}' stroke-width='2'/><line x1='57' y1='69' x2='63' y2='69' stroke='${K}' stroke-width='2'/>`],
  vector: ["", `<rect x='36' y='86' width='48' height='28' rx='3' fill='#2a2a2e'/><circle cx='60' cy='100' r='3' fill='#7cffd6'/><rect x='28' y='113' width='64' height='5' rx='2.5' fill='#c9c9cf'/>`],
  kine: [`<path d='M4 60 H20 M0 74 H18 M6 88 H20' stroke='#6a7dff' stroke-width='4' stroke-linecap='round' opacity='.6'/>`, ""],
  eco: [`<path d='M26 66 Q60 14 94 66' stroke='${K}' stroke-width='4.5' fill='none'/>`, `<rect x='17' y='60' width='12' height='22' rx='6' fill='${K}'/><rect x='91' y='60' width='12' height='22' rx='6' fill='${K}'/>`],
  prisma: ["", `<rect x='90' y='70' width='24' height='32' rx='3' fill='${W}' stroke='${K}' stroke-width='2'/><rect x='97' y='66' width='10' height='7' rx='2' fill='${K}'/><path d='M95 86 l4 4 l9 -10' stroke='#2bb673' stroke-width='2.5' fill='none' stroke-linecap='round'/>`],
  tempo: ["", `<rect x='97' y='75' width='6' height='6' fill='${K}'/><circle cx='100' cy='94' r='13' fill='${W}' stroke='${K}' stroke-width='2.5'/><line x1='100' y1='94' x2='100' y2='85' stroke='${K}' stroke-width='2'/><line x1='100' y1='94' x2='106' y2='97' stroke='#ff4d6d' stroke-width='2'/>`],
  faro: [`<polygon points='60,30 26,0 94,0' fill='#fff08a' opacity='.6'/>`, `<rect x='51' y='26' width='18' height='11' rx='3' fill='${K}'/><rect x='54' y='22' width='12' height='5' rx='2' fill='#ffd43d'/>`],
  chispa: ["", `<rect x='92' y='74' width='17' height='29' rx='4' fill='${K}'/><rect x='94.5' y='77' width='12' height='21' rx='2' fill='#ffb347'/>`],
  lente: ["", `<rect x='44' y='84' width='9' height='6' rx='1.5' fill='${K}'/><rect x='38' y='88' width='44' height='26' rx='6' fill='${K}'/><circle cx='60' cy='101' r='9' fill='#3a3a40' stroke='${W}' stroke-width='2'/><circle cx='63' cy='98' r='2' fill='${W}'/>`],
  corte: ["", `<rect x='86' y='88' width='30' height='22' rx='2' fill='${K}'/><g transform='rotate(-16 86 88)'><rect x='86' y='80' width='30' height='8' fill='${W}' stroke='${K}' stroke-width='1.5'/><path d='M92 80 l4 8 M100 80 l4 8 M108 80 l4 8' stroke='${K}' stroke-width='2.5'/></g>`],
  escena: ["", `<g transform='translate(0 7) rotate(12 60 38)'><polygon points='45,40 60,2 75,40' fill='#ffb347' stroke='${K}' stroke-width='1.5' stroke-linejoin='round'/><path d='M51 26 L69 30 M55 15 L66 18' stroke='#ff6fb1' stroke-width='3'/><circle cx='60' cy='3' r='4.5' fill='#ff6fb1'/></g>`],
  iman: ["", `<path d='M92 74 v14 a10 10 0 0 0 20 0 v-14' stroke='#e5484d' stroke-width='7' fill='none'/><rect x='88.5' y='70' width='7' height='6' fill='#cfd2d6'/><rect x='108.5' y='70' width='7' height='6' fill='#cfd2d6'/>`],
  trofeo: ["", `<g fill='#8fb83a' stroke='${K}' stroke-width='1'><ellipse cx='34' cy='46' rx='4' ry='7' transform='rotate(-35 34 46)'/><ellipse cx='42' cy='38' rx='4' ry='7' transform='rotate(-55 42 38)'/><ellipse cx='52' cy='34' rx='4' ry='7' transform='rotate(-80 52 34)'/><ellipse cx='86' cy='46' rx='4' ry='7' transform='rotate(35 86 46)'/><ellipse cx='78' cy='38' rx='4' ry='7' transform='rotate(55 78 38)'/><ellipse cx='68' cy='34' rx='4' ry='7' transform='rotate(80 68 34)'/></g>`],
  pulso: ["", `<rect x='80' y='84' width='36' height='24' rx='5' fill='${K}'/><polyline points='84,97 92,97 95,90 99,104 103,93 106,97 112,97' fill='none' stroke='#5dff9b' stroke-width='2' stroke-linejoin='round'/>`],
};

// Los ojos según el carácter: Eco escucha con los ojos cerrados, Chispa sonríe,
// Sonda entrecierra como detective, Kine mira hacia adelante y Lumen los tapa con sus lentes.
const OJOS: Record<string, string> = {
  eco: `<path d='M47 74 q4 3 8 0 M65 74 q4 3 8 0' stroke='${K}' stroke-width='2.2' fill='none' stroke-linecap='round'/>`,
  chispa: `<path d='M47 75 q4 -4 8 0 M65 75 q4 -4 8 0' stroke='${K}' stroke-width='2.2' fill='none' stroke-linecap='round'/>`,
  sonda: `<path d='M47 73 h8 M65 73 h8' stroke='${K}' stroke-width='2.6' stroke-linecap='round'/>`,
  kine: `<circle cx='55' cy='72' r='3' fill='${K}'/><circle cx='71' cy='72' r='3' fill='${K}'/>`,
  lumen: "",
};
const OJOS_BASE = `<circle cx='51' cy='73' r='3' fill='${K}'/><circle cx='69' cy='73' r='3' fill='${K}'/>`;

// Cada uno con su cuerpo: Atlas más grande, Kine más alargado, Chispa redonda.
const FORMA: Record<string, [number, number]> = { atlas: [38, 40], ledger: [35, 38], kine: [33, 41], mira: [34, 38], tempo: [34, 37], pulso: [35, 38], chispa: [37, 37], escena: [37, 38] };

const cache = new Map<string, string>();

/** La cara de un agente como data URI (SVG). `apagado` la deja en gris claro. */
export function caraSvg(id: string, apagado = false): string {
  const clave = `${id}:${apagado ? 1 : 0}`;
  const hecho = cache.get(clave);
  if (hecho) return hecho;
  const a = agentePorId(id);
  const area = a ? AREAS[a.area] : AREAS.mando;
  const t = a?.tono ?? area;
  const [l, m, s, ac] = apagado ? ["#ffffff", "#ddd8cf", "#bdb6aa", "#ffffff"] : [t.luz, t.medio, t.sombra, t.acento ?? area.acento];
  const [rx, ry] = FORMA[id] ?? [36, 39];
  const [atras, frente] = PROP[id] ?? ["", ""];
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 130'>` +
    `<defs><radialGradient id='g' cx='36%' cy='28%' r='80%'><stop offset='0' stop-color='${l}'/><stop offset='.55' stop-color='${m}'/><stop offset='1' stop-color='${s}'/></radialGradient>` +
    `<radialGradient id='r' cx='82%' cy='88%' r='45%'><stop offset='0' stop-color='${ac}' stop-opacity='.75'/><stop offset='1' stop-color='${ac}' stop-opacity='0'/></radialGradient></defs>` +
    `<g opacity='${apagado ? 0.75 : 1}'>${atras}<ellipse cx='60' cy='76' rx='${rx}' ry='${ry}' fill='url(#g)'/><ellipse cx='60' cy='76' rx='${rx}' ry='${ry}' fill='url(#r)'/>` +
    `<ellipse cx='47' cy='56' rx='11' ry='6' fill='white' opacity='.45' transform='rotate(-20 47 56)'/>${OJOS[id] ?? OJOS_BASE}${frente}</g></svg>`;
  const uri = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  cache.set(clave, uri);
  return uri;
}
