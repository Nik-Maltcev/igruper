import { createClient } from '@supabase/supabase-js';

// ВСТАВЬТЕ СЮДА ВАШИ ДАННЫЕ ИЗ SUPABASE DASHBOARD -> SETTINGS -> API
const SUPABASE_URL = 'https://yyadrgpenmtqqvorekly.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5YWRyZ3Blbm10cXF2b3Jla2x5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA3MDk0OTQsImV4cCI6MjA4NjI4NTQ5NH0.XPhSLyndGQjQoBK7asBEw37J6ZUvFG7EDsvUxPS0Ixw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper для проверки, настроил ли пользователь ключи
export const isSupabaseConfigured = () => {
    return (SUPABASE_URL as string) !== 'https://your-project-url.supabase.co';
};