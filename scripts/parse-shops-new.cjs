const fs = require('fs');

const csv = fs.readFileSync('shops_new.csv', 'utf-8');
const lines = csv.split('\n');

const shops = [];
let currentShop = null;
let currentUnlockYear = 1960;
let partIdCounter = 1;

// Парсинг характеристик из строки
function parseBoosts(str) {
  if (!str) return {};
  const b = {};
  const s = str.replace(/\s+/g, ' ').trim();

  // Процентные лс: "2% лс +6 лс" или "10%лс + 30 лс" или "5% лс +20 лс"
  const pctPowerMatch = s.match(/(\d+)\s*%\s*лс\s*\+?\s*(\d+)\s*лс/i);
  if (pctPowerMatch) {
    b.powerPct = parseInt(pctPowerMatch[1]);
    b.power = parseInt(pctPowerMatch[2]);
  }
  // Процентные Нм: "10%Нм +30 Нм" или "10% Нм+15 Нм"
  const pctTorqueMatch = s.match(/(\d+)\s*%\s*Нм\s*\+?\s*(\d+)\s*Нм/i);
  if (pctTorqueMatch) {
    b.torquePct = parseInt(pctTorqueMatch[1]);
    b.torque = parseInt(pctTorqueMatch[2]);
  }

  // Абсолютные лс (не процентные)
  if (!pctPowerMatch) {
    const hpMatch = s.match(/(\d+)\s*лс/i);
    if (hpMatch) b.power = parseInt(hpMatch[1]);
  }
  // Абсолютные Нм (не процентные)
  if (!pctTorqueMatch) {
    const nmMatch = s.match(/(\d+)\s*(?:Нм|нм)/);
    if (nmMatch) b.torque = parseInt(nmMatch[1]);
  }

  // км/ч или км\ч
  const kmhMatch = s.match(/(\d+)\s*км[\/\\]?ч/i);
  if (kmhMatch) b.topSpeed = parseInt(kmhMatch[1]);

  // Управляемость (У)
  const handlingMatches = [...s.matchAll(/(-?\d+)\s*У/g)];
  if (handlingMatches.length > 0) {
    b.handling = handlingMatches.reduce((sum, m) => sum + parseInt(m[1]), 0);
  }

  // Проходимость (П)
  const offroadMatches = [...s.matchAll(/(-?\d+)\s*П/g)];
  if (offroadMatches.length > 0) {
    b.offroad = offroadMatches.reduce((sum, m) => sum + parseInt(m[1]), 0);
  }

  // % к разгону
  const accelPctMatches = [...s.matchAll(/(\d+)\s*%\s*к\s*(?:разгону|кразгону)/gi)];
  if (accelPctMatches.length > 0) {
    b.accelerationPct = accelPctMatches.reduce((sum, m) => sum + parseInt(m[1]), 0);
  }

  // % к скорости
  const speedPctMatches = [...s.matchAll(/(\d+)\s*%\s*к\s*скорости/gi)];
  if (speedPctMatches.length > 0) {
    b.topSpeedPct = speedPctMatches.reduce((sum, m) => sum + parseInt(m[1]), 0);
  }

  return b;
}

// Определяем слот по названию
function getSlot(name) {
  const n = name.toLowerCase();
  if (n.includes('шины') || n.includes('слики')) return 'tires';
  if (n.includes('распредвал')) return 'camshaft';
  if (n.includes('дифференциал')) return 'differential';
  if (n.includes('турбина')) return 'turbo';
  if (n.includes('компрессор')) return 'compressor';
  if (n.includes('интеркулер')) return 'intercooler';
  if (n.includes('амортизаторы')) return 'shocks';
  if (n.includes('пружины')) return 'springs';
  if (n.includes('тормоза')) return 'brakes';
  if (n.includes('коробка')) return 'gearbox';
  if (n.includes('расточка')) return 'bore';
  return null;
}

// Определяем requires
function getRequires(name) {
  const n = name.toLowerCase();
  if (n.includes('турбина') || n.includes('компрессор')) return 'intercooler';
  return null;
}

// Определяем tier по номеру в названии
function getTier(name) {
  const m = name.match(/(\d)$/);
  return m ? parseInt(m[1]) : 1;
}

// Иконка по типу
function getIcon(name) {
  const n = name.toLowerCase();
  if (n.includes('шины') || n.includes('слики') || n.includes('маховик')) return 'Circle';
  if (n.includes('турбина') || n.includes('компрессор')) return 'Flame';
  if (n.includes('тормоза') || n.includes('дифференциал') || n.includes('шрус') || n.includes('лебёдка') || n.includes('шаровые') || n.includes('облегч')) return 'Disc';
  if (n.includes('пружины') || n.includes('амортизаторы') || n.includes('клиренс')) return 'Spring';
  if (n.includes('фильтр') || n.includes('впуск') || n.includes('выпуск') || n.includes('топлив') || n.includes('шноркель') || n.includes('интеркулер') || n.includes('систем')) return 'Filter';
  return 'Zap';
}

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;

  // Простой CSV парсинг (с учётом кавычек)
  const parts = [];
  let current = '';
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === ',' && !inQuotes) { parts.push(current.trim()); current = ''; continue; }
    current += ch;
  }
  parts.push(current.trim());

  const [shopName, partName, image, description, stats, priceStr] = parts;

  // Строка с годом
  const yearMatch = shopName && shopName.match(/^(\d{4})$/);
  if (yearMatch) {
    currentUnlockYear = parseInt(yearMatch[1]);
    continue;
  }

  // Строка "на начало игры" или "Бонусные детали"
  if (shopName && (shopName.includes('на начало') || shopName.includes('Бонусные'))) {
    if (shopName.includes('Бонусные')) {
      currentUnlockYear = 9999; // бонусные — не в обычном магазине
      currentShop = {
        brand: 'Бонусные детали',
        unlockYear: 9999,
        parts: [],
      };
      shops.push(currentShop);
    }
    continue;
  }

  // Строка с названием магазина (есть shopName, нет partName)
  if (shopName && !partName) {
    currentShop = {
      brand: shopName,
      unlockYear: currentUnlockYear,
      parts: [],
    };
    shops.push(currentShop);
    continue;
  }

  // Строка с деталью
  if (partName && currentShop) {
    const tier = getTier(partName);
    const boosts = parseBoosts(stats);
    const price = parseInt(priceStr) || 0;
    const slot = getSlot(partName);
    const requires = getRequires(partName);
    const icon = getIcon(partName);

    const partId = `${currentShop.brand.toLowerCase().replace(/[^a-zа-яё0-9]/gi, '_')}_${partName.toLowerCase().replace(/[^a-zа-яё0-9]/gi, '_')}_${partIdCounter++}`;

    const part = {
      id: partId,
      name: partName,
      description: description || '',
      boosts,
      price,
      brand: currentShop.brand,
      tier,
      icon,
    };
    if (slot) part.slot = slot;
    if (requires) part.requires = requires;

    currentShop.parts.push(part);
  }
}

// Выводим результат
const result = {
  shops: shops.map(s => ({
    brand: s.brand,
    unlockYear: s.unlockYear,
    parts: s.parts,
  })),
};

fs.writeFileSync('shops_data.json', JSON.stringify(result, null, 2), 'utf-8');
console.log(`Parsed ${shops.length} shops with ${shops.reduce((s, sh) => s + sh.parts.length, 0)} parts total`);
shops.forEach(s => console.log(`  ${s.brand} (${s.unlockYear}): ${s.parts.length} parts`));
