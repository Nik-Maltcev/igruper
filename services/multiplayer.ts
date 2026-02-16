import { supabase } from './supabase';
import { Room, RoomPlayer, RoomPhase, ChatMessage, Car, RaceEntry } from '../types';
import { AVAILABLE_CARS } from '../constants';

// --- Генерация кода комнаты ---
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // без O,0,1,I для читаемости
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// --- Стартовые машины (3 дешёвых из эпохи 1960) ---
export function getStarterCars(): Car[] {
  const pool = AVAILABLE_CARS
    .filter((c: any) => c.year && c.year <= 1960)
    .sort((a: any, b: any) => a.price - b.price);
  // Берём 3 самых дешёвых из разных дилеров если возможно
  const picked: Car[] = [];
  const usedDealers = new Set<string>();
  for (const car of pool) {
    if (picked.length >= 3) break;
    if (!usedDealers.has(car.dealer || '')) {
      picked.push({ ...car, id: `starter-${Date.now()}-${picked.length}`, originalId: car.id, installedParts: [] });
      usedDealers.add(car.dealer || '');
    }
  }
  // Если не хватило из разных дилеров — добираем
  for (const car of pool) {
    if (picked.length >= 3) break;
    if (!picked.find(p => p.originalId === car.id)) {
      picked.push({ ...car, id: `starter-${Date.now()}-${picked.length}`, originalId: car.id, installedParts: [] });
    }
  }
  return picked;
}

// --- CRUD комнат ---
export async function createRoom(username: string): Promise<{ room: Room; playerId: string } | { error: string }> {
  const code = generateRoomCode();
  const playerId = crypto.randomUUID();
  const starterCars = getStarterCars();

  const { data: room, error: roomErr } = await supabase
    .from('rooms')
    .insert({ code, status: 'WAITING', host_id: playerId, max_players: 8 })
    .select()
    .single();

  if (roomErr || !room) return { error: roomErr?.message || 'Ошибка создания комнаты' };

  const { error: playerErr } = await supabase
    .from('room_players')
    .insert({
      id: playerId,
      room_id: room.id,
      username,
      is_host: true,
      money: 15000,
      garage: starterCars,
    });

  if (playerErr) return { error: playerErr.message };

  // Системное сообщение
  await sendSystemMessage(room.id, `${username} создал комнату`);

  return { room: room as Room, playerId };
}

export async function joinRoom(code: string, username: string): Promise<{ room: Room; playerId: string } | { error: string }> {
  const { data: room, error: findErr } = await supabase
    .from('rooms')
    .select('*')
    .eq('code', code.toUpperCase())
    .single();

  if (findErr || !room) return { error: 'Комната не найдена' };
  if (room.status !== 'WAITING') return { error: 'Игра уже началась' };

  // Проверяем количество игроков
  const { count } = await supabase
    .from('room_players')
    .select('*', { count: 'exact', head: true })
    .eq('room_id', room.id);

  if (count !== null && count >= room.max_players) return { error: `Комната полна (${count}/${room.max_players})` };

  // Проверяем уникальность никнейма
  const { data: existing } = await supabase
    .from('room_players')
    .select('username')
    .eq('room_id', room.id)
    .eq('username', username);

  if (existing && existing.length > 0) return { error: 'Никнейм уже занят в этой комнате' };

  const playerId = crypto.randomUUID();
  const starterCars = getStarterCars();

  const { error: joinErr } = await supabase
    .from('room_players')
    .insert({
      id: playerId,
      room_id: room.id,
      username,
      is_host: false,
      money: 15000,
      garage: starterCars,
    });

  if (joinErr) return { error: joinErr.message };

  await sendSystemMessage(room.id, `${username} присоединился`);

  return { room: room as Room, playerId };
}

// --- Получение игроков ---
export async function fetchPlayers(roomId: string): Promise<RoomPlayer[]> {
  const { data } = await supabase
    .from('room_players')
    .select('*')
    .eq('room_id', roomId)
    .order('joined_at');
  return (data || []) as RoomPlayer[];
}

// --- Обновление гаража игрока ---
export async function updatePlayerGarage(playerId: string, garage: Car[], money: number) {
  await supabase
    .from('room_players')
    .update({ garage, money })
    .eq('id', playerId);
}

// --- Смена фазы ---
export async function updateRoomPhase(roomId: string, phase: RoomPhase, extras?: Partial<Room>) {
  await supabase
    .from('rooms')
    .update({ phase, day_started_at: new Date().toISOString(), ...extras })
    .eq('id', roomId);
}

// --- Старт игры (хост) ---
export async function startGame(roomId: string) {
  await supabase
    .from('rooms')
    .update({
      status: 'PLAYING',
      phase: 'TUNING',
      current_day: 1,
      current_year: 1960,
      day_started_at: new Date().toISOString(),
      week_started_at: new Date().toISOString(),
    })
    .eq('id', roomId);

  await sendSystemMessage(roomId, 'Игра началась! Эпоха 1960. Тюнинг до 22:00.');
}

// --- Чат ---
export async function sendChatMessage(roomId: string, playerId: string, username: string, message: string) {
  await supabase
    .from('chat_messages')
    .insert({ room_id: roomId, player_id: playerId, username, message, type: 'user' });
}

export async function sendSystemMessage(roomId: string, message: string) {
  await supabase
    .from('chat_messages')
    .insert({ room_id: roomId, player_id: null, username: 'СИСТЕМА', message, type: 'system' });
}

export async function fetchChatMessages(roomId: string, limit = 50): Promise<ChatMessage[]> {
  const { data } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })
    .limit(limit);
  return (data || []) as ChatMessage[];
}

// --- Race entries ---
export async function submitRaceEntry(roomId: string, playerId: string, raceId: string, carId: string, day: number) {
  // Удаляем старую заявку на эту гонку если есть
  await supabase
    .from('race_entries')
    .delete()
    .eq('room_id', roomId)
    .eq('player_id', playerId)
    .eq('race_id', raceId)
    .eq('day', day);

  await supabase
    .from('race_entries')
    .insert({ room_id: roomId, player_id: playerId, race_id: raceId, car_id: carId, day });
}

export async function fetchRaceEntries(roomId: string, day: number): Promise<RaceEntry[]> {
  const { data } = await supabase
    .from('race_entries')
    .select('*')
    .eq('room_id', roomId)
    .eq('day', day);
  return (data || []) as RaceEntry[];
}

// --- Покупка машин (синхронизация наличия) ---
export async function logCarPurchase(roomId: string, playerId: string, carOriginalId: string) {
  await supabase
    .from('purchase_log')
    .insert({ room_id: roomId, player_id: playerId, car_original_id: carOriginalId });
}

export async function fetchPurchaseCounts(roomId: string): Promise<Record<string, number>> {
  const { data } = await supabase
    .from('purchase_log')
    .select('car_original_id')
    .eq('room_id', roomId);

  const counts: Record<string, number> = {};
  (data || []).forEach((row: any) => {
    counts[row.car_original_id] = (counts[row.car_original_id] || 0) + 1;
  });
  return counts;
}

// --- Недельный цикл ---
export const WEEK_SCHEDULE = [
  { dayOfWeek: 'FRIDAY',    dayNum: 1, label: 'Пятница',    activity: 'TUNING',     raceType: null },
  { dayOfWeek: 'SATURDAY',  dayNum: 2, label: 'Суббота',    activity: 'RACE',       raceType: 'QUALIFICATION' },
  { dayOfWeek: 'SUNDAY',    dayNum: 3, label: 'Воскресенье', activity: 'DEALER',     raceType: null },
  { dayOfWeek: 'MONDAY',    dayNum: 4, label: 'Понедельник', activity: 'TUNING',     raceType: null },
  { dayOfWeek: 'TUESDAY',   dayNum: 5, label: 'Вторник',    activity: 'RACE',       raceType: 'CITY' },
  { dayOfWeek: 'WEDNESDAY', dayNum: 6, label: 'Среда',      activity: 'TUNING',     raceType: null },
  { dayOfWeek: 'THURSDAY',  dayNum: 7, label: 'Четверг',    activity: 'RACE',       raceType: 'NATIONAL' },
  { dayOfWeek: 'FRIDAY_2',  dayNum: 8, label: 'Пятница',    activity: 'TUNING',     raceType: null },
  { dayOfWeek: 'SATURDAY_2',dayNum: 9, label: 'Суббота',    activity: 'RACE',       raceType: 'WORLD' },
  { dayOfWeek: 'SUNDAY_2',  dayNum: 10,label: 'Воскресенье', activity: 'DEALER',    raceType: null },
] as const;

// Категории мощности для Мировой Серии
export const POWER_CATEGORIES = [
  { label: '0-120 лс', min: 0, max: 120 },
  { label: '121-200 лс', min: 121, max: 200 },
  { label: '201-300 лс', min: 201, max: 300 },
  { label: '301-450 лс', min: 301, max: 450 },
  { label: '451-650 лс', min: 451, max: 650 },
  { label: '651-900 лс', min: 651, max: 900 },
  { label: '900+ лс', min: 901, max: Infinity },
];

// Получить текущий день расписания по номеру дня
export function getScheduleDay(dayNum: number) {
  // Первая неделя: дни 1-3 (пт-вс, квалификация)
  if (dayNum <= 3) return WEEK_SCHEDULE[dayNum - 1];
  // Последующие недели: цикл дней 4-10
  const cycleDay = ((dayNum - 4) % 7) + 4;
  return WEEK_SCHEDULE.find(s => s.dayNum === cycleDay) || WEEK_SCHEDULE[3];
}
