import { Car, Part, Track } from './types';
import carsDataRaw from './cars_data.json';
import racesDataRaw from './races_data.json';
import shopsDataRaw from './shops_data.json';
import rewardsDataRaw from './rewards_data.json';

export const INITIAL_MONEY = 15000;

// Загружаем машины из спарсенного JSON, добавляем runtime-поля
export const AVAILABLE_CARS: Car[] = carsDataRaw.map((c: any) => ({
  ...c,
  color: '#333',
  installedParts: [],
}));

// Загружаем магазины и детали из shops_data.json
export interface ShopInfo {
  brand: string;
  unlockYear: number;
  parts: Part[];
}

export const SHOPS: ShopInfo[] = (shopsDataRaw as any).shops
  .filter((s: any) => s.unlockYear < 9999)
  .map((s: any) => ({
    brand: s.brand,
    unlockYear: s.unlockYear,
    parts: s.parts.map((p: any) => ({ ...p, boosts: p.boosts || {} })),
  }));

// Все детали из всех магазинов (плоский список)
export const SHOP_PARTS: Part[] = SHOPS.flatMap(s => s.parts);

// Бонусные детали 4 уровня (выдаются за достижения)
export const BONUS_PARTS: Part[] = ((shopsDataRaw as any).shops
  .find((s: any) => s.unlockYear === 9999)?.parts || [])
  .map((p: any) => ({ ...p, boosts: p.boosts || {} }));

export const TRACKS: Track[] = [
  { id: 't1', name: 'Ночной Драг', image: 'https://picsum.photos/800/400?grayscale', description: 'Прямая трасса, где решает чистая скорость.',
    weights: { power: 0.3, torque: 0.15, topSpeed: 0.35, acceleration: 0.15, handling: 0.05, offroad: 0 }, weatherModifier: 0.2 },
  { id: 't2', name: 'Тоге Дрифт', image: 'https://picsum.photos/800/400?blur=2', description: 'Узкие повороты на горном перевале.',
    weights: { power: 0.1, torque: 0.1, topSpeed: 0.1, acceleration: 0.15, handling: 0.5, offroad: 0.05 }, weatherModifier: 0.8 },
  { id: 't3', name: 'Грунтовое Ралли', image: 'https://picsum.photos/800/400?sepia', description: 'Грязь, трамплины и гравий.',
    weights: { power: 0.15, torque: 0.15, topSpeed: 0.1, acceleration: 0.1, handling: 0.15, offroad: 0.35 }, weatherModifier: 1.0 },
];

export const MOCK_OPPONENTS: Car[] = [
  { id: 'bot1', name: 'Гонщик Джо', image: '', price: 0, color: '#fca5a5',
    stats: { power: 80, torque: 120, topSpeed: 120, acceleration: 18, handling: 30, offroad: 50 }, installedParts: [], tags: ['Бот'] },
  { id: 'bot2', name: 'Королева Скорости', image: '', price: 0, color: '#93c5fd',
    stats: { power: 300, torque: 400, topSpeed: 200, acceleration: 8, handling: 60, offroad: 20 }, installedParts: [], tags: ['Бот'] },
  { id: 'bot3', name: 'Король Дрифта', image: '', price: 0, color: '#d8b4fe',
    stats: { power: 250, torque: 350, topSpeed: 180, acceleration: 9, handling: 100, offroad: 20 }, installedParts: [], tags: ['Бот'] },
  { id: 'bot4', name: 'Чемпион Мира', image: '', price: 0, color: '#ffd700',
    stats: { power: 600, torque: 700, topSpeed: 320, acceleration: 3.5, handling: 140, offroad: 30 }, installedParts: [], tags: ['Бот'] },
];

// Генерируем эпохи из данных машин
const yearsSet = new Set(carsDataRaw.map((c: any) => c.year).filter(Boolean));
export const EPOCHS = Array.from(yearsSet).sort((a: any, b: any) => a - b).map((y: any) => ({ year: y, label: String(y) }));

export const getUnlockedBrands = (currentYear: number): Set<string> => {
  return new Set(SHOPS.filter(s => s.unlockYear <= currentYear).map(s => s.brand));
};

// Данные гонок
export const RACES_DATA = racesDataRaw as any;

// Данные наград по количеству игроков
export interface RewardEntry {
  place: number;
  money: number;
  points: number;
  prizes: number;
}

export interface RewardsForPlayerCount {
  city: RewardEntry[];
  national: RewardEntry[];
  worldSaturday: RewardEntry[];
  worldBonus: RewardEntry[];
  worldMain: RewardEntry[];
  tournament: RewardEntry[];
  worldSaturdayEntryFee?: number;
}

export const REWARDS_DATA: Record<string, RewardsForPlayerCount> = rewardsDataRaw as any;

// Получить награды для конкретного количества игроков
export function getRewards(playerCount: number): RewardsForPlayerCount {
  const clamped = Math.max(3, Math.min(8, playerCount));
  return REWARDS_DATA[String(clamped)] || REWARDS_DATA['3'];
}
