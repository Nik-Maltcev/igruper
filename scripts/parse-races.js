// Парсер races.csv -> races_data.json
import { readFileSync, writeFileSync } from 'fs';

const csvRaw = readFileSync('races.csv', 'utf-8');

// Склеиваем многострочные значения в кавычках
let csv = '';
let inQuote = false;
for (let ci = 0; ci < csvRaw.length; ci++) {
  const ch = csvRaw[ci];
  if (ch === '"') { inQuote = !inQuote; csv += ch; continue; }
  if (inQuote && (ch === '\n' || ch === '\r')) { csv += ' '; continue; }
  csv += ch;
}

const lines = csv.split(/\r?\n/);

function parseNum(s) {
  if (!s) return 0;
  return parseFloat(s.replace(',', '.')) || 0;
}

function parseFields(line) {
  const fields = [];
  let fi = 0, inQ = false, cur = '';
  while (fi < line.length) {
    if (line[fi] === '"') { inQ = !inQ; fi++; continue; }
    if (line[fi] === ',' && !inQ) { fields.push(cur); cur = ''; fi++; continue; }
    cur += line[fi]; fi++;
  }
  fields.push(cur);
  return fields;
}

const epochs = [];
const specials = [];

let currentYear = 0;
let currentRound = 0;
let roundRequirement = '';
let currentRaces = [];
let currentRounds = [];
let specialBlock = null;
let mode = 'epoch'; // 'epoch' | 'special'

function flushRound() {
  if (currentRaces.length > 0 && currentRound > 0) {
    currentRounds.push({ round: currentRound, requirement: roundRequirement, races: [...currentRaces] });
    currentRaces = [];
  }
}

function flushEpoch() {
  flushRound();
  if (currentYear && currentRounds.length > 0) {
    epochs.push({ year: currentYear, rounds: [...currentRounds] });
    currentRounds = [];
  }
  currentYear = 0;
  currentRound = 0;
  roundRequirement = '';
}

function flushSpecial() {
  if (specialBlock && specialBlock.races.length > 0) {
    specials.push(specialBlock);
  }
  specialBlock = null;
}

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  const fields = parseFields(line);
  const f0 = fields[0]?.trim() || '';
  const f7 = fields[7]?.trim() || '';

  // Строка с баллами — пропускаем
  if (f0.includes('баллов') || f0.includes('балл')) continue;

  // Год (1958-2030)
  if (/^\d{4}$/.test(f0) && parseInt(f0) >= 1958 && parseInt(f0) <= 2030) {
    flushSpecial();
    flushEpoch();
    currentYear = parseInt(f0);
    mode = 'epoch';
    continue;
  }

  // Номер раунда (1-9)
  if (/^\d$/.test(f0) && parseInt(f0) >= 1 && parseInt(f0) <= 9) {
    flushRound();
    currentRound = parseInt(f0);
    roundRequirement = f7;
    mode = 'epoch';
    continue;
  }

  // квалификация
  if (f0 === 'квалификация') {
    flushRound();
    currentRound = 0;
    specialBlock = { name: 'квалификация', year: currentYear, races: [] };
    mode = 'special';
    continue;
  }

  // полуФинал / Финал
  if (f0 === 'полуФинал' || f0 === 'Финал') {
    flushSpecial();
    flushEpoch();
    specialBlock = { name: f0, requirement: f7, races: [] };
    mode = 'special';
    continue;
  }

  // Ралли / Гонка Чемпионов
  if (f0.startsWith('Ралли') || f0.startsWith('Гонка Чемпионов')) {
    flushSpecial();
    flushEpoch();
    const years = [];
    for (let j = 1; j < fields.length; j++) {
      const y = parseInt(fields[j]?.trim());
      if (y >= 1958 && y <= 2030) years.push(y);
    }
    specialBlock = { name: f0, years, races: [] };
    mode = 'special';
    continue;
  }

  // Гонка: название + 6 весов + требование
  if (f0.length < 2) continue;
  const hasWeights = parseNum(fields[1]) > 0 || parseNum(fields[2]) > 0 || parseNum(fields[3]) > 0 ||
                     parseNum(fields[4]) > 0 || parseNum(fields[5]) > 0 || parseNum(fields[6]) > 0;
  if (!hasWeights) continue;

  const race = {
    name: f0,
    weights: {
      power: parseNum(fields[1]),
      torque: parseNum(fields[2]),
      topSpeed: parseNum(fields[3]),
      acceleration: parseNum(fields[4]),
      handling: parseNum(fields[5]),
      offroad: parseNum(fields[6]),
    },
    requirement: f7,
  };

  if (mode === 'special' && specialBlock) {
    specialBlock.races.push(race);
  } else {
    currentRaces.push(race);
  }
}

flushSpecial();
flushEpoch();

const data = { epochs, specials };

console.log(`Parsed: ${epochs.length} epochs`);
for (const e of epochs) {
  const totalRaces = e.rounds.reduce((s, r) => s + r.races.length, 0);
  console.log(`  ${e.year}: ${e.rounds.length} rounds, ${totalRaces} races`);
}
console.log(`Specials: ${specials.length}`);
for (const s of specials) {
  console.log(`  ${s.name}: ${s.races.length} races, years: ${s.years || s.year || '-'}`);
}

writeFileSync('races_data.json', JSON.stringify(data, null, 2));
console.log('Saved races_data.json');
