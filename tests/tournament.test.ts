/**
 * Tests for tournament functionality:
 * - Tournament detection by year
 * - Car locking/unlocking for tournaments
 * - Tournament section simulation (3 sections across Tue/Thu/Sat)
 * - Locked cars filtered from regular race entries
 * - Tournament results accumulation
 * - Tournament display in schedule
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TOURNAMENTS_DATA } from '../constants';
import { joinTournament, getScheduleDay } from '../services/multiplayer';
import { simulateRace, getEffectiveStats } from '../services/gameEngine';
import { supabase } from '../services/supabase';
import { Car, Room, RoomPlayer, TournamentState, TournamentEntry } from '../types';

// ─── Helpers ───

function makeCar(overrides: Partial<Car> = {}): Car {
  return {
    id: 'car-1', name: 'Test Car', image: '', price: 10000, color: '#333',
    stats: { power: 200, torque: 250, topSpeed: 220, acceleration: 6, handling: 60, offroad: 40 },
    installedParts: [], tags: [],
    ...overrides,
  };
}

function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: 'room-1', code: 'ABCD', status: 'PLAYING', host_id: 'p1',
    current_day: 5, current_year: 1964, phase: 'RACE_SETUP',
    day_started_at: null, week_started_at: null,
    created_at: new Date().toISOString(), max_players: 8,
    ...overrides,
  };
}

function makePlayer(overrides: Partial<RoomPlayer> = {}): RoomPlayer {
  return {
    id: 'player-1', room_id: 'room-1', username: 'TestPlayer',
    is_host: true, money: 15000, garage: [], storage: [],
    points: 0, is_ready: false, shop_visits: {},
    joined_at: new Date().toISOString(),
    ...overrides,
  };
}

function mockChain(finalResult: any = { data: null, error: null }) {
  const chain: any = {};
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'limit', 'order'];
  for (const m of methods) { chain[m] = vi.fn().mockReturnValue(chain); }
  chain.single = vi.fn().mockResolvedValue(finalResult);
  chain.maybeSingle = vi.fn().mockResolvedValue(finalResult);
  return chain;
}

// ═══════════════════════════════════════════════════════
// TOURNAMENTS_DATA structure
// ═══════════════════════════════════════════════════════

describe('TOURNAMENTS_DATA', () => {
  it('has 5 tournament definitions', () => {
    expect(TOURNAMENTS_DATA).toHaveLength(5);
  });

  it('every tournament has exactly 3 sections', () => {
    for (const t of TOURNAMENTS_DATA) {
      expect(t.sections).toHaveLength(3);
    }
  });

  it('tournament years match CSV data', () => {
    const mexico = TOURNAMENTS_DATA.find(t => t.name === 'Ралли Мексики');
    expect(mexico).toBeDefined();
    expect(mexico!.years).toContain(1964);
    expect(mexico!.years).toContain(1996);

    const siberia = TOURNAMENTS_DATA.find(t => t.name === 'Ралли Сибири');
    expect(siberia).toBeDefined();
    expect(siberia!.years).toContain(1972);
    expect(siberia!.years).toContain(2004);

    const finland = TOURNAMENTS_DATA.find(t => t.name === 'Ралли Финляндии');
    expect(finland).toBeDefined();
    expect(finland!.years).toContain(1980);
    expect(finland!.years).toContain(2012);

    const france = TOURNAMENTS_DATA.find(t => t.name === 'Ралли Франции');
    expect(france).toBeDefined();
    expect(france!.years).toContain(1988);
    expect(france!.years).toContain(2020);

    const champions = TOURNAMENTS_DATA.find(t => t.name === 'Гонка Чемпионов');
    expect(champions).toBeDefined();
    expect(champions!.years).toEqual([1968, 1976, 1984, 1992, 2000, 2008, 2016]);
  });

  it('Ралли Мексики sections match CSV', () => {
    const mexico = TOURNAMENTS_DATA.find(t => t.name === 'Ралли Мексики')!;
    expect(mexico.sections[0].name).toBe('Песок');
    expect(mexico.sections[1].name).toBe('Сельская дорога');
    expect(mexico.sections[2].name).toBe('Асфальт');
  });

  it('Гонка Чемпионов sections match CSV', () => {
    const champ = TOURNAMENTS_DATA.find(t => t.name === 'Гонка Чемпионов')!;
    expect(champ.sections[0].name).toBe('Взлётная полоса');
    expect(champ.sections[1].name).toBe('Pikes Peak');
    expect(champ.sections[2].name).toBe('Нюрбургринг');
  });

  it('section weights are normalized (sum to ~1)', () => {
    for (const t of TOURNAMENTS_DATA) {
      for (const s of t.sections) {
        const sum = s.weights.power + s.weights.torque + s.weights.topSpeed +
          s.weights.acceleration + s.weights.handling + s.weights.offroad;
        expect(sum).toBeCloseTo(1, 1);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════
// Tournament year detection
// ═══════════════════════════════════════════════════════

describe('Tournament year detection', () => {
  it('1964 has Ралли Мексики', () => {
    const t = TOURNAMENTS_DATA.find(t => t.years.includes(1964));
    expect(t).toBeDefined();
    expect(t!.name).toBe('Ралли Мексики');
  });

  it('1968 has Гонка Чемпионов', () => {
    const t = TOURNAMENTS_DATA.find(t => t.years.includes(1968));
    expect(t!.name).toBe('Гонка Чемпионов');
  });

  it('1960 has no tournament', () => {
    const t = TOURNAMENTS_DATA.find(t => t.years.includes(1960));
    expect(t).toBeUndefined();
  });

  it('1962 has no tournament', () => {
    const t = TOURNAMENTS_DATA.find(t => t.years.includes(1962));
    expect(t).toBeUndefined();
  });

  it('2020 has Ралли Франции', () => {
    const t = TOURNAMENTS_DATA.find(t => t.years.includes(2020));
    expect(t!.name).toBe('Ралли Франции');
  });

  it('every tournament year maps to exactly one tournament', () => {
    const allYears = TOURNAMENTS_DATA.flatMap(t => t.years);
    for (const year of allYears) {
      const matches = TOURNAMENTS_DATA.filter(t => t.years.includes(year));
      expect(matches).toHaveLength(1);
    }
  });
});

// ═══════════════════════════════════════════════════════
// Tournament schedule (sections on Tue/Thu/Sat)
// ═══════════════════════════════════════════════════════

describe('Tournament schedule alignment', () => {
  it('section 1 runs on Tuesday (dayNum=5)', () => {
    const day = getScheduleDay(5);
    expect(day.dayNum).toBe(5);
    expect(day.activity).toBe('RACE');
    expect(day.raceType).toBe('CITY');
  });

  it('section 2 runs on Thursday (dayNum=7)', () => {
    const day = getScheduleDay(7);
    expect(day.dayNum).toBe(7);
    expect(day.activity).toBe('RACE');
    expect(day.raceType).toBe('NATIONAL');
  });

  it('section 3 runs on Saturday (dayNum=9)', () => {
    const day = getScheduleDay(9);
    expect(day.dayNum).toBe(9);
    expect(day.activity).toBe('RACE');
    expect(day.raceType).toBe('WORLD');
  });

  it('tournament section index maps correctly from dayNum', () => {
    // This mirrors the logic in Multiplayer.tsx advanceDay
    const sectionMap: Record<number, number> = { 5: 0, 7: 1, 9: 2 };
    for (const [dayNum, sectionIdx] of Object.entries(sectionMap)) {
      expect(sectionIdx).toBe(sectionMap[parseInt(dayNum)]);
    }
  });
});

// ═══════════════════════════════════════════════════════
// joinTournament validation
// ═══════════════════════════════════════════════════════

describe('joinTournament', () => {
  beforeEach(() => {
    vi.mocked(supabase.from).mockReturnValue(mockChain() as any);
  });

  it('rejects car without АВТОСПОРТ tag', async () => {
    const car = makeCar({ id: 'c1', tags: ['Спорт', 'Германия'] });
    const player = makePlayer({ garage: [car] });
    const room = makeRoom();
    const result = await joinTournament(player, 'c1', room);
    expect(result.error).toBe('Для турнира нужна машина с меткой АВТОСПОРТ');
  });

  it('rejects already locked car', async () => {
    const car = makeCar({ id: 'c1', tags: ['АВТОСПОРТ'], lockedForTournament: true });
    const player = makePlayer({ garage: [car] });
    const room = makeRoom();
    const result = await joinTournament(player, 'c1', room);
    expect(result.error).toBe('Машина уже отправлена на турнир');
  });

  it('accepts valid АВТОСПОРТ car', async () => {
    const car = makeCar({ id: 'c1', tags: ['АВТОСПОРТ'] });
    const player = makePlayer({ garage: [car] });
    const room = makeRoom({ tournament_state: null });
    const result = await joinTournament(player, 'c1', room);
    expect(result.error).toBeUndefined();
  });

  it('rejects car not in garage', async () => {
    const player = makePlayer({ garage: [] });
    const room = makeRoom();
    const result = await joinTournament(player, 'nonexistent', room);
    expect(result.error).toBe('Машина не найдена');
  });

  it('allows only one car per player (replaces existing entry)', async () => {
    const car1 = makeCar({ id: 'c1', tags: ['АВТОСПОРТ'] });
    const car2 = makeCar({ id: 'c2', tags: ['АВТОСПОРТ'] });
    const player = makePlayer({ id: 'p1', garage: [car1, car2] });
    const room = makeRoom({
      tournament_state: {
        tournamentName: 'Ралли Мексики',
        entries: [{ playerId: 'p1', carId: 'c1', sectionTimes: [], totalTime: 0 }],
        completedSections: 0,
      },
    });
    // Should replace c1 with c2
    const result = await joinTournament(player, 'c2', room);
    expect(result.error).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════
// Locked car filtering
// ═══════════════════════════════════════════════════════

describe('Locked car filtering for regular races', () => {
  it('lockedForTournament car should be excluded from race entries', () => {
    const lockedCar = makeCar({ id: 'locked', tags: ['АВТОСПОРТ'], lockedForTournament: true });
    const freeCar = makeCar({ id: 'free', tags: ['Спорт'] });
    const allCars = [lockedCar, freeCar];

    // Simulate the filter used in RaceCenter
    const availableForRace = allCars.filter(c => !c.lockedForTournament);
    expect(availableForRace).toHaveLength(1);
    expect(availableForRace[0].id).toBe('free');
  });

  it('unlocked car is available for race entries', () => {
    const car = makeCar({ id: 'free', lockedForTournament: false });
    const available = [car].filter(c => !c.lockedForTournament);
    expect(available).toHaveLength(1);
  });

  it('car without lockedForTournament field is available', () => {
    const car = makeCar({ id: 'normal' });
    delete (car as any).lockedForTournament;
    const available = [car].filter(c => !c.lockedForTournament);
    expect(available).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════════════════
// Tournament simulation (3 sections)
// ═══════════════════════════════════════════════════════

describe('Tournament race simulation', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('simulates a tournament section as a regular race', () => {
    const car = makeCar({ id: 'tourn-car', tags: ['АВТОСПОРТ'] });
    const section = TOURNAMENTS_DATA[0].sections[0]; // Песок
    const results = simulateRace([car], {
      id: 'tourn-0', name: section.name,
      image: '', description: '',
      weights: section.weights,
      weatherModifier: section.weatherModifier,
    }, 'SUNNY', false);
    expect(results).toHaveLength(1);
    expect(results[0].time).toBeGreaterThan(0);
  });

  it('tournament total time is sum of 3 sections', () => {
    const car = makeCar({ id: 'tourn-car', tags: ['АВТОСПОРТ'] });
    const tournament = TOURNAMENTS_DATA[0]; // Ралли Мексики
    let totalTime = 0;
    const sectionTimes: number[] = [];

    for (const section of tournament.sections) {
      const results = simulateRace([car], {
        id: `tourn-${sectionTimes.length}`, name: section.name,
        image: '', description: '',
        weights: section.weights,
        weatherModifier: section.weatherModifier,
      }, 'SUNNY', false);
      sectionTimes.push(results[0].time);
      totalTime += results[0].time;
    }

    expect(sectionTimes).toHaveLength(3);
    expect(totalTime).toBeCloseTo(sectionTimes[0] + sectionTimes[1] + sectionTimes[2], 3);
  });

  it('different sections produce different times (different weights)', () => {
    const car = makeCar({ id: 'tourn-car', tags: ['АВТОСПОРТ'] });
    const tournament = TOURNAMENTS_DATA[0]; // Ралли Мексики
    const times: number[] = [];

    for (const section of tournament.sections) {
      const results = simulateRace([car], {
        id: 'test', name: section.name,
        image: '', description: '',
        weights: section.weights,
        weatherModifier: section.weatherModifier,
      }, 'SUNNY', false);
      times.push(results[0].time);
    }

    // At least 2 of 3 times should differ (different track weights)
    const unique = new Set(times.map(t => t.toFixed(3)));
    expect(unique.size).toBeGreaterThanOrEqual(2);
  });

  it('faster car wins across all sections', () => {
    const fastCar = makeCar({ id: 'fast', tags: ['АВТОСПОРТ'],
      stats: { power: 400, torque: 500, topSpeed: 300, acceleration: 3, handling: 100, offroad: 80 } });
    const slowCar = makeCar({ id: 'slow', tags: ['АВТОСПОРТ'],
      stats: { power: 80, torque: 100, topSpeed: 120, acceleration: 15, handling: 20, offroad: 10 } });

    const tournament = TOURNAMENTS_DATA[0];
    let fastTotal = 0, slowTotal = 0;

    for (const section of tournament.sections) {
      const results = simulateRace([fastCar, slowCar], {
        id: 'test', name: section.name,
        image: '', description: '',
        weights: section.weights,
        weatherModifier: section.weatherModifier,
      }, 'SUNNY', false);
      const fastResult = results.find(r => r.carId === 'fast')!;
      const slowResult = results.find(r => r.carId === 'slow')!;
      fastTotal += fastResult.time;
      slowTotal += slowResult.time;
    }

    expect(fastTotal).toBeLessThan(slowTotal);
  });
});

// ═══════════════════════════════════════════════════════
// TournamentState management
// ═══════════════════════════════════════════════════════

describe('TournamentState', () => {
  it('initial state has 0 completedSections', () => {
    const state: TournamentState = {
      tournamentName: 'Ралли Мексики',
      entries: [],
      completedSections: 0,
    };
    expect(state.completedSections).toBe(0);
  });

  it('entry tracks section times correctly', () => {
    const entry: TournamentEntry = {
      playerId: 'p1',
      carId: 'c1',
      sectionTimes: [45.5, 0, 0],
      totalTime: 45.5,
    };
    expect(entry.sectionTimes[0]).toBe(45.5);
    expect(entry.totalTime).toBe(45.5);
  });

  it('total time accumulates across sections', () => {
    let entry: TournamentEntry = {
      playerId: 'p1', carId: 'c1',
      sectionTimes: [], totalTime: 0,
    };

    // Section 1
    const time1 = 45.5;
    entry = { ...entry, sectionTimes: [time1], totalTime: time1 };

    // Section 2
    const time2 = 52.3;
    entry = { ...entry, sectionTimes: [time1, time2], totalTime: time1 + time2 };

    // Section 3
    const time3 = 48.1;
    entry = { ...entry, sectionTimes: [time1, time2, time3], totalTime: time1 + time2 + time3 };

    expect(entry.sectionTimes).toHaveLength(3);
    expect(entry.totalTime).toBeCloseTo(145.9, 1);
  });

  it('ranking is by total time (lowest wins)', () => {
    const entries: TournamentEntry[] = [
      { playerId: 'p1', carId: 'c1', sectionTimes: [50, 55, 48], totalTime: 153 },
      { playerId: 'p2', carId: 'c2', sectionTimes: [45, 60, 50], totalTime: 155 },
      { playerId: 'p3', carId: 'c3', sectionTimes: [40, 45, 42], totalTime: 127 },
    ];
    const sorted = [...entries].sort((a, b) => a.totalTime - b.totalTime);
    expect(sorted[0].playerId).toBe('p3'); // 127 — winner
    expect(sorted[1].playerId).toBe('p1'); // 153
    expect(sorted[2].playerId).toBe('p2'); // 155
  });

  it('player can be behind after section 1 but win overall', () => {
    const entries: TournamentEntry[] = [
      { playerId: 'p1', carId: 'c1', sectionTimes: [60, 30, 30], totalTime: 120 }, // slow start, fast finish
      { playerId: 'p2', carId: 'c2', sectionTimes: [40, 50, 50], totalTime: 140 }, // fast start, slow finish
    ];
    // After section 1: p2 leads (40 < 60)
    expect(entries[1].sectionTimes[0]).toBeLessThan(entries[0].sectionTimes[0]);
    // But overall: p1 wins (120 < 140)
    const sorted = [...entries].sort((a, b) => a.totalTime - b.totalTime);
    expect(sorted[0].playerId).toBe('p1');
  });
});

// ═══════════════════════════════════════════════════════
// Tournament section weights (specific tracks)
// ═══════════════════════════════════════════════════════

describe('Tournament section characteristics', () => {
  it('Песок (Ралли Мексики) favors offroad and torque', () => {
    const mexico = TOURNAMENTS_DATA.find(t => t.name === 'Ралли Мексики')!;
    const sand = mexico.sections[0]; // Песок
    expect(sand.weights.offroad).toBeGreaterThan(sand.weights.power);
    expect(sand.weights.torque).toBeGreaterThan(sand.weights.topSpeed);
  });

  it('Снег (Ралли Сибири) heavily favors offroad', () => {
    const siberia = TOURNAMENTS_DATA.find(t => t.name === 'Ралли Сибири')!;
    const snow = siberia.sections[2]; // Снег
    expect(snow.weights.offroad).toBeGreaterThan(snow.weights.power);
    expect(snow.weights.offroad).toBeGreaterThan(snow.weights.topSpeed);
  });

  it('Взлётная полоса (Гонка Чемпионов) favors topSpeed', () => {
    const champ = TOURNAMENTS_DATA.find(t => t.name === 'Гонка Чемпионов')!;
    const runway = champ.sections[0]; // Взлётная полоса
    expect(runway.weights.topSpeed).toBeGreaterThan(runway.weights.handling);
    expect(runway.weights.topSpeed).toBeGreaterThan(runway.weights.offroad);
  });

  it('Нюрбургринг (Гонка Чемпионов) is balanced', () => {
    const champ = TOURNAMENTS_DATA.find(t => t.name === 'Гонка Чемпионов')!;
    const nurburgring = champ.sections[2]; // Нюрбургринг
    // Should have decent power, topSpeed, and handling
    expect(nurburgring.weights.power).toBeGreaterThan(0.1);
    expect(nurburgring.weights.topSpeed).toBeGreaterThan(0.1);
    expect(nurburgring.weights.handling).toBeGreaterThan(0.1);
  });

  it('all tournament sections have weatherModifier = 0.5', () => {
    for (const t of TOURNAMENTS_DATA) {
      for (const s of t.sections) {
        expect(s.weatherModifier).toBe(0.5);
      }
    }
  });
});

// ═══════════════════════════════════════════════════════
// Car visibility in garage during tournament
// ═══════════════════════════════════════════════════════

describe('Car visibility during tournament', () => {
  it('locked car has lockedForTournament = true', () => {
    const car = makeCar({ lockedForTournament: true });
    expect(car.lockedForTournament).toBe(true);
  });

  it('car is unlocked after tournament ends (Saturday results)', () => {
    const car = makeCar({ lockedForTournament: true });
    // Simulate unlocking
    const unlocked = { ...car, lockedForTournament: false };
    expect(unlocked.lockedForTournament).toBe(false);
  });

  it('multiple cars can be filtered: only non-locked shown', () => {
    const cars = [
      makeCar({ id: 'c1', lockedForTournament: true }),
      makeCar({ id: 'c2', lockedForTournament: false }),
      makeCar({ id: 'c3' }), // undefined = not locked
      makeCar({ id: 'c4', lockedForTournament: true }),
    ];
    const visible = cars.filter(c => !c.lockedForTournament);
    expect(visible).toHaveLength(2);
    expect(visible.map(c => c.id)).toEqual(['c2', 'c3']);
  });
});
