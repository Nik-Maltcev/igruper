// Переименовываем файлы в public/cars_sm/ — убираем лишние пробелы
// и обновляем cars_data.json
import { readdirSync, renameSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const dir = 'public/cars_sm';
const files = readdirSync(dir);

const renameMap = new Map(); // oldName -> newName

for (const f of files) {
  // Заменяем множественные пробелы на один, trim
  const newName = f.replace(/\s+/g, ' ').trim();
  if (newName !== f) {
    renameMap.set(f, newName);
  }
}

console.log(`Files to rename: ${renameMap.size} of ${files.length}`);

// Переименовываем файлы
for (const [oldName, newName] of renameMap) {
  const oldPath = join(dir, oldName);
  const newPath = join(dir, newName);
  renameSync(oldPath, newPath);
}

console.log('Files renamed.');

// Обновляем cars_data.json
const cars = JSON.parse(readFileSync('cars_data.json', 'utf-8'));
let updated = 0;

for (const car of cars) {
  if (car.image && car.image.startsWith('/cars_sm/')) {
    // Декодируем текущий путь
    const encoded = car.image.replace('/cars_sm/', '');
    const decoded = decodeURIComponent(encoded);
    // Применяем то же преобразование
    const newName = decoded.replace(/\s+/g, ' ').trim();
    // Новый путь — просто encodeURIComponent
    car.image = '/cars_sm/' + encodeURIComponent(newName);
    updated++;
  }
}

console.log(`Updated ${updated} image paths in JSON.`);
writeFileSync('cars_data.json', JSON.stringify(cars, null, 2));
console.log('Saved cars_data.json');
