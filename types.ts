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

export interface Room {
    id: string;
    code: string;
    status: 'WAITING' | 'RACING' | 'FINISHED';
    host_id: string;
    track_id: string;
    created_at: string;
}

export interface RoomPlayer {
    id: string;
    room_id: string;
    username: string;
    is_host: boolean;
    car_data: Car; // Сериализованная машина
    finish_time: number | null; // null пока не проехал
    position: number | null;
}

export type GamePhase = 'PREPARATION' | 'RACE_DAY' | 'RACING' | 'RESULTS';
export type View = 'DASHBOARD' | 'GARAGE' | 'DEALER' | 'SHOP' | 'AUCTION' | 'WORKLIST' | 'PLAYERS' | 'RULES' | 'HISTORY' | 'MULTIPLAYER';
