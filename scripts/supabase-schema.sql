-- Superigruper Multiplayer Schema
-- Запустить в Supabase SQL Editor

-- 1. Таблица комнат
create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  status text not null default 'WAITING',
  host_id text not null,
  current_day integer not null default 0,
  current_year integer not null default 1960,
  phase text not null default 'LOBBY',
  day_started_at timestamptz,
  week_started_at timestamptz,
  created_at timestamptz default now(),
  max_players integer not null default 8
);

-- 2. Игроки в комнатах
create table if not exists room_players (
  id text primary key,
  room_id uuid references rooms(id) on delete cascade,
  username text not null,
  is_host boolean default false,
  money integer not null default 15000,
  garage jsonb not null default '[]'::jsonb,
  points integer not null default 0,
  is_ready boolean default false,
  joined_at timestamptz default now()
);

-- 3. Заявки на гонки (кто какую машину на какую трассу)
create table if not exists race_entries (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  player_id text references room_players(id) on delete cascade,
  race_id text not null,
  car_id text not null,
  day integer not null,
  created_at timestamptz default now()
);

-- 4. Результаты гонок
create table if not exists race_results (
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

-- 5. Чат
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  player_id text,
  username text not null,
  message text not null,
  type text not null default 'user',
  created_at timestamptz default now()
);

-- 6. Лог покупок машин (для синхронизации наличия)
create table if not exists purchase_log (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  player_id text references room_players(id) on delete cascade,
  car_original_id text not null,
  created_at timestamptz default now()
);

-- Включить Realtime для нужных таблиц
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table room_players;
alter publication supabase_realtime add table race_results;
alter publication supabase_realtime add table chat_messages;
alter publication supabase_realtime add table race_entries;
alter publication supabase_realtime add table purchase_log;

-- RLS (Row Level Security) - разрешаем всё для anon (игра без auth)
alter table rooms enable row level security;
alter table room_players enable row level security;
alter table race_entries enable row level security;
alter table race_results enable row level security;
alter table chat_messages enable row level security;
alter table purchase_log enable row level security;

-- Политики: полный доступ для anon
create policy "rooms_all" on rooms for all using (true) with check (true);
create policy "room_players_all" on room_players for all using (true) with check (true);
create policy "race_entries_all" on race_entries for all using (true) with check (true);
create policy "race_results_all" on race_results for all using (true) with check (true);
create policy "chat_messages_all" on chat_messages for all using (true) with check (true);
create policy "purchase_log_all" on purchase_log for all using (true) with check (true);
