// Генератор 32-битного спрайта машины (пример: BMW E9, вид в 3/4 спереди).
// Пайплайн: SVG с crispEdges на низком разрешении -> PNG -> nearest-neighbor upscale.
// Запуск: node scripts/gen-car-sprite.cjs
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Палитра (тёмно-зелёное купе)
const C = {
  outline: '#0b2018',   // контур
  roof: '#3f9868',      // свет: крыша/капот/багажник
  side: '#2a7049',      // основной борт
  sideShade: '#1d5236', // заднее крыло / тень
  front: '#236140',     // передняя панель
  glass: '#182633',     // стекло
  glassHi: '#3c5a76',   // блик стекла
  chrome: '#c9cdd5',    // хром
  chromeSh: '#878e99',  // хром в тени
  tire: '#17191d',
  rim: '#b7bdc7',
  rimDark: '#6b727e',
  headlight: '#f3eec4',
  headlightRing: '#9a9478',
  taillight: '#c23a2e',
  shadow: '#00000038',
};

const W = 200, H = 112;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges">
  <rect width="${W}" height="${H}" fill="transparent"/>

  <!-- тень под машиной -->
  <ellipse cx="100" cy="102" rx="90" ry="6" fill="${C.shadow}"/>

  <!-- ═══ ЗАДНЯЯ ЧАСТЬ КУЗОВА (тёмная плоскость заднего крыла) ═══ -->
  <polygon points="124,28 146,42 176,50 176,66 150,62 128,46" fill="${C.sideShade}"/>
  <!-- крышка багажника (свет сверху) -->
  <polygon points="146,42 174,48 172,54 148,49" fill="${C.roof}"/>

  <!-- ═══ ОСНОВНОЙ БОРТ ═══ -->
  <!-- борт: верх повторяет нижнюю кромку капота, пояс, порог -->
  <polygon points="14,58 86,42 146,48 176,52 176,74 30,74 18,70" fill="${C.side}"/>

  <!-- ═══ КРЫША + КАБИНА ═══ -->
  <!-- лобовое стекло (наклонная плоскость) -->
  <polygon points="78,43 92,24 116,24 106,43" fill="${C.glass}"/>
  <polygon points="88,34 96,27 101,27 93,36" fill="${C.glassHi}"/>
  <!-- передняя стойка (тонкая, по левому краю лобового) -->
  <polygon points="92,24 95,25 86,42 82,43" fill="${C.side}"/>
  <!-- боковое стекло двери -->
  <polygon points="97,28 114,28 116,43 96,43" fill="${C.glass}"/>
  <polygon points="99,30 104,30 102,35 97,35" fill="${C.glassHi}"/>
  <!-- средняя стойка -->
  <rect x="114" y="28" width="2" height="15" fill="${C.side}"/>
  <!-- боковое стекло заднего четверть-окна -->
  <polygon points="118,28 128,28 134,41 118,43" fill="${C.glass}"/>
  <!-- заднее стекло (фастбек, верхняя плоскость) -->
  <polygon points="128,25 146,40 140,44 124,31" fill="${C.glass}"/>
  <!-- задняя стойка -->
  <polygon points="128,22 132,23 148,40 144,44 130,31" fill="${C.side}"/>
  <!-- крыша (светлая плоскость сверху) -->
  <polygon points="91,21 128,21 130,26 93,26" fill="${C.roof}"/>
  <!-- зеркало (торчит у основания стойки) -->
  <polygon points="76,33 83,31 83,37 76,38" fill="${C.outline}"/>

  <!-- ═══ КАПОТ (светлая верхняя плоскость) ═══ -->
  <polygon points="10,52 82,38 86,42 14,58" fill="${C.roof}"/>

  <!-- ═══ ПЕРЕДНЯЯ ПАНЕЛЬ (акульий нос) ═══ -->
  <polygon points="8,52 14,56 14,74 10,72 4,60" fill="${C.front}"/>
  <polygon points="14,56 30,52 32,74 14,74" fill="${C.front}"/>
  <!-- 4 круглые фары 2x2 -->
  <rect x="16" y="56" width="6" height="6" fill="${C.headlightRing}"/><rect x="17" y="57" width="4" height="4" fill="${C.headlight}"/>
  <rect x="16" y="64" width="6" height="6" fill="${C.headlightRing}"/><rect x="17" y="65" width="4" height="4" fill="${C.headlight}"/>
  <rect x="24" y="55" width="6" height="6" fill="${C.headlightRing}"/><rect x="25" y="56" width="4" height="4" fill="${C.headlight}"/>
  <rect x="24" y="63" width="6" height="6" fill="${C.headlightRing}"/><rect x="25" y="64" width="4" height="4" fill="${C.headlight}"/>
  <!-- ноздри решётки между фарами -->
  <rect x="22" y="58" width="2" height="10" fill="${C.outline}"/>
  <!-- указатель поворота -->
  <rect x="28" y="70" width="4" height="3" fill="#e8a020"/>

  <!-- ═══ БАМПЕРЫ (хром) ═══ -->
  <polygon points="4,68 30,72 30,80 26,84 8,80 2,74" fill="${C.chrome}"/>
  <polygon points="2,74 26,80 26,84 8,80" fill="${C.chromeSh}"/>
  <polygon points="170,60 190,62 194,72 190,78 170,76" fill="${C.chrome}"/>
  <polygon points="190,66 194,72 190,78 186,77" fill="${C.chromeSh}"/>
  <!-- задний фонарь -->
  <rect x="176" y="50" width="7" height="5" fill="${C.taillight}"/>

  <!-- ═══ ДЕТАЛИ БОРТА ═══ -->
  <!-- характерная линия -->
  <rect x="34" y="54" width="110" height="1" fill="${C.roof}"/>
  <!-- шов двери + ручка -->
  <rect x="104" y="46" width="1" height="26" fill="${C.outline}"/>
  <rect x="108" y="49" width="7" height="2" fill="${C.chromeSh}"/>
  <!-- порог в тени -->
  <rect x="30" y="72" width="146" height="3" fill="${C.sideShade}"/>
  <!-- арки колёс (тёмно-зелёные, без чёрных клиньев) -->
  <polygon points="32,74 62,74 60,64 38,64 30,70" fill="${C.sideShade}"/>
  <polygon points="142,74 174,74 172,62 148,62 142,70" fill="${C.sideShade}"/>

  <!-- ═══ КОЛЁСА ═══ -->
  <!-- переднее -->
  <rect x="32" y="72" width="28" height="26" rx="2" fill="${C.tire}"/>
  <rect x="38" y="78" width="16" height="14" rx="1" fill="${C.rimDark}"/>
  <rect x="40" y="80" width="12" height="10" fill="${C.rim}"/>
  <rect x="45" y="80" width="2" height="10" fill="${C.rimDark}"/>
  <rect x="40" y="84" width="12" height="2" fill="${C.rimDark}"/>
  <!-- заднее -->
  <rect x="144" y="72" width="28" height="24" rx="2" fill="${C.tire}"/>
  <rect x="150" y="77" width="16" height="13" rx="1" fill="${C.rimDark}"/>
  <rect x="152" y="79" width="12" height="9" fill="${C.rim}"/>
  <rect x="157" y="79" width="2" height="9" fill="${C.rimDark}"/>
  <rect x="152" y="83" width="12" height="2" fill="${C.rimDark}"/>
</svg>`;

(async () => {
  const outDir = path.join(__dirname, '..', 'pixel_cars');
  fs.mkdirSync(outDir, { recursive: true });

  // 1) низкое разрешение (пиксельная сетка)
  const lo = await sharp(Buffer.from(svg)).png().toBuffer();
  fs.writeFileSync(path.join(outDir, 'bmw_e9_32bit_lo.png'), lo);

  // 2) nearest-neighbor upscale x4 -> честные крупные пиксели
  const hi = await sharp(lo).resize(W * 4, H * 4, { kernel: 'nearest' }).png().toFile(path.join(outDir, 'bmw_e9_32bit.png'));

  // 3) исходник SVG для правок
  fs.writeFileSync(path.join(outDir, 'bmw_e9_32bit.svg'), svg);
  console.log('done', hi.width + 'x' + hi.height);
})();
