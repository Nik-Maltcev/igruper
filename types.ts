export type StatType = 'power' | 'torque' | 'topSpeed' | 'acceleration' | 'handling' | 'offroad';

export interface CarStats {
  power: number;        // Мощность, лс
  torque: number;       // Крутящий момент, Нм
  topSpeed: number;     // Скорость, км/ч
  acceleration: number; // Разгон 0-100, сек (меньше = лучше)
  handling: number;     // Управляемость
  offroad: number;      // Проходимость
}

export interface Car {
  id: string;
  name: string;
  image: string;
  price: number;
  stats: CarStats;
  coefficients?: CarStats;  // Коэффициенты для процентных бустов от запчастей
  installedParts: Part[];
  color: string;
  tags?: string[];      // Метки: "Классика", "Спорт", "Внедорожник" и т.д.
  originalId?: string;  // Оригинальный ID из каталога (для проверки дубликатов)
  epoch?: number;       // Эпоха (60, 70, 80...)
  page?: number;        // Страница в каталоге (1-5)
  year?: number;        // Год появления в салоне (1960, 1962, ...)
  dealer?: string;      // Салон: АЛЬФА, БЕТА, ГАММА, ДЕЛЬТА
  quantity?: number;    // Количество в наличии
  roadType?: string;    // Тип дороги: У, Г, В, С
  carClass?: string;    // Класс: A, B, C, D, E, S
  rarity?: number;      // Редкость: 1-5
}

export interface PartBoosts {
  power?: number;           // +лс (абсолют)
  torque?: number;          // +Нм (абсолют)
  topSpeed?: number;        // +км/ч (абсолют)
  handling?: number;        // +управляемость (абсолют)
  offroad?: number;         // +проходимость (абсолют)
  // Процентные модификаторы
  powerPct?: number;        // % к мощности
  topSpeedPct?: number;     // % к скорости
  accelerationPct?: number; // % к разгону (положительное = улучшение, т.е. уменьшение времени)
}

export type PartSlot = 'tires' | 'camshaft' | 'differential' | 'turbo' | 'compressor' | 'intercooler';

export interface Part {
  id: string;
  name: string;
  boosts: PartBoosts;   // Влияние на все характеристики сразу
  price: number;
  icon: string;
  brand?: string;
  tier?: number;
  description?: string;
  slot?: PartSlot;       // Слот: только одна деталь этого типа на машину
  requires?: PartSlot;   // Пререквизит: нужна деталь этого слота для установки
}

export interface Track {
  id: string;
  name: string;
  image: string;
  description: string;
  weights: {
    power: number;
    torque: number;
    topSpeed: number;
    acceleration: number;
    handling: number;
    offroad: number;
  };
  weatherModifier: number; // 0 none, 1 high impact
}

export interface RaceResult {
  carId: string;
  carName: string;
  position: number;
  time: number;
  earnings: number;
  points: number;
}

export interface PlayerState {
  money: number;
  garage: Car[];
  history: RaceResult[];
}

// --- Multiplayer Types ---

export type RoomStatus = 'WAITING' | 'PLAYING' | 'FINISHED';
export type RoomPhase = 'LOBBY' | 'TUNING' | 'RACE_SETUP' | 'RACING' | 'RESULTS' | 'DEALER';

export type WeekDay = 'FRIDAY' | 'SATURDAY' | 'SUNDAY' | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY';

export interface Room {
  id: string;
  code: string;
  status: RoomStatus;
  host_id: string;
  current_day: number;       // Игровой день (0=лобби, 1=пятница старт...)
  current_year: number;      // Текущий игровой год (1960, 1962...)
  phase: RoomPhase;
  day_started_at: string | null;
  week_started_at: string | null;
  created_at: string;
  max_players: number;
}

export interface RoomPlayer {
  id: string;
  room_id: string;
  username: string;
  is_host: boolean;
  money: number;
  garage: Car[];             // Гараж игрока (JSONB)
  points: number;
  is_ready: boolean;
  joined_at: string;
}

export interface RaceEntry {
  id: string;
  room_id: string;
  player_id: string;
  race_id: string;
  car_id: string;
  day: number;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  player_id: string | null;
  username: string;
  message: string;
  type: 'user' | 'system';
  created_at: string;
}

export type GamePhase = 'PREPARATION' | 'RACE_DAY' | 'RACING' | 'RESULTS';
export type View = 'DASHBOARD' | 'GARAGE' | 'DEALER' | 'SHOP' | 'AUCTION' | 'WORKLIST' | 'PLAYERS' | 'RULES' | 'HISTORY' | 'MULTIPLAYER';
