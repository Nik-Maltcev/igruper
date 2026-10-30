import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateSinglePrize, generatePrizesForPlayer, generatePrizesForRace, getPrizeKind } from '../services/prizeService';
import { Part, PrizeDiscount, MoneyPrize, Prize } from '../types';

function isPart(item: Prize): item is Part {
  return !('type' in item && ((item as any).type === 'discount' || (item as any).type === 'money'));
}

function isDiscount(item: Prize): item is PrizeDiscount {
  return 'type' in item && (item as any).type === 'discount';
}

function isMoneyPrize(item: Prize): item is MoneyPrize {
  return 'type' in item && (item as any).type === 'money';
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

  it('can return a money prize', () => {
    // Свежий бросок без alreadyGiven: деталь < 0.525, деньги [0.525, 0.7), скидка >= 0.7
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.6)   // → денежный приз
      .mockReturnValueOnce(0.4);  // выбор суммы: < 0.5 → 12000
    const prize = generateSinglePrize(1960);
    expect(isMoneyPrize(prize)).toBe(true);
    if (isMoneyPrize(prize)) {
      expect(prize.amount).toBe(12000);
      expect(prize.id).toMatch(/^prize-money-/);
      expect(prize.icon).toBe('💰');
    }
  });

  it('money prize can be 17000', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.6)
      .mockReturnValueOnce(0.9);  // >= 0.5 → 17000
    const prize = generateSinglePrize(1960);
    expect(isMoneyPrize(prize)).toBe(true);
    if (isMoneyPrize(prize)) {
      expect(prize.amount).toBe(17000);
    }
  });

  it('roll below the money range gives a part', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.3)   // < 0.525 → деталь
      .mockReturnValue(0.5);
    const prize = generateSinglePrize(1960);
    expect(isMoneyPrize(prize)).toBe(false);
    expect(isPart(prize)).toBe(true);
  });

  // ─── Антиповтор редких типов в наборе одного игрока ───

  it('после скидки тот же бросок даёт уже деньги, а не вторую скидку', () => {
    // alreadyGiven=['discount']: вес скидки 0.3→0.06, деталь < 0.6908, деньги < 0.9211
    vi.spyOn(Math, 'random').mockReturnValue(0.8);
    const first = generateSinglePrize(1960);
    expect(isDiscount(first)).toBe(true);
    const second = generateSinglePrize(1960, [getPrizeKind(first)]);
    expect(isMoneyPrize(second)).toBe(true);
  });

  it('скидка после скидки всё же возможна — просто редко', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.95); // >= 0.9211 → скидка
    const prize = generateSinglePrize(1960, ['discount']);
    expect(isDiscount(prize)).toBe(true);
  });

  it('после денежного приза вероятнее всего деталь', () => {
    // alreadyGiven=['money']: вес денег 0.175→0.035, сумма весов 0.86, деталь < 0.6105
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    expect(isPart(generateSinglePrize(1960, ['money']))).toBe(true);
  });

  it('после денежного приза возможна и скидка', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.8); // >= 0.6512 → скидка
    expect(isDiscount(generateSinglePrize(1960, ['money']))).toBe(true);
  });

  it('повтор детали не штрафуется — alreadyGiven с деталью не меняет веса', () => {
    // 0.8 без alreadyGiven — скидка; с ['part'] пороги те же — снова скидка
    vi.spyOn(Math, 'random').mockReturnValue(0.75);
    expect(isDiscount(generateSinglePrize(1960, ['part']))).toBe(true);
  });

  it('distribution is roughly 70/30 over many calls', () => {
    vi.restoreAllMocks(); // use real random
    let parts = 0;
    let discounts = 0;
    let money = 0;
    const N = 1000;
    for (let i = 0; i < N; i++) {
      const prize = generateSinglePrize(1980);
      if (isDiscount(prize)) discounts++;
      else if (isMoneyPrize(prize)) money++;
      else parts++;
    }
    // 70% «детальной» ветки, из них ~25% заменяются деньгами: ~52.5% деталей, ~17.5% денег
    expect(parts / N).toBeGreaterThan(0.45);
    expect(parts / N).toBeLessThan(0.60);
    // 30% скидок ± 5%
    expect(discounts / N).toBeGreaterThan(0.20);
    expect(discounts / N).toBeLessThan(0.40);
    // деньги: только суммы 12000 и 17000
    expect(money / N).toBeGreaterThan(0.10);
    expect(money / N).toBeLessThan(0.25);
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

  it('антиповтор: две скидки в паре призов выпадают редко (было ~9%)', () => {
    let both = 0;
    let pairs = 0;
    const N = 1000;
    for (let i = 0; i < N; i++) {
      const prizes = generatePrizesForPlayer(1, 8, 1980); // 1 место — 2 приза
      if (prizes.length === 2) {
        pairs++;
        if (isDiscount(prizes[0]) && isDiscount(prizes[1])) both++;
      }
    }
    expect(pairs).toBeGreaterThan(900);
    // Вес повтора снижен в 5 раз: P(обе скидки) ≈ 2.4% против 9% при независимых бросках
    expect(both / pairs).toBeLessThan(0.06);
  });

  it('антиповтор: после денежного приза вторым чаще деталь или скидка', () => {
    let moneyThenMoney = 0;
    let moneyPairs = 0;
    const N = 1000;
    for (let i = 0; i < N; i++) {
      const prizes = generatePrizesForPlayer(1, 8, 1980);
      if (prizes.length === 2 && isMoneyPrize(prizes[0])) {
        moneyPairs++;
        if (isMoneyPrize(prizes[1])) moneyThenMoney++;
      }
    }
    if (moneyPairs > 50) {
      // P(деньги|деньги) ≈ 0.035/0.86 ≈ 4.1% против 17.5% при независимых бросках
      expect(moneyThenMoney / moneyPairs).toBeLessThan(0.15);
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
