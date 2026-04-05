import { Part, PrizeDiscount } from '../types';
import { SHOPS, BONUS_PARTS, getRewards } from '../constants';

const DEALERS = ['АЛЬФА', 'БЕТА', 'ГАММА', 'ДЕЛЬТА'];

export function getMaxShopTier(currentYear: number): number {
  let maxTier = 1;
  for (const shop of SHOPS) {
    if (shop.unlockYear <= currentYear) {
      for (const part of shop.parts) {
        if (part.tier && part.tier > maxTier) maxTier = part.tier;
      }
    }
  }
  return maxTier;
}

export function getPrizeTier(currentYear: number): number {
  return Math.min(getMaxShopTier(currentYear) + 1, 4);
}

function getAllPartsOfTier(tier: number): Part[] {
  if (tier === 4) return [...BONUS_PARTS];
  const parts: Part[] = [];
  for (const shop of SHOPS) {
    for (const part of shop.parts) {
      if (part.tier === tier) parts.push(part);
    }
  }
  return parts;
}

export function generateSinglePrize(currentYear: number): Part | PrizeDiscount {
  const roll = Math.random();
  if (roll < 0.7) {
    // Prize Part
    const tier = getPrizeTier(currentYear);
    const pool = getAllPartsOfTier(tier);
    if (pool.length === 0) {
      // Fallback to BONUS_PARTS
      const fallback = BONUS_PARTS.length > 0 ? BONUS_PARTS : getAllPartsOfTier(tier - 1);
      const picked = fallback[Math.floor(Math.random() * fallback.length)];
      return { ...picked, id: `prize-part-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, price: 0 };
    }
    const picked = pool[Math.floor(Math.random() * pool.length)];
    return { ...picked, id: `prize-part-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, price: 0 };
  } else {
    // Prize Discount
    const dealer = DEALERS[Math.floor(Math.random() * DEALERS.length)];
    return {
      id: `prize-discount-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'discount' as const,
      dealer,
      discount: 15,
      name: `Скидка 15% — ${dealer}`,
      icon: '🏷️',
    };
  }
}

export function generatePrizesForPlayer(
  position: number,
  playerCount: number,
  currentYear: number
): (Part | PrizeDiscount)[] {
  const rewards = getRewards(playerCount);
  const bonusTable = (rewards as any).worldBonus;
  if (!bonusTable) return [];
  const entry = bonusTable.find((r: any) => r.place === position);
  if (!entry || !entry.prizes || entry.prizes <= 0) return [];
  const prizes: (Part | PrizeDiscount)[] = [];
  for (let i = 0; i < entry.prizes; i++) {
    prizes.push(generateSinglePrize(currentYear));
  }
  return prizes;
}

export function generatePrizesForRace(
  results: { carId: string; position: number }[],
  playerCount: number,
  currentYear: number
): Map<string, (Part | PrizeDiscount)[]> {
  const prizeMap = new Map<string, (Part | PrizeDiscount)[]>();
  for (const r of results) {
    const prizes = generatePrizesForPlayer(r.position, playerCount, currentYear);
    if (prizes.length > 0) {
      prizeMap.set(r.carId, prizes);
    }
  }
  return prizeMap;
}
