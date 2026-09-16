import { Car, Track, RaceResult, CarStats, PartBoosts } from '../types';
import { MOCK_OPPONENTS } from '../constants';
import { RewardEntry } from '../constants';

// Считает итоговые статы машины с учётом всех установленных деталей
// Коэффициенты из CSV влияют на эффективность процентных бустов
export const getEffectiveStats = (car: Car): CarStats => {
  const base = { ...car.stats };
  const coeff = car.coefficients || { power: 1, torque: 1, topSpeed: 1, acceleration: 1, handling: 1, offroad: 1 };

  // 1. Применяем абсолютные и процентные бусты последовательно для каждой детали
  for (const part of car.installedParts) {
    const b = part.boosts;
    // Абсолютные бусты (с учётом коэффициента машины)
    if (b.power) base.power += b.power * coeff.power;
    if (b.torque) base.torque += b.torque * coeff.torque;
    if (b.topSpeed) base.topSpeed += b.topSpeed * coeff.topSpeed;
    if (b.handling) base.handling += b.handling * coeff.handling;
    if (b.offroad) base.offroad += b.offroad * coeff.offroad;

    // Процентные бусты мощности/момента (обычная формула)
    if (b.powerPct) base.power = base.power * (1 + (b.powerPct * coeff.power) / 100);
    if (b.torquePct) base.torque = base.torque * (1 + (b.torquePct * coeff.torque) / 100);

    // Процентный буст скорости — формула V = ((450-X)*P/100)*K + X
    // X = текущая скорость, P = процент из детали, K = коэффициент машины
    if (b.topSpeedPct) {
      const X = base.topSpeed;
      const P = b.topSpeedPct;
      const K = coeff.topSpeed;
      base.topSpeed = ((450 - X) * P / 100) * K + X;
    }

    // Процентный буст разгона: accelerationPct > 0 = улучшение (уменьшение секунд)
    if (b.accelerationPct) {
      base.acceleration = base.acceleration * (1 - (b.accelerationPct * coeff.acceleration) / 100);
    }
  }

  // Округляем
  base.power = Math.max(1, Math.round(base.power));
  base.torque = Math.max(1, Math.round(base.torque));
  base.topSpeed = Math.max(10, Math.round(base.topSpeed));
  base.acceleration = Math.max(0.01, parseFloat(base.acceleration.toFixed(2))); // сотые секунды (Task 8)
  base.handling = Math.max(0, Math.round(base.handling));
  base.offroad = Math.max(0, Math.round(base.offroad));
  return base;
};

// Награда за место: из таблицы наград или дефолтная (когда таблица не передана)
function rewardForPlace(place: number, rewardTable?: RewardEntry[]): { money: number; points: number } {
  if (rewardTable) {
    const rw = rewardTable.find(r => r.place === place);
    return { money: rw?.money || 0, points: rw?.points || 0 };
  }
  if (place === 1) return { money: 5000, points: 25 };
  if (place === 2) return { money: 2500, points: 18 };
  if (place === 3) return { money: 1000, points: 15 };
  if (place <= 5) return { money: 250, points: 10 };
  return { money: 50, points: 0 };
}

export const simulateRace = (
  userCars: Car[],
  track: Track,
  weather: 'SUNNY' | 'RAIN' | 'STORM',
  includeBots: boolean = true,
  rewardTable?: RewardEntry[],
): RaceResult[] => {
  const allRacers = includeBots ? [...userCars, ...MOCK_OPPONENTS] : [...userCars];

  // Базовая скорость машины без случайной прибавки (с погодой и шинами)
  const baseSpeeds: number[] = allRacers.map(car => {
    const s = getEffectiveStats(car);

    // Определяем эффективный тип шин: заводские или купленные
    let tireType = car.roadType || 'У';
    const installedTires = car.installedParts?.find(p => p.slot === 'tires');
    if (installedTires) {
      const n = installedTires.name.toLowerCase();
      if (n.includes('универсал')) tireType = 'У';
      else if (n.includes('гоноч')) tireType = 'Г';
      else if (n.includes('внедорож') || n.includes('шипов')) tireType = 'В';
      else if (n.includes('слик')) tireType = 'С';
    }

    // Определяем штраф за погоду в зависимости от шин
    let weatherPenalty = 0;
    if (weather === 'RAIN') {
      if (tireType === 'С') weatherPenalty = 0.40; // Слики: сильный штраф в дождь
      else if (tireType === 'Г') weatherPenalty = 0.25; // Гоночные: средний штраф
      else if (tireType === 'У') weatherPenalty = 0.10; // Универсальные: слабый штраф
      else if (tireType === 'В') weatherPenalty = 0.05; // Внедорожные: минимальный штраф
    } else if (weather === 'STORM') {
      if (tireType === 'С') weatherPenalty = 0.60;
      else if (tireType === 'Г') weatherPenalty = 0.40;
      else if (tireType === 'У') weatherPenalty = 0.25;
      else if (tireType === 'В') weatherPenalty = 0.15;
    }

    // Нормализуем acceleration: меньше секунд = лучше, инвертируем для формулы
    const accelScore = Math.max(1, 40 - s.acceleration);

    let averageSpeed =
      (s.power * track.weights.power) +
      (s.torque * track.weights.torque) +
      (s.topSpeed * track.weights.topSpeed) +
      (accelScore * track.weights.acceleration) +
      (s.handling * track.weights.handling) +
      (s.offroad * track.weights.offroad);

    // Применяем влияние погоды с учетом коэффициента трассы
    const mitigation = (s.handling * 0.5 + s.offroad * 0.5) / 200;
    const effectivePenalty = weatherPenalty * track.weatherModifier * Math.max(0, (1 - mitigation));
    averageSpeed = averageSpeed * (1 - effectivePenalty);
    return averageSpeed;
  });

  // Один бросок случайности на уникальную базовую скорость: машины с
  // одинаковыми характеристиками получают одинаковое время и делят место
  const luckBySpeed = new Map<number, number>();

  const results: RaceResult[] = allRacers.map((car, i) => {
    const baseSpeed = baseSpeeds[i];
    let luck = luckBySpeed.get(baseSpeed);
    if (luck === undefined) {
      // Рандом ±5
      luck = Math.random() * 10 - 5;
      luckBySpeed.set(baseSpeed, luck);
    }
    const finalSpeed = Math.max(10, baseSpeed + luck);

    const trackDistanceKm = 4.0;
    const timeHours = trackDistanceKm / finalSpeed;
    const timeSeconds = timeHours * 3600;

    return {
      carId: car.id,
      carName: car.name,
      position: 0,
      time: parseFloat(timeSeconds.toFixed(3)),
      earnings: 0,
      points: 0
    };
  });

  results.sort((a, b) => a.time - b.time);

  // Группа машин с одинаковым временем занимает диапазон мест k..k+n-1
  // (следующая машина получает место k+n). Награды по правилам ничьих:
  // деньги за занятые места делятся поровну, очки — как за лучшее место группы.
  let i = 0;
  while (i < results.length) {
    let j = i;
    while (j + 1 < results.length && results[j + 1].time === results[i].time) j++;

    const startPlace = i + 1;
    const groupSize = j - i + 1;
    let moneySum = 0;
    for (let p = startPlace; p < startPlace + groupSize; p++) {
      moneySum += rewardForPlace(p, rewardTable).money;
    }
    const groupMoney = Math.round(moneySum / groupSize);
    const groupPoints = rewardForPlace(startPlace, rewardTable).points;

    for (let k = i; k <= j; k++) {
      results[k].position = startPlace;
      results[k].earnings = groupMoney;
      results[k].points = groupPoints;
    }
    i = j + 1;
  }

  return results;
};
