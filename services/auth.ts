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
  // Если нет сессии после регистрации — возможно требуется подтверждение email
  if (data.user && !data.session) {
    // Пробуем сразу залогиниться
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
    if (signInErr) {
      return { error: 'Регистрация прошла, но нужно подтвердить email. Проверьте почту.' };
    }
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
  try {
    const { data } = await supabase
      .from('room_players')
      .select('id, room_id')
      .eq('auth_uid', authUid)
      .limit(1)
      .maybeSingle();

    if (!data) return null;

    // Проверяем что комната ещё существует
    const { data: room } = await supabase
      .from('rooms')
      .select('id, status')
      .eq('id', data.room_id)
      .maybeSingle();

    if (!room) return null;

    return { playerId: data.id, roomId: data.room_id };
  } catch {
    return null;
  }
}
