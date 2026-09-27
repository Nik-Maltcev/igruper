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

// Тип покрытия по названию трассы — строки таблицы правил «Влияние осадков»:
// sand — песок, болото; snow — снег, лёд, полигон; dirt — грунтовка, мотокросс, бездорожье;
// country — сельская дорога, лес; asphalt — все остальные (асфальт)
export type RoadCategory = 'sand' | 'snow' | 'dirt' | 'country' | 'asphalt';

export function getRoadCategory(trackName: string): RoadCategory {
  const n = (trackName || '').toLowerCase();
  if (/(песок|болот)/.test(n)) return 'sand';
  if (/(снег|лёд|лед|полигон)/.test(n)) return 'snow';
  if (/(грунт|мотокросс|бездорож)/.test(n)) return 'dirt';
  if (/(сельск|лес)/.test(n)) return 'country';
  return 'asphalt';
}

// Ячейка таблицы «Влияние осадков»: штрафы к статам, «не едет» или «нет тучки».
// handling = −У (управляемость), offroad = −П (проходимость), accelSec = +сек к разгону («медленнее»).
export type RainCell = { handling?: number; offroad?: number; accelSec?: number } | 'dns' | 'none';

// Таблица «Влияние осадков» из правил: покрытие × шины (числа заданы для дождя).
export const RAIN_TABLE: Record<RoadCategory, Record<string, RainCell>> = {
  // Песок, Болото
  sand: {
    'У': { offroad: 10, handling: 10, accelSec: 0.5 },
    'Г': { offroad: 15, handling: 20, accelSec: 1 },
    'В': 'none',
    'С': 'dns',
  },
  // Снег, Лёд, Полигон
  snow: {
    'У': { offroad: 15, handling: 20, accelSec: 1 },
    'Г': { offroad: 20, handling: 25, accelSec: 1.5 },
    'В': 'none',
    'С': 'dns',
  },
  // Грунтовка, Мотокросс (и бездорожье)
  dirt: {
    'У': { offroad: 10, handling: 5 },
    'Г': { offroad: 15, handling: 10 },
    'В': 'none',
    'С': 'dns',
  },
  // Сельская дорога, Лес
  country: {
    'У': { offroad: 5 },
    'Г': { handling: 15, offroad: 5, accelSec: 0.5 },
    'В': { handling: 5 },
    'С': { handling: 30, offroad: 10, accelSec: 1.5 },
  },
  // Асфальт (все остальные трассы)
  asphalt: {
    'У': 'none',
    'Г': { handling: 20 },
    'В': { handling: 15, accelSec: 1 },
    'С': { handling: 30, accelSec: 1 },
  },
};

// Время «не едет»: слики + дождь + тяжёлое покрытие — машина отступает и не финиширует
export const DNS_TIME = 9999;

// ─── Нормализация характеристик («предварительный результат») ───
// Сырые числа несопоставимы: мощность дожимается до ~1300 лс, управляемость — до ~200.
// Каждая характеристика сначала приводится к конкурентоспособному масштабу (~0..2000),
// и только затем умножается на коэффициент трассы и складывается в общий результат.
// Формулы из таблицы правил (Excel): ЕСЛИ/IFS по диапазонам значений.
export function normalizeStat(
  stat: 'power' | 'torque' | 'topSpeed' | 'acceleration' | 'handling' | 'offroad',
  v: number,
): number {
  switch (stat) {
    case 'power': // ЕСЛИ(мощность<299;(мощность-25)*2,16;мощность*1,2+300)
      return Math.max(0, v < 299 ? (v - 25) * 2.16 : v * 1.2 + 300);
    case 'torque': // ЕСЛИ(момент<381;(момент-29)*1,81;(момент-29)*1,55+200)
      return Math.max(0, v < 381 ? (v - 29) * 1.81 : (v - 29) * 1.55 + 200);
    case 'topSpeed': // ЕСЛИ(скорость<222;(скорость-96)*3,9;(скорость-222)*7,5+500)
      return Math.max(0, v < 222 ? (v - 96) * 3.9 : (v - 222) * 7.5 + 500);
    case 'acceleration': // разгон: меньше секунд = больше очков
      if (v < 5) return (5 - v) * 333 + 900;
      if (v < 10) return (10 - v) * 130 + 250;
      if (v < 20) return (20 - v) * 13 + 120;
      if (v < 30) return (30 - v) * 6 + 60;
      return Math.max(0, (46 - v) * 3.75);
    case 'handling':
      if (v < 45) return v * 5.5;
      if (v < 82) return v * 7.5 - 94;
      if (v < 120) return v * 9.5 - 230;
      return Math.max(0, v * 11 - 290);
    case 'offroad':
      if (v < 45) return v * 4.5;
      if (v < 82) return v * 6.5 - 94;
      if (v < 120) return v * 8 - 200;
      return Math.max(0, v * 10 - 400);
  }
}

// ─── Реалистичное время прохождения ───
// Скорость считается универсальной формулой выше и НЕ меняется — меняется только
// перевод скорости в секунды. Диапазоны по правилам:
//   дрэг 400 м → 6..20 с, дрэг 800 м → 10..27 с, дрэг 1600 м → 18..60 с,
//   слалом и дрифт → старая формула (4 км / скорость),
//   остальные трассы → 3..15 минут.
// Эталоны (ниже) через веса конкретной трассы дают скорости, соответствующие границам
// диапазона; промежуточные скорости ложатся на плавную степенную кривую между ними,
// поэтому порядок финиша и относительные отрывы сохраняются.

// Эталон «самой медленной» машины каталога (Citroen 2CV 4x4 Sahara, сток)
const REF_SLOW_STATS: CarStats = { power: 14, torque: 25, topSpeed: 100, acceleration: 30, handling: 20, offroad: 90 };
// Эталон «самой быстрой» машины: лучшие статы каталога (Ferrari FXX K-Evo) + максимум тюнинга по всем слотам
const REF_FAST_STATS: CarStats = { power: 1460, torque: 1420, topSpeed: 411, acceleration: 1.5, handling: 260, offroad: 230 };

export interface RaceTimeModel {
  tMin: number; // время эталонно-быстрой машины, сек
  tMax: number; // время эталонно-медленной машины, сек
}

export function getRaceTimeModel(trackName: string): RaceTimeModel | null {
  const n = (trackName || '').toLowerCase();
  if (/слалом|дрифт|slalom|drift/.test(n)) return null;
  if (/дрэг|драг|drag/.test(n)) {
    if (n.includes('1600')) return { tMin: 18, tMax: 60 };
    if (n.includes('800')) return { tMin: 10, tMax: 27 };
    return { tMin: 6, tMax: 20 }; // 400 м и дрэги без дистанции в названии
  }
  return { tMin: 180, tMax: 900 };
}

// Скорость эталонной машины на трассе с данными весами (та же нормализация, что в simulateRace)
function refSpeed(stats: CarStats, weights: Track['weights']): number {
  return (normalizeStat('power', stats.power) * weights.power) +
    (normalizeStat('torque', stats.torque) * weights.torque) +
    (normalizeStat('topSpeed', stats.topSpeed) * weights.topSpeed) +
    (normalizeStat('acceleration', stats.acceleration) * weights.acceleration) +
    (normalizeStat('handling', stats.handling) * weights.handling) +
    (normalizeStat('offroad', stats.offroad) * weights.offroad);
}

export function mapSpeedToTime(speed: number, model: RaceTimeModel, weights: Track['weights']): number {
  // Защита от вырождения: на одномерных весах нормализация эталона может дать 0
  const vSlow = Math.max(1, refSpeed(REF_SLOW_STATS, weights));
  const vFast = Math.max(vSlow * 1.0001, refSpeed(REF_FAST_STATS, weights));
  const k = Math.log(model.tMax / model.tMin) / Math.log(vFast / vSlow);
  return model.tMin * Math.pow(vFast / Math.max(speed, 1), k);
}

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

  const roadCategory = getRoadCategory(track.name);
  const isWet = weather === 'RAIN' || weather === 'STORM';
  const timeModel = getRaceTimeModel(track.name);

  // Базовая скорость машины без случайной прибавки (с погодой и шинами)
  // + флажки влияния дождя для визуализации
  const perCar = allRacers.map(car => {
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

    // Ячейка таблицы «Влияние осадков» для этого покрытия и типа шин
    const rainCell: RainCell = isWet ? (RAIN_TABLE[roadCategory]?.[tireType] ?? 'none') : 'none';

    // «Не едет»: слики + дождь + песок/болото, снег/лёд/полигон или грунтовка/мотокросс
    const didNotStart = rainCell === 'dns';

    // Тучка: осадки влияют из-за неподходящих шин (по таблице есть штраф).
    // Нет тучки: внедорожные на песке/снеге/грунтовке, универсальные на асфальте.
    const rainAffected = isWet && rainCell !== 'none' && rainCell !== 'dns';

    // Штрафы применяются к эффективным статам по таблице (для шторма — вдвое).
    const mult = weather === 'STORM' ? 2 : 1;
    const cell = rainAffected ? (rainCell as Exclude<RainCell, 'dns' | 'none'>) : null;
    const effHandling = cell ? Math.max(0, s.handling - (cell.handling || 0) * mult) : s.handling;
    const effOffroad = cell ? Math.max(0, s.offroad - (cell.offroad || 0) * mult) : s.offroad;
    const effAccel = cell ? s.acceleration + (cell.accelSec || 0) * mult : s.acceleration;

    // Предварительный результат каждой характеристики (нормализация к общему масштабу)
    // умножается на коэффициент трассы, суммы складываются в расчётную скорость
    let averageSpeed =
      (normalizeStat('power', s.power) * track.weights.power) +
      (normalizeStat('torque', s.torque) * track.weights.torque) +
      (normalizeStat('topSpeed', s.topSpeed) * track.weights.topSpeed) +
      (normalizeStat('acceleration', effAccel) * track.weights.acceleration) +
      (normalizeStat('handling', effHandling) * track.weights.handling) +
      (normalizeStat('offroad', effOffroad) * track.weights.offroad);

    return { baseSpeed: averageSpeed, tireType, didNotStart, rainAffected };
  });

  // Один бросок случайности на уникальную базовую скорость: машины с
  // одинаковыми характеристиками получают одинаковое время и делят место
  const luckBySpeed = new Map<number, number>();

  const results: RaceResult[] = allRacers.map((car, i) => {
    const info = perCar[i];
    const base = {
      carId: car.id,
      carName: car.name,
      position: 0,
      time: 0,
      earnings: 0,
      points: 0,
      tireType: info.tireType,
      rainAffected: info.rainAffected,
      didNotStart: info.didNotStart,
    };

    if (info.didNotStart) {
      return { ...base, time: DNS_TIME };
    }

    let luck = luckBySpeed.get(info.baseSpeed);
    if (luck === undefined) {
      // Рандом ±5
      luck = Math.random() * 10 - 5;
      luckBySpeed.set(info.baseSpeed, luck);
    }
    const finalSpeed = Math.max(10, info.baseSpeed + luck);

    // Перевод скорости в секунды: дрэги/обычные трассы — по реалистичной модели,
    // слалом и дрифт — старая формула (4 км / скорость)
    const timeSeconds = timeModel
      ? mapSpeedToTime(finalSpeed, timeModel, track.weights)
      : (4.0 / finalSpeed) * 3600;

    return { ...base, time: parseFloat(timeSeconds.toFixed(3)) };
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

  // «Не едет» — последнее место без наград и очков
  for (const r of results) {
    if (r.didNotStart) {
      r.earnings = 0;
      r.points = 0;
    }
  }

  return results;
};
