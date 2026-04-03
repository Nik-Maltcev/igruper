import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';

export async function signUp(email: string, password: string, username: string): Promise<{ user?: User; error?: string }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });
  if (error) return { error: error.message };
  if (data.user && !data.session) {
    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
    if (signInErr) {
      return { error: 'Registrация OK, но нужно подтвердить email.' };
    }
    return { user: signInData.user ?? undefined };
  }
  return { user: data.user ?? undefined };
}

export async function signIn(email: string, password: string): Promise<{ user?: User; error?: string }> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  return { user: data.user ?? undefined };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export function getUserName(user: User): string {
  return user.user_metadata?.username || user.email?.split('@')[0] || 'Player';
}

export async function findActiveSession(authUid: string): Promise<{ playerId: string; roomId: string } | null> {
  try {
    const { data } = await supabase
      .from('room_players')
      .select('id, room_id')
      .eq('auth_uid', authUid)
      .limit(1)
      .maybeSingle();
    if (!data) return null;
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
