-- Добавляем колонку auth_uid в room_players для привязки к Supabase Auth
ALTER TABLE room_players ADD COLUMN IF NOT EXISTS auth_uid UUID NULL;

-- Индекс для быстрого поиска по auth_uid
CREATE INDEX IF NOT EXISTS idx_room_players_auth_uid ON room_players(auth_uid);
