import { Car, Track, RaceResult, CarStats, PartBoosts } from '../types';
import { MOCK_OPPONENTS } from '../constants';

// Считает итоговые статы машины с учётом всех установленных деталей
// Коэффициенты из CSV влияют на эффективность процентных бустов
export const getEffectiveStats = (car: Car): CarStats => {
  const base = { ...car.stats };
  const coeff = car.coefficients || { power: 1, torque: 1, topSpeed: 1, acceleration: 1, handling: 1, offroad: 1 };

  // 1. Собираем суммарные абсолютные и процентные бусты
  // Коэффициент применяется к абсолютным бустам: +10 лс при коэфф 1.1 = +11 лс
  let powerPctTotal = 0;
  let torquePctTotal = 0;
  let topSpeedPctTotal = 0;
  let accelPctTotal = 0;

  for (const part of car.installedParts) {
    const b = part.boosts;
    if (b.power) base.power += b.power * coeff.power;
    if (b.torque) base.torque += b.torque * coeff.torque;
    if (b.topSpeed) base.topSpeed += b.topSpeed * coeff.topSpeed;
    if (b.handling) base.handling += b.handling * coeff.handling;
    if (b.offroad) base.offroad += b.offroad * coeff.offroad;
    // Накапливаем проценты
    if (b.powerPct) powerPctTotal += b.powerPct;
    if (b.torquePct) torquePctTotal += b.torquePct;
    if (b.topSpeedPct) topSpeedPctTotal += b.topSpeedPct;
    if (b.accelerationPct) accelPctTotal += b.accelerationPct;
  }

  // 2. Применяем процентные модификаторы с учётом коэффициентов
  // Коэффициент > 1 = деталь даёт больше эффекта, < 1 = меньше
  if (powerPctTotal) base.power = base.power * (1 + (powerPctTotal * coeff.power) / 100);
  if (torquePctTotal) base.torque = base.torque * (1 + (torquePctTotal * coeff.torque) / 100);
  if (topSpeedPctTotal) base.topSpeed = base.topSpeed * (1 + (topSpeedPctTotal * coeff.topSpeed) / 100);
  if (accelPctTotal) base.acceleration = base.acceleration * (1 - (accelPctTotal * coeff.acceleration) / 100);

  // Округляем
  base.power = Math.max(1, Math.round(base.power));
  base.torque = Math.max(1, Math.round(base.torque));
  base.topSpeed = Math.max(10, Math.round(base.topSpeed));
  base.acceleration = Math.max(0.5, parseFloat(base.acceleration.toFixed(1)));
  base.handling = Math.max(0, Math.round(base.handling));
  base.offroad = Math.max(0, Math.round(base.offroad));
  return base;
};

export const simulateRace = (
  userCars: Car[],
  track: Track,
  weather: 'SUNNY' | 'RAIN' | 'STORM',
  includeBots: boolean = true
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
    if (position === 1) { earnings = 5000; points = 25; }
    else if (position === 2) { earnings = 2500; points = 18; }
    else if (position === 3) { earnings = 1000; points = 15; }
    else if (position <= 5) { earnings = 250; points = 10; }
    else { earnings = 50; points = 0; }
    return { ...r, position, earnings, points };
  });
};
