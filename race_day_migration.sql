-- Добавляем колонку race_weather в таблицу rooms
-- В ней будет храниться JSON {"isRaining": true, "rainyTrackIdx": 1}
ALTER TABLE rooms ADD COLUMN race_weather JSONB NULL;

-- Создаем таблицу для результатов гоночного дня
CREATE TABLE IF NOT EXISTS race_day_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  day INT NOT NULL,
  race_id TEXT NOT NULL,
  race_name TEXT NOT NULL,
  results JSONB NOT NULL,
  weather TEXT NOT NULL, -- 'SUNNY', 'RAIN', 'STORM'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Добавляем политику для чтения всеми
CREATE POLICY "Allow read access to all users for race_day_results" 
ON race_day_results FOR SELECT USING (true);

-- Добавляем политику для вставки всеми (для простоты прототипа)
CREATE POLICY "Allow insert access to all users for race_day_results" 
ON race_day_results FOR INSERT WITH CHECK (true);

-- Добавляем политику для обновления всеми
CREATE POLICY "Allow update access to all users for race_day_results" 
ON race_day_results FOR UPDATE USING (true);

-- Добавляем политику для удаления всеми
CREATE POLICY "Allow delete access to all users for race_day_results" 
ON race_day_results FOR DELETE USING (true);

-- Включаем RLS
ALTER TABLE race_day_results ENABLE ROW LEVEL SECURITY;
