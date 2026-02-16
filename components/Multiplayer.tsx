import React, { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { Car, Room, RoomPlayer, RoomPhase } from '../types';
import {
  createRoom, joinRoom, fetchPlayers, startGame,
  updateRoomPhase, updatePlayerGarage, sendSystemMessage,
  getScheduleDay, WEEK_SCHEDULE,
} from '../services/multiplayer';
import Chat from './Chat';

interface MultiplayerProps {
  myCars: Car[];
  onBack: () => void;
}

type Step = 'LOGIN' | 'LOBBY_SELECT' | 'ROOM' | 'GAME';

const Multiplayer: React.FC<MultiplayerProps> = ({ myCars, onBack }) => {
  // Auth
  const [username, setUsername] = useState(() => localStorage.getItem('mp_username') || '');
  const [step, setStep] = useState<Step>('LOGIN');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Room state
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [playerId, setPlayerId] = useState(() => localStorage.getItem('mp_player_id') || '');

  // Timer
  const [timeLeft, setTimeLeft] = useState('');

  // Supabase check
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

  // --- Realtime подписки ---
  useEffect(() => {
    if (!room) return;

    const channel = supabase
      .channel(`mp-room:${room.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'room_players',
        filter: `room_id=eq.${room.id}`,
      }, () => {
        fetchPlayers(room.id).then(setPlayers);
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'rooms',
        filter: `id=eq.${room.id}`,
      }, (payload) => {
        setRoom(payload.new as Room);
      })
      .subscribe();

    fetchPlayers(room.id).then(setPlayers);

    return () => { supabase.removeChannel(channel); };
  }, [room?.id]);

  // --- Таймер до 22:00 ---
  useEffect(() => {
    if (!room || room.status !== 'PLAYING') return;

    const interval = setInterval(() => {
      const now = new Date();
      const target = new Date();
      target.setHours(22, 0, 0, 0);
      if (now >= target) {
        target.setDate(target.getDate() + 1);
      }
      const diff = target.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [room?.status]);

  // --- Автосмена фазы в 22:00 (только хост) ---
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

  // --- Смена дня ---
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
      // Воскресенье после Мировой Серии = смена года
      if (nextDay > 3 && schedule.dayNum === 10) {
        const yearIdx = EPOCHS_LIST.indexOf(nextYear);
        if (yearIdx < EPOCHS_LIST.length - 1) {
          nextYear = EPOCHS_LIST[yearIdx + 1];
        }
      }
    }

    await updateRoomPhase(room.id, nextPhase, {
      current_day: nextDay,
      current_year: nextYear,
    } as any);

    const label = schedule.label;
    const actLabel = schedule.activity === 'RACE' ? `Гонки: ${schedule.raceType}` :
      schedule.activity === 'DEALER' ? 'Автосалон' : 'Тюнинг';
    await sendSystemMessage(room.id, `День ${nextDay}: ${label} — ${actLabel}. Эпоха ${nextYear}.`);
  }, [room]);

  // --- Handlers ---
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
    setPlayerId(result.playerId);
    localStorage.setItem('mp_player_id', result.playerId);
    setRoom(result.room);
    setStep('ROOM');
  };

  const handleJoin = async () => {
    if (!roomCodeInput.trim()) return;
    setError(null);
    const result = await joinRoom(roomCodeInput.trim(), username);
    if ('error' in result) { setError(result.error); return; }
    setPlayerId(result.playerId);
    localStorage.setItem('mp_player_id', result.playerId);
    setRoom(result.room);
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
      setStep('LOBBY_SELECT');
      setRoom(null);
      setPlayers([]);
    }
  };

  // --- Текущий день расписания ---
  const currentSchedule = room ? getScheduleDay(room.current_day) : null;
  const me = players.find(p => p.id === playerId);

  // --- RENDER ---

  // Экран логина
  if (step === 'LOGIN') {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="pixel-card p-6 w-full max-w-md text-center">
          <h2 className="text-[10px] retro-title mb-6">🌐 МУЛЬТИПЛЕЕР</h2>
          {error && <div className="bg-[#330000] border border-[#ff4444] text-[#ff4444] text-[7px] p-2 mb-4">{error}</div>}
          <input type="text" placeholder="НИКНЕЙМ"
            className="w-full bg-[#111] border-2 border-[#333] p-2 text-[9px] text-white text-center mb-4 outline-none focus:border-[#5555ff]"
            style={{ fontFamily: 'Press Start 2P' }}
            value={username} onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
          <button onClick={handleLogin} disabled={!username.trim()}
            className="retro-btn text-[8px] py-2 px-6 w-full"
            style={{ backgroundColor: '#000066', border: '2px solid #5555ff', color: '#5555ff' }}>
            ВОЙТИ
          </button>
          <button onClick={onBack} className="text-[7px] text-[#444] mt-4 block mx-auto hover:text-[#888]">НАЗАД</button>
        </div>
      </div>
    );
  }

  // Выбор: создать / войти
  if (step === 'LOBBY_SELECT') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 gap-4">
        <h2 className="text-sm retro-title">🌐 ЛОББИ</h2>
        {error && <div className="bg-[#330000] border border-[#ff4444] text-[#ff4444] text-[7px] p-2">{error}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl">
          <div className="pixel-card p-5 text-center flex flex-col items-center gap-3">
            <div className="text-2xl">👥</div>
            <h3 className="text-[9px] text-white">СОЗДАТЬ КОМНАТУ</h3>
            <p className="text-[6px] text-[#555]">3-8 ИГРОКОВ</p>
            <button onClick={handleCreate} className="retro-btn text-[8px] py-2 px-4 w-full mt-auto"
              style={{ backgroundColor: '#000066', border: '2px solid #5555ff', color: '#5555ff' }}>СОЗДАТЬ</button>
          </div>
          <div className="pixel-card p-5 text-center flex flex-col items-center gap-3">
            <div className="text-2xl">🚪</div>
            <h3 className="text-[9px] text-white">ВОЙТИ ПО КОДУ</h3>
            <input type="text" placeholder="XXXX"
              className="w-full bg-[#111] border-2 border-[#333] p-2 text-[9px] text-white text-center uppercase outline-none focus:border-[#44ff44]"
              style={{ fontFamily: 'Press Start 2P' }} maxLength={4}
              value={roomCodeInput} onChange={(e) => setRoomCodeInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleJoin()} />
            <button onClick={handleJoin} className="retro-btn text-[8px] py-2 px-4 w-full mt-auto"
              style={{ backgroundColor: '#003300', border: '2px solid #44ff44', color: '#44ff44' }}>ВОЙТИ</button>
          </div>
        </div>
        <button onClick={() => setStep('LOGIN')} className="text-[7px] text-[#444] hover:text-[#888]">← НАЗАД</button>
      </div>
    );
  }

  // Лобби комнаты (ожидание игроков)
  if (step === 'ROOM' && room && room.status === 'WAITING') {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <div className="pixel-card p-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-[10px] retro-title mb-2">ЛОББИ</h2>
              <div className="flex items-center gap-2 bg-[#111] border border-[#333] px-3 py-1.5 inline-flex">
                <span className="text-[7px] text-[#555]">КОД:</span>
                <span className="text-[12px] text-[#4488ff]" style={{ letterSpacing: '3px' }}>{room.code}</span>
                <button onClick={copyCode} className="text-[7px] text-[#555] hover:text-[#aaa] ml-1">
                  {copied ? '✓' : '📋'}
                </button>
              </div>
              <p className="text-[6px] text-[#444] mt-1">ОТПРАВЬТЕ КОД ДРУЗЬЯМ</p>
            </div>
            <div className="text-right flex items-center gap-3">
              <div>
                <div className="text-[12px] text-white">{players.length}/{room.max_players}</div>
                <div className="text-[6px] text-[#555]">ИГРОКОВ</div>
              </div>
              <button onClick={leaveRoom} className="retro-btn text-[7px] py-1 px-2"
                style={{ backgroundColor: '#330000', border: '2px solid #ff4444', color: '#ff4444' }}>ВЫЙТИ</button>
            </div>
          </div>
        </div>

        {/* Список игроков */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {players.map(player => (
            <div key={player.id} className={`pixel-card p-3 text-center ${player.id === playerId ? 'border-[#5555ff]' : ''}`}>
              <div className="text-lg mb-1">🏎</div>
              <div className="text-[8px] text-white">
                {player.username}
                {player.is_host && <span className="text-[6px] bg-[#ffff00] text-black px-1 ml-1">HOST</span>}
              </div>
              <div className="text-[6px] text-[#555] mt-1">💰 ${player.money.toLocaleString()}</div>
              <div className="text-[6px] text-[#444]">{(player.garage as any[]).length} машин</div>
            </div>
          ))}
          {Array.from({ length: room.max_players - players.length }).map((_, i) => (
            <div key={`empty-${i}`} className="border border-dashed border-[#222] p-3 flex items-center justify-center text-[7px] text-[#333]">
              ПУСТО
            </div>
          ))}
        </div>

        {/* Кнопка старта */}
        <div className="text-center">
          {me?.is_host ? (
            <button onClick={handleStartGame} disabled={players.length < 3}
              className="retro-btn text-[9px] py-3 px-8"
              style={{
                backgroundColor: players.length >= 3 ? '#003300' : '#1a1a1a',
                border: `3px solid ${players.length >= 3 ? '#00ff00' : '#333'}`,
                color: players.length >= 3 ? '#00ff00' : '#555',
              }}>
              {players.length < 3 ? `ЖДЁМ ИГРОКОВ (${players.length}/3)...` : '▶ НАЧАТЬ ИГРУ'}
            </button>
          ) : (
            <div className="pixel-card p-4 inline-block">
              <p className="text-[8px] text-[#4488ff] blink">⏳ ОЖИДАНИЕ ХОСТА...</p>
            </div>
          )}
        </div>

        {/* Чат */}
        <Chat roomId={room.id} playerId={playerId} username={username} />
      </div>
    );
  }

  // Игра идёт
  if ((step === 'ROOM' || step === 'GAME') && room && room.status === 'PLAYING') {
    return (
      <div className="p-3 max-w-6xl mx-auto">
        {/* Верхняя панель */}
        <div className="pixel-card p-3 mb-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-[7px] text-[#555]">ЭПОХА</span>
                <div className="text-[11px] text-[#00aaff]">{room.current_year}</div>
              </div>
              <div>
                <span className="text-[7px] text-[#555]">ДЕНЬ</span>
                <div className="text-[11px] text-white">{currentSchedule?.label || '—'}</div>
              </div>
              <div>
                <span className="text-[7px] text-[#555]">ФАЗА</span>
                <div className="text-[11px]" style={{
                  color: room.phase === 'TUNING' ? '#44ff44' :
                    room.phase === 'RACE_SETUP' ? '#ffaa00' :
                      room.phase === 'RACING' ? '#ff4444' :
                        room.phase === 'DEALER' ? '#4488ff' : '#fff'
                }}>
                  {room.phase === 'TUNING' ? '🔧 ТЮНИНГ' :
                    room.phase === 'RACE_SETUP' ? '🏁 РАССТАНОВКА' :
                      room.phase === 'RACING' ? '🏎 ГОНКА' :
                        room.phase === 'RESULTS' ? '🏆 РЕЗУЛЬТАТЫ' :
                          room.phase === 'DEALER' ? '🏪 АВТОСАЛОН' : room.phase}
                </div>
              </div>
              <div>
                <span className="text-[7px] text-[#555]">ДО 22:00</span>
                <div className="text-[11px] text-[#ffff00]">{timeLeft}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[7px] text-[#555]">{username}</span>
                <div className="text-[10px] text-[#00ff00]">💰 ${me?.money?.toLocaleString() || 0}</div>
                <div className="text-[7px] text-[#ffaa00]">⭐ {me?.points || 0} очков</div>
              </div>
              <button onClick={leaveRoom} className="retro-btn text-[7px] py-1 px-2"
                style={{ backgroundColor: '#330000', border: '2px solid #ff4444', color: '#ff4444' }}>ВЫЙТИ</button>
            </div>
          </div>
        </div>

        {/* Расписание недели */}
        <div className="pixel-card p-3 mb-3">
          <div className="text-[7px] text-[#555] mb-2">РАСПИСАНИЕ НЕДЕЛИ:</div>
          <div className="flex gap-1 overflow-x-auto">
            {WEEK_SCHEDULE.slice(room.current_day <= 3 ? 0 : 3).map((day, i) => {
              const isToday = day.dayNum === (currentSchedule?.dayNum || 0);
              return (
                <div key={i} className="px-2 py-1 text-center min-w-[80px]"
                  style={{
                    backgroundColor: isToday ? '#1a1a4e' : '#111',
                    border: `1px solid ${isToday ? '#5555ff' : '#222'}`,
                  }}>
                  <div className="text-[7px]" style={{ color: isToday ? '#5555ff' : '#555' }}>{day.label}</div>
                  <div className="text-[6px]" style={{
                    color: day.activity === 'RACE' ? '#ff4444' :
                      day.activity === 'DEALER' ? '#4488ff' : '#44ff44'
                  }}>
                    {day.activity === 'RACE' ? `🏁 ${day.raceType}` :
                      day.activity === 'DEALER' ? '🏪 САЛОН' : '🔧 ТЮНИНГ'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Таблица игроков */}
        <div className="pixel-card p-3 mb-3">
          <div className="text-[7px] text-[#555] mb-2">РЕЙТИНГ ИГРОКОВ:</div>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
            {[...players].sort((a, b) => b.points - a.points).map((p, i) => (
              <div key={p.id} className={`text-center p-2 ${p.id === playerId ? 'bg-[#1a1a4e] border border-[#5555ff]' : 'bg-[#111] border border-[#222]'}`}>
                <div className="text-[8px]" style={{ color: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#888' }}>
                  #{i + 1}
                </div>
                <div className="text-[7px] text-white truncate">{p.username}</div>
                <div className="text-[7px] text-[#ffaa00]">⭐{p.points}</div>
                <div className="text-[6px] text-[#00ff00]">${p.money.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Контент фазы */}
        <div className="pixel-card p-4 text-center">
          {room.phase === 'TUNING' && (
            <div>
              <div className="text-lg mb-2">🔧</div>
              <div className="text-[10px] text-[#44ff44] mb-2">ФАЗА ТЮНИНГА</div>
              <div className="text-[7px] text-[#555]">
                Покупайте детали и тюнингуйте машины до 22:00.
                <br />Используйте вкладки ГАРАЖ и МАГАЗИН в главном меню.
              </div>
            </div>
          )}
          {room.phase === 'RACE_SETUP' && (
            <div>
              <div className="text-lg mb-2">🏁</div>
              <div className="text-[10px] text-[#ffaa00] mb-2">РАССТАНОВКА МАШИН</div>
              <div className="text-[7px] text-[#555]">
                Расставьте машины на трассы до 22:00.
                <br />Тип гонки: {currentSchedule?.raceType || '—'}
              </div>
            </div>
          )}
          {room.phase === 'RACING' && (
            <div>
              <div className="text-lg mb-2">🏎</div>
              <div className="text-[10px] text-[#ff4444] mb-2 blink">ГОНКА ИДЁТ</div>
              <div className="text-[7px] text-[#555]">Подсчёт результатов...</div>
            </div>
          )}
          {room.phase === 'RESULTS' && (
            <div>
              <div className="text-lg mb-2">🏆</div>
              <div className="text-[10px] text-[#ffd700] mb-2">РЕЗУЛЬТАТЫ</div>
              <div className="text-[7px] text-[#555]">Результаты гонок дня</div>
            </div>
          )}
          {room.phase === 'DEALER' && (
            <div>
              <div className="text-lg mb-2">🏪</div>
              <div className="text-[10px] text-[#4488ff] mb-2">АВТОСАЛОН ОТКРЫТ</div>
              <div className="text-[7px] text-[#555]">
                Покупайте машины эпохи {room.current_year} до 22:00.
                <br />Используйте вкладку АВТОСАЛОН в главном меню.
              </div>
            </div>
          )}
        </div>

        {/* Чат */}
        <Chat roomId={room.id} playerId={playerId} username={username} />
      </div>
    );
  }

  return null;
};

// Список эпох для смены года
const EPOCHS_LIST = [1960, 1962, 1964, 1966, 1968, 1970, 1972, 1974, 1976, 1978,
  1980, 1982, 1984, 1986, 1988, 1990, 1992, 1994, 1996, 1998,
  2000, 2002, 2004, 2006, 2008, 2010, 2012, 2014, 2016, 2018, 2020, 2022, 2024];

export default Multiplayer;
