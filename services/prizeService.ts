import { Part, PrizeDiscount, Prize } from '../types';
import { SHOPS, BONUS_PARTS, getRewards } from '../constants';

const DEALERS = ['\u0410\u041b\u042c\u0424\u0410', '\u0411\u0415\u0422\u0410', '\u0413\u0410\u041c\u041c\u0410', '\u0414\u0415\u041b\u042c\u0422\u0410'];

// Вместо детали может случайно достаться денежный приз.
// Шанс замены внутри «детальной» ветки (70% всех призов) и размеры приза
const MONEY_INSTEAD_OF_PART_CHANCE = 0.25;
const MONEY_PRIZE_AMOUNTS = [12000, 17000];

// Базовые доли типов призов: деталь 52.5%, денежный приз 17.5%, скидка 30%
// (детальная ветка — 70% призов, из них 25% заменяется деньгами).
// В наборе призов одного игрока повтор одного и того же редкого типа
// (скидка после скидки, деньги после денег) маловероятен: вес повтора
// умножается на REPEAT_PENALTY. Поэтому если первый приз — скидка, то
// второй почти наверняка деталь (или деньги); если первый — деньги, то
// второй деталь или скидка. Две детали — нормальная ситуация, вес
// детали не штрафуется.
export type PrizeKind = 'part' | 'money' | 'discount';

const BASE_WEIGHTS: Record<PrizeKind, number> = {
  part: 0.7 * (1 - MONEY_INSTEAD_OF_PART_CHANCE),
  money: 0.7 * MONEY_INSTEAD_OF_PART_CHANCE,
  discount: 0.3,
};
const REPEAT_PENALTY = 0.2;

export function getPrizeKind(p: Prize): PrizeKind {
  if ('type' in p && p.type === 'money') return 'money';
  if ('type' in p && p.type === 'discount') return 'discount';
  return 'part';
}

// Get all parts from unlocked shops for the current year
function getUnlockedParts(currentYear: number): Part[] {
  const parts: Part[] = [];
  for (const shop of SHOPS) {
    if (shop.unlockYear <= currentYear) {
      for (const part of shop.parts) {
        parts.push(part);
      }
    }
  }
  return parts;
}

// Get the base name of a part (strip tier number suffix)
export function getPartBaseName(name: string): string {
  return name.replace(/\s*\d+\s*$/, '').trim().toLowerCase();
}

// Find a part with the same base name but one tier higher
function findNextTierPart(baseName: string, currentTier: number): Part | null {
  const targetTier = currentTier + 1;
  if (targetTier === 4) {
    // Look in BONUS_PARTS
    return BONUS_PARTS.find(p => getPartBaseName(p.name) === baseName) || null;
  }
  // Look in ALL shops (including locked ones) for the next tier
  for (const shop of SHOPS) {
    for (const part of shop.parts) {
      if (part.tier === targetTier && getPartBaseName(part.name) === baseName) {
        return part;
      }
    }
  }
  return null;
}

function generateMoneyPrize(): Prize {
  const amount = MONEY_PRIZE_AMOUNTS[Math.floor(Math.random() * MONEY_PRIZE_AMOUNTS.length)];
  return {
    id: `prize-money-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: 'money' as const,
    amount,
    name: `Денежный приз $${amount.toLocaleString('ru-RU')}`,
    icon: '💰',
  };
}

function generateDiscountPrize(): Prize {
  const dealer = DEALERS[Math.floor(Math.random() * DEALERS.length)];
  return {
    id: `prize-discount-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: 'discount' as const,
    dealer,
    discount: 15,
    name: `\u0421\u043a\u0438\u0434\u043a\u0430 15% \u2014 ${dealer}`,
    icon: '\uD83C\uDFF7\uFE0F',
  };
}

function generatePartPrize(currentYear: number): Prize {
  // Prize Part: pick a random base part name, find max unlocked tier for THAT part, give +1
  const unlocked = getUnlockedParts(currentYear);
  if (unlocked.length === 0) {
    if (BONUS_PARTS.length > 0) {
      const picked = BONUS_PARTS[Math.floor(Math.random() * BONUS_PARTS.length)];
      return { ...picked, id: `prize-part-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, price: 0 };
    }
  }

  // Collect unique base names from unlocked parts
  const baseNames = [...new Set(unlocked.map(p => getPartBaseName(p.name)))];

  // Try up to 10 times to find a valid prize
  for (let attempt = 0; attempt < 10; attempt++) {
    const chosenBase = baseNames[Math.floor(Math.random() * baseNames.length)];
    // Find max tier of THIS specific part among unlocked shops
    let maxTierForPart = 0;
    for (const p of unlocked) {
      if (getPartBaseName(p.name) === chosenBase && (p.tier || 1) > maxTierForPart) {
        maxTierForPart = p.tier || 1;
      }
    }
    // Prize = this part at maxTier + 1
    const nextTierPart = findNextTierPart(chosenBase, maxTierForPart);
    if (nextTierPart) {
      return { ...nextTierPart, id: `prize-part-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, price: 0 };
    }
  }

  // Fallback
  const fallback = unlocked[Math.floor(Math.random() * unlocked.length)];
  return { ...fallback, id: `prize-part-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, price: 0 };
}

// alreadyGiven — типы призов, уже выпавших этому игроку в текущем наборе.
// Повтор редкого типа (скидка/деньги) становится маловероятным,
// деталь всегда остаётся самым вероятным исходом.
export function generateSinglePrize(currentYear: number, alreadyGiven: PrizeKind[] = []): Prize {
  const w = { ...BASE_WEIGHTS };
  for (const kind of alreadyGiven) {
    if (kind !== 'part') w[kind] *= REPEAT_PENALTY;
  }
  const total = w.part + w.money + w.discount;
  const roll = Math.random();
  if (roll < w.part / total) {
    return generatePartPrize(currentYear);
  }
  if (roll < (w.part + w.money) / total) {
    return generateMoneyPrize();
  }
  return generateDiscountPrize();
}

export function generatePrizesForPlayer(
  position: number,
  playerCount: number,
  currentYear: number
): Prize[] {
  const rewards = getRewards(playerCount);
  const bonusTable = (rewards as any).worldBonus;
  if (!bonusTable) return [];
  const entry = bonusTable.find((r: any) => r.place === position);
  if (!entry || !entry.prizes || entry.prizes <= 0) return [];
  const prizes: Prize[] = [];
  const kinds: PrizeKind[] = [];
  for (let i = 0; i < entry.prizes; i++) {
    const prize = generateSinglePrize(currentYear, kinds);
    prizes.push(prize);
    kinds.push(getPrizeKind(prize));
  }
  return prizes;
}

export function generatePrizesForRace(
  results: { carId: string; position: number }[],
  playerCount: number,
  currentYear: number
): Map<string, Prize[]> {
  const prizeMap = new Map<string, Prize[]>();
  for (const r of results) {
    const prizes = generatePrizesForPlayer(r.position, playerCount, currentYear);
    if (prizes.length > 0) {
      prizeMap.set(r.carId, prizes);
    }
  }
  return prizeMap;
}
