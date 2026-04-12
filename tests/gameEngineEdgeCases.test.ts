import { describe, it, expect, vi, afterEach } from 'vitest';
import { getEffectiveStats, simulateRace } from '../services/gameEngine';
import { Car, Track, Part } from '../types';

function makeCar(overrides: Partial<Car> = {}): Car {
  return {
    id: 'car-1', name: 'Test', image: '', price: 10000, color: '#333',
    stats: { power: 100, torque: 150, topSpeed: 200, acceleration: 8, handling: 50, offroad: 30 },
    installedParts: [],
    ...overrides,
  };
}

function makePart(overrides: Partial<Part> = {}): Part {
  return { id: 'p1', name: 'Part', boosts: {}, price: 500, icon: '🔧', ...overrides };
}

const TRACK: Track = {
  id: 't1', name: 'Test', image: '', description: '',
  weights: { power: 0.2, torque: 0.2, topSpeed: 0.2, acceleration: 0.2, handling: 0.1, offroad: 0.1 },
  weatherModifier: 0.5,
};

describe('getEffectiveStats edge cases', () => {
  it('handles very high topSpeedPct approaching 450 ceiling', () => {
    const car = makeCar({
      stats: { power: 100, torque: 150, topSpeed: 440, acceleration: 8, handling: 50, offroad: 30 },
      installedParts: [makePart({ boosts: { topSpeedPct: 50 } })],
    });
    const stats = getEffectiveStats(car);
    // ((450-440)*50/100)*1 + 440 = 5 + 440 = 445
    expect(stats.topSpeed).toBe(445);
  });

  it('topSpeedPct at exactly 450 gives no boost', () => {
    const car = makeCar({
      stats: { power: 100, torque: 150, topSpeed: 450, acceleration: 8, handling: 50, offroad: 30 },
      installedParts: [makePart({ boosts: { topSpeedPct: 50 } })],
    });
    const stats = getEffectiveStats(car);
    // ((450-450)*50/100)*1 + 450 = 0 + 450 = 450
    expect(stats.topSpeed).toBe(450);
  });

  it('handles zero coefficient (no boost applied)', () => {
    const car = makeCar({
      coefficients: { power: 0, torque: 1, topSpeed: 1, acceleration: 1, handling: 1, offroad: 1 },
      installedParts: [makePart({ boosts: { power: 50 } })],
    });
    const stats = getEffectiveStats(car);
    // 100 + 50*0 = 100
    expect(stats.power).toBe(100);
  });

  it('handles very large coefficient', () => {
    const car = makeCar({
      coefficients: { power: 3, torque: 1, topSpeed: 1, acceleration: 1, handling: 1, offroad: 1 },
      installedParts: [makePart({ boosts: { power: 10 } })],
    });
    const stats = getEffectiveStats(car);
    // 100 + 10*3 = 130
    expect(stats.power).toBe(130);
  });

  it('stacks 5 parts correctly', () => {
    const parts = Array.from({ length: 5 }, (_, i) =>
      makePart({ id: `p${i}`, boosts: { power: 10 } })
    );
    const car = makeCar({ installedParts: parts });
    const stats = getEffectiveStats(car);
    expect(stats.power).toBe(150); // 100 + 5*10
  });

  it('handles mixed absolute and percentage boosts on same part', () => {
    const car = makeCar({
      installedParts: [makePart({ boosts: { power: 50, powerPct: 10 } })],
    });
    const stats = getEffectiveStats(car);
    // Step 1: 100 + 50 = 150 (absolute)
    // Step 2: 150 * (1 + 10/100) = 150 * 1.1 = 165 (percentage)
    expect(stats.power).toBe(165);
  });

  it('accelerationPct with high value does not go below minimum', () => {
    const car = makeCar({
      stats: { power: 100, torque: 150, topSpeed: 200, acceleration: 0.1, handling: 50, offroad: 30 },
      installedParts: [makePart({ boosts: { accelerationPct: 99 } })],
    });
    const stats = getEffectiveStats(car);
    // 0.1 * (1 - 99/100) = 0.1 * 0.01 = 0.001 → clamped to 0.01
    expect(stats.acceleration).toBeGreaterThanOrEqual(0.01);
  });

  it('handles part with all zero boosts', () => {
    const car = makeCar({
      installedParts: [makePart({ boosts: { power: 0, torque: 0, topSpeed: 0, handling: 0, offroad: 0 } })],
    });
    const stats = getEffectiveStats(car);
    expect(stats.power).toBe(100);
    expect(stats.torque).toBe(150);
  });

  it('handles part with empty boosts object', () => {
    const car = makeCar({
      installedParts: [makePart({ boosts: {} })],
    });
    const stats = getEffectiveStats(car);
    expect(stats.power).toBe(100);
  });
});

describe('simulateRace edge cases', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('handles single car race', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const car = makeCar();
    const results = simulateRace([car], TRACK, 'SUNNY', false);
    expect(results).toHaveLength(1);
    expect(results[0].position).toBe(1);
  });

  it('handles empty car array (bots only)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const results = simulateRace([], TRACK, 'SUNNY', true);
    // Should have 4 bots
    expect(results).toHaveLength(4);
  });

  it('handles empty car array with no bots', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const results = simulateRace([], TRACK, 'SUNNY', false);
    expect(results).toHaveLength(0);
  });

  it('SUNNY weather has no penalty', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const car = makeCar({ roadType: 'С' });
    const results = simulateRace([car], TRACK, 'SUNNY', false);
    // No weather penalty in sunny
    expect(results[0].time).toBeGreaterThan(0);
  });

  it('car with no roadType defaults to У (universal)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const car = makeCar({ roadType: undefined });
    const rainResults = simulateRace([car], TRACK, 'RAIN', false);
    // Universal tires: 10% penalty in rain
    const carWithU = makeCar({ roadType: 'У' });
    const uResults = simulateRace([carWithU], TRACK, 'RAIN', false);
    expect(rainResults[0].time).toBe(uResults[0].time);
  });

  it('rewardTable with no matching position gives 0 earnings', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const car = makeCar();
    const rewardTable = [{ place: 99, money: 1000, points: 10, prizes: 0 }];
    const results = simulateRace([car], TRACK, 'SUNNY', false, rewardTable);
    expect(results[0].earnings).toBe(0);
    expect(results[0].points).toBe(0);
  });

  it('many cars race produces correct number of results', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const cars = Array.from({ length: 10 }, (_, i) =>
      makeCar({ id: `car-${i}`, stats: { power: 100 + i * 50, torque: 150, topSpeed: 200, acceleration: 8, handling: 50, offroad: 30 } })
    );
    const results = simulateRace(cars, TRACK, 'SUNNY', false);
    expect(results).toHaveLength(10);
    // Positions should be 1-10
    const positions = results.map(r => r.position);
    expect(Math.min(...positions)).toBe(1);
  });

  it('acceleration score: lower acceleration time = better score', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const fastAccel = makeCar({ id: 'fast', stats: { power: 200, torque: 200, topSpeed: 200, acceleration: 3, handling: 50, offroad: 30 } });
    const slowAccel = makeCar({ id: 'slow', stats: { power: 200, torque: 200, topSpeed: 200, acceleration: 15, handling: 50, offroad: 30 } });
    const results = simulateRace([fastAccel, slowAccel], TRACK, 'SUNNY', false);
    const fastResult = results.find(r => r.carId === 'fast')!;
    const slowResult = results.find(r => r.carId === 'slow')!;
    expect(fastResult.time).toBeLessThan(slowResult.time);
  });

  it('шипованные tire name maps to offroad (В)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const car = makeCar({
      id: 'test',
      roadType: 'С',
      installedParts: [makePart({ slot: 'tires', name: 'Шипованные зимние', boosts: {} })],
    });
    // Should use В tire type (offroad/шипов)
    const rainResults = simulateRace([car], TRACK, 'RAIN', false);
    // Compare with explicit В car
    const vCar = makeCar({ id: 'v', roadType: 'В' });
    const vResults = simulateRace([vCar], TRACK, 'RAIN', false);
    // Times should be similar (both В penalty)
    expect(Math.abs(rainResults[0].time - vResults[0].time)).toBeLessThan(1);
  });

  it('универсальные tire name maps to У', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const car = makeCar({
      id: 'test',
      roadType: 'С',
      installedParts: [makePart({ slot: 'tires', name: 'Универсальные шины', boosts: {} })],
    });
    const rainResults = simulateRace([car], TRACK, 'RAIN', false);
    const uCar = makeCar({ id: 'u', roadType: 'У' });
    const uResults = simulateRace([uCar], TRACK, 'RAIN', false);
    expect(Math.abs(rainResults[0].time - uResults[0].time)).toBeLessThan(1);
  });
});
