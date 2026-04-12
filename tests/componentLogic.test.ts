/**
 * Tests for pure business logic functions defined inside React components.
 * These functions are re-implemented here since they're not exported,
 * but the logic is tested against the same rules.
 */
import { describe, it, expect } from 'vitest';
import { Car, Part } from '../types';

// ─── Re-implementations of component logic ───

// From Garage.tsx / Marketplace.tsx
const CLASS_PART_LIMITS: Record<string, number> = { A: 16, B: 14, C: 12, D: 10, E: 8, R: 6, S: 4 };

// From Garage.tsx — getCurrentPrice
function getCurrentPrice(car: { price: number; rarity?: number }, stage: number): number {
  const base = car.price;
  const rarity = car.rarity ?? 3;
  let price = base;
  if (rarity === 1) {
    price = Math.max(base * 0.5, base - 600 * stage);
  } else if (rarity === 2) {
    price = Math.max(base * 0.5, base - 300 * stage);
  } else if (rarity === 4) {
    price = base + 500 * stage;
  } else if (rarity === 5) {
    price = base + 1000 * stage;
  }
  return Math.round(price);
}

// From RaceResults.tsx — formatTime
function formatTime(seconds: number, raceName: string): string {
  const isDrag = raceName.toLowerCase().includes('дрэг');
  if (isDrag) {
    return `${seconds.toFixed(2)} сек`;
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 100);
  if (mins > 0) {
    return `${mins} мин ${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')} сек`;
  }
  return `${secs}.${ms.toString().padStart(2, '0')} сек`;
}

// From RaceCenter.tsx / RaceSchedule.tsx — weightColor
function weightColor(v: number) {
  if (v >= 6) return '#ff4444';
  if (v >= 4) return '#ffaa00';
  if (v >= 2) return '#ffdd00';
  if (v >= 1) return '#aaa';
  return '#333';
}

// From Garage.tsx / Dealer.tsx — coeffColor
function coeffColor(v: number) {
  if (v > 1) return '#44ff44';
  if (v < 1) return '#ff4444';
  return '#888';
}

// From Garage.tsx / Marketplace.tsx — boostBadges
function boostBadges(part: Part) {
  const b = part.boosts;
  const items: { text: string; positive: boolean }[] = [];
  if (b.power) items.push({ text: `${b.power > 0 ? '+' : ''}${b.power} лс`, positive: b.power > 0 });
  if (b.powerPct) items.push({ text: `${b.powerPct}% лс`, positive: b.powerPct > 0 });
  if (b.torque) items.push({ text: `${b.torque > 0 ? '+' : ''}${b.torque} Нм`, positive: b.torque > 0 });
  if (b.torquePct) items.push({ text: `${b.torquePct}% Нм`, positive: b.torquePct > 0 });
  if (b.topSpeed) items.push({ text: `${b.topSpeed > 0 ? '+' : ''}${b.topSpeed} км/ч`, positive: b.topSpeed > 0 });
  if (b.topSpeedPct) items.push({ text: `${b.topSpeedPct}% скор`, positive: b.topSpeedPct > 0 });
  if (b.accelerationPct) items.push({ text: `+${b.accelerationPct}% разг`, positive: true });
  if (b.handling) items.push({ text: `${b.handling > 0 ? '+' : ''}${b.handling} У`, positive: b.handling > 0 });
  if (b.offroad) items.push({ text: `${b.offroad > 0 ? '+' : ''}${b.offroad} П`, positive: b.offroad > 0 });
  return items;
}

// From RaceCenter.tsx — checkRequirement / checkSingleRequirement
function checkRequirement(car: any, req: string | null | undefined): boolean {
  if (!req || req.trim() === '') return true;
  const conditions = req.split('+').map((s: string) => s.trim().toLowerCase()).filter(Boolean);
  return conditions.every((r: string) => checkSingleRequirement(car, r));
}

function checkSingleRequirement(car: any, r: string): boolean {
  r = r.replace(/^с(?=h)/i, 'c');
  let effectiveTire = car.roadType || null;
  const tiresPart = car.installedParts?.find((p: any) => p.slot === 'tires');
  if (tiresPart) {
    const n = tiresPart.name.toLowerCase();
    if (n.includes('слик')) effectiveTire = 'С';
    else if (n.includes('гоночн')) effectiveTire = 'Г';
    else if (n.includes('внедор')) effectiveTire = 'В';
    else if (n.includes('универс')) effectiveTire = 'У';
  }
  if (r === 'автоспорт') return !!car.tags?.some((t: string) => t.toLowerCase() === 'автоспорт');
  const epochMatch = r.match(/эпоха[\s-]*(?:(\d{2}))/);
  if (epochMatch) return car.epoch === parseInt(epochMatch[1]);
  const rarityMatch = r.match(/[рp]едкость\s*(\d)/);
  if (rarityMatch) return car.rarity === parseInt(rarityMatch[1]);
  const classMatch = r.match(/([a-zа-я])[-\s]*класс/) || r.match(/класс[\s:]*([a-zа-я])/);
  if (classMatch) {
    let letter = classMatch[1].toUpperCase();
    if (letter === 'А') letter = 'A';
    if (letter === 'В') letter = 'B';
    if (letter === 'С') letter = 'C';
    if (letter === 'Д') letter = 'D';
    if (letter === 'Е') letter = 'E';
    return car.carClass === letter;
  }
  if (r.includes('авто') && r.includes('класс')) {
    const m = r.match(/авто\s+([a-zа-я])[-\s]*класс/);
    if (m) {
      let letter = m[1].toUpperCase();
      if (letter === 'А') letter = 'A';
      if (letter === 'В') letter = 'B';
      if (letter === 'С') letter = 'C';
      return car.carClass === letter;
    }
  }
  if ((r.includes('хэтчбэк') || r.includes('хэтчбек')) || r.includes('hatch') || r.includes('hot hatch')) return !!car.tags?.some((t: string) => (t.toLowerCase() === 'хэтчбэк' || t.toLowerCase() === 'хэтчбек'));
  if (r.includes('купе')) return !!car.tags?.some((t: string) => t.toLowerCase() === 'купе');
  if (r.includes('седан')) return !!car.tags?.some((t: string) => t.toLowerCase() === 'седан');
  if (r.includes('внедорожник')) return !!car.tags?.some((t: string) => t.toLowerCase() === 'внедорожник');
  if (r.includes('muscle') || r.includes('muscle car')) return !!car.tags?.some((t: string) => t.toLowerCase() === 'muscle car');
  if (r.includes('комфорт')) return !!car.tags?.some((t: string) => t.toLowerCase() === 'комфорт');
  if (r.includes('коллекция')) return !!car.tags?.some((t: string) => t.toLowerCase() === 'коллекция');
  if (r.includes('widow maker')) return !!car.tags?.some((t: string) => t.toLowerCase() === 'widow maker');
  if (r.includes('франция')) return !!car.tags?.some((t: string) => t.toLowerCase() === 'франция');
  if (r.includes('сша')) return !!car.tags?.some((t: string) => t.toLowerCase() === 'сша');
  if (r.includes('италия')) return !!car.tags?.some((t: string) => t.toLowerCase() === 'италия');
  if (r.includes('германия')) return !!car.tags?.some((t: string) => t.toLowerCase() === 'германия');
  if (r.includes('япония')) return !!car.tags?.some((t: string) => t.toLowerCase() === 'япония');
  if (r.includes('ссср')) return !!car.tags?.some((t: string) => t.toLowerCase() === 'ссср');
  const brands = ['porsche', 'ferrari', 'lamborghini', 'bmw', 'ford', 'chevrolet', 'renault', 'citroen'];
  for (const brand of brands) {
    if (r.includes(brand.toLowerCase())) return car.name.toLowerCase().includes(brand.toLowerCase());
  }
  if (r.includes('слик')) return effectiveTire === 'С';
  if (r.includes('шины внедорожн') || r === 'внедорожные шины') return effectiveTire === 'В';
  if (r.includes('шины универсальн') || r === 'универсальные шины') return effectiveTire === 'У';
  if (r.includes('гоночные шины') || r.includes('гоночных шин')) return effectiveTire === 'Г';
  const powerRange = r.match(/(\d+)[-–](\d+)\s*л[сc]/);
  if (powerRange) return car.stats.power >= parseInt(powerRange[1]) && car.stats.power <= parseInt(powerRange[2]);
  const powerTo = r.match(/мощность\s*до\s*(\d+)/);
  if (powerTo) return car.stats.power <= parseInt(powerTo[1]);
  const powerAbove = r.match(/мощность\s*выше\s*(\d+)/);
  if (powerAbove) return car.stats.power > parseInt(powerAbove[1]);
  const powerBelow = r.match(/мощность\s*менее\s*(\d+)/);
  if (powerBelow) return car.stats.power < parseInt(powerBelow[1]);
  const handlingAbove = r.match(/управляемость\s*выше\s*(\d+)/);
  if (handlingAbove) return car.stats.handling > parseInt(handlingAbove[1]);
  const offroadAbove = r.match(/проходимость\s*выше\s*(\d+)/);
  if (offroadAbove) return car.stats.offroad > parseInt(offroadAbove[1]);
  const speedAbove = r.match(/скорость\s*выше\s*(\d+)/);
  if (speedAbove) return car.stats.topSpeed > parseInt(speedAbove[1]);
  if (r.includes('оплатить 1000')) return true;
  if (r.includes('полностью установленны') || r.includes('полным установленным лимитом')) {
    const limits: Record<string, number> = { A: 16, B: 14, C: 12, D: 10, E: 8, R: 6, S: 4 };
    const limit = limits[car.carClass] || 16;
    return car.installedParts.length >= limit;
  }
  if (r.includes('нем ') || r.includes('немецк')) return !!car.tags?.some((t: string) => t.toLowerCase() === 'германия');
  return true;
}

// Dealer access control logic
function getAllowedDealersCount(playerCount: number, myRank: number): number {
  if (playerCount < 3) return 4;
  if (playerCount === 3) {
    if (myRank === 1) return 1;
    if (myRank === 2) return 2;
    return 3;
  }
  if (playerCount === 4) {
    if (myRank === 1) return 1;
    if (myRank === 2) return 2;
    if (myRank === 3) return 3;
    return 4;
  }
  if (playerCount === 5) {
    if (myRank === 1) return 1;
    if (myRank === 2) return 2;
    if (myRank === 3) return 3;
    return 4;
  }
  if (playerCount === 6) {
    if (myRank <= 2) return 1;
    if (myRank === 3) return 2;
    if (myRank === 4) return 3;
    return 4;
  }
  if (playerCount === 7) {
    if (myRank <= 2) return 1;
    if (myRank <= 4) return 2;
    if (myRank === 5) return 3;
    return 4;
  }
  if (playerCount >= 8) {
    if (myRank <= 2) return 1;
    if (myRank <= 4) return 2;
    if (myRank <= 6) return 3;
    return 4;
  }
  return 4;
}

// ─── Helper ───
function makeCar(overrides: any = {}): any {
  return {
    id: 'car-1', name: 'BMW 320i', price: 10000, carClass: 'A', epoch: 60,
    rarity: 3, roadType: 'У', tags: [], installedParts: [],
    stats: { power: 150, torque: 200, topSpeed: 220, acceleration: 8, handling: 50, offroad: 30 },
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════
// getCurrentPrice
// ═══════════════════════════════════════════════════════

describe('getCurrentPrice', () => {
  it('rarity 3 — price stays the same regardless of stage', () => {
    expect(getCurrentPrice({ price: 10000, rarity: 3 }, 0)).toBe(10000);
    expect(getCurrentPrice({ price: 10000, rarity: 3 }, 5)).toBe(10000);
    expect(getCurrentPrice({ price: 10000, rarity: 3 }, 100)).toBe(10000);
  });

  it('rarity 1 — decreases by 600 per stage, min 50%', () => {
    expect(getCurrentPrice({ price: 10000, rarity: 1 }, 0)).toBe(10000);
    expect(getCurrentPrice({ price: 10000, rarity: 1 }, 1)).toBe(9400);
    expect(getCurrentPrice({ price: 10000, rarity: 1 }, 5)).toBe(7000);
    // At stage 10: 10000 - 6000 = 4000, but min is 5000
    expect(getCurrentPrice({ price: 10000, rarity: 1 }, 10)).toBe(5000);
    // At stage 20: 10000 - 12000 → clamped to 5000
    expect(getCurrentPrice({ price: 10000, rarity: 1 }, 20)).toBe(5000);
  });

  it('rarity 2 — decreases by 300 per stage, min 50%', () => {
    expect(getCurrentPrice({ price: 10000, rarity: 2 }, 0)).toBe(10000);
    expect(getCurrentPrice({ price: 10000, rarity: 2 }, 1)).toBe(9700);
    expect(getCurrentPrice({ price: 10000, rarity: 2 }, 10)).toBe(7000);
    // At stage 20: 10000 - 6000 = 4000, clamped to 5000
    expect(getCurrentPrice({ price: 10000, rarity: 2 }, 20)).toBe(5000);
  });

  it('rarity 4 — increases by 500 per stage', () => {
    expect(getCurrentPrice({ price: 10000, rarity: 4 }, 0)).toBe(10000);
    expect(getCurrentPrice({ price: 10000, rarity: 4 }, 1)).toBe(10500);
    expect(getCurrentPrice({ price: 10000, rarity: 4 }, 10)).toBe(15000);
  });

  it('rarity 5 — increases by 1000 per stage', () => {
    expect(getCurrentPrice({ price: 10000, rarity: 5 }, 0)).toBe(10000);
    expect(getCurrentPrice({ price: 10000, rarity: 5 }, 1)).toBe(11000);
    expect(getCurrentPrice({ price: 10000, rarity: 5 }, 10)).toBe(20000);
  });

  it('defaults to rarity 3 when undefined', () => {
    expect(getCurrentPrice({ price: 10000 }, 5)).toBe(10000);
  });

  it('rounds to integer', () => {
    const price = getCurrentPrice({ price: 9999, rarity: 1 }, 1);
    expect(Number.isInteger(price)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════
// formatTime
// ═══════════════════════════════════════════════════════

describe('formatTime', () => {
  it('drag race shows seconds with 2 decimals', () => {
    expect(formatTime(12.345, 'Ночной Дрэг')).toBe('12.35 сек');
    expect(formatTime(8.1, 'дрэг')).toBe('8.10 сек');
  });

  it('non-drag race under 60s shows seconds', () => {
    expect(formatTime(45.67, 'Тоге Дрифт')).toBe('45.67 сек');
  });

  it('non-drag race over 60s shows minutes:seconds', () => {
    expect(formatTime(125.5, 'Грунтовое Ралли')).toBe('2 мин 05.50 сек');
  });

  it('handles exact minute boundary', () => {
    expect(formatTime(60.0, 'Ралли')).toBe('1 мин 00.00 сек');
  });

  it('handles zero seconds', () => {
    expect(formatTime(0, 'Ралли')).toBe('0.00 сек');
  });

  it('handles large times', () => {
    const result = formatTime(3661.5, 'Ралли');
    expect(result).toContain('мин');
  });
});

// ═══════════════════════════════════════════════════════
// weightColor
// ═══════════════════════════════════════════════════════

describe('weightColor', () => {
  it('returns red for >= 6', () => {
    expect(weightColor(6)).toBe('#ff4444');
    expect(weightColor(10)).toBe('#ff4444');
  });

  it('returns orange for >= 4', () => {
    expect(weightColor(4)).toBe('#ffaa00');
    expect(weightColor(5)).toBe('#ffaa00');
  });

  it('returns yellow for >= 2', () => {
    expect(weightColor(2)).toBe('#ffdd00');
    expect(weightColor(3)).toBe('#ffdd00');
  });

  it('returns gray for >= 1', () => {
    expect(weightColor(1)).toBe('#aaa');
  });

  it('returns dark for < 1', () => {
    expect(weightColor(0)).toBe('#333');
    expect(weightColor(0.5)).toBe('#333');
  });
});

// ═══════════════════════════════════════════════════════
// coeffColor
// ═══════════════════════════════════════════════════════

describe('coeffColor', () => {
  it('returns green for > 1', () => {
    expect(coeffColor(1.5)).toBe('#44ff44');
    expect(coeffColor(2)).toBe('#44ff44');
  });

  it('returns red for < 1', () => {
    expect(coeffColor(0.5)).toBe('#ff4444');
    expect(coeffColor(0.9)).toBe('#ff4444');
  });

  it('returns gray for exactly 1', () => {
    expect(coeffColor(1)).toBe('#888');
  });
});

// ═══════════════════════════════════════════════════════
// boostBadges
// ═══════════════════════════════════════════════════════

describe('boostBadges', () => {
  it('returns empty array for no boosts', () => {
    const part: Part = { id: 'p1', name: 'Empty', boosts: {}, price: 0, icon: '' };
    expect(boostBadges(part)).toEqual([]);
  });

  it('shows positive power boost', () => {
    const part: Part = { id: 'p1', name: 'Turbo', boosts: { power: 50 }, price: 0, icon: '' };
    const badges = boostBadges(part);
    expect(badges).toHaveLength(1);
    expect(badges[0].text).toBe('+50 лс');
    expect(badges[0].positive).toBe(true);
  });

  it('shows negative power boost', () => {
    const part: Part = { id: 'p1', name: 'Heavy', boosts: { power: -10 }, price: 0, icon: '' };
    const badges = boostBadges(part);
    expect(badges[0].text).toBe('-10 лс');
    expect(badges[0].positive).toBe(false);
  });

  it('shows percentage boosts', () => {
    const part: Part = { id: 'p1', name: 'Chip', boosts: { powerPct: 15, torquePct: 10 }, price: 0, icon: '' };
    const badges = boostBadges(part);
    expect(badges).toHaveLength(2);
    expect(badges[0].text).toBe('15% лс');
    expect(badges[1].text).toBe('10% Нм');
  });

  it('shows all boost types', () => {
    const part: Part = {
      id: 'p1', name: 'Super', price: 0, icon: '',
      boosts: { power: 10, torque: 20, topSpeed: 5, handling: 8, offroad: 3, accelerationPct: 5 },
    };
    const badges = boostBadges(part);
    expect(badges).toHaveLength(6);
  });

  it('accelerationPct is always positive', () => {
    const part: Part = { id: 'p1', name: 'Cam', boosts: { accelerationPct: 10 }, price: 0, icon: '' };
    const badges = boostBadges(part);
    expect(badges[0].positive).toBe(true);
    expect(badges[0].text).toBe('+10% разг');
  });
});

// ═══════════════════════════════════════════════════════
// CLASS_PART_LIMITS
// ═══════════════════════════════════════════════════════

describe('CLASS_PART_LIMITS', () => {
  it('A class has 16 slots', () => expect(CLASS_PART_LIMITS['A']).toBe(16));
  it('B class has 14 slots', () => expect(CLASS_PART_LIMITS['B']).toBe(14));
  it('C class has 12 slots', () => expect(CLASS_PART_LIMITS['C']).toBe(12));
  it('D class has 10 slots', () => expect(CLASS_PART_LIMITS['D']).toBe(10));
  it('E class has 8 slots', () => expect(CLASS_PART_LIMITS['E']).toBe(8));
  it('R class has 6 slots', () => expect(CLASS_PART_LIMITS['R']).toBe(6));
  it('S class has 4 slots', () => expect(CLASS_PART_LIMITS['S']).toBe(4));
});

// ═══════════════════════════════════════════════════════
// checkRequirement
// ═══════════════════════════════════════════════════════

describe('checkRequirement', () => {
  it('returns true for empty requirement', () => {
    expect(checkRequirement(makeCar(), '')).toBe(true);
    expect(checkRequirement(makeCar(), null)).toBe(true);
    expect(checkRequirement(makeCar(), undefined)).toBe(true);
    expect(checkRequirement(makeCar(), '   ')).toBe(true);
  });

  // Tags
  it('checks автоспорт tag', () => {
    expect(checkRequirement(makeCar({ tags: ['АВТОСПОРТ'] }), 'автоспорт')).toBe(true);
    expect(checkRequirement(makeCar({ tags: ['Спорт'] }), 'автоспорт')).toBe(false);
    expect(checkRequirement(makeCar({ tags: [] }), 'автоспорт')).toBe(false);
  });

  it('checks хэтчбек tag', () => {
    expect(checkRequirement(makeCar({ tags: ['Хэтчбек'] }), 'хэтчбек')).toBe(true);
    expect(checkRequirement(makeCar({ tags: ['Хэтчбэк'] }), 'хэтчбэк')).toBe(true);
    expect(checkRequirement(makeCar({ tags: ['Седан'] }), 'хэтчбек')).toBe(false);
  });

  it('checks купе tag', () => {
    expect(checkRequirement(makeCar({ tags: ['Купе'] }), 'купе')).toBe(true);
    expect(checkRequirement(makeCar({ tags: ['Седан'] }), 'купе')).toBe(false);
  });

  it('checks седан tag', () => {
    expect(checkRequirement(makeCar({ tags: ['Седан'] }), 'седан')).toBe(true);
  });

  it('checks внедорожник tag', () => {
    expect(checkRequirement(makeCar({ tags: ['Внедорожник'] }), 'внедорожник')).toBe(true);
  });

  it('checks muscle car tag', () => {
    expect(checkRequirement(makeCar({ tags: ['Muscle Car'] }), 'muscle car')).toBe(true);
    expect(checkRequirement(makeCar({ tags: ['Muscle Car'] }), 'muscle')).toBe(true);
  });

  it('checks комфорт tag', () => {
    expect(checkRequirement(makeCar({ tags: ['Комфорт'] }), 'комфорт')).toBe(true);
  });

  it('checks коллекция tag', () => {
    expect(checkRequirement(makeCar({ tags: ['Коллекция'] }), 'коллекция')).toBe(true);
  });

  // Countries
  it('checks country tags', () => {
    expect(checkRequirement(makeCar({ tags: ['Франция'] }), 'Франция')).toBe(true);
    expect(checkRequirement(makeCar({ tags: ['США'] }), 'США')).toBe(true);
    expect(checkRequirement(makeCar({ tags: ['Италия'] }), 'Италия')).toBe(true);
    expect(checkRequirement(makeCar({ tags: ['Германия'] }), 'Германия')).toBe(true);
    expect(checkRequirement(makeCar({ tags: ['Япония'] }), 'Япония')).toBe(true);
    expect(checkRequirement(makeCar({ tags: ['СССР'] }), 'СССР')).toBe(true);
  });

  it('checks немецк → Германия', () => {
    expect(checkRequirement(makeCar({ tags: ['Германия'] }), 'немецкий')).toBe(true);
    expect(checkRequirement(makeCar({ tags: ['Франция'] }), 'немецкий')).toBe(false);
  });

  // Epoch
  it('checks epoch requirement', () => {
    expect(checkRequirement(makeCar({ epoch: 60 }), 'эпоха 60')).toBe(true);
    expect(checkRequirement(makeCar({ epoch: 70 }), 'эпоха 60')).toBe(false);
    expect(checkRequirement(makeCar({ epoch: 80 }), 'эпоха - 80-ые')).toBe(true);
  });

  // Rarity
  it('checks rarity requirement', () => {
    expect(checkRequirement(makeCar({ rarity: 3 }), 'редкость 3')).toBe(true);
    expect(checkRequirement(makeCar({ rarity: 1 }), 'редкость 3')).toBe(false);
    expect(checkRequirement(makeCar({ rarity: 5 }), 'редкость 5')).toBe(true);
  });

  // Car class
  it('checks car class requirement (Cyrillic)', () => {
    expect(checkRequirement(makeCar({ carClass: 'A' }), 'А-класс')).toBe(true);
    expect(checkRequirement(makeCar({ carClass: 'B' }), 'А-класс')).toBe(false);
    expect(checkRequirement(makeCar({ carClass: 'C' }), 'С-класс')).toBe(true);
  });

  it('checks car class requirement (Latin)', () => {
    expect(checkRequirement(makeCar({ carClass: 'A' }), 'A-класс')).toBe(true);
    expect(checkRequirement(makeCar({ carClass: 'E' }), 'E-класс')).toBe(true);
  });

  // Brands
  it('checks brand by car name', () => {
    expect(checkRequirement(makeCar({ name: 'BMW 320i' }), 'BMW')).toBe(true);
    expect(checkRequirement(makeCar({ name: 'Ford Mustang' }), 'Ford')).toBe(true);
    expect(checkRequirement(makeCar({ name: 'Porsche 911' }), 'Porsche')).toBe(true);
    expect(checkRequirement(makeCar({ name: 'Ferrari F40' }), 'Ferrari')).toBe(true);
    expect(checkRequirement(makeCar({ name: 'BMW 320i' }), 'Ford')).toBe(false);
  });

  // Tires
  it('checks tire type requirement', () => {
    expect(checkRequirement(makeCar({ roadType: 'С' }), 'слик')).toBe(true);
    expect(checkRequirement(makeCar({ roadType: 'У' }), 'слик')).toBe(false);
    expect(checkRequirement(makeCar({ roadType: 'В' }), 'внедорожные шины')).toBe(true);
    expect(checkRequirement(makeCar({ roadType: 'У' }), 'универсальные шины')).toBe(true);
    expect(checkRequirement(makeCar({ roadType: 'Г' }), 'гоночные шины')).toBe(true);
  });

  it('installed tire part overrides roadType for requirement check', () => {
    const car = makeCar({
      roadType: 'У',
      installedParts: [{ slot: 'tires', name: 'Слик Pro', boosts: {} }],
    });
    expect(checkRequirement(car, 'слик')).toBe(true);
  });

  // Power ranges
  it('checks power range requirement', () => {
    expect(checkRequirement(makeCar({ stats: { power: 150, torque: 200, topSpeed: 220, acceleration: 8, handling: 50, offroad: 30 } }), '100-200 лс')).toBe(true);
    expect(checkRequirement(makeCar({ stats: { power: 250, torque: 200, topSpeed: 220, acceleration: 8, handling: 50, offroad: 30 } }), '100-200 лс')).toBe(false);
  });

  it('checks мощность до X', () => {
    expect(checkRequirement(makeCar({ stats: { power: 100, torque: 200, topSpeed: 220, acceleration: 8, handling: 50, offroad: 30 } }), 'мощность до 150')).toBe(true);
    expect(checkRequirement(makeCar({ stats: { power: 200, torque: 200, topSpeed: 220, acceleration: 8, handling: 50, offroad: 30 } }), 'мощность до 150')).toBe(false);
  });

  it('checks мощность выше X', () => {
    expect(checkRequirement(makeCar({ stats: { power: 200, torque: 200, topSpeed: 220, acceleration: 8, handling: 50, offroad: 30 } }), 'мощность выше 150')).toBe(true);
    expect(checkRequirement(makeCar({ stats: { power: 100, torque: 200, topSpeed: 220, acceleration: 8, handling: 50, offroad: 30 } }), 'мощность выше 150')).toBe(false);
  });

  it('checks мощность менее X', () => {
    expect(checkRequirement(makeCar({ stats: { power: 100, torque: 200, topSpeed: 220, acceleration: 8, handling: 50, offroad: 30 } }), 'мощность менее 150')).toBe(true);
    expect(checkRequirement(makeCar({ stats: { power: 200, torque: 200, topSpeed: 220, acceleration: 8, handling: 50, offroad: 30 } }), 'мощность менее 150')).toBe(false);
  });

  // Stat thresholds
  it('checks управляемость выше X', () => {
    expect(checkRequirement(makeCar({ stats: { power: 150, torque: 200, topSpeed: 220, acceleration: 8, handling: 80, offroad: 30 } }), 'управляемость выше 50')).toBe(true);
    expect(checkRequirement(makeCar({ stats: { power: 150, torque: 200, topSpeed: 220, acceleration: 8, handling: 30, offroad: 30 } }), 'управляемость выше 50')).toBe(false);
  });

  it('checks проходимость выше X', () => {
    expect(checkRequirement(makeCar({ stats: { power: 150, torque: 200, topSpeed: 220, acceleration: 8, handling: 50, offroad: 60 } }), 'проходимость выше 50')).toBe(true);
  });

  it('checks скорость выше X', () => {
    expect(checkRequirement(makeCar({ stats: { power: 150, torque: 200, topSpeed: 300, acceleration: 8, handling: 50, offroad: 30 } }), 'скорость выше 250')).toBe(true);
  });

  // Combined requirements
  it('checks combined requirements with +', () => {
    const car = makeCar({ tags: ['Хэтчбек', 'США'], stats: { power: 150, torque: 200, topSpeed: 220, acceleration: 8, handling: 50, offroad: 30 } });
    expect(checkRequirement(car, 'хэтчбек + США')).toBe(true);
    expect(checkRequirement(car, 'хэтчбек + Германия')).toBe(false);
  });

  it('all conditions must be met for combined', () => {
    const car = makeCar({ tags: ['Купе', 'Германия'], carClass: 'B' });
    expect(checkRequirement(car, 'купе + Германия')).toBe(true);
    expect(checkRequirement(car, 'купе + Франция')).toBe(false);
  });

  // Payment requirement (always passes)
  it('оплатить 1000 always returns true', () => {
    expect(checkRequirement(makeCar(), 'оплатить 1000')).toBe(true);
  });

  // Full part limit
  it('checks полностью установленным лимитом', () => {
    const fullCar = makeCar({
      carClass: 'S',
      installedParts: Array.from({ length: 4 }, (_, i) => ({ id: `p${i}`, name: `Part ${i}`, boosts: {}, price: 0, icon: '' })),
    });
    expect(checkRequirement(fullCar, 'полностью установленным лимитом')).toBe(true);

    const notFullCar = makeCar({
      carClass: 'S',
      installedParts: [{ id: 'p1', name: 'Part', boosts: {}, price: 0, icon: '' }],
    });
    expect(checkRequirement(notFullCar, 'полностью установленным лимитом')).toBe(false);
  });

  // Unknown requirement defaults to true
  it('unknown requirement returns true', () => {
    expect(checkRequirement(makeCar(), 'какое-то неизвестное требование')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════
// getAllowedDealersCount (Dealer access control)
// ═══════════════════════════════════════════════════════

describe('getAllowedDealersCount', () => {
  it('< 3 players: everyone gets 4 dealers', () => {
    expect(getAllowedDealersCount(2, 1)).toBe(4);
    expect(getAllowedDealersCount(1, 1)).toBe(4);
  });

  it('3 players: 1st=1, 2nd=2, 3rd=3', () => {
    expect(getAllowedDealersCount(3, 1)).toBe(1);
    expect(getAllowedDealersCount(3, 2)).toBe(2);
    expect(getAllowedDealersCount(3, 3)).toBe(3);
  });

  it('4 players: 1st=1, 2nd=2, 3rd=3, 4th=4', () => {
    expect(getAllowedDealersCount(4, 1)).toBe(1);
    expect(getAllowedDealersCount(4, 2)).toBe(2);
    expect(getAllowedDealersCount(4, 3)).toBe(3);
    expect(getAllowedDealersCount(4, 4)).toBe(4);
  });

  it('5 players: 1st=1, 2nd=2, 3rd=3, 4th-5th=4', () => {
    expect(getAllowedDealersCount(5, 1)).toBe(1);
    expect(getAllowedDealersCount(5, 2)).toBe(2);
    expect(getAllowedDealersCount(5, 3)).toBe(3);
    expect(getAllowedDealersCount(5, 4)).toBe(4);
    expect(getAllowedDealersCount(5, 5)).toBe(4);
  });

  it('6 players: 1st-2nd=1, 3rd=2, 4th=3, 5th-6th=4', () => {
    expect(getAllowedDealersCount(6, 1)).toBe(1);
    expect(getAllowedDealersCount(6, 2)).toBe(1);
    expect(getAllowedDealersCount(6, 3)).toBe(2);
    expect(getAllowedDealersCount(6, 4)).toBe(3);
    expect(getAllowedDealersCount(6, 5)).toBe(4);
    expect(getAllowedDealersCount(6, 6)).toBe(4);
  });

  it('7 players: 1st-2nd=1, 3rd-4th=2, 5th=3, 6th-7th=4', () => {
    expect(getAllowedDealersCount(7, 1)).toBe(1);
    expect(getAllowedDealersCount(7, 2)).toBe(1);
    expect(getAllowedDealersCount(7, 3)).toBe(2);
    expect(getAllowedDealersCount(7, 4)).toBe(2);
    expect(getAllowedDealersCount(7, 5)).toBe(3);
    expect(getAllowedDealersCount(7, 6)).toBe(4);
    expect(getAllowedDealersCount(7, 7)).toBe(4);
  });

  it('8 players: 1st-2nd=1, 3rd-4th=2, 5th-6th=3, 7th-8th=4', () => {
    expect(getAllowedDealersCount(8, 1)).toBe(1);
    expect(getAllowedDealersCount(8, 2)).toBe(1);
    expect(getAllowedDealersCount(8, 3)).toBe(2);
    expect(getAllowedDealersCount(8, 4)).toBe(2);
    expect(getAllowedDealersCount(8, 5)).toBe(3);
    expect(getAllowedDealersCount(8, 6)).toBe(3);
    expect(getAllowedDealersCount(8, 7)).toBe(4);
    expect(getAllowedDealersCount(8, 8)).toBe(4);
  });

  it('leader always gets fewest dealers (1)', () => {
    for (let n = 3; n <= 8; n++) {
      expect(getAllowedDealersCount(n, 1)).toBe(1);
    }
  });

  it('last place always gets most dealers', () => {
    expect(getAllowedDealersCount(3, 3)).toBe(3);
    expect(getAllowedDealersCount(4, 4)).toBe(4);
    expect(getAllowedDealersCount(5, 5)).toBe(4);
    expect(getAllowedDealersCount(6, 6)).toBe(4);
    expect(getAllowedDealersCount(7, 7)).toBe(4);
    expect(getAllowedDealersCount(8, 8)).toBe(4);
  });
});
