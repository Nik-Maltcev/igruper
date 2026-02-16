# Мультиплеер — Design Document

## Архитектура

### Стек
- Frontend: React 19 + TypeScript (существующий)
- Backend: Supabase (PostgreSQL + Realtime + RLS)
- Синхронизация: Supabase Realtime (postgres_changes)
- Таймер: клиентский, привязан к серверному времени через `day_started_at`

### Принцип работы
- Вся игровая логика на клиенте
- Supabase = хранилище состояния + синхронизация через Realtime
- Хост-клиент отвечает за смену фаз (проверяет таймер, пишет в `rooms`)
- Остальные клиенты подписаны на изменения и реагируют

---

## Схема БД (Supabase)

### Таблица `rooms`
```sql
create table rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  status text not null default 'WAITING', -- WAITING, PLAYING, FINISHED
  host_id text not null,
  current_day integer not null default 0, -- 0=лобби, 1=пятница старт, 2=суббота...
  current_year integer not null default 1960,
  phase text not null default 'LOBBY', -- LOBBY, TUNING, RACE_SETUP, RACING, RESULTS, DEALER
  day_started_at timestamptz,
  week_started_at timestamptz, -- когда началась текущая неделя (пятница)
  created_at timestamptz default now(),
  max_players integer not null default 8
);
```

### Таблица `room_players`
```sql
create table room_players (
  id text primary key, -- UUID генерируется на клиенте
  room_id uuid references rooms(id) on delete cascade,
  username text not null,
  is_host boolean default false,
  money integer not null default 15000,
  garage jsonb not null default '[]'::jsonb, -- массив Car[]
  points integer not null default 0,
  is_ready boolean default false,
  joined_at timestamptz default now()
);
```

### Таблица `race_entries`
```sql
create table race_entries (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  player_id text references room_players(id) on delete cascade,
  race_id text not null, -- ID гонки из расписания
  car_id text not null, -- ID машины из гаража игрока
  day integer not null, -- игровой день
  created_at timestamptz default now()
);
```

### Таблица `race_results`
```sql
create table race_results (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  race_id text not null,
  player_id text references room_players(id) on delete cascade,
  car_name text not null,
  position integer not null,
  time_seconds numeric,
  earnings integer not null default 0,
  points integer not null default 0,
  day integer not null,
  created_at timestamptz default now()
);
```

### Таблица `chat_messages`
```sql
create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  player_id text,
  username text not null,
  message text not null,
  type text not null default 'user', -- user, system
  created_at timestamptz default now()
);
```

### Таблица `purchase_log` (для синхронизации наличия машин)
```sql
create table purchase_log (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  player_id text references room_players(id) on delete cascade,
  car_original_id text not null, -- ID машины из каталога
  created_at timestamptz default now()
);
```

---

## Недельный цикл (маппинг день недели → фаза)

```
Неделя 1 (старт игры):
  Пятница:  TUNING (стартовые машины + детали до 22:00)
  Суббота:  RACE_SETUP → RACING (квалификация) → DEALER (автосалон 1960)
  Воскресенье: DEALER → 22:00 закрытие → TUNING

Недели 2+:
  Понедельник: TUNING
  Вторник:     RACE_SETUP → RACING (Городские Состязания)
  Среда:       TUNING
  Четверг:     RACE_SETUP → RACING (Национальное Соревнование)
  Пятница:     TUNING
  Суббота:     RACE_SETUP → RACING (Мировая Серия)
  Воскресенье: DEALER (смена года) → 22:00 → TUNING
```

### Автоматическая смена фаз
- Клиент хоста проверяет время каждые 10 секунд
- Если текущее время >= 22:00 и фаза не сменена — хост пишет новую фазу в `rooms`
- Все клиенты подписаны на `rooms` и реагируют на смену фазы

---

## Компоненты (новые/изменённые)

### Новые файлы
- `services/multiplayer.ts` — логика комнат, синхронизации, таймеров
- `components/Multiplayer.tsx` — полная переработка (лобби, игровой процесс)
- `components/Chat.tsx` — чат комнаты
- `components/PlayerList.tsx` — список игроков + просмотр гаражей
- `components/RaceSetup.tsx` — расстановка машин на трассы
- `components/RaceAnimation.tsx` — 2D анимация гонки (вид сверху)

### Изменённые файлы
- `App.tsx` — интеграция мультиплеерного состояния
- `types.ts` — новые типы для мультиплеера
- `components/Dealer.tsx` — синхронизация наличия через `purchase_log`
- `components/Marketplace.tsx` — блокировка в нерабочие фазы

---

## Порядок реализации (tasks)

### Task 1: SQL + Supabase setup
- Создать SQL скрипт для всех таблиц
- Включить Realtime для нужных таблиц

### Task 2: Типы + сервис мультиплеера
- Обновить `types.ts`
- Создать `services/multiplayer.ts` (CRUD комнат, игроков, подписки)

### Task 3: Лобби (никнейм → создать/войти → ожидание)
- Переписать `Multiplayer.tsx` — экраны логина, лобби, ожидания

### Task 4: Игровой цикл + таймер
- Логика недельного цикла
- Автоматическая смена фаз в 22:00
- Синхронизация через Realtime

### Task 5: Чат
- `Chat.tsx` — сворачиваемая панель
- Supabase insert + Realtime подписка

### Task 6: Расстановка машин + гонки
- `RaceSetup.tsx` — выбор машин на трассы
- Подсчёт результатов, запись в `race_results`

### Task 7: Анимация гонки
- `RaceAnimation.tsx` — 2D вид сверху

### Task 8: Рейтинг + просмотр гаражей
- `PlayerList.tsx` — таблица очков, просмотр гаражей соперников

### Task 9: Автосалон в мультиплеере
- Синхронизация наличия через `purchase_log`
