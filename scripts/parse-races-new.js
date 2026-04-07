// Parser for task-race.csv -> races_data.json
import { readFileSync, writeFileSync } from 'fs';

const csvRaw = readFileSync('task-race.csv', 'utf-8');

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
  let inQ = false, cur = '';
  for (let fi = 0; fi < line.length; fi++) {
    if (line[fi] === '"') { inQ = !inQ; continue; }
    if (line[fi] === ',' && !inQ) { fields.push(cur); cur = ''; continue; }
    cur += line[fi];
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
let mode = 'epoch';

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

  // Skip reward/score lines
  if (f0.includes('баллов') || f0.includes('балл') || f0.includes('Награды') || f0.includes('Турниры')) continue;

  // Year (1958-2030)
  if (/^\d{4}$/.test(f0) && parseInt(f0) >= 1958 && parseInt(f0) <= 2030) {
    flushSpecial();
    flushEpoch();
    currentYear = parseInt(f0);
    mode = 'epoch';
    continue;
  }

  // Race day headers -> round numbers
  const f0lower = f0.toLowerCase().trim();
  if (f0lower.startsWith('city challenge')) {
    flushRound();
    currentRound = 1;
    roundRequirement = f7;
    mode = 'epoch';
    continue;
  }
  if (f0lower.startsWith('national tournament')) {
    flushRound();
    currentRound = 2;
    roundRequirement = f7;
    mode = 'epoch';
    continue;
  }
  if (f0lower.startsWith('world series')) {
    flushRound();
    currentRound = 3;
    roundRequirement = f7;
    mode = 'epoch';
    continue;
  }

  // Qualification
  if (f0lower === 'квалификация' || f0lower === 'qualification') {
    flushRound();
    currentRound = 0;
    specialBlock = { name: 'квалификация', year: currentYear, races: [] };
    mode = 'special';
    continue;
  }

  // Semi-final / Final
  if (f0lower === 'полуфинал' || f0lower === 'финал') {
    flushSpecial();
    flushEpoch();
    specialBlock = { name: f0, requirement: f7, races: [] };
    mode = 'special';
    continue;
  }

  // Rally / Champions Race
  if (f0.startsWith('Ралли') || f0.startsWith('Гонка Чемпионов')) {
    flushSpecial();
    // Don't flush epoch - tournaments are within an epoch year
    const years = [];
    for (let j = 1; j < fields.length; j++) {
      const y = parseInt(fields[j]?.trim());
      if (y >= 1958 && y <= 2030) years.push(y);
    }
    specialBlock = { name: f0.trim(), years, requirement: f7, races: [] };
    mode = 'special';
    continue;
  }

  // Race line: name + 6 weights + requirement
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
  console.log(`  ${s.name}: ${s.races.length} races`);
}

writeFileSync('races_data.json', JSON.stringify(data, null, 2));
console.log('Saved races_data.json');
