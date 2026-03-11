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

export const simulateRace = (
  userCars: Car[],
  track: Track,
  weather: 'SUNNY' | 'RAIN' | 'STORM',
  includeBots: boolean = true,
  rewardTable?: RewardEntry[],
): RaceResult[] => {
  const allRacers = includeBots ? [...userCars, ...MOCK_OPPONENTS] : [...userCars];

  let weatherPenalty = 0;
  if (weather === 'RAIN') weatherPenalty = 0.2;
  if (weather === 'STORM') weatherPenalty = 0.4;

  const results: RaceResult[] = allRacers.map(car => {
    const s = getEffectiveStats(car);

    // Нормализуем acceleration: меньше секунд = лучше, инвертируем для формулы
    const accelScore = Math.max(1, 40 - s.acceleration); // 40 - потолок, чем меньше разгон тем выше скор

    let averageSpeed =
      (s.power * track.weights.power) +
      (s.torque * track.weights.torque) +
      (s.topSpeed * track.weights.topSpeed) +
      (accelScore * track.weights.acceleration) +
      (s.handling * track.weights.handling) +
      (s.offroad * track.weights.offroad);

    // Погода
    const mitigation = (s.handling * 0.5 + s.offroad * 0.5) / 200;
    const effectivePenalty = weatherPenalty * track.weatherModifier * Math.max(0, (1 - mitigation));
    averageSpeed = averageSpeed * (1 - effectivePenalty);

    // Рандом ±5
    const luck = Math.random() * 10 - 5;
    const finalSpeed = Math.max(10, averageSpeed + luck);

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

  return results.map((r, index) => {
    const position = index + 1;
    let earnings = 0;
    let points = 0;

    if (rewardTable) {
      // Используем таблицу наград из nagrady.csv
      const reward = rewardTable.find(rw => rw.place === position);
      if (reward) {
        earnings = reward.money;
        points = reward.points;
      }
    } else {
      // Fallback — старая система
      if (position === 1) { earnings = 5000; points = 25; }
      else if (position === 2) { earnings = 2500; points = 18; }
      else if (position === 3) { earnings = 1000; points = 15; }
      else if (position <= 5) { earnings = 250; points = 10; }
      else { earnings = 50; points = 0; }
    }
    return { ...r, position, earnings, points };
  });
};
