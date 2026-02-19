const fs = require('fs');

// Парсим nagrady.csv — призы по количеству игроков
const csv = fs.readFileSync('nagrady.csv', 'utf-8');
const lines = csv.split('\n').map(l => l.trim()).filter(Boolean);

// Парсим строку вида "1- 3500,  6 баллов" → { place: 1, money: 3500, points: 6 }
// или "1-7000 +2 приза" → { place: 1, money: 7000, prizes: 2 }
// или "3-5000" → { place: 3, money: 5000 }
// или "5-приз" / "5- приз" → { place: 5, money: 0, prizes: 1 }
function parseRewardLine(str) {
  if (!str || !str.trim()) return null;
  str = str.trim();

  // Проверяем формат "N- ..."
  const placeMatch = str.match(/^(\d+)\s*[-–]\s*/);
  if (!placeMatch) return null;

  const place = parseInt(placeMatch[1]);
  const rest = str.slice(placeMatch[0].length).trim();

  let money = 0;
  let points = 0;
  let prizes = 0;

  // "приз" без денег
  if (/^приз$/i.test(rest)) {
    return { place, money: 0, points: 0, prizes: 1 };
  }

  // Деньги: "3500" или "10 000" или "11000" — до запятой или буквы
  // Сначала пробуем формат с запятой: "3500,  6 баллов"
  const moneyCommaMatch = rest.match(/^(\d[\d\s]*?\d)\s*,/);
  const moneySpaceMatch = rest.match(/^(\d[\d\s]*?\d)\s+\d+\s*балл/);
  const moneySimpleMatch = rest.match(/^(\d[\d\s]*\d|\d+)/);
  
  if (moneyCommaMatch) {
    money = parseInt(moneyCommaMatch[1].replace(/\s/g, ''));
  } else if (moneySpaceMatch) {
    money = parseInt(moneySpaceMatch[1].replace(/\s/g, ''));
  } else if (moneySimpleMatch) {
    money = parseInt(moneySimpleMatch[0].replace(/\s/g, ''));
  }

  // Баллы: "6 баллов" или "6 баллолв" или "6 балла" или "6баллов"
  const pointsMatch = rest.match(/(\d+)\s*балл/i);
  if (pointsMatch) {
    points = parseInt(pointsMatch[1]);
  }

  // Призы: "+2 приза" или "+1 приз"
  const prizesMatch = rest.match(/\+(\d+)\s*приз/i);
  if (prizesMatch) {
    prizes = parseInt(prizesMatch[1]);
  }

  // "+ приз" без числа
  if (!prizesMatch && /приз/i.test(rest) && money === 0) {
    prizes = 1;
  }

  return { place, money, points, prizes };
}

// Парсим CSV по столбцам (3-8 игроков)
const playerCounts = [3, 4, 5, 6, 7, 8];
const result = {};

for (let col = 0; col < 6; col++) {
  const pc = playerCounts[col];
  const rewards = {
    city: [],
    national: [],
    worldSaturday: [],   // субботняя гонка
    worldBonus: [],      // бонусный заезд
    worldMain: [],       // главная гонка
    tournament: [],      // итоговый турнир
  };

  let currentSection = null;
  let entryFee = 0;

  // Собираем все значения этого столбца
  for (let row = 2; row < lines.length; row++) {
    // Парсим CSV строку
    const parts = [];
    let current = '';
    let inQuotes = false;
    for (const ch of lines[row]) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === ',' && !inQuotes) { parts.push(current.trim()); current = ''; continue; }
      current += ch;
    }
    parts.push(current.trim());

    const cell = (parts[col] || '').trim();
    if (!cell) continue;

    // Определяем секцию
    if (/City Challenge/i.test(cell)) { currentSection = 'city'; continue; }
    if (/National Tournament/i.test(cell)) { currentSection = 'national'; continue; }
    if (/World series/i.test(cell)) { currentSection = 'worldSaturday'; continue; }
    if (/Субботн/i.test(cell)) {
      currentSection = 'worldSaturday';
      const feeMatch = cell.match(/оплатить\s*(\d+)/i);
      if (feeMatch) entryFee = parseInt(feeMatch[1]);
      continue;
    }
    if (/Bonus Track/i.test(cell)) { currentSection = 'worldBonus'; continue; }
    if (/Главная гонка/i.test(cell)) { currentSection = 'worldMain'; continue; }
    if (/ТУРНИР/i.test(cell)) { currentSection = 'tournament'; continue; }

    // Парсим строку с наградой
    const reward = parseRewardLine(cell);
    if (reward && currentSection) {
      rewards[currentSection].push(reward);
    }
  }

  rewards.worldSaturdayEntryFee = entryFee;
  result[pc] = rewards;
}

fs.writeFileSync('rewards_data.json', JSON.stringify(result, null, 2), 'utf-8');
console.log('Parsed rewards for player counts:', Object.keys(result).join(', '));
for (const [pc, r] of Object.entries(result)) {
  console.log(`  ${pc} players: city=${r.city.length}, national=${r.national.length}, worldSat=${r.worldSaturday.length}, worldBonus=${r.worldBonus.length}, worldMain=${r.worldMain.length}, tournament=${r.tournament.length}`);
}
