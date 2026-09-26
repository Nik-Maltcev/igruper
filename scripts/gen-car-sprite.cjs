// Генератор 64-битного спрайта машины (пример: BMW E9, вид в 3/4 спереди).
// Пайплайн: SVG с crispEdges на сетке 400x224 -> PNG -> nearest-neighbor upscale x2.
// Запуск: node scripts/gen-car-sprite.cjs
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// ─── Палитра (тёмно-зелёное купе, 64-бит: больше тонов) ───
const C = {
  outline: '#081711',
  roofHi: '#63ba86',    // блик крыши/капота
  roof: '#3f9868',      // свет: верхние плоскости
  side: '#2f7b52',      // борт, верхняя часть
  sideMid: '#296b47',   // борт, середина
  sideShade: '#1d5236', // борт, низ / заднее крыло
  sideDark: '#143a26',  // порог
  front: '#266846',     // передняя панель
  frontSh: '#1b4c33',
  glass: '#1c2c3c',
  glassMid: '#314d68',
  glassHi: '#6d95b8',
  chrome: '#d6dae2',
  chromeHi: '#f2f4f8',
  chromeMid: '#a9aeb9',
  chromeSh: '#787f8c',
  tire: '#17191d',
  tireSide: '#25272d',
  rim: '#c3c8d2',
  rimMid: '#8f96a2',
  rimDark: '#565d69',
  headlight: '#f6f1cd',
  headlightIn: '#d8d2a4',
  headlightRing: '#9a9478',
  taillight: '#c93a2c',
  taillightHi: '#e8664f',
  turn: '#e8a020',
  plate: '#cfd3da',
  shadow: '#00000030',
  shadow2: '#00000055',
};

const W = 400, H = 224;

const rect = (x, y, w, h, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;

// Дизеринг-полоса: шахматный переход между двумя тонами (2x2 клетки, без сдвига)
function dither(x, y, w, h, c1, c2) {
  let s = '';
  for (let ix = 0; ix < w; ix += 2) {
    for (let iy = 0; iy < h; iy += 2) {
      s += rect(x + ix, y + iy, 2, 2, ((ix + iy) / 2) % 2 === 0 ? c1 : c2);
    }
  }
  return s;
}

// Спицы диска линиями от втулки к ободу
function spokes(cx, cy, rIn, rOut, color, n = 5) {
  let s = '';
  for (let a = 0; a < n; a++) {
    const ang = (Math.PI * 2 / n) * a - Math.PI / 2;
    const x1 = (cx + Math.cos(ang) * rIn).toFixed(1);
    const y1 = (cy + Math.sin(ang) * rIn).toFixed(1);
    const x2 = (cx + Math.cos(ang) * rOut).toFixed(1);
    const y2 = (cy + Math.sin(ang) * rOut).toFixed(1);
    s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="3"/>`;
  }
  return s;
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges">
  <rect width="${W}" height="${H}" fill="transparent"/>

  <!-- тень: мягкая + плотное ядро -->
  <ellipse cx="196" cy="206" rx="182" ry="10" fill="${C.shadow}"/>
  <ellipse cx="196" cy="205" rx="150" ry="6" fill="${C.shadow2}"/>

  <!-- ═══ ЗАДНЯЯ ЧАСТЬ КУЗОВА (тёмная плоскость заднего крыла) ═══ -->
  <polygon points="284,50 334,90 372,96 374,154 358,166 298,96" fill="${C.sideShade}"/>
  <!-- крышка багажника -->
  <polygon points="326,84 368,92 366,102 328,94" fill="${C.roof}"/>
  <rect x="332" y="86" width="28" height="2" fill="${C.roofHi}"/>

  <!-- ═══ КАБИНА: единый силуэт теплицы ═══ -->
  <polygon points="166,84 204,46 284,46 330,90 170,88" fill="${C.glass}"/>
  <!-- лобовое стекло (светлее, с бликами) -->
  <polygon points="170,82 207,48 242,48 224,82" fill="${C.glassMid}"/>
  <polygon points="182,72 202,52 210,52 202,62 190,76" fill="${C.glassHi}"/>
  <!-- передняя стойка -->
  <polygon points="202,45 209,46 186,84 178,84" fill="${C.side}"/>
  <!-- дверь: стекло светлее -->
  <polygon points="212,50 258,50 260,86 210,86" fill="${C.glassMid}"/>
  <polygon points="216,54 228,54 224,62 214,62" fill="${C.glassHi}"/>
  <!-- средняя стойка (тонкая) -->
  <rect x="258" y="50" width="3" height="36" fill="${C.sideShade}"/>
  <!-- четверть-стекло -->
  <polygon points="263,50 280,50 288,84 263,86" fill="${C.glassMid}"/>
  <!-- заднее стекло (фастбек, наклонная плоскость) -->
  <polygon points="284,48 302,54 324,84 314,88 286,58" fill="${C.glass}"/>
  <polygon points="288,54 294,58 290,60 285,56" fill="${C.glassHi}"/>
  <!-- задняя стойка -->
  <polygon points="300,50 306,52 328,86 322,89 296,56" fill="${C.side}"/>
  <!-- крыша -->
  <polygon points="200,40 282,40 286,50 206,50" fill="${C.roof}"/>
  <rect x="205" y="41" width="72" height="3" fill="${C.roofHi}"/>
  <rect x="207" y="49" width="78" height="2" fill="${C.sideShade}"/>
  <!-- хром-окантовка пояса под стеклами -->
  <rect x="170" y="86" width="160" height="2" fill="${C.chrome}"/>
  <rect x="170" y="88" width="160" height="1" fill="${C.chromeSh}"/>
  <!-- зеркало -->
  <polygon points="160,64 174,60 174,70 160,71" fill="${C.outline}"/>
  <rect x="162" y="62" width="10" height="4" fill="${C.chromeMid}"/>

  <!-- ═══ ОСНОВНОЙ БОРТ ═══ -->
  <polygon points="18,110 60,100 170,84 290,88 366,94 374,104 374,156 358,168 54,172 38,162 18,146 14,118" fill="${C.side}"/>
  ${dither(50, 128, 310, 4, C.side, C.sideMid)}
  <rect x="46" y="132" width="318" height="22" fill="${C.sideMid}"/>
  ${dither(50, 154, 310, 4, C.sideMid, C.sideShade)}
  <rect x="48" y="158" width="310" height="10" fill="${C.sideShade}"/>
  <rect x="50" y="166" width="308" height="6" fill="${C.sideDark}"/>
  <!-- характерная линия (свет) -->
  <rect x="64" y="118" width="294" height="2" fill="${C.roof}"/>
  <!-- шов двери + ручка -->
  <rect x="214" y="92" width="2" height="72" fill="${C.outline}"/>
  <rect x="220" y="100" width="16" height="4" fill="${C.chrome}"/>
  <rect x="220" y="103" width="16" height="1" fill="${C.chromeSh}"/>
  <!-- повторитель поворота -->
  <rect x="194" y="112" width="6" height="3" fill="${C.turn}"/>
  <!-- лючок бензобака -->
  <circle cx="348" cy="110" r="4" fill="${C.chromeMid}"/>

  <!-- ═══ КАПОТ ═══ -->
  <polygon points="18,96 58,86 166,76 170,84 60,96 20,106" fill="${C.roof}"/>
  <polygon points="24,94 60,86 160,77 161,80 62,90 26,100" fill="${C.roofHi}"/>
  <!-- воздухозаборник -->
  <rect x="118" y="80" width="22" height="3" fill="${C.sideShade}"/>

  <!-- ═══ ПЕРЕДНЯЯ ПАНЕЛЬ (акульий нос) ═══ -->
  <polygon points="14,96 24,100 24,164 18,158 6,112" fill="${C.front}"/>
  <polygon points="24,100 60,92 60,166 24,164" fill="${C.front}"/>
  <rect x="24" y="152" width="36" height="12" fill="${C.frontSh}"/>
  <!-- фары: внешняя пара (стек) -->
  <circle cx="31" cy="110" r="6" fill="${C.headlightRing}"/><circle cx="31" cy="110" r="4.5" fill="${C.headlight}"/><rect x="28" y="107" width="3" height="2" fill="#ffffff"/>
  <circle cx="31" cy="130" r="6" fill="${C.headlightRing}"/><circle cx="31" cy="130" r="4.5" fill="${C.headlight}"/><rect x="28" y="127" width="3" height="2" fill="#ffffff"/>
  <!-- ноздри решётки -->
  <rect x="40" y="106" width="5" height="30" fill="${C.chromeMid}"/>
  <rect x="41" y="107" width="3" height="28" fill="${C.outline}"/>
  <rect x="47" y="105" width="5" height="30" fill="${C.chromeMid}"/>
  <rect x="48" y="106" width="3" height="28" fill="${C.outline}"/>
  <!-- фары: внутренняя пара (стек, ракурс) -->
  <circle cx="58" cy="108" r="5" fill="${C.headlightRing}"/><circle cx="58" cy="108" r="3.5" fill="${C.headlight}"/>
  <circle cx="58" cy="126" r="5" fill="${C.headlightRing}"/><circle cx="58" cy="126" r="3.5" fill="${C.headlight}"/>
  <!-- поворотник -->
  <rect x="52" y="142" width="7" height="4" fill="${C.turn}"/>

  <!-- ═══ БАМПЕРЫ (хром) ═══ -->
  <polygon points="8,146 60,138 60,150 62,158 54,163 12,158 4,152" fill="${C.chrome}"/>
  <rect x="10" y="147" width="46" height="3" fill="${C.chromeHi}"/>
  <polygon points="62,158 54,163 12,158 9,154 58,155" fill="${C.chromeSh}"/>
  <rect x="20" y="148" width="16" height="9" fill="${C.plate}"/>
  <polygon points="358,130 386,134 390,152 384,162 358,158" fill="${C.chrome}"/>
  <rect x="362" y="133" width="22" height="3" fill="${C.chromeHi}"/>
  <polygon points="390,152 384,162 364,159 364,155" fill="${C.chromeSh}"/>
  <rect x="366" y="138" width="14" height="8" fill="${C.plate}"/>
  <!-- фонарь -->
  <rect x="364" y="100" width="9" height="20" fill="${C.taillight}"/>
  <rect x="364" y="100" width="9" height="7" fill="${C.taillightHi}"/>
  <!-- выхлоп -->
  <rect x="370" y="163" width="13" height="6" fill="${C.chromeSh}"/>
  <rect x="380" y="163" width="3" height="6" fill="${C.outline}"/>

  <!-- ═══ КОЛЁСА ═══ -->
  <!-- переднее -->
  <circle cx="101" cy="181" r="33" fill="${C.tire}"/>
  <circle cx="101" cy="181" r="27" fill="${C.tireSide}"/>
  <circle cx="101" cy="181" r="22" fill="${C.rimDark}"/>
  <circle cx="101" cy="181" r="19" fill="${C.rimMid}"/>
  ${spokes(101, 181, 4, 16, C.rim)}
  <circle cx="101" cy="181" r="4" fill="${C.chrome}"/>
  <!-- заднее -->
  <circle cx="319" cy="179" r="31" fill="${C.tire}"/>
  <circle cx="319" cy="179" r="25" fill="${C.tireSide}"/>
  <circle cx="319" cy="179" r="20" fill="${C.rimDark}"/>
  <circle cx="319" cy="179" r="17" fill="${C.rimMid}"/>
  ${spokes(319, 179, 4, 15, C.rim)}
  <circle cx="319" cy="179" r="4" fill="${C.chrome}"/>
</svg>`;

(async () => {
  const outDir = path.join(__dirname, '..', 'pixel_cars');
  fs.mkdirSync(outDir, { recursive: true });

  // 1) низкое разрешение (родная пиксельная сетка 64-бит)
  const lo = await sharp(Buffer.from(svg)).png().toBuffer();
  fs.writeFileSync(path.join(outDir, 'bmw_e9_64bit_lo.png'), lo);

  // 2) nearest-neighbor upscale x2
  const hi = await sharp(lo).resize(W * 2, H * 2, { kernel: 'nearest' }).png().toFile(path.join(outDir, 'bmw_e9_64bit.png'));

  // 3) исходник SVG для правок
  fs.writeFileSync(path.join(outDir, 'bmw_e9_64bit.svg'), svg);
  console.log('done', hi.width + 'x' + hi.height);
})();
