import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getEffectiveStats, simulateRace } from '../services/gameEngine';
import { Car, Track, Part } from '../types';

// ─── Helpers ───

function makeCar(overrides: Partial<Car> = {}): Car {
  return {
    id: 'car-1',
    name: 'Test Car',
    image: '',
    price: 10000,
    color: '#333',
    stats: { power: 100, torque: 150, topSpeed: 200, acceleration: 8, handling: 50, offroad: 30 },
    installedParts: [],
    ...overrides,
  };
}

function makePart(overrides: Partial<Part> = {}): Part {
  return {
    id: 'part-1',
    name: 'Test Part',
    boosts: {},
    price: 500,
    icon: '🔧',
    ...overrides,
  };
}

const DRAG_TRACK: Track = {
  id: 't1', name: 'Drag', image: '', description: '',
  weights: { power: 0.3, torque: 0.15, topSpeed: 0.35, acceleration: 0.15, handling: 0.05, offroad: 0 },
  weatherModifier: 0.2,
};

const DRIFT_TRACK: Track = {
  id: 't2', name: 'Drift', image: '', description: '',
  weights: { power: 0.1, torque: 0.1, topSpeed: 0.1, acceleration: 0.15, handling: 0.5, offroad: 0.05 },
  weatherModifier: 0.8,
};

const RALLY_TRACK: Track = {
  id: 't3', name: 'Rally', image: '', description: '',
  weights: { power: 0.15, torque: 0.15, topSpeed: 0.1, acceleration: 0.1, handling: 0.15, offroad: 0.35 },
  weatherModifier: 1.0,
};

// ═══════════════════════════════════════════════════════
// getEffectiveStats
// ═══════════════════════════════════════════════════════

describe('getEffectiveStats', () => {

  it('returns base stats when no parts installed', () => {
    const car = makeCar();
    const stats = getEffectiveStats(car);
    expect(stats.power).toBe(100);
    expect(stats.torque).toBe(150);
    expect(stats.topSpeed).toBe(200);
    expect(stats.acceleration).toBe(8);
    expect(stats.handling).toBe(50);
    expect(stats.offroad).toBe(30);
  });

  it('applies absolute power boost', () => {
    const car = makeCar({
      installedParts: [makePart({ boosts: { power: 20 } })],
    });
    const stats = getEffectiveStats(car);
    expect(stats.power).toBe(120); // 100 + 20*1
  });

  it('applies absolute torque boost', () => {
    const car = makeCar({
      installedParts: [makePart({ boosts: { torque: 30 } })],
    });
    const stats = getEffectiveStats(car);
    expect(stats.torque).toBe(180); // 150 + 30*1
  });

  it('applies absolute topSpeed boost', () => {
    const car = makeCar({
      installedParts: [makePart({ boosts: { topSpeed: 15 } })],
    });
    const stats = getEffectiveStats(car);
    expect(stats.topSpeed).toBe(215); // 200 + 15*1
  });

  it('applies absolute handling boost', () => {
    const car = makeCar({
      installedParts: [makePart({ boosts: { handling: 10 } })],
    });
    const stats = getEffectiveStats(car);
    expect(stats.handling).toBe(60);
  });

  it('applies absolute offroad boost', () => {
    const car = makeCar({
      installedParts: [makePart({ boosts: { offroad: 5 } })],
    });
    const stats = getEffectiveStats(car);
    expect(stats.offroad).toBe(35);
  });

  it('applies percentage power boost (powerPct)', () => {
    const car = makeCar({
      installedParts: [makePart({ boosts: { powerPct: 10 } })],
    });
    const stats = getEffectiveStats(car);
    // 100 * (1 + 10*1/100) = 100 * 1.1 = 110
    expect(stats.power).toBe(110);
  });

  it('applies percentage torque boost (torquePct)', () => {
    const car = makeCar({
      installedParts: [makePart({ boosts: { torquePct: 20 } })],
    });
    const stats = getEffectiveStats(car);
    // 150 * (1 + 20*1/100) = 150 * 1.2 = 180
    expect(stats.torque).toBe(180);
  });

  it('applies topSpeedPct with special formula V = ((450-X)*P/100)*K + X', () => {
    const car = makeCar({
      installedParts: [makePart({ boosts: { topSpeedPct: 10 } })],
    });
    const stats = getEffectiveStats(car);
    // X=200, P=10, K=1 → ((450-200)*10/100)*1 + 200 = 25 + 200 = 225
    expect(stats.topSpeed).toBe(225);
  });

  it('applies accelerationPct (positive = improvement = lower seconds)', () => {
    const car = makeCar({
      installedParts: [makePart({ boosts: { accelerationPct: 10 } })],
    });
    const stats = getEffectiveStats(car);
    // 8 * (1 - 10*1/100) = 8 * 0.9 = 7.2
    expect(stats.acceleration).toBe(7.2);
  });

  it('applies coefficients to absolute boosts', () => {
    const car = makeCar({
      coefficients: { power: 1.5, torque: 0.8, topSpeed: 1, acceleration: 1, handling: 1, offroad: 1 },
      installedParts: [makePart({ boosts: { power: 20, torque: 30 } })],
    });
    const stats = getEffectiveStats(car);
    expect(stats.power).toBe(130); // 100 + 20*1.5 = 130
    expect(stats.torque).toBe(174); // 150 + 30*0.8 = 174
  });

  it('applies coefficients to percentage boosts', () => {
    const car = makeCar({
      coefficients: { power: 1.5, torque: 1, topSpeed: 2, acceleration: 0.5, handling: 1, offroad: 1 },
      installedParts: [makePart({ boosts: { powerPct: 10, topSpeedPct: 10, accelerationPct: 10 } })],
    });
    const stats = getEffectiveStats(car);
    // power: 100 * (1 + 10*1.5/100) = 100 * 1.15 = 115
    expect(stats.power).toBe(115);
    // topSpeed: ((450-200)*10/100)*2 + 200 = 50 + 200 = 250
    expect(stats.topSpeed).toBe(250);
    // acceleration: 8 * (1 - 10*0.5/100) = 8 * 0.95 = 7.6
    expect(stats.acceleration).toBe(7.6);
  });

  it('stacks multiple parts sequentially', () => {
    const car = makeCar({
      installedParts: [
        makePart({ boosts: { power: 20 } }),
        makePart({ boosts: { power: 30 } }),
      ],
    });
    const stats = getEffectiveStats(car);
    expect(stats.power).toBe(150); // 100 + 20 + 30
  });

  it('stacks absolute then percentage boost correctly', () => {
    const car = makeCar({
      installedParts: [
        makePart({ boosts: { power: 50 } }),       // 100 + 50 = 150
        makePart({ boosts: { powerPct: 10 } }),     // 150 * 1.1 = 165
      ],
    });
    const stats = getEffectiveStats(car);
    expect(stats.power).toBe(165);
  });

  it('stacks percentage then absolute boost correctly', () => {
    const car = makeCar({
      installedParts: [
        makePart({ boosts: { powerPct: 10 } }),     // 100 * 1.1 = 110
        makePart({ boosts: { power: 50 } }),         // 110 + 50 = 160
      ],
    });
    const stats = getEffectiveStats(car);
    expect(stats.power).toBe(160);
  });

  it('enforces minimum values', () => {
    const car = makeCar({
      stats: { power: 5, torque: 5, topSpeed: 15, acceleration: 0.5, handling: 2, offroad: 2 },
      installedParts: [makePart({ boosts: { power: -100, torque: -100, topSpeed: -100, handling: -100, offroad: -100 } })],
    });
    const stats = getEffectiveStats(car);
    expect(stats.power).toBeGreaterThanOrEqual(1);
    expect(stats.torque).toBeGreaterThanOrEqual(1);
    expect(stats.topSpeed).toBeGreaterThanOrEqual(10);
    expect(stats.acceleration).toBeGreaterThanOrEqual(0.01);
    expect(stats.handling).toBeGreaterThanOrEqual(0);
    expect(stats.offroad).toBeGreaterThanOrEqual(0);
  });

  it('rounds stats to integers (except acceleration to 2 decimals)', () => {
    const car = makeCar({
      installedParts: [makePart({ boosts: { power: 3, torque: 7 } })],
      coefficients: { power: 1.3, torque: 1.3, topSpeed: 1, acceleration: 1, handling: 1, offroad: 1 },
    });
    const stats = getEffectiveStats(car);
    // power: 100 + 3*1.3 = 103.9 → 104
    expect(stats.power).toBe(104);
    // torque: 150 + 7*1.3 = 159.1 → 159
    expect(stats.torque).toBe(159);
    expect(Number.isInteger(stats.power)).toBe(true);
    expect(Number.isInteger(stats.torque)).toBe(true);
    expect(Number.isInteger(stats.topSpeed)).toBe(true);
    expect(Number.isInteger(stats.handling)).toBe(true);
    expect(Number.isInteger(stats.offroad)).toBe(true);
  });

  it('handles car with no coefficients (defaults to 1)', () => {
    const car = makeCar({ coefficients: undefined });
    car.installedParts = [makePart({ boosts: { power: 10, powerPct: 10 } })];
    const stats = getEffectiveStats(car);
    // power: (100 + 10*1) = 110, then 110 * (1 + 10*1/100) = 110 * 1.1 = 121
    expect(stats.power).toBe(121);
  });

  it('handles empty installedParts array', () => {
    const car = makeCar({ installedParts: [] });
    const stats = getEffectiveStats(car);
    expect(stats).toEqual({
      power: 100, torque: 150, topSpeed: 200, acceleration: 8, handling: 50, offroad: 30,
    });
  });

  it('applies combined boosts from a single part', () => {
    const car = makeCar({
      installedParts: [makePart({
        boosts: { power: 10, torque: 20, topSpeed: 5, handling: 8, offroad: 3 },
      })],
    });
    const stats = getEffectiveStats(car);
    expect(stats.power).toBe(110);
    expect(stats.torque).toBe(170);
    expect(stats.topSpeed).toBe(205);
    expect(stats.handling).toBe(58);
    expect(stats.offroad).toBe(33);
  });
});

// ═══════════════════════════════════════════════════════
// simulateRace
// ═══════════════════════════════════════════════════════

describe('simulateRace', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // luck = 0.5*10-5 = 0
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns results sorted by time (fastest first)', () => {
    const fast = makeCar({ id: 'fast', stats: { power: 500, torque: 600, topSpeed: 300, acceleration: 3, handling: 100, offroad: 50 } });
    const slow = makeCar({ id: 'slow', stats: { power: 50, torque: 60, topSpeed: 100, acceleration: 15, handling: 20, offroad: 10 } });
    const results = simulateRace([fast, slow], DRAG_TRACK, 'SUNNY', false);
    expect(results[0].carId).toBe('fast');
    expect(results[1].carId).toBe('slow');
    expect(results[0].time).toBeLessThan(results[1].time);
  });

  it('assigns correct positions', () => {
    const cars = [
      makeCar({ id: 'a', stats: { power: 300, torque: 400, topSpeed: 250, acceleration: 5, handling: 80, offroad: 40 } }),
      makeCar({ id: 'b', stats: { power: 100, torque: 150, topSpeed: 150, acceleration: 10, handling: 40, offroad: 20 } }),
    ];
    const results = simulateRace(cars, DRAG_TRACK, 'SUNNY', false);
    expect(results[0].position).toBe(1);
    expect(results[1].position).toBe(2);
  });

  it('assigns default rewards when no rewardTable provided', () => {
    const cars = Array.from({ length: 6 }, (_, i) =>
      makeCar({ id: `car-${i}`, stats: { power: 500 - i * 80, torque: 500 - i * 80, topSpeed: 300 - i * 40, acceleration: 3 + i * 2, handling: 100 - i * 15, offroad: 50 - i * 8 } })
    );
    const results = simulateRace(cars, DRAG_TRACK, 'SUNNY', false);
    expect(results[0].earnings).toBe(5000);
    expect(results[0].points).toBe(25);
    expect(results[1].earnings).toBe(2500);
    expect(results[1].points).toBe(18);
    expect(results[2].earnings).toBe(1000);
    expect(results[2].points).toBe(15);
    expect(results[3].earnings).toBe(250);
    expect(results[3].points).toBe(10);
    expect(results[4].earnings).toBe(250);
    expect(results[4].points).toBe(10);
    expect(results[5].earnings).toBe(50);
    expect(results[5].points).toBe(0);
  });

  it('uses custom rewardTable when provided', () => {
    const car = makeCar({ id: 'solo' });
    const rewardTable = [
      { place: 1, money: 9999, points: 50, prizes: 0 },
    ];
    const results = simulateRace([car], DRAG_TRACK, 'SUNNY', false, rewardTable);
    expect(results[0].earnings).toBe(9999);
    expect(results[0].points).toBe(50);
  });

  it('applies RAIN weather penalty for slick tires (С)', () => {
    const car = makeCar({ id: 'slick', roadType: 'С' });
    const sunnyResults = simulateRace([car], RALLY_TRACK, 'SUNNY', false);
    const rainResults = simulateRace([car], RALLY_TRACK, 'RAIN', false);
    // Rain should make the car slower (higher time)
    expect(rainResults[0].time).toBeGreaterThan(sunnyResults[0].time);
  });

  it('applies STORM weather penalty (worse than RAIN)', () => {
    const car = makeCar({ id: 'slick', roadType: 'С' });
    const rainResults = simulateRace([car], RALLY_TRACK, 'RAIN', false);
    const stormResults = simulateRace([car], RALLY_TRACK, 'STORM', false);
    expect(stormResults[0].time).toBeGreaterThan(rainResults[0].time);
  });

  it('offroad tires (В) have minimal rain penalty', () => {
    const offroad = makeCar({ id: 'offroad', roadType: 'В' });
    const slick = makeCar({ id: 'slick', roadType: 'С' });
    // Both same stats, but offroad should be faster in rain
    const results = simulateRace([offroad, slick], RALLY_TRACK, 'RAIN', false);
    const offroadResult = results.find(r => r.carId === 'offroad')!;
    const slickResult = results.find(r => r.carId === 'slick')!;
    expect(offroadResult.time).toBeLessThan(slickResult.time);
  });

  it('universal tires (У) have moderate rain penalty', () => {
    const universal = makeCar({ id: 'uni', roadType: 'У' });
    const slick = makeCar({ id: 'slick', roadType: 'С' });
    const results = simulateRace([universal, slick], RALLY_TRACK, 'RAIN', false);
    const uniResult = results.find(r => r.carId === 'uni')!;
    const slickResult = results.find(r => r.carId === 'slick')!;
    expect(uniResult.time).toBeLessThan(slickResult.time);
  });

  it('installed tire part overrides car roadType', () => {
    const car = makeCar({
      id: 'override',
      roadType: 'С', // slick by default
      installedParts: [makePart({ slot: 'tires', name: 'Внедорожные шины', boosts: {} })],
    });
    // With offroad tires installed, rain penalty should be minimal (В = 5%)
    const sunnyResults = simulateRace([car], RALLY_TRACK, 'SUNNY', false);
    const rainResults = simulateRace([car], RALLY_TRACK, 'RAIN', false);
    // The penalty should be small (offroad = 5% vs slick = 40%)
    const timeDiff = rainResults[0].time - sunnyResults[0].time;
    // For slick tires the diff would be much larger
    const slickCar = makeCar({ id: 'slick-only', roadType: 'С' });
    const slickSunny = simulateRace([slickCar], RALLY_TRACK, 'SUNNY', false);
    const slickRain = simulateRace([slickCar], RALLY_TRACK, 'RAIN', false);
    const slickDiff = slickRain[0].time - slickSunny[0].time;
    expect(timeDiff).toBeLessThan(slickDiff);
  });

  it('includes bots when includeBots=true', () => {
    const car = makeCar({ id: 'player' });
    const results = simulateRace([car], DRAG_TRACK, 'SUNNY', true);
    // Should have player + 4 bots = 5
    expect(results.length).toBe(5);
  });

  it('excludes bots when includeBots=false', () => {
    const car = makeCar({ id: 'player' });
    const results = simulateRace([car], DRAG_TRACK, 'SUNNY', false);
    expect(results.length).toBe(1);
  });

  it('time is always positive', () => {
    const car = makeCar();
    const results = simulateRace([car], DRAG_TRACK, 'SUNNY', false);
    expect(results[0].time).toBeGreaterThan(0);
  });

  it('time is in seconds (reasonable range for 4km)', () => {
    const car = makeCar({ stats: { power: 200, torque: 300, topSpeed: 250, acceleration: 5, handling: 70, offroad: 40 } });
    const results = simulateRace([car], DRAG_TRACK, 'SUNNY', false);
    // 4km at ~100-300 km/h → roughly 48-144 seconds
    expect(results[0].time).toBeGreaterThan(10);
    expect(results[0].time).toBeLessThan(1500);
  });

  it('handles tie-breaking (same time gets same position)', () => {
    // Force identical cars
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const car1 = makeCar({ id: 'a' });
    const car2 = makeCar({ id: 'b' });
    const results = simulateRace([car1, car2], DRAG_TRACK, 'SUNNY', false);
    // With same random and same stats, times should be equal
    if (results[0].time === results[1].time) {
      expect(results[0].position).toBe(1);
      expect(results[1].position).toBe(1);
    }
  });

  it('weatherModifier=0 track is unaffected by rain', () => {
    const noWeatherTrack: Track = {
      ...DRAG_TRACK,
      weatherModifier: 0,
    };
    const car = makeCar({ id: 'test', roadType: 'С' });
    const sunny = simulateRace([car], noWeatherTrack, 'SUNNY', false);
    const rain = simulateRace([car], noWeatherTrack, 'RAIN', false);
    expect(sunny[0].time).toBe(rain[0].time);
  });

  it('racing tires (Г) have medium rain penalty', () => {
    const racing = makeCar({ id: 'racing', roadType: 'Г' });
    const offroad = makeCar({ id: 'offroad', roadType: 'В' });
    const results = simulateRace([racing, offroad], RALLY_TRACK, 'RAIN', false);
    const racingResult = results.find(r => r.carId === 'racing')!;
    const offroadResult = results.find(r => r.carId === 'offroad')!;
    // Racing tires (25% penalty) should be slower than offroad (5% penalty) in rain
    expect(racingResult.time).toBeGreaterThan(offroadResult.time);
  });

  it('gоночные tire name is detected from installed part', () => {
    const car = makeCar({
      id: 'test',
      roadType: 'У',
      installedParts: [makePart({ slot: 'tires', name: 'Гоночные шины Pro', boosts: {} })],
    });
    // Should use Г tire type from installed part
    const sunnyResults = simulateRace([car], RALLY_TRACK, 'SUNNY', false);
    const rainResults = simulateRace([car], RALLY_TRACK, 'RAIN', false);
    // Г penalty = 25%, should be noticeable
    expect(rainResults[0].time).toBeGreaterThan(sunnyResults[0].time);
  });

  it('слик tire name is detected from installed part', () => {
    const car = makeCar({
      id: 'test',
      roadType: 'У',
      installedParts: [makePart({ slot: 'tires', name: 'Слик Extreme', boosts: {} })],
    });
    const sunnyResults = simulateRace([car], RALLY_TRACK, 'SUNNY', false);
    const rainResults = simulateRace([car], RALLY_TRACK, 'RAIN', false);
    // С penalty = 40%, should be very noticeable
    const diff = rainResults[0].time - sunnyResults[0].time;
    expect(diff).toBeGreaterThan(0);
  });

  it('handling and offroad mitigate weather penalty', () => {
    const lowHandling = makeCar({ id: 'low', stats: { power: 200, torque: 200, topSpeed: 200, acceleration: 8, handling: 0, offroad: 0 }, roadType: 'У' });
    const highHandling = makeCar({ id: 'high', stats: { power: 200, torque: 200, topSpeed: 200, acceleration: 8, handling: 200, offroad: 200 }, roadType: 'У' });
    const lowResults = simulateRace([lowHandling], RALLY_TRACK, 'RAIN', false);
    const highResults = simulateRace([highHandling], RALLY_TRACK, 'RAIN', false);
    // High handling/offroad should mitigate weather penalty → faster
    expect(highResults[0].time).toBeLessThan(lowResults[0].time);
  });
});
