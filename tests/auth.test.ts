import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getUserName } from '../services/auth';
import type { User } from '@supabase/supabase-js';

// ═══════════════════════════════════════════════════════
// getUserName (pure function, no DB calls)
// ═══════════════════════════════════════════════════════

describe('getUserName', () => {
  it('returns username from user_metadata', () => {
    const user = {
      user_metadata: { username: 'TestPlayer' },
      email: 'test@example.com',
    } as unknown as User;
    expect(getUserName(user)).toBe('TestPlayer');
  });

  it('falls back to email prefix when no username in metadata', () => {
    const user = {
      user_metadata: {},
      email: 'gamer@example.com',
    } as unknown as User;
    expect(getUserName(user)).toBe('gamer');
  });

  it('falls back to "Player" when no username and no email', () => {
    const user = {
      user_metadata: {},
      email: undefined,
    } as unknown as User;
    expect(getUserName(user)).toBe('Player');
  });

  it('falls back to "Player" when user_metadata is undefined', () => {
    const user = {
      user_metadata: undefined,
      email: undefined,
    } as unknown as User;
    expect(getUserName(user)).toBe('Player');
  });

  it('handles email with complex domain', () => {
    const user = {
      user_metadata: {},
      email: 'player.name@sub.domain.com',
    } as unknown as User;
    expect(getUserName(user)).toBe('player.name');
  });

  it('prefers username over email', () => {
    const user = {
      user_metadata: { username: 'PreferredName' },
      email: 'fallback@example.com',
    } as unknown as User;
    expect(getUserName(user)).toBe('PreferredName');
  });

  it('handles empty string username (falls back to email)', () => {
    const user = {
      user_metadata: { username: '' },
      email: 'test@example.com',
    } as unknown as User;
    // Empty string is falsy, so should fall back
    expect(getUserName(user)).toBe('test');
  });
});
