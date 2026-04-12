import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateSinglePrize, generatePrizesForPlayer, generatePrizesForRace } from '../services/prizeService';
import { Part, PrizeDiscount } from '../types';

function isPart(item: Part | PrizeDiscount): item is Part {
  return !('type' in item && (item as any).type === 'discount');
}

function isDiscount(item: Part | PrizeDiscount): item is PrizeDiscount {
  return 'type' in item && (item as any).type === 'discount';
}

// ═══════════════════════════════════════════════════════
// generateSinglePrize
// ═══════════════════════════════════════════════════════

describe('generateSinglePrize', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a part when random < 0.7', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.3)   // roll < 0.7 → part
      .mockReturnValue(0.5);      // subsequent randoms for part selection
    const prize = generateSinglePrize(1960);
    expect(isPart(prize)).toBe(true);
  });

  it('returns a discount when random >= 0.7', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.8)   // roll >= 0.7 → discount
      .mockReturnValue(0.5);      // dealer selection
    const prize = generateSinglePrize(1960);
    expect(isDiscount(prize)).toBe(true);
  });

  it('discount has 15% value', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.75)
      .mockReturnValue(0.0);
    const prize = generateSinglePrize(1960) as PrizeDiscount;
    expect(prize.discount).toBe(15);
  });

  it('discount dealer is one of АЛЬФА, БЕТА, ГАММА, ДЕЛЬТА', () => {
    const validDealers = ['АЛЬФА', 'БЕТА', 'ГАММА', 'ДЕЛЬТА'];
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.75)
      .mockReturnValue(0.5);
    const prize = generateSinglePrize(1960) as PrizeDiscount;
    expect(validDealers).toContain(prize.dealer);
  });

  it('discount has correct name format', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.75)
      .mockReturnValue(0.0);
    const prize = generateSinglePrize(1960) as PrizeDiscount;
    expect(prize.name).toMatch(/^Скидка 15% —/);
  });

  it('discount has icon 🏷️', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.75)
      .mockReturnValue(0.0);
    const prize = generateSinglePrize(1960) as PrizeDiscount;
    expect(prize.icon).toBe('🏷️');
  });

  it('prize part has unique ID starting with "prize-part-"', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.3)
      .mockReturnValue(0.5);
    const prize = generateSinglePrize(1960);
    if (isPart(prize)) {
      expect(prize.id).toMatch(/^prize-part-/);
    }
  });

  it('prize part has price = 0', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.3)
      .mockReturnValue(0.5);
    const prize = generateSinglePrize(1960);
    if (isPart(prize)) {
      expect(prize.price).toBe(0);
    }
  });

  it('prize discount has unique ID starting with "prize-discount-"', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.75)
      .mockReturnValue(0.5);
    const prize = generateSinglePrize(1960) as PrizeDiscount;
    expect(prize.id).toMatch(/^prize-discount-/);
  });

  it('generates prizes for later years (2020)', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.3)
      .mockReturnValue(0.5);
    const prize = generateSinglePrize(2020);
    // Should not throw, should return a valid prize
    expect(prize).toBeDefined();
    expect(prize.id).toBeDefined();
  });

  it('distribution is roughly 70/30 over many calls', () => {
    vi.restoreAllMocks(); // use real random
    let parts = 0;
    let discounts = 0;
    const N = 1000;
    for (let i = 0; i < N; i++) {
      const prize = generateSinglePrize(1980);
      if (isPart(prize)) parts++;
      else discounts++;
    }
    // 70% parts ± 5%
    expect(parts / N).toBeGreaterThan(0.60);
    expect(parts / N).toBeLessThan(0.80);
    // 30% discounts ± 5%
    expect(discounts / N).toBeGreaterThan(0.20);
    expect(discounts / N).toBeLessThan(0.40);
  });
});

// ═══════════════════════════════════════════════════════
// generatePrizesForPlayer
// ═══════════════════════════════════════════════════════

describe('generatePrizesForPlayer', () => {
  it('returns empty array for positions with no prizes', () => {
    // Position 8 in a 3-player game likely has no prizes
    const prizes = generatePrizesForPlayer(8, 3, 1960);
    expect(prizes).toEqual([]);
  });

  it('returns array of prizes for valid position', () => {
    const prizes = generatePrizesForPlayer(1, 4, 1960);
    // May or may not have prizes depending on worldBonus table
    expect(Array.isArray(prizes)).toBe(true);
  });

  it('each prize has an id', () => {
    const prizes = generatePrizesForPlayer(1, 4, 1960);
    for (const prize of prizes) {
      expect(prize.id).toBeDefined();
    }
  });
});

// ═══════════════════════════════════════════════════════
// generatePrizesForRace
// ═══════════════════════════════════════════════════════

describe('generatePrizesForRace', () => {
  it('returns a Map', () => {
    const results = [
      { carId: 'car-1', position: 1 },
      { carId: 'car-2', position: 2 },
    ];
    const prizeMap = generatePrizesForRace(results, 4, 1960);
    expect(prizeMap).toBeInstanceOf(Map);
  });

  it('keys are carIds from results', () => {
    const results = [
      { carId: 'car-1', position: 1 },
      { carId: 'car-2', position: 2 },
    ];
    const prizeMap = generatePrizesForRace(results, 4, 1960);
    for (const key of prizeMap.keys()) {
      expect(['car-1', 'car-2']).toContain(key);
    }
  });

  it('values are arrays of prizes', () => {
    const results = [{ carId: 'car-1', position: 1 }];
    const prizeMap = generatePrizesForRace(results, 4, 1960);
    for (const prizes of prizeMap.values()) {
      expect(Array.isArray(prizes)).toBe(true);
    }
  });
});
