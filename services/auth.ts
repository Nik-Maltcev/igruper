import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';

// Регистрация по email + пароль
export async function signUp(email: string, password: string, username: string): Promise<{ error?: string }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });
  if (error) return { error: error.message };
  // Если Supabase требует подтверждение email — user будет, но session нет
  if (data.user && !data.session) {
    return { error: 'Проверьте почту — нужно подтвердить email (или отключите Confirm email в Supabase Dashboard → Auth → Settings)' };
  }
  return {};
}

// Вход по email + пароль
export async function signIn(email: string, password: string): Promise<{ error?: string }> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  return {};
}

// Выход
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

// Получить username из метаданных
export function getUserName(user: User): string {
  return user.user_metadata?.username || user.email?.split('@')[0] || 'Игрок';
}

// Найти активную игровую сессию для auth user
export async function findActiveSession(authUid: string): Promise<{ playerId: string; roomId: string } | null> {
  const { data } = await supabase
    .from('room_players')
    .select('id, room_id')
    .eq('auth_uid', authUid)
    .limit(1)
    .single();

  if (!data) return null;

  // Проверяем что комната ещё существует
  const { data: room } = await supabase
    .from('rooms')
    .select('id, status')
    .eq('id', data.room_id)
    .single();

  if (!room) return null;

  return { playerId: data.id, roomId: data.room_id };
}
