// Парсер shops1.csv -> cars_data.json
// Формат: год -> 4 салона (АЛЬФА/БЕТА/ГАММА/ДЕЛЬТА) -> машины (2 строки каждая)
// Строка 1: имя, характеристики, теги, цена, количество
// Строка 2: буква дороги, коэффициенты
import { readFileSync, readdirSync, writeFileSync } from 'fs';

const csv = readFileSync('CARS_NEW.csv', 'utf-8');
const imageFiles = readdirSync('public/cars_sm');

function normName(s) { return s.replace(/[\s\t]+/g, ' ').trim(); }
function normMatch(s) { return s.replace(/[\s\t]+/g, '').toLowerCase(); }

function findImage(carName) {
  const n = normMatch(carName);
  for (const f of imageFiles) {
    const fClean = f.replace(/_\d+\.jpg$/i, '');
    if (normMatch(fClean) === n) return f;
  }
  return null;
}

function parseRuNum(s) {
  // "14,6" -> 14.6, "30" -> 30
  if (!s) return NaN;
  return parseFloat(s.replace(',', '.'));
}

function parseTags(tagStr) {
  // Разбиваем по 2+ пробелам/табам, НЕ сжимая сначала
  return tagStr.trim().split(/\s{2,}/).map(t => t.trim()).filter(Boolean);
}

const lines = csv.split('\n');
const cars = [];
const seen = new Set();
let currentYear = 0;
let currentDealer = '';
let i = 0;

const dealerMap = {
  'АЛЬФА': 'АЛЬФА', 'альфа': 'АЛЬФА',
  'БЕТА': 'БЕТА', 'бета': 'БЕТА',
  'ГАММА': 'ГАММА', 'гамма': 'ГАММА', 'Гамма': 'ГАММА',
  'ДЕЛЬТА': 'ДЕЛЬТА', 'дельта': 'ДЕЛЬТА', 'Дельта': 'ДЕЛЬТА',
};

while (i < lines.length) {
  const line = lines[i].trim();
  
  // Пустая строка
  if (!line) { i++; continue; }
  
  // Разбиваем по запятым, но учитываем кавычки
  const rawFields = [];
  let fi = 0, inQ = false, cur = '';
  while (fi < line.length) {
    if (line[fi] === '"') { inQ = !inQ; fi++; continue; }
    if (line[fi] === ',' && !inQ) { rawFields.push(cur); cur = ''; fi++; continue; }
    cur += line[fi]; fi++;
  }
  rawFields.push(cur);
  
  // Проверяем: это строка с годом? (,1960,,,,,,,,,)
  if (rawFields.length >= 2 && rawFields[0].trim() === '') {
    const maybeYear = parseInt(rawFields[1].trim());
    if (maybeYear >= 1960 && maybeYear <= 2030) {
      currentYear = maybeYear;
      i++;
      continue;
    }
    // Проверяем: это название салона?
    const dealerName = rawFields[1].trim();
    if (dealerMap[dealerName]) {
      currentDealer = dealerMap[dealerName];
      i++;
      continue;
    }
  }
  
  // Это строка с машиной? Проверяем: первое поле — имя (не пустое, содержит буквы)
  const nameField = rawFields[0];
  const name = normName(nameField);
  if (!name || !/[a-zA-Zа-яА-Я]/.test(name) || name.length < 3) { i++; continue; }
  
  // Парсим характеристики: поля 2-7 (power, torque, topSpeed, accel, handling, offroad)
  const power = parseRuNum(rawFields[2]);
  const torque = parseRuNum(rawFields[3]);
  const topSpeed = parseRuNum(rawFields[4]);
  const acceleration = parseRuNum(rawFields[5]);
  const handling = parseRuNum(rawFields[6]);
  const offroad = parseRuNum(rawFields[7]);
  
  if (isNaN(power) || isNaN(torque)) { i++; continue; }
  
  // Теги — поле 8
  const tagStr = rawFields[8] || '';
  // Цена — поле 9
  const priceStr = rawFields[9] || '5000';
  const price = parseInt(priceStr.replace(/[\s\/\\]/g, '')) || 5000;
  // Количество — поле 10
  const quantity = parseInt(rawFields[10]) || 1;
  
  // Следующая строка — коэффициенты
  const nextLine = (i + 1 < lines.length) ? lines[i + 1].trim() : '';
  const nextFields = [];
  let nfi = 0, nInQ = false, nCur = '';
  while (nfi < nextLine.length) {
    if (nextLine[nfi] === '"') { nInQ = !nInQ; nfi++; continue; }
    if (nextLine[nfi] === ',' && !nInQ) { nextFields.push(nCur); nCur = ''; nfi++; continue; }
    nCur += nextLine[nfi]; nfi++;
  }
  nextFields.push(nCur);
  
  // Буква дороги — поле 0 следующей строки
  const roadLetter = nextFields[0]?.trim() || '';
  
  // Коэффициенты — поля 2-7 следующей строки
  const cPower = parseRuNum(nextFields[2]) || 1;
  const cTorque = parseRuNum(nextFields[3]) || 1;
  const cTopSpeed = parseRuNum(nextFields[4]) || 1;
  const cAccel = parseRuNum(nextFields[5]) || 1;
  const cHandling = parseRuNum(nextFields[6]) || 1;
  const cOffroad = parseRuNum(nextFields[7]) || 1;
  
  // Парсим теги: "класс  B           купе               США                      60                               2                              muscle car"
  // Разбиваем по 2+ пробелам -> ["класс", "B", "купе", "США", "60", "2", "muscle car"]
  const rawTags = parseTags(tagStr);
  let epoch = 60, rarity = 1, carClass = '';
  const cleanTags = [];
  let nextIsClass = false;
  for (const t of rawTags) {
    if (t === 'класс') { nextIsClass = true; continue; }
    if (nextIsClass) { carClass = t; nextIsClass = false; continue; }
    if (/^\d{2}$/.test(t) && parseInt(t) >= 10) { epoch = parseInt(t); continue; }
    if (/^\d$/.test(t) && parseInt(t) >= 1 && parseInt(t) <= 5) { rarity = parseInt(t); continue; }
    cleanTags.push(t);
  }
  
  // Добавляем букву дороги в теги если есть
  const roadMap = { 'У': 'Улица', 'Г': 'Город', 'В': 'Внедорожье', 'С': 'Спорт' };
  if (roadMap[roadLetter]) cleanTags.unshift(roadMap[roadLetter]);
  
  // Генерируем уникальный ID
  const baseId = name.toLowerCase().replace(/[^a-zа-яё0-9]/gi, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  let uid = baseId;
  let c = 2;
  while (seen.has(uid)) { uid = `${baseId}_${c}`; c++; }
  seen.add(uid);
  
  const img = findImage(name);
  
  cars.push({
    id: uid,
    name,
    image: img ? `/cars_sm/${encodeURIComponent(img)}` : `https://placehold.co/600x300/111/555?text=${encodeURIComponent(name.substring(0, 20))}`,
    price,
    stats: { power, torque, topSpeed, acceleration, handling, offroad },
    coefficients: { power: cPower, torque: cTorque, topSpeed: cTopSpeed, acceleration: cAccel, handling: cHandling, offroad: cOffroad },
    tags: [...new Set(cleanTags)],
    carClass,
    rarity,
    epoch,
    year: currentYear,
    dealer: currentDealer,
    quantity,
    roadType: roadLetter,
    hasImage: !!img,
  });
  
  i += 2; // Пропускаем строку с коэффициентами
  continue;
}

// Нумеруем дубли
const groups = new Map();
for (const car of cars) {
  if (!groups.has(car.name)) groups.set(car.name, []);
  groups.get(car.name).push(car);
}
for (const [name, group] of groups) {
  if (group.length <= 1) continue;
  for (let j = 0; j < group.length; j++) {
    group[j].name = `${name} #${j + 1}`;
  }
}

console.log(`Parsed: ${cars.length} cars`);
console.log(`With images: ${cars.filter(c => c.hasImage).length}`);
console.log(`Years: ${[...new Set(cars.map(c => c.year))].sort().join(', ')}`);
console.log(`Dealers: ${[...new Set(cars.map(c => c.dealer))].join(', ')}`);

// Статистика по салонам
for (const d of ['АЛЬФА', 'БЕТА', 'ГАММА', 'ДЕЛЬТА']) {
  const dc = cars.filter(c => c.dealer === d);
  console.log(`  ${d}: ${dc.length} cars`);
}

writeFileSync('cars_data.json', JSON.stringify(cars, null, 2));
console.log('Saved cars_data.json');
