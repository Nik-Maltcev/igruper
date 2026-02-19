import React, { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { Car, Room, RoomPlayer, RoomPhase, View } from '../types';
import {
  createRoom, joinRoom, fetchPlayers, startGame,
  updateRoomPhase, sendSystemMessage,
  getScheduleDay, WEEK_SCHEDULE, resetShopVisits,
} from '../services/multiplayer';
import Chat from './Chat';

interface MultiplayerProps {
  room: Room | null;
  player: RoomPlayer | null;
  playerId: string;
  onRoomJoined: (room: Room, playerId: string) => void;
  onRoomLeft: () => void;
  onNavigate: (view: View) => void;
  onBack: () => void;
}

type Step = 'LOGIN' | 'LOBBY_SELECT' | 'ROOM' | 'GAME';

const EPOCHS_LIST = [1960, 1962, 1964, 1966, 1968, 1970, 1972, 1974, 1976, 1978,
  1980, 1982, 1984, 1986, 1988, 1990, 1992, 1994, 1996, 1998,
  2000, 2002, 2004, 2006, 2008, 2010, 2012, 2014, 2016, 2018, 2020, 2022, 2024];

const Multiplayer: React.FC<MultiplayerProps> = ({ room, player, playerId, onRoomJoined, onRoomLeft, onNavigate, onBack }) => {
  const [username, setUsername] = useState(() => localStorage.getItem('mp_username') || '');
  const [step, setStep] = useState<Step>(() => {
    if (room && room.status === 'PLAYING') return 'GAME';
    if (room) return 'ROOM';
    if (localStorage.getItem('mp_username')) return 'LOBBY_SELECT';
    return 'LOGIN';
  });
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [timeLeft, setTimeLeft] = useState('');

  // Sync step with room status
  useEffect(() => {
    if (room?.status === 'PLAYING') setStep('GAME');
    else if (room?.status === 'WAITING') setStep('ROOM');
  }, [room?.status]);

  if (!isSupabaseConfigured()) {
    return (
      <div className="p-4 max-w-2xl mx-auto text-center mt-8">
        <div className="pixel-card p-6 border-[#ff4444]">
          <div className="text-2xl mb-3">⚠</div>
          <h2 className="text-[10px] text-[#ff4444] mb-3">SUPABASE НЕ НАСТРОЕН</h2>
          <p className="text-[7px] text-[#666] mb-4">НАСТРОЙТЕ SUPABASE В services/supabase.ts</p>
          <button onClick={onBack} className="retro-btn text-[#aaa] text-[8px] py-1 px-3"
            style={{ backgroundColor: '#1a1a2e', border: '2px solid #555' }}>НАЗАД</button>
        </div>
      </div>
    );
  }

  // Realtime: players list
  useEffect(() => {
    if (!room) return;
    const channel = supabase
      .channel(`mp-players:${room.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'room_players',
        filter: `room_id=eq.${room.id}`,
      }, () => {
        fetchPlayers(room.id).then(setPlayers);
      })
      .subscribe();
    fetchPlayers(room.id).then(setPlayers);
    return () => { supabase.removeChannel(channel); };
  }, [room?.id]);

  // Timer to 22:00
  useEffect(() => {
    if (!room || room.status !== 'PLAYING') return;
    const interval = setInterval(() => {
      const now = new Date();
      const target = new Date();
      target.setHours(22, 0, 0, 0);
      if (now >= target) target.setDate(target.getDate() + 1);
      const diff = target.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [room?.status]);

  // Auto phase change at 22:00 (host only)
  useEffect(() => {
    if (!room || room.status !== 'PLAYING') return;
    const me = players.find(p => p.id === playerId);
    if (!me?.is_host) return;
    const checkPhase = setInterval(async () => {
      const now = new Date();
      if (now.getHours() === 22 && now.getMinutes() === 0 && now.getSeconds() < 15) {
        await advanceDay();
      }
    }, 10000);
    return () => clearInterval(checkPhase);
  }, [room, players, playerId]);

  const advanceDay = useCallback(async () => {
    if (!room) return;
    const nextDay = room.current_day + 1;
    const schedule = getScheduleDay(nextDay);
    let nextPhase: RoomPhase = 'TUNING';
    let nextYear = room.current_year;

    if (schedule.activity === 'RACE') {
      nextPhase = 'RACE_SETUP';
    } else if (schedule.activity === 'DEALER') {
      nextPhase = 'DEALER';
      if (nextDay > 3 && schedule.dayNum === 10) {
        const yearIdx = EPOCHS_LIST.indexOf(nextYear);
        if (yearIdx < EPOCHS_LIST.length - 1) nextYear = EPOCHS_LIST[yearIdx + 1];
      }
    }

    // Reset shop visits for all players on day change
    for (const p of players) {
      await resetShopVisits(p.id);
    }

    await updateRoomPhase(room.id, nextPhase, {
      current_day: nextDay,
      current_year: nextYear,
    } as any);

    const label = schedule.label;
    const actLabel = schedule.activity === 'RACE' ? `Гонки: ${schedule.raceType}` :
      schedule.activity === 'DEALER' ? 'Автосалон' : 'Тюнинг';
    await sendSystemMessage(room.id, `День ${nextDay}: ${label} — ${actLabel}. Эпоха ${nextYear}.`);
  }, [room, players]);

  // Handlers
  const handleLogin = () => {
    if (!username.trim()) { setError('ВВЕДИТЕ НИКНЕЙМ'); return; }
    localStorage.setItem('mp_username', username.trim());
    setError(null);
    setStep('LOBBY_SELECT');
  };

  const handleCreate = async () => {
    setError(null);
    const result = await createRoom(username);
    if ('error' in result) { setError(result.error); return; }
    onRoomJoined(result.room, result.playerId);
    setStep('ROOM');
  };

  const handleJoin = async () => {
    if (!roomCodeInput.trim()) return;
    setError(null);
    const result = await joinRoom(roomCodeInput.trim(), username);
    if ('error' in result) { setError(result.error); return; }
    onRoomJoined(result.room, result.playerId);
    setStep('ROOM');
  };

  const handleStartGame = async () => {
    if (!room || players.length < 3) return;
    await startGame(room.id);
  };

  const copyCode = () => {
    if (room?.code) {
      navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const leaveRoom = () => {
    if (window.confirm('ПОКИНУТЬ КОМНАТУ?')) {
      onRoomLeft();
      setStep('LOBBY_SELECT');
    }
  };

  const currentSchedule = room ? getScheduleDay(room.current_day) : null;
  const me = player;
