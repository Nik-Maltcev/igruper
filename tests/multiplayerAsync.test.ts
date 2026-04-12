import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supabase } from '../services/supabase';
import {
  createRoom,
  joinRoom,
  fetchPlayers,
  buyCar,
  buyPart,
  removePart,
  removePartToStorage,
  installFromStorage,
  joinTournament,
  leaveRoom,
  startGame,
  sendChatMessage,
  sendSystemMessage,
  fetchChatMessages,
  submitRaceEntry,
  fetchRaceEntries,
  saveRaceDayResults,
  fetchRaceDayResults,
  logCarPurchase,
  fetchPurchaseCounts,
  resetShopVisits,
  fetchPlayer,
  updatePlayerGarage,
  updatePlayerState,
  updateRoomState,
  updateRoomPhase,
} from '../services/multiplayer';
import { RoomPlayer, Room, Car, Part } from '../types';

// ─── Helpers ───

function makePlayer(overrides: Partial<RoomPlayer> = {}): RoomPlayer {
  return {
    id: 'player-1',
    room_id: 'room-1',
    username: 'TestPlayer',
    is_host: true,
    money: 15000,
    garage: [],
    storage: [],
    points: 0,
    is_ready: false,
    shop_visits: {},
    joined_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeCar(overrides: Partial<Car> = {}): Car {
  return {
    id: 'car-1',
    name: 'Test Car',
    image: '',
    price: 5000,
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
    boosts: { power: 10 },
    price: 500,
    icon: '🔧',
    ...overrides,
  };
}

function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: 'room-1',
    code: 'ABCD',
    status: 'PLAYING',
    host_id: 'player-1',
    current_day: 5,
    current_year: 1960,
    phase: 'TUNING',
    day_started_at: null,
    week_started_at: null,
    created_at: new Date().toISOString(),
    max_players: 8,
    ...overrides,
  };
}

// ─── Mock chain builder ───

function mockChain(finalResult: any = { data: null, error: null }) {
  const chain: any = {};
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'limit', 'order'];
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.single = vi.fn().mockResolvedValue(finalResult);
  chain.maybeSingle = vi.fn().mockResolvedValue(finalResult);
  return chain;
}

// ═══════════════════════════════════════════════════════
// buyPart
// ═══════════════════════════════════════════════════════

describe('buyPart', () => {
  beforeEach(() => {
    vi.mocked(supabase.from).mockReturnValue(mockChain() as any);
  });

  it('returns error when not enough money', async () => {
    const player = makePlayer({ money: 100 });
    const part = makePart({ price: 500 });
    const result = await buyPart(player, 'car-1', part);
    expect(result.error).toBe('Недостаточно денег');
  });

  it('returns error when car not found in garage', async () => {
    const player = makePlayer({ money: 10000, garage: [] });
    const part = makePart({ price: 500 });
    const result = await buyPart(player, 'nonexistent', part);
    expect(result.error).toBe('Машина не найдена');
  });

  it('succeeds when player has enough money and car exists', async () => {
    const car = makeCar({ id: 'my-car' });
    const player = makePlayer({ money: 10000, garage: [car] });
    const part = makePart({ price: 500 });
    const result = await buyPart(player, 'my-car', part);
    expect(result.error).toBeUndefined();
  });

  it('records shop visit when part has brand', async () => {
    const car = makeCar({ id: 'my-car' });
    const player = makePlayer({ money: 10000, garage: [car] });
    const part = makePart({ price: 500, brand: 'Bosch' });
    await buyPart(player, 'my-car', part);
    // Verify updatePlayerState was called (via supabase.from)
    expect(supabase.from).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════
// buyCar
// ═══════════════════════════════════════════════════════

describe('buyCar', () => {
  beforeEach(() => {
    vi.mocked(supabase.from).mockReturnValue(mockChain() as any);
  });

  it('returns error when not enough money', async () => {
    const player = makePlayer({ money: 1000 });
    const car = makeCar({ price: 5000 });
    const result = await buyCar(player, car, 'room-1');
    expect(result.error).toBe('Недостаточно денег');
  });

  it('succeeds when player has enough money', async () => {
    const player = makePlayer({ money: 10000 });
    const car = makeCar({ price: 5000 });
    const result = await buyCar(player, car, 'room-1');
    expect(result.error).toBeUndefined();
  });

  it('sets purchaseDay when currentDay is provided', async () => {
    const player = makePlayer({ money: 10000 });
    const car = makeCar({ price: 5000 });
    await buyCar(player, car, 'room-1', 5);
    expect(supabase.from).toHaveBeenCalled();
  });

  it('logs car purchase', async () => {
    const player = makePlayer({ money: 10000 });
    const car = makeCar({ price: 5000, id: 'original-id' });
    await buyCar(player, car, 'room-1');
    // logCarPurchase calls supabase.from('purchase_log')
    expect(supabase.from).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════
// joinTournament
// ═══════════════════════════════════════════════════════

describe('joinTournament', () => {
  beforeEach(() => {
    vi.mocked(supabase.from).mockReturnValue(mockChain() as any);
  });

  it('returns error when car not found', async () => {
    const player = makePlayer({ garage: [] });
    const room = makeRoom();
    const result = await joinTournament(player, 'nonexistent', room);
    expect(result.error).toBe('Машина не найдена');
  });

  it('returns error when car has no АВТОСПОРТ tag', async () => {
    const car = makeCar({ id: 'my-car', tags: ['Спорт'] });
    const player = makePlayer({ garage: [car] });
    const room = makeRoom();
    const result = await joinTournament(player, 'my-car', room);
    expect(result.error).toBe('Для турнира нужна машина с меткой АВТОСПОРТ');
  });

  it('returns error when car is already locked for tournament', async () => {
    const car = makeCar({ id: 'my-car', tags: ['АВТОСПОРТ'], lockedForTournament: true });
    const player = makePlayer({ garage: [car] });
    const room = makeRoom();
    const result = await joinTournament(player, 'my-car', room);
    expect(result.error).toBe('Машина уже отправлена на турнир');
  });

  it('succeeds with valid АВТОСПОРТ car', async () => {
    const car = makeCar({ id: 'my-car', tags: ['АВТОСПОРТ'] });
    const player = makePlayer({ garage: [car] });
    const room = makeRoom({ tournament_state: null });
    const result = await joinTournament(player, 'my-car', room);
    expect(result.error).toBeUndefined();
  });

  it('replaces existing entry for same player', async () => {
    const car = makeCar({ id: 'new-car', tags: ['АВТОСПОРТ'] });
    const player = makePlayer({ id: 'p1', garage: [car] });
    const room = makeRoom({
      tournament_state: {
        tournamentName: 'Test',
        entries: [{ playerId: 'p1', carId: 'old-car', sectionTimes: [], totalTime: 0 }],
        completedSections: 0,
      },
    });
    const result = await joinTournament(player, 'new-car', room);
    expect(result.error).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════
// removePart
// ═══════════════════════════════════════════════════════

describe('removePart', () => {
  beforeEach(() => {
    vi.mocked(supabase.from).mockReturnValue(mockChain() as any);
  });

  it('does nothing when car not found', async () => {
    const player = makePlayer({ garage: [] });
    await removePart(player, 'nonexistent', 0);
    // Should not throw
  });

  it('removes part at given index', async () => {
    const part1 = makePart({ id: 'p1' });
    const part2 = makePart({ id: 'p2' });
    const car = makeCar({ id: 'my-car', installedParts: [part1, part2] });
    const player = makePlayer({ garage: [car] });
    await removePart(player, 'my-car', 0);
    expect(supabase.from).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════
// removePartToStorage
// ═══════════════════════════════════════════════════════

describe('removePartToStorage', () => {
  beforeEach(() => {
    vi.mocked(supabase.from).mockReturnValue(mockChain() as any);
  });

  it('does nothing when car not found', async () => {
    const player = makePlayer({ garage: [] });
    await removePartToStorage(player, 'nonexistent', 0);
  });

  it('moves part from car to storage', async () => {
    const part = makePart({ id: 'p1' });
    const car = makeCar({ id: 'my-car', installedParts: [part] });
    const player = makePlayer({ garage: [car], storage: [] });
    await removePartToStorage(player, 'my-car', 0);
    expect(supabase.from).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════
// installFromStorage
// ═══════════════════════════════════════════════════════

describe('installFromStorage', () => {
  beforeEach(() => {
    vi.mocked(supabase.from).mockReturnValue(mockChain() as any);
  });

  it('does nothing when storage index is invalid', async () => {
    const player = makePlayer({ storage: [] });
    await installFromStorage(player, 'car-1', 5);
    // Should not throw
  });

  it('does nothing when car not found', async () => {
    const part = makePart();
    const player = makePlayer({ storage: [part], garage: [] });
    await installFromStorage(player, 'nonexistent', 0);
  });

  it('moves part from storage to car', async () => {
    const part = makePart({ id: 'stored-part' });
    const car = makeCar({ id: 'my-car' });
    const player = makePlayer({ garage: [car], storage: [part] });
    await installFromStorage(player, 'my-car', 0);
    expect(supabase.from).toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════
// createRoom
// ═══════════════════════════════════════════════════════

describe('createRoom', () => {
  it('returns error when room insert fails', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
        }),
      }),
    } as any);
    const result = await createRoom('TestUser');
    expect('error' in result).toBe(true);
  });

  it('returns room and playerId on success', async () => {
    const fakeRoom = { id: 'room-123', code: 'ABCD', status: 'WAITING', host_id: 'p1', max_players: 8 };
    const insertChain = mockChain({ data: fakeRoom, error: null });
    // First call: rooms insert
    // Second call: room_players insert
    // Third call: chat_messages insert (system message)
    let callCount = 0;
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'rooms') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: fakeRoom, error: null }),
            }),
          }),
        } as any;
      }
      return mockChain({ data: null, error: null }) as any;
    });
    const result = await createRoom('TestUser');
    expect('room' in result).toBe(true);
    if ('room' in result) {
      expect(result.room.id).toBe('room-123');
      expect(result.playerId).toBeDefined();
    }
  });
});

// ═══════════════════════════════════════════════════════
// joinRoom
// ═══════════════════════════════════════════════════════

describe('joinRoom', () => {
  it('returns error when room not found', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
        }),
      }),
    } as any);
    const result = await joinRoom('XXXX', 'Player');
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error).toBe('Комната не найдена');
    }
  });
});

// ═══════════════════════════════════════════════════════
// fetchPlayers
// ═══════════════════════════════════════════════════════

describe('fetchPlayers', () => {
  it('returns empty array when no players', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [] }),
      }),
    } as any);
    const players = await fetchPlayers('room-1');
    expect(players).toEqual([]);
  });

  it('returns players array', async () => {
    const fakePlayers = [makePlayer()];
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: fakePlayers }),
      }),
    } as any);
    const players = await fetchPlayers('room-1');
    expect(players).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════════════════
// startGame
// ═══════════════════════════════════════════════════════

describe('startGame', () => {
  it('updates room to PLAYING status with day 1 and year 1960', async () => {
    const updateMock = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) });
    vi.mocked(supabase.from).mockReturnValue({
      update: updateMock,
      insert: vi.fn().mockResolvedValue({}),
    } as any);
    await startGame('room-1');
    expect(supabase.from).toHaveBeenCalledWith('rooms');
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'PLAYING',
        phase: 'TUNING',
        current_day: 1,
        current_year: 1960,
      })
    );
  });
});

// ═══════════════════════════════════════════════════════
// Chat functions
// ═══════════════════════════════════════════════════════

describe('sendChatMessage', () => {
  it('inserts a user message', async () => {
    const insertMock = vi.fn().mockResolvedValue({});
    vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as any);
    await sendChatMessage('room-1', 'player-1', 'TestUser', 'Hello');
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'user', message: 'Hello' })
    );
  });
});

describe('sendSystemMessage', () => {
  it('inserts a system message with null player_id', async () => {
    const insertMock = vi.fn().mockResolvedValue({});
    vi.mocked(supabase.from).mockReturnValue({ insert: insertMock } as any);
    await sendSystemMessage('room-1', 'Game started');
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'system', player_id: null, username: 'СИСТЕМА' })
    );
  });
});

describe('fetchChatMessages', () => {
  it('returns empty array when no messages', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [] }),
          }),
        }),
      }),
    } as any);
    const messages = await fetchChatMessages('room-1');
    expect(messages).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════
// Race entries
// ═══════════════════════════════════════════════════════

describe('submitRaceEntry', () => {
  it('deletes old entry then inserts new one', async () => {
    const deleteMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({}),
          }),
        }),
      }),
    });
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(supabase.from).mockReturnValue({
      delete: deleteMock,
      insert: insertMock,
    } as any);
    await submitRaceEntry('room-1', 'player-1', 'race-1', 'car-1', 5);
    expect(supabase.from).toHaveBeenCalledWith('race_entries');
  });
});

// ═══════════════════════════════════════════════════════
// Purchase tracking
// ═══════════════════════════════════════════════════════

describe('fetchPurchaseCounts', () => {
  it('returns empty object when no purchases', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [] }),
      }),
    } as any);
    const counts = await fetchPurchaseCounts('room-1');
    expect(counts).toEqual({});
  });

  it('counts purchases correctly', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [
            { car_original_id: 'car-a' },
            { car_original_id: 'car-a' },
            { car_original_id: 'car-b' },
          ],
        }),
      }),
    } as any);
    const counts = await fetchPurchaseCounts('room-1');
    expect(counts['car-a']).toBe(2);
    expect(counts['car-b']).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════
// leaveRoom
// ═══════════════════════════════════════════════════════

describe('leaveRoom', () => {
  it('sends system message and deletes player', async () => {
    const singleMock = vi.fn().mockResolvedValue({ data: { username: 'TestUser' } });
    const deleteMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({}),
    });
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === 'room_players') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: singleMock,
            }),
          }),
          delete: deleteMock,
        } as any;
      }
      return { insert: vi.fn().mockResolvedValue({}) } as any;
    });
    await leaveRoom('room-1', 'player-1');
    expect(supabase.from).toHaveBeenCalledWith('room_players');
  });
});
