-- Добавляем колонки для турниров и системы лидерства в таблицу rooms
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS tournament_state JSONB NULL;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS leader_id TEXT NULL;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS leader_streak INTEGER NOT NULL DEFAULT 0;
