// Парсер cars_clean.csv -> JSON
// Рекурсивный парсер: собираем 6 пар (value, coeff) из CSV-токенов
import { readFileSync, readdirSync, writeFileSync } from 'fs';

const csv = readFileSync('cars_images/cars_clean.csv', 'utf-8');
const imageFiles = readdirSync('cars_images/output_images');

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

function extractFields(line) {
  const fields = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      i++;
      let v = '';
      while (i < line.length && line[i] !== '"') { v += line[i]; i++; }
      i++;
      if (i < line.length && line[i] === ',') i++;
      fields.push({ q: true, v });
    } else {
      let v = '';
      while (i < line.length && line[i] !== '"') { v += line[i]; i++; }
      fields.push({ q: false, v });
    }
  }
  return fields;
}

function readNumber(tokens, idx) {
  if (idx >= tokens.length) return null;
  const cur = parseInt(tokens[idx]);
  if (isNaN(cur)) return null;
  if (idx + 1 < tokens.length) {
    const next = tokens[idx + 1];
    const nextNum = parseInt(next);
    if (!isNaN(nextNum) && next.length === 1) {
      return { decimal: parseFloat(`${cur}.${next}`), decIdx: idx + 2, whole: cur, wholeIdx: idx + 1 };
    }
  }
  return { whole: cur, wholeIdx: idx + 1 };
}

// Рекурсивно собираем 6 пар (value, coeff)
// value: любое > 0, coeff: 0.1 - 5.0
function solvePairs(tokens, idx, pairs) {
  if (pairs.length === 6) return pairs.slice();
  if (idx >= tokens.length) return null;
  
  const vr = readNumber(tokens, idx);
  if (!vr) return null;
  
  const tryValue = (val, nextIdx) => {
    const cr = readNumber(tokens, nextIdx);
    if (!cr) return null;
    // Пробуем coeff как десятичное
    if (cr.decimal !== undefined && cr.decimal >= 0.1 && cr.decimal <= 5.0) {
      const r = solvePairs(tokens, cr.decIdx, [...pairs, { value: val, coeff: cr.decimal }]);
      if (r) return r;
    }
    // Пробуем coeff как целое
    if (cr.whole >= 0.1 && cr.whole <= 5.0) {
      const r = solvePairs(tokens, cr.wholeIdx, [...pairs, { value: val, coeff: cr.whole }]);
      if (r) return r;
    }
    return null;
  };
  
  // Пробуем value как целое СНАЧАЛА (30 лучше чем 3.0)
  const r = tryValue(vr.whole, vr.wholeIdx);
  if (r) return r;
  
  // Пробуем value как десятичное
  if (vr.decimal !== undefined) {
    const r2 = tryValue(vr.decimal, vr.decIdx);
    if (r2) return r2;
  }
  
  return null;
}

function parseTags(tagStr) {
  return tagStr.replace(/[\s\t]+/g, ' ').trim().split(/\s{2,}/).map(t => t.trim()).filter(Boolean);
}

const lines = csv.split('\n').filter(l => l.trim());
const cars = [];
const seen = new Set();
let errors = 0;

for (let li = 1; li < lines.length; li++) {
  const line = lines[li].trim();
  if (!line) continue;
  
  const fields = extractFields(line);
  if (fields.length < 3) { errors++; continue; }
  
  const name = normName(fields[0].v);
  const numStr = fields[1]?.v || '';
  const tagStr = fields[2]?.v || '';
  const priceStr = fields[3]?.v || '5000';
  
  const tokens = numStr.split(',').map(s => s.trim()).filter(s => s !== '');
  let finalPairs = solvePairs(tokens, 0, []);
  
  // Фоллбэк: если коэффициенты отсутствуют (пустые ,, в CSV), токенов ровно 6-7
  if (!finalPairs && tokens.length >= 6 && tokens.length <= 7) {
    const vals = tokens.map(t => parseFloat(t)).filter(v => !isNaN(v));
    if (vals.length >= 6) {
      finalPairs = [];
      for (let i = 0; i < 6; i++) finalPairs.push({ value: vals[i], coeff: 1 });
    }
  }
  
  if (!finalPairs) {
    errors++;
    if (errors <= 10) console.log(`ERR line ${li}: "${name}" tokens=[${tokens.join(',')}]`);
    continue;
  }
  
  const price = parseInt(priceStr.replace(/[\s\/]/g, '')) || 5000;
  const rawTags = parseTags(tagStr);
  let epoch = 60, page = 1;
  const cleanTags = [];
  for (const t of rawTags) {
    for (const w of t.split(/\s+/)) {
      if (/^\d{2}$/.test(w) && parseInt(w) >= 60) epoch = parseInt(w);
      else if (/^\d$/.test(w) && parseInt(w) >= 1 && parseInt(w) <= 5) page = parseInt(w);
      else if (w !== 'класс' && w.length > 1) cleanTags.push(w);
    }
  }
  
  const id = name.toLowerCase().replace(/[^a-zа-яё0-9]/gi, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  let uid = id;
  let c = 2;
  while (seen.has(uid)) { uid = `${id}_${c}`; c++; }
  seen.add(uid);
  
  const img = findImage(name);
  
  cars.push({
    id: uid, name,
    image: img ? `/cars/${encodeURIComponent(img)}` : `https://placehold.co/600x300/111/555?text=${encodeURIComponent(name.substring(0, 20))}`,
    price,
    stats: { power: finalPairs[0].value, torque: finalPairs[1].value, topSpeed: finalPairs[2].value, acceleration: finalPairs[3].value, handling: finalPairs[4].value, offroad: finalPairs[5].value },
    coefficients: { power: finalPairs[0].coeff, torque: finalPairs[1].coeff, topSpeed: finalPairs[2].coeff, acceleration: finalPairs[3].coeff, handling: finalPairs[4].coeff, offroad: finalPairs[5].coeff },
    tags: [...new Set(cleanTags)],
    epoch, page, hasImage: !!img,
  });
}

console.log(`Parsed: ${cars.length}, Errors: ${errors}`);
console.log(`With images: ${cars.filter(c => c.hasImage).length}`);

const r4 = cars.find(c => c.name === 'Renault 4');
if (r4) console.log('Renault 4:', JSON.stringify(r4.stats), JSON.stringify(r4.coefficients));

const capri = cars.find(c => c.name === 'Ford Capri');
if (capri) console.log('Ford Capri:', JSON.stringify(capri.stats), JSON.stringify(capri.coefficients));

writeFileSync('cars_data.json', JSON.stringify(cars, null, 2));
console.log('Saved cars_data.json');
