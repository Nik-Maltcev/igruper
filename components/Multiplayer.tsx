import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { Car, Room, RoomPlayer, RoomPhase, View } from '../types';
import {
  createRoom, joinRoom, fetchPlayers, startGame,
  updateRoomPhase, updateRoomState, sendSystemMessage,
  getScheduleDay, WEEK_SCHEDULE, resetShopVisits,
  fetchRaceEntries, updatePlayerState, saveRaceDayResults,
  leaveRoom as apiLeaveRoom
} from '../services/multiplayer';
import { simulateRace } from '../services/gameEngine';
import { RACES_DATA, TOURNAMENTS_DATA, getRewards } from '../constants';
import { signIn, signUp, getUserName } from '../services/auth';
import type { User } from '@supabase/supabase-js';
import Chat from './Chat';

interface MultiplayerProps {
  room: Room | null;
  player: RoomPlayer | null;
  playerId: string;
  authUser: User | null;
  onRoomJoined: (room: Room, playerId: string) => void;
  onRoomLeft: () => void;
  onLogout: () => void;
  onAuthSuccess: () => void;
  onNavigate: (view: View) => void;
  onBack: () => void;
}

type Step = 'AUTH' | 'LOBBY_SELECT' | 'ROOM' | 'GAME';

const EPOCHS_LIST = [1960, 1962, 1964, 1966, 1968, 1970, 1972, 1974, 1976, 1978,
  1980, 1982, 1984, 1986, 1988, 1990, 1992, 1994, 1996, 1998,
  2000, 2002, 2004, 2006, 2008, 2010, 2012, 2014, 2016, 2018, 2020, 2022, 2024];

const Multiplayer: React.FC<MultiplayerProps> = ({ room, player, playerId, authUser, onRoomJoined, onRoomLeft, onLogout, onAuthSuccess, onNavigate, onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [step, setStep] = useState<Step>(() => {
    if (room && room.status === 'PLAYING') return 'GAME';
    if (room) return 'ROOM';
    if (authUser) return 'LOBBY_SELECT';
    return 'AUTH';
  });
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [timeLeft, setTimeLeft] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Sync step with room status and auth
  useEffect(() => {
    if (room?.status === 'PLAYING') setStep('GAME');
    else if (room?.status === 'WAITING') setStep('ROOM');
    else if (authUser && !room) { setStep('LOBBY_SELECT'); }
    else if (!authUser) setStep('AUTH');
  }, [room?.status, authUser]);

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

  const advanceDay = useCallback(async () => {
    if (!room) return;

    try {
    // --- Если сейчас фаза RACE_SETUP — запускаем гонки и раздаём призы ---
    if (room.phase === 'RACE_SETUP') {
      const entries = await fetchRaceEntries(room.id, room.current_day);
      if (entries.length > 0) {
        // Группируем заявки по race_id
        const byRace: Record<string, typeof entries> = {};
        for (const e of entries) {
          if (!byRace[e.race_id]) byRace[e.race_id] = [];
          byRace[e.race_id].push(e);
        }

        // Для каждой гонки — симулируем и равдаём призы
        for (const [raceId, raceEntries] of Object.entries(byRace)) {
          // Собираем машины игроков
          const raceCars: Car[] = [];
          const playerMap: Record<string, string> = {}; // carId -> playerId
          for (const entry of raceEntries) {
            const player = players.find(p => p.id === entry.player_id);
            if (!player) continue;
            const car = player.garage.find((c: Car) => c.id === entry.car_id);
            if (!car) continue;
            raceCars.push(car);
            playerMap[car.id] = entry.player_id;
          }
          if (raceCars.length === 0) continue;

          // Определяем погоду для гонки
          let raceWeatherStr: 'SUNNY' | 'RAIN' | 'STORM' = 'SUNNY';
          if (room.race_weather?.isRaining) {
            // Найдем индекс гонки в раунде, чтобы проверить идет ли тут дождь
            const schedule = getScheduleDay(room.current_day);
            
            if (schedule.raceType === 'QUALIFICATION') {
              const qualData = RACES_DATA.specials?.find((s: any) => s.name === 'квалификация');
              if (qualData) {
                const raceIdx = qualData.races.findIndex((r: any) => r.name === raceId);
                if (raceIdx === room.race_weather.rainyTrackIdx) raceWeatherStr = 'RAIN';
              }
            } else {
              const epochData = RACES_DATA.epochs.find((e: any) => e.year === room.current_year);
              const roundNum = schedule.raceType === 'CITY' ? 1 : schedule.raceType === 'NATIONAL' ? 2 : 3;
              const roundData = epochData?.rounds.find((r: any) => r.round === roundNum);
              if (roundData) {
                const raceIdx = roundData.races.findIndex((r: any) => r.name === raceId);
                if (raceIdx === room.race_weather.rainyTrackIdx) {
                  raceWeatherStr = 'RAIN'; // Или STORM для экстрима, пока RAIN
                }
              }
            }
          }

          // Настоящие веса трассы (берем из RACES_DATA)
          let raceWeights = { power: 2, torque: 2, topSpeed: 3, acceleration: 2, handling: 1, offroad: 0 };
          const schedule = getScheduleDay(room.current_day);

          if (schedule.raceType === 'QUALIFICATION') {
            const numPlayers = Math.max(3, Math.min(8, players.length));
            // Ищем в specials
            const qualData = RACES_DATA.specials?.find((s: any) => s.name === 'квалификация');
            if (qualData) {
              const trackDef = qualData.races.find((r: any) => r.name === raceId);
              if (trackDef) raceWeights = trackDef.weights;
            }
          } else {
            const epochData = RACES_DATA.epochs.find((e: any) => e.year === room.current_year);
            const roundNum = schedule.raceType === 'CITY' ? 1 : schedule.raceType === 'NATIONAL' ? 2 : 3;
            const roundData = epochData?.rounds.find((r: any) => r.round === roundNum);
            if (roundData) {
              const trackDef = roundData.races.find((r: any) => r.name === raceId);
              if (trackDef) raceWeights = trackDef.weights;
            }
          }

          // Определяем таблицу наград для этого типа гонки
          const rewards = getRewards(players.length);
          let rewardTable = rewards.city; // дефолт
          if (schedule.raceType === 'QUALIFICATION') rewardTable = rewards.qualification || rewards.city;
          else if (schedule.raceType === 'CITY') rewardTable = rewards.city;
          else if (schedule.raceType === 'NATIONAL') rewardTable = rewards.national;
          else if (schedule.raceType === 'WORLD') rewardTable = rewards.worldMain;

          // Симулируем
          const results = simulateRace(raceCars, {
            id: raceId, name: raceId,
            image: '', description: '',
            weights: raceWeights,
            weatherModifier: 0.3, // Влияние погоды
          }, raceWeatherStr, false, rewardTable);

          // Сохраняем результаты в БД для экрана результатов
          await saveRaceDayResults(room.id, room.current_day, raceId, raceId, results, raceWeatherStr);

          // Раздаём призы
          for (const result of results) {
            const pid = playerMap[result.carId];
            if (!pid) continue;
            const player = players.find(p => p.id === pid);
            if (!player) continue;
            await updatePlayerState(pid, {
              money: player.money + result.earnings,
              points: player.points + result.points,
            });
            await sendSystemMessage(room.id,
              `🏁 ${result.carName}: место ${result.position} — +$${result.earnings.toLocaleString()} +${result.points}оч.`);
          }
        }
      } else {
        await sendSystemMessage(room.id, '⚠ Никто не записался на гонки в этот день.');
      }

      // === ТУРНИРЫ ===
      if (room.tournament_state && room.tournament_state.entries.length > 0) {
        let sectionIdx = -1;
        if (room.current_day === 2) sectionIdx = 0;
        else if (room.current_day === 4) sectionIdx = 1;
        else if (room.current_day === 6) sectionIdx = 2;

        if (sectionIdx !== -1) {
          const tournamentData = TOURNAMENTS_DATA.find(t => t.name === room.tournament_state!.tournamentName);
          if (tournamentData && sectionIdx < tournamentData.sections.length) {
            const section = tournamentData.sections[sectionIdx];

            const tCars: Car[] = [];
            for (const entry of room.tournament_state.entries) {
              const player = players.find(p => p.id === entry.playerId);
              if (player) {
                const car = player.garage.find(c => c.id === entry.carId);
                if (car) tCars.push(car);
              }
            }

            if (tCars.length > 0) {
              const tResults = simulateRace(tCars, {
                id: `tourn-${sectionIdx}`, name: section.name,
                image: '', description: '', weights: section.weights, weatherModifier: section.weatherModifier
              }, 'SUNNY', false);

              const newEntries = room.tournament_state.entries.map(entry => {
                const res = tResults.find(r => r.carId === entry.carId);
                if (res) {
                  const newTimes = [...entry.sectionTimes];
                  newTimes[sectionIdx] = res.time;
                  const newTotal = newTimes.reduce((acc, val) => acc + val, 0);
                  return { ...entry, sectionTimes: newTimes, totalTime: newTotal };
                }
                return entry;
              });

              const updatedTournamentState = {
                ...room.tournament_state,
                entries: newEntries,
                completedSections: sectionIdx + 1,
              };
              await updateRoomState(room.id, { tournament_state: updatedTournamentState });
              
              const sectName = sectionIdx === 0 ? 'ПЕРВЫЙ УЧАСТОК' : sectionIdx === 1 ? 'ВТОРОЙ УЧАСТОК' : 'ФИНАЛЬНЫЙ УЧАСТОК';
              await sendSystemMessage(room.id, `🏆 Турнир [${room.tournament_state.tournamentName}]: Завершён ${sectName}!`);

              if (sectionIdx === 2) {
                const sortedEntries = [...newEntries].sort((a,b) => a.totalTime - b.totalTime);
                const rewards = getRewards(players.length).tournament;
                if (rewards && rewards.length > 0) {
                  for (let i = 0; i < sortedEntries.length; i++) {
                    const place = i + 1;
                    const rwd = rewards.find(r => r.place === place) || { money: 0, points: 0, prizes: 0 };
                    if (rwd.money > 0 || rwd.points > 0) {
                       const pId = sortedEntries[i].playerId;
                       const p = players.find(pl => pl.id === pId);
                       if (p) {
                         await updatePlayerState(p.id, {
                           money: p.money + rwd.money,
                           points: p.points + rwd.points
                         });
                         await sendSystemMessage(room.id, `🏆 [${room.tournament_state.tournamentName}] ${p.username}: ${place} место! +$${rwd.money} +${rwd.points}оч.`);
                       }
                    }
                  }
                }
                
                // Разблокируем машины
                for (const player of players) {
                  let changed = false;
                  const newGarage = player.garage.map(c => {
                    if (c.lockedForTournament) {
                      changed = true;
                      return { ...c, lockedForTournament: false };
                    }
                    return c;
                  });
                  if (changed) {
                    await updatePlayerState(player.id, { garage: newGarage });
                  }
                }
              }
            }
          }
        }
      }
      // === КОНЕЦ ТУРНИРОВ ===

      // Переходим в фазу показа результатов
      await updateRoomPhase(room.id, 'RESULTS');
      await sendSystemMessage(room.id, `🏁 Гоночный день завершен. Смотрите результаты!`);
      return; // Ждем пока хост нажмет "СЛЕДУЮЩИЙ ДЕНЬ" на экране результатов
    }

    // Если фаза RESULTS — переходим к следующему дню
    if (room.phase === 'RESULTS') {
      // Очищаем погоду перед следующим днем
      await supabase.from('rooms').update({ race_weather: null }).eq('id', room.id);
    }

    const nextDay = room.current_day + 1;
    const schedule = getScheduleDay(nextDay);
    let nextPhase: RoomPhase = 'TUNING';
    let nextYear = room.current_year;
    let newLeaderId = room.leader_id || null;
    let newLeaderStreak = room.leader_streak || 0;

    // Генерируем погоду если следующий день — RACE
    let nextWeather = null;
    if (schedule.activity === 'RACE') {
      nextPhase = 'RACE_SETUP';
      // 25% шанс дождя
      const isRaining = Math.random() < 0.25;
      nextWeather = {
        isRaining,
        // Если дождь, выбираем случайную трассу из 3-х возможных в этот день (0, 1 или 2)
        rainyTrackIdx: isRaining ? Math.floor(Math.random() * 3) : null
      };
    } else if (schedule.activity === 'DEALER') {
      nextPhase = 'DEALER';
      if (nextDay > 3 && schedule.dayNum === 10) {
        // Упрощенный инкремент года
        nextYear += 2;

        // --- Система поддержки отстающих (Catch-up) ---
        const sortedPlayers = [...players].sort((a, b) => b.points - a.points);
        if (sortedPlayers.length > 0) {
          const leader = sortedPlayers[0];
          const lastPlayer = sortedPlayers[sortedPlayers.length - 1];
          const secondToLast = sortedPlayers.length >= 2 ? sortedPlayers[sortedPlayers.length - 2] : null;

          // Обновляем статистику лидерства
          if (room.leader_id === leader.id) {
            newLeaderStreak += 1;
          } else {
            newLeaderId = leader.id;
            newLeaderStreak = 1;
          }

          let lastBonus = 7000;
          let secondToLastBonus = 0;
          let leaderPenalty = 0;

          // Если лидер удерживает место >= 2 этапов подряд, он платит налог
          if (newLeaderStreak >= 2 && sortedPlayers.length >= 2) {
            leaderPenalty = 6500;
            lastBonus += 4000;
            if (secondToLast && secondToLast.id !== lastPlayer.id) {
              secondToLastBonus += 2500;
            }
          }

          if (lastBonus > 0 || secondToLastBonus > 0 || leaderPenalty > 0) {
            await sendSystemMessage(room.id, `🤝 Конец этапа: Система поддержки отстающих активирована.`);
            
            if (lastBonus > 0) {
              await updatePlayerState(lastPlayer.id, { money: lastPlayer.money + lastBonus });
              await sendSystemMessage(room.id, `💰 ${lastPlayer.username} получает +$${lastBonus.toLocaleString()} (Поддержка).`);
            }
            if (secondToLastBonus > 0 && secondToLast) {
              await updatePlayerState(secondToLast.id, { money: secondToLast.money + secondToLastBonus });
              await sendSystemMessage(room.id, `💰 ${secondToLast.username} получает +$${secondToLastBonus.toLocaleString()} (Фонд лидера).`);
            }
            if (leaderPenalty > 0) {
              await updatePlayerState(leader.id, { money: leader.money - leaderPenalty });
              await sendSystemMessage(room.id, `👑 ${leader.username} удерживает лидерство >= 2 этапов и отчисляет в фонд: -$${leaderPenalty.toLocaleString()}`);
            }
          }
        }

        // --- Установка турнира на новый год ---
        const nextTourn = TOURNAMENTS_DATA.find(t => t.years.includes(nextYear));
        if (nextTourn) {
           await updateRoomState(room.id, {
             tournament_state: {
               tournamentName: nextTourn.name,
               entries: [],
               completedSections: 0
             }
           });
           await sendSystemMessage(room.id, `🏆 ВНИМАНИЕ: В этом году (${nextYear}) проходит турнир "${nextTourn.name}"! Готовьте машины!`);
        } else {
           await updateRoomState(room.id, { tournament_state: null });
        }
      }
    }

    // Reset shop visits for all players on day change
    for (const p of players) {
      await resetShopVisits(p.id);
    }

    await updateRoomPhase(room.id, nextPhase, {
      current_day: nextDay,
      current_year: nextYear,
      race_weather: nextWeather,
      leader_id: newLeaderId,
      leader_streak: newLeaderStreak,
    } as any);

    const label = schedule.label;
    await sendSystemMessage(room.id, `⏩ Переход к дню ${nextDay}: ${label}`);
    } catch (err) {
      console.error('advanceDay error:', err);
      await sendSystemMessage(room.id, `❌ Ошибка при переключении дня: ${err instanceof Error ? err.message : String(err)}`).catch(() => {});
    }
  }, [room, players, playerId]);

  // Auto phase change at 22:00 (host only)
  const lastAutoAdvanceDate = useRef<string | null>(null);

  useEffect(() => {
    if (!room || room.status !== 'PLAYING') return;
    const me = players.find(p => p.id === playerId);
    if (!me?.is_host) return;

    const checkPhase = setInterval(async () => {
      const now = new Date();
      const todayStr = now.toDateString();
      if (now.getHours() === 22 && now.getMinutes() === 0) {
        // Убедимся, что мы не запускали перевод времени сегодня
        if (lastAutoAdvanceDate.current !== todayStr) {
          lastAutoAdvanceDate.current = todayStr;
          await advanceDay();
        }
      }
    }, 10000);
    return () => clearInterval(checkPhase);
  }, [room, players, advanceDay, playerId]);

  // Выход из игры с подтверждением
  const handleLeaveGame = async () => {
    if (!room || !playerId) return;
    if (window.confirm('ВЫ ТОЧНО ЭТОГО ХОТИТЕ? ВСЕ ДОСТИЖЕНИЯ В ИГРЕ БУДУТ ПОТЕРЯНЫ')) {
      await apiLeaveRoom(room.id, playerId);
      onRoomLeft();
    }
  };

  if (!room && step === 'ROOM') return null;

  // Handlers
  const handleAuth = async () => {
    setError(null);
    if (!email.trim()) { setError('ВВЕДИТЕ EMAIL'); return; }
    if (!password || password.length < 6) { setError('ПАРОЛЬ МИНИМУМ 6 СИМВОЛОВ'); return; }
    setAuthLoading(true);
    try {
      if (isRegister) {
        if (!username.trim()) { setError('ВВЕДИТЕ НИКНЕЙМ'); setAuthLoading(false); return; }
        const result = await signUp(email.trim(), password, username.trim());
        if (result.error) { setError(result.error); setAuthLoading(false); return; }
      } else {
        const result = await signIn(email.trim(), password);
        if (result.error) { setError(result.error); setAuthLoading(false); return; }
      }
      // Force refresh auth state
      try { onAuthSuccess(); } catch (_) { /* ignore */ }
      }
    } catch (e: any) {
      setError(e.message || 'Неизвестная ошибка');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!authUser) return;
    setError(null);
    const displayName = getUserName(authUser);
    const result = await createRoom(displayName, authUser.id);
    if ('error' in result) { setError(result.error); return; }
    onRoomJoined(result.room, result.playerId);
    setStep('ROOM');
  };

  const handleJoin = async () => {
    if (!roomCodeInput.trim() || !authUser) return;
    setError(null);
    const displayName = getUserName(authUser);
    const result = await joinRoom(roomCodeInput.trim(), displayName, authUser.id);
    if ('error' in result) { setError(result.error); return; }
    onRoomJoined(result.room, result.playerId);
    setStep('ROOM');
  };

  const handleStartGame = async () => {
    if (!room || players.length < 3) return;
    await startGame(room.id);
  };

  const copyCode = () => {
    if (room) {
      navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const leaveLobby = () => {
    if (window.confirm('ПОКИНУТЬ КОМНАТУ?')) {
      onRoomLeft();
      setStep('LOBBY_SELECT');
    }
  };

  const currentSchedule = room ? getScheduleDay(room.current_day) : null;
  const me = player;
  const displayName = authUser ? getUserName(authUser) : '';
  return (
    <div className="p-3 max-w-4xl mx-auto text-[8px]">
      <div className="pixel-card p-4 mb-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[10px] text-[#00aaff]">МУЛЬТИПЛЕЕР</h2>
          {room && <span className="text-[#888]">КОД: <b className="text-[#fff]">{room.code}</b></span>}
        </div>

        {step === 'AUTH' && (
          <div className="space-y-2">
            <p className="text-[#aaa]">{isRegister ? 'Регистрация' : 'Вход в аккаунт'}</p>
            <input
              className="w-full bg-[#0f0f1f] border border-[#333] p-2 text-[#fff]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              type="email"
            />
            <input
              className="w-full bg-[#0f0f1f] border border-[#333] p-2 text-[#fff]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Пароль"
              type="password"
            />
            {isRegister && (
              <input
                className="w-full bg-[#0f0f1f] border border-[#333] p-2 text-[#fff]"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Никнейм (будет виден в игре)"
                maxLength={20}
              />
            )}
            <div className="flex gap-2">
              <button className="retro-btn" onClick={handleAuth} disabled={authLoading}>
                {authLoading ? 'ЗАГРУЗКА...' : isRegister ? 'ЗАРЕГИСТРИРОВАТЬСЯ' : 'ВОЙТИ'}
              </button>
            </div>
            <button className="text-[#888] underline" onClick={() => { setIsRegister(!isRegister); setError(null); }}>
              {isRegister ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Регистрация'}
            </button>
          </div>
        )}

        {step === 'LOBBY_SELECT' && authUser && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[#aaa]">Привет, <span className="text-[#fff]">{getUserName(authUser)}</span></p>
              <button className="text-[#888] text-[7px] underline" onClick={onLogout}>ВЫЙТИ ИЗ АККАУНТА</button>
            </div>
            <div className="flex gap-2">
              <button className="retro-btn" onClick={handleCreate}>СОЗДАТЬ КОМНАТУ</button>
            </div>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-[#0f0f1f] border border-[#333] p-2 text-[#fff] uppercase"
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value.toUpperCase())}
                placeholder="КОД КОМНАТЫ"
                maxLength={6}
              />
              <button className="retro-btn" onClick={handleJoin}>ВОЙТИ</button>
            </div>
          </div>
        )}

        {(step === 'ROOM' || step === 'GAME') && room && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[#aaa]">Комната: <b className="text-[#fff]">{room.code}</b></div>
                <div className="text-[#666]">Игроков: {players.length}/{room.max_players}</div>
              </div>
              <button className="retro-btn" onClick={copyCode}>{copied ? 'СКОПИРОВАНО' : 'КОПИРОВАТЬ КОД'}</button>
            </div>

            <div className="pixel-card p-2 bg-[#0f0f1f]">
              <div className="text-[#aaa] mb-1">Игроки:</div>
              {[...players].sort((a, b) => b.points - a.points).map((p) => (
                <div key={p.id} className="flex justify-between text-[#ddd]">
                  <span>{p.username} {p.is_host ? '👑' : ''}</span>
                  <span className="text-[#888]">💰 {p.money.toLocaleString()} | 🏆 {p.points}</span>
                </div>
              ))}
            </div>

            {room.status === 'WAITING' && (
              <div className="flex gap-2">
                {me?.is_host && (
                  <button className="retro-btn" onClick={handleStartGame} disabled={players.length < 3}>
                    СТАРТ ({players.length}/3+)
                  </button>
                )}
                <button className="retro-btn text-[#ff8888]" onClick={handleLeaveGame}>ВЫЙТИ</button>
              </div>
            )}

            {room.status === 'PLAYING' && (
              <>
                <div className="pixel-card p-2 bg-[#101026]">
                  <div>День: <b>{room.current_day}</b> / {WEEK_SCHEDULE.length}</div>
                  <div>Эпоха: <b>{room.current_year}</b></div>
                  <div>Фаза: <b>{room.phase}</b></div>
                  {currentSchedule && <div>Сегодня: <b>{currentSchedule.label}</b> ({currentSchedule.activity})</div>}
                  <div className="flex items-center gap-2">
                    До 22:00: <b>{timeLeft || '—'}</b>
                    {me?.is_host && (
                      <button onClick={advanceDay} className="text-[8px] px-2 py-0.5 retro-btn" style={{ backgroundColor: '#663300', border: '1px solid #ffaa00', color: '#ffaa00' }}>
                        +12 ЧАСОВ ⏩
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  <button className="retro-btn" onClick={() => onNavigate('GARAGE')}>ГАРАЖ</button>
                  {/* МАГАЗИН: показываем только в фазе тюнинга */}
                  {room.phase === 'TUNING' && (
                    <button className="retro-btn" onClick={() => onNavigate('SHOP')}>МАГАЗИН</button>
                  )}
                  {/* АВТОСАЛОН: показываем только в фазе DEALER */}
                  {room.phase === 'DEALER' && (
                    <button className="retro-btn" onClick={() => onNavigate('DEALER')}>АВТОСАЛОН</button>
                  )}
                  <button className="retro-btn" style={{ borderColor: '#44ffaa', color: '#44ffaa' }} onClick={() => onNavigate('PLAYERS')}>СОПЕРНИКИ</button>
                  <button className="retro-btn" onClick={() => onNavigate('WORKLIST')}>ГОНОЧНЫЙ ЦЕНТР</button>
                  {/* Task 13: скрываем РАСПИСАНИЕ во время квалификации (дни 1-3) */}
                  {room.current_day > 3 && (
                    <button className="retro-btn" onClick={() => onNavigate('SCHEDULE')}>РАСПИСАНИЕ</button>
                  )}
                  <button className="retro-btn" onClick={() => onNavigate('RULES')}>ПРАВИЛА</button>
                  {/* Кнопка результатов гонок */}
                  {room.phase === 'RESULTS' && (
                    <button className="retro-btn text-[#00ffaa]" style={{ border: '2px solid #00ffaa' }} onClick={() => onNavigate('RACE_RESULTS')}>
                      РЕЗУЛЬТАТЫ ГОНОК
                    </button>
                  )}
                  {/* Task 16: кнопка перемотки дня только для хоста */}
                  {me?.is_host && (
                    <button className="retro-btn text-[#ffaa00]" style={{ border: '2px solid #ffaa00' }} onClick={advanceDay}>
                      {room.phase === 'RACE_SETUP' ? '▶ ЗАПУСТИТЬ ГОНКИ' : '⏩ СЛЕДУЮЩИЙ ДЕНЬ'}
                    </button>
                  )}
                  {/* Кнопка выхода из игры */}
                  <button className="retro-btn text-[#ff4444]" style={{ border: '2px solid #ff4444' }} onClick={handleLeaveGame}>
                    🚪 ВЫЙТИ ИЗ ИГРЫ
                  </button>
                </div>
              </>
            )}

            <Chat roomId={room.id} playerId={playerId} username={me?.username || displayName} />
          </div>
        )}

        {error && <div className="mt-2 text-[#ff6666]">{error}</div>}
      </div>
    </div>
  );
};

export default Multiplayer;
