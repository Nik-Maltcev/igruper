import { Part, PrizeDiscount } from '../types';
import { SHOPS, BONUS_PARTS, getRewards } from '../constants';

const DEALERS = ['\u0410\u041b\u042c\u0424\u0410', '\u0411\u0415\u0422\u0410', '\u0413\u0410\u041c\u041c\u0410', '\u0414\u0415\u041b\u042c\u0422\u0410'];

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
function getPartBaseName(name: string): string {
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

export function generateSinglePrize(currentYear: number): Part | PrizeDiscount {
  const roll = Math.random();
  if (roll < 0.7) {
    // Prize Part: pick a random unlocked part, then find it one tier higher
    const unlocked = getUnlockedParts(currentYear);
    if (unlocked.length === 0) {
      // Fallback: random bonus part
      if (BONUS_PARTS.length > 0) {
        const picked = BONUS_PARTS[Math.floor(Math.random() * BONUS_PARTS.length)];
        return { ...picked, id: `prize-part-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, price: 0 };
      }
    }

    // Try up to 10 times to find a part with a next tier available
    for (let attempt = 0; attempt < 10; attempt++) {
      const sourcePart = unlocked[Math.floor(Math.random() * unlocked.length)];
      const baseName = getPartBaseName(sourcePart.name);
      const tier = sourcePart.tier || 1;
      const nextTierPart = findNextTierPart(baseName, tier);
      if (nextTierPart) {
        return { ...nextTierPart, id: `prize-part-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, price: 0 };
      }
    }

    // Fallback: if no next tier found, give a random unlocked part as prize
    const fallback = unlocked[Math.floor(Math.random() * unlocked.length)];
    return { ...fallback, id: `prize-part-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, price: 0 };
  } else {
    // Prize Discount
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
