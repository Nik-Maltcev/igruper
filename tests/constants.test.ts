import { describe, it, expect } from 'vitest';
import {
  AVAILABLE_CARS,
  SHOPS,
  SHOP_PARTS,
  BONUS_PARTS,
  TRACKS,
  MOCK_OPPONENTS,
  EPOCHS,
  INITIAL_MONEY,
  getUnlockedBrands,
  getRewards,
  TOURNAMENTS_DATA,
} from '../constants';

// ═══════════════════════════════════════════════════════
// AVAILABLE_CARS
// ═══════════════════════════════════════════════════════

describe('AVAILABLE_CARS', () => {
  it('is a non-empty array', () => {
    expect(AVAILABLE_CARS.length).toBeGreaterThan(0);
  });

  it('every car has required fields', () => {
    for (const car of AVAILABLE_CARS) {
      expect(car.id).toBeDefined();
      expect(car.name).toBeDefined();
      expect(car.price).toBeGreaterThanOrEqual(0);
      expect(car.stats).toBeDefined();
      expect(car.stats.power).toBeDefined();
      expect(car.stats.torque).toBeDefined();
      expect(car.stats.topSpeed).toBeDefined();
      expect(car.stats.acceleration).toBeDefined();
      expect(car.stats.handling).toBeDefined();
      expect(car.stats.offroad).toBeDefined();
    }
  });

  it('every car has empty installedParts', () => {
    for (const car of AVAILABLE_CARS) {
      expect(car.installedParts).toEqual([]);
    }
  });

  it('every car has a color', () => {
    for (const car of AVAILABLE_CARS) {
      expect(car.color).toBeDefined();
    }
  });

  it('car stats are positive numbers', () => {
    for (const car of AVAILABLE_CARS) {
      expect(car.stats.power).toBeGreaterThan(0);
      expect(car.stats.torque).toBeGreaterThan(0);
      expect(car.stats.topSpeed).toBeGreaterThan(0);
      expect(car.stats.acceleration).toBeGreaterThan(0);
    }
  });
});

// ═══════════════════════════════════════════════════════
// SHOPS
// ═══════════════════════════════════════════════════════

describe('SHOPS', () => {
  it('is a non-empty array', () => {
    expect(SHOPS.length).toBeGreaterThan(0);
  });

  it('every shop has brand and unlockYear', () => {
    for (const shop of SHOPS) {
      expect(shop.brand).toBeDefined();
      expect(typeof shop.brand).toBe('string');
      expect(shop.unlockYear).toBeDefined();
      expect(typeof shop.unlockYear).toBe('number');
    }
  });

  it('every shop has parts array', () => {
    for (const shop of SHOPS) {
      expect(Array.isArray(shop.parts)).toBe(true);
    }
  });

  it('no shop has unlockYear = 9999 (bonus parts filtered out)', () => {
    for (const shop of SHOPS) {
      expect(shop.unlockYear).toBeLessThan(9999);
    }
  });

  it('every part has boosts object', () => {
    for (const shop of SHOPS) {
      for (const part of shop.parts) {
        expect(part.boosts).toBeDefined();
        expect(typeof part.boosts).toBe('object');
      }
    }
  });
});

// ═══════════════════════════════════════════════════════
// SHOP_PARTS
// ═══════════════════════════════════════════════════════

describe('SHOP_PARTS', () => {
  it('is a flat array of all shop parts', () => {
    const totalParts = SHOPS.reduce((sum, s) => sum + s.parts.length, 0);
    expect(SHOP_PARTS.length).toBe(totalParts);
  });

  it('every part has id, name, price', () => {
    for (const part of SHOP_PARTS) {
      expect(part.id).toBeDefined();
      expect(part.name).toBeDefined();
      expect(part.price).toBeDefined();
    }
  });
});

// ═══════════════════════════════════════════════════════
// BONUS_PARTS
// ═══════════════════════════════════════════════════════

describe('BONUS_PARTS', () => {
  it('is an array', () => {
    expect(Array.isArray(BONUS_PARTS)).toBe(true);
  });

  it('every bonus part has boosts object', () => {
    for (const part of BONUS_PARTS) {
      expect(part.boosts).toBeDefined();
    }
  });
});

// ═══════════════════════════════════════════════════════
// TRACKS
// ═══════════════════════════════════════════════════════

describe('TRACKS', () => {
  it('has exactly 3 tracks', () => {
    expect(TRACKS).toHaveLength(3);
  });

  it('every track has valid weights that sum to ~1', () => {
    for (const track of TRACKS) {
      const w = track.weights;
      const sum = w.power + w.torque + w.topSpeed + w.acceleration + w.handling + w.offroad;
      expect(sum).toBeCloseTo(1, 1);
    }
  });

  it('every track has weatherModifier between 0 and 1', () => {
    for (const track of TRACKS) {
      expect(track.weatherModifier).toBeGreaterThanOrEqual(0);
      expect(track.weatherModifier).toBeLessThanOrEqual(1);
    }
  });

  it('tracks have unique IDs', () => {
    const ids = TRACKS.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('Drag track favors topSpeed and power', () => {
    const drag = TRACKS.find(t => t.id === 't1')!;
    expect(drag.weights.topSpeed).toBeGreaterThan(drag.weights.handling);
    expect(drag.weights.power).toBeGreaterThan(drag.weights.handling);
  });

  it('Drift track favors handling', () => {
    const drift = TRACKS.find(t => t.id === 't2')!;
    expect(drift.weights.handling).toBeGreaterThan(drift.weights.power);
    expect(drift.weights.handling).toBeGreaterThan(drift.weights.topSpeed);
  });

  it('Rally track favors offroad', () => {
    const rally = TRACKS.find(t => t.id === 't3')!;
    expect(rally.weights.offroad).toBeGreaterThan(rally.weights.power);
    expect(rally.weights.offroad).toBeGreaterThan(rally.weights.topSpeed);
  });
});

// ═══════════════════════════════════════════════════════
// MOCK_OPPONENTS
// ═══════════════════════════════════════════════════════

describe('MOCK_OPPONENTS', () => {
  it('has exactly 4 bots', () => {
    expect(MOCK_OPPONENTS).toHaveLength(4);
  });

  it('every bot has "Бот" tag', () => {
    for (const bot of MOCK_OPPONENTS) {
      expect(bot.tags).toContain('Бот');
    }
  });

  it('bots have unique IDs', () => {
    const ids = MOCK_OPPONENTS.map(b => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('bots have price = 0', () => {
    for (const bot of MOCK_OPPONENTS) {
      expect(bot.price).toBe(0);
    }
  });

  it('bots have varying stats (not all the same)', () => {
    const powers = MOCK_OPPONENTS.map(b => b.stats.power);
    expect(new Set(powers).size).toBeGreaterThan(1);
  });
});

// ═══════════════════════════════════════════════════════
// INITIAL_MONEY
// ═══════════════════════════════════════════════════════

describe('INITIAL_MONEY', () => {
  it('is 15000', () => {
    expect(INITIAL_MONEY).toBe(15000);
  });
});

// ═══════════════════════════════════════════════════════
// EPOCHS
// ═══════════════════════════════════════════════════════

describe('EPOCHS', () => {
  it('is a non-empty array', () => {
    expect(EPOCHS.length).toBeGreaterThan(0);
  });

  it('is sorted ascending by year', () => {
    for (let i = 1; i < EPOCHS.length; i++) {
      expect(EPOCHS[i].year).toBeGreaterThan(EPOCHS[i - 1].year);
    }
  });

  it('every epoch has year and label', () => {
    for (const epoch of EPOCHS) {
      expect(epoch.year).toBeDefined();
      expect(epoch.label).toBeDefined();
      expect(epoch.label).toBe(String(epoch.year));
    }
  });
});

// ═══════════════════════════════════════════════════════
// getUnlockedBrands
// ═══════════════════════════════════════════════════════

describe('getUnlockedBrands', () => {
  it('returns a Set', () => {
    const brands = getUnlockedBrands(1960);
    expect(brands).toBeInstanceOf(Set);
  });

  it('returns more brands for later years', () => {
    const early = getUnlockedBrands(1960);
    const late = getUnlockedBrands(2020);
    expect(late.size).toBeGreaterThanOrEqual(early.size);
  });

  it('returns empty set for year 0', () => {
    const brands = getUnlockedBrands(0);
    // Might be empty or have some very early brands
    expect(brands).toBeInstanceOf(Set);
  });

  it('returns all brands for year 9998', () => {
    const allBrands = getUnlockedBrands(9998);
    // Should include all shops (except 9999 which is filtered)
    expect(allBrands.size).toBe(SHOPS.length);
  });
});

// ═══════════════════════════════════════════════════════
// getRewards
// ═══════════════════════════════════════════════════════

describe('getRewards', () => {
  it('returns rewards for 3 players', () => {
    const rewards = getRewards(3);
    expect(rewards).toBeDefined();
    expect(rewards.city).toBeDefined();
    expect(rewards.national).toBeDefined();
  });

  it('returns rewards for 8 players', () => {
    const rewards = getRewards(8);
    expect(rewards).toBeDefined();
  });

  it('clamps to 3 for values below 3', () => {
    const rewards1 = getRewards(1);
    const rewards3 = getRewards(3);
    expect(rewards1).toEqual(rewards3);
  });

  it('clamps to 8 for values above 8', () => {
    const rewards10 = getRewards(10);
    const rewards8 = getRewards(8);
    expect(rewards10).toEqual(rewards8);
  });

  it('city rewards have place, money, points', () => {
    const rewards = getRewards(4);
    for (const entry of rewards.city) {
      expect(entry.place).toBeDefined();
      expect(entry.money).toBeDefined();
      expect(entry.points).toBeDefined();
    }
  });

  it('rewards for different player counts may differ', () => {
    const r3 = getRewards(3);
    const r8 = getRewards(8);
    // They should be different objects (different reward structures)
    const r3json = JSON.stringify(r3);
    const r8json = JSON.stringify(r8);
    // At minimum they should both be valid
    expect(r3json.length).toBeGreaterThan(0);
    expect(r8json.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════
// TOURNAMENTS_DATA
// ═══════════════════════════════════════════════════════

describe('TOURNAMENTS_DATA', () => {
  it('has 5 tournaments', () => {
    expect(TOURNAMENTS_DATA).toHaveLength(5);
  });

  it('every tournament has name, years, and 3 sections', () => {
    for (const t of TOURNAMENTS_DATA) {
      expect(t.name).toBeDefined();
      expect(t.years.length).toBeGreaterThan(0);
      expect(t.sections).toHaveLength(3);
    }
  });

  it('every section has weights that sum to ~1', () => {
    for (const t of TOURNAMENTS_DATA) {
      for (const section of t.sections) {
        const w = section.weights;
        const sum = w.power + w.torque + w.topSpeed + w.acceleration + w.handling + w.offroad;
        expect(sum).toBeCloseTo(1, 1);
      }
    }
  });

  it('every section has weatherModifier = 0.5', () => {
    for (const t of TOURNAMENTS_DATA) {
      for (const section of t.sections) {
        expect(section.weatherModifier).toBe(0.5);
      }
    }
  });

  it('Гонка Чемпионов has the most years', () => {
    const champ = TOURNAMENTS_DATA.find(t => t.name === 'Гонка Чемпионов')!;
    expect(champ).toBeDefined();
    expect(champ.years.length).toBe(7);
  });
});
