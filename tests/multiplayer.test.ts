import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateRoomCode,
  getStarterCars,
  getScheduleDay,
  WEEK_SCHEDULE,
  POWER_CATEGORIES,
} from '../services/multiplayer';

// ═══════════════════════════════════════════════════════
// generateRoomCode
// ═══════════════════════════════════════════════════════

describe('generateRoomCode', () => {
  it('returns a 4-character string', () => {
    const code = generateRoomCode();
    expect(code).toHaveLength(4);
  });

  it('contains only allowed characters (no O, 0, 1, I)', () => {
    const allowed = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (let i = 0; i < 100; i++) {
      const code = generateRoomCode();
      for (const ch of code) {
        expect(allowed).toContain(ch);
      }
    }
  });

  it('does not contain ambiguous characters', () => {
    const forbidden = ['O', '0', '1', 'I'];
    for (let i = 0; i < 100; i++) {
      const code = generateRoomCode();
      for (const ch of forbidden) {
        expect(code).not.toContain(ch);
      }
    }
  });

  it('generates different codes (not always the same)', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 50; i++) {
      codes.add(generateRoomCode());
    }
    // With 30^4 = 810000 possibilities, 50 codes should be mostly unique
    expect(codes.size).toBeGreaterThan(30);
  });
});

// ═══════════════════════════════════════════════════════
// getStarterCars
// ═══════════════════════════════════════════════════════

describe('getStarterCars', () => {
  it('returns exactly 3 cars', () => {
    const cars = getStarterCars();
    expect(cars).toHaveLength(3);
  });

  it('all starter cars have empty installedParts', () => {
    const cars = getStarterCars();
    for (const car of cars) {
      expect(car.installedParts).toEqual([]);
    }
  });

  it('all starter cars have unique IDs starting with "starter-"', () => {
    const cars = getStarterCars();
    const ids = cars.map(c => c.id);
    expect(new Set(ids).size).toBe(3);
    for (const id of ids) {
      expect(id).toMatch(/^starter-/);
    }
  });

  it('all starter cars have originalId set', () => {
    const cars = getStarterCars();
    for (const car of cars) {
      expect(car.originalId).toBeDefined();
      expect(car.originalId).not.toBe('');
    }
  });

  it('starter cars are from year <= 1960', () => {
    const cars = getStarterCars();
    for (const car of cars) {
      if (car.year) {
        expect(car.year).toBeLessThanOrEqual(1960);
      }
    }
  });

  it('tries to pick from different dealers', () => {
    const cars = getStarterCars();
    const dealers = cars.map(c => c.dealer).filter(Boolean);
    // Should try to use different dealers
    if (dealers.length >= 2) {
      const uniqueDealers = new Set(dealers);
      expect(uniqueDealers.size).toBeGreaterThanOrEqual(2);
    }
  });
});

// ═══════════════════════════════════════════════════════
// getScheduleDay
// ═══════════════════════════════════════════════════════

describe('getScheduleDay', () => {
  it('day 1 is Friday (TUNING)', () => {
    const day = getScheduleDay(1);
    expect(day.dayNum).toBe(1);
    expect(day.activity).toBe('TUNING');
    expect(day.label).toBe('Пятница');
  });

  it('day 2 is Saturday (QUALIFICATION race)', () => {
    const day = getScheduleDay(2);
    expect(day.dayNum).toBe(2);
    expect(day.activity).toBe('RACE');
    expect(day.raceType).toBe('QUALIFICATION');
  });

  it('day 3 is Sunday (DEALER)', () => {
    const day = getScheduleDay(3);
    expect(day.dayNum).toBe(3);
    expect(day.activity).toBe('DEALER');
  });

  it('day 4 is Monday (TUNING)', () => {
    const day = getScheduleDay(4);
    expect(day.dayNum).toBe(4);
    expect(day.activity).toBe('TUNING');
  });

  it('day 5 is Tuesday (CITY race)', () => {
    const day = getScheduleDay(5);
    expect(day.dayNum).toBe(5);
    expect(day.raceType).toBe('CITY');
  });

  it('day 7 is Thursday (NATIONAL race)', () => {
    const day = getScheduleDay(7);
    expect(day.dayNum).toBe(7);
    expect(day.raceType).toBe('NATIONAL');
  });

  it('day 9 is Saturday (WORLD race)', () => {
    const day = getScheduleDay(9);
    expect(day.dayNum).toBe(9);
    expect(day.raceType).toBe('WORLD');
  });

  it('day 10 is Sunday (DEALER)', () => {
    const day = getScheduleDay(10);
    expect(day.dayNum).toBe(10);
    expect(day.activity).toBe('DEALER');
  });

  it('cycles correctly after day 10 (day 11 = Monday)', () => {
    const day = getScheduleDay(11);
    expect(day.dayNum).toBe(4);
    expect(day.activity).toBe('TUNING');
  });

  it('day 12 = Tuesday (CITY)', () => {
    const day = getScheduleDay(12);
    expect(day.dayNum).toBe(5);
    expect(day.raceType).toBe('CITY');
  });

  it('day 17 = Sunday (DEALER)', () => {
    const day = getScheduleDay(17);
    expect(day.dayNum).toBe(10);
    expect(day.activity).toBe('DEALER');
  });

  it('day 18 cycles back to Monday', () => {
    const day = getScheduleDay(18);
    expect(day.dayNum).toBe(4);
  });

  it('large day numbers cycle correctly', () => {
    // Day 100: (100-4) % 7 = 96 % 7 = 5, +4 = 9 → Saturday WORLD
    const day = getScheduleDay(100);
    expect(day.dayNum).toBe(9);
    expect(day.raceType).toBe('WORLD');
  });
});

// ═══════════════════════════════════════════════════════
// WEEK_SCHEDULE
// ═══════════════════════════════════════════════════════

describe('WEEK_SCHEDULE', () => {
  it('has exactly 10 entries', () => {
    expect(WEEK_SCHEDULE).toHaveLength(10);
  });

  it('day numbers are sequential 1-10', () => {
    for (let i = 0; i < 10; i++) {
      expect(WEEK_SCHEDULE[i].dayNum).toBe(i + 1);
    }
  });

  it('has 4 race days', () => {
    const raceDays = WEEK_SCHEDULE.filter(d => d.activity === 'RACE');
    expect(raceDays).toHaveLength(4);
  });

  it('has 4 tuning days', () => {
    const tuningDays = WEEK_SCHEDULE.filter(d => d.activity === 'TUNING');
    expect(tuningDays).toHaveLength(4);
  });

  it('has 2 dealer days', () => {
    const dealerDays = WEEK_SCHEDULE.filter(d => d.activity === 'DEALER');
    expect(dealerDays).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════════════════
// POWER_CATEGORIES
// ═══════════════════════════════════════════════════════

describe('POWER_CATEGORIES', () => {
  it('has 7 categories', () => {
    expect(POWER_CATEGORIES).toHaveLength(7);
  });

  it('categories are contiguous (no gaps)', () => {
    for (let i = 1; i < POWER_CATEGORIES.length; i++) {
      expect(POWER_CATEGORIES[i].min).toBe(POWER_CATEGORIES[i - 1].max + 1);
    }
  });

  it('starts at 0', () => {
    expect(POWER_CATEGORIES[0].min).toBe(0);
  });

  it('ends at Infinity', () => {
    expect(POWER_CATEGORIES[POWER_CATEGORIES.length - 1].max).toBe(Infinity);
  });

  it('every power value falls into exactly one category', () => {
    const testValues = [0, 50, 120, 121, 200, 201, 300, 301, 450, 451, 650, 651, 900, 901, 1500];
    for (const val of testValues) {
      const matches = POWER_CATEGORIES.filter(c => val >= c.min && val <= c.max);
      expect(matches).toHaveLength(1);
    }
  });
});
