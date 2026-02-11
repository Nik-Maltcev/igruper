// Добавляем номер к дублирующимся именам машин в cars_data.json
// Ford Capri (1 из 9), Ford Capri (2 из 9), ...
import { readFileSync, writeFileSync } from 'fs';

const cars = JSON.parse(readFileSync('cars_data.json', 'utf-8'));

// Группируем по имени
const groups = new Map();
for (const car of cars) {
  if (!groups.has(car.name)) groups.set(car.name, []);
  groups.get(car.name).push(car);
}

let renamed = 0;
for (const [name, group] of groups) {
  if (group.length <= 1) continue;
  for (let i = 0; i < group.length; i++) {
    group[i].name = `${name} #${i + 1}`;
    renamed++;
  }
}

console.log(`Renamed: ${renamed} cars`);
writeFileSync('cars_data.json', JSON.stringify(cars, null, 2));
console.log('Saved cars_data.json');
