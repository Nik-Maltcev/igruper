import React, { useState, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { Car, Room, RoomPlayer, RaceResult } from '../types';
import { TRACKS } from '../constants';
import { simulateRace } from '../services/gameEngine';
import { Users, Play, LogIn, AlertTriangle, CarFront, Trophy, RefreshCw, Copy, Check, ArrowRight, LogOut, Loader2 } from 'lucide-react';

interface MultiplayerProps {
  myCars: Car[];
  onBack: () => void;
}

const Multiplayer: React.FC<MultiplayerProps> = ({ myCars, onBack }) => {
  const [username, setUsername] = useState('');
  const [step, setStep] = useState<'LOGIN' | 'LOBBY_SELECT' | 'ROOM' | 'RACING' | 'RESULTS'>('LOGIN');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  
  // Room State
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [playerId, setPlayerId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // UI State
  const [copied, setCopied] = useState(false);

  // Race Animation State
  const [progress, setProgress] = useState(0);
  
  // Ref for current step to use inside useEffect closure if needed
  const stepRef = useRef(step);
  useEffect(() => { stepRef.current = step; }, [step]);

  // Проверка конфига Supabase
  if (!isSupabaseConfigured()) {
     return (
        <div className="p-8 max-w-2xl mx-auto text-center mt-10 bg-gray-800 rounded-xl border border-red-500">
            <AlertTriangle size={48} className="mx-auto text-red-500 mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Supabase не настроен</h2>
            <p className="text-gray-400 mb-6">
                Для работы мультиплеера необходимо подключить базу данных.
            </p>
            <div className="text-left bg-black p-4 rounded text-xs font-mono text-green-400 overflow-x-auto">
                <p className="mb-2 text-gray-500">1. Создайте проект на supabase.com</p>
                <p className="mb-2 text-gray-500">2. Выполните этот SQL в SQL Editor:</p>
                <pre>{`
create table rooms (
  id uuid default gen_random_uuid() primary key,
  code text unique not null,
  status text default 'WAITING',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  host_id uuid,
  track_id text
);

create table room_players (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references rooms(id) on delete cascade,
  username text not null,
  is_host boolean default false,
  car_data jsonb,
  finish_time float,
  position int
);
                `}</pre>
                <p className="mt-4 mb-2 text-gray-500">3. Вставьте URL и ANON KEY в файл <code>services/supabase.ts</code></p>
            </div>
            <button onClick={onBack} className="mt-6 px-4 py-2 bg-gray-700 rounded text-white hover:bg-gray-600">Вернуться назад</button>
        </div>
     );
  }

  // Realtime subscription setup
  useEffect(() => {
    if (!currentRoom) return;

    const channel = supabase
      .channel(`room:${currentRoom.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${currentRoom.id}` }, (payload) => {
        fetchPlayers(currentRoom.id);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${currentRoom.id}` }, (payload) => {
        const newRoom = payload.new as Room;
        setCurrentRoom(newRoom);
        
        // Logic to handle state transitions based on Room Status
        if (newRoom.status === 'RACING' && stepRef.current !== 'RACING') {
             setStep('RACING');
             startRaceAnimation();
        } else if (newRoom.status === 'WAITING' && (stepRef.current === 'RESULTS' || stepRef.current === 'RACING')) {
             // Host reset the lobby for next race
             setStep('ROOM');
             setProgress(0);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentRoom?.id]);

  const fetchPlayers = async (roomId: string) => {
    const { data } = await supabase.from('room_players').select('*').eq('room_id', roomId);
    if (data) setPlayers(data);
  };

  const handleLogin = () => {
    setError(null);
    if (!username.trim()) {
        setError("Пожалуйста, введите никнейм");
        return;
    }
    if (myCars.length === 0) {
        setError("У вас нет машин! Купите машину в Автосалоне перед гонкой.");
        return;
    }
    setStep('LOBBY_SELECT');
  };

  const createRoom = async () => {
    setError(null);
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const myId = crypto.randomUUID();
    
    // 1. Create Room
    const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .insert({ 
            code, 
            status: 'WAITING', 
            host_id: myId, 
            track_id: TRACKS[0].id // Default track
        })
        .select()
        .single();

    if (roomError) {
        setError(roomError.message);
        return;
    }

    // 2. Add Host as Player
    const { error: playerError } = await supabase
        .from('room_players')
        .insert({
            id: myId,
            room_id: roomData.id,
            username,
            is_host: true,
            car_data: myCars[0] // Select first car automatically for demo
        });

    if (playerError) {
        setError(playerError.message);
        return;
    }

    setPlayerId(myId);
    setCurrentRoom(roomData);
    fetchPlayers(roomData.id);
    setStep('ROOM');
  };

  const joinRoom = async () => {
    setError(null);
    if(!roomCodeInput) return;

    // 1. Find Room
    const { data: roomData, error: findError } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', roomCodeInput.toUpperCase())
        .single();

    if (findError || !roomData) {
        setError("Комната не найдена");
        return;
    }

    if (roomData.status !== 'WAITING') {
        setError("Гонка уже началась или завершена");
        return;
    }

    // 2. Check Capacity (Max 8)
    const { count } = await supabase
        .from('room_players')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', roomData.id);

    if (count !== null && count >= 8) {
        setError("Комната переполнена (8/8)");
        return;
    }

    // 3. Join
    const myId = crypto.randomUUID();
    const { error: joinError } = await supabase
        .from('room_players')
        .insert({
            id: myId,
            room_id: roomData.id,
            username,
            is_host: false,
            car_data: myCars[0]
        });

    if (joinError) {
        setError(joinError.message);
        return;
    }

    setPlayerId(myId);
    setCurrentRoom(roomData);
    fetchPlayers(roomData.id);
    setStep('ROOM');
  };

  const startRaceHost = async () => {
    if (!currentRoom || players.length < 1) return;

    // 1. Calculate Results Locally for Fairness (Host is authority)
    // Convert players to "Car" format expected by engine
    const carsForSim = players.map(p => ({
        ...p.car_data,
        id: p.id // Use player ID as car ID for mapping results back
    }));
    
    // Choose track (mocking track selection for now)
    const track = TRACKS.find(t => t.id === currentRoom.track_id) || TRACKS[0];
    
    // ВАЖНО: передаем false в 4-м аргументе, чтобы отключить ботов
    const results = simulateRace(carsForSim, track, 'SUNNY', false);

    // 2. Update all players with their finish times in DB
    const updates = results.map(res => {
        return supabase
            .from('room_players')
            .update({ finish_time: res.time, position: res.position })
            .eq('id', res.carId);
    });
    
    await Promise.all(updates);

    // 3. Set Room Status to RACING
    await supabase
        .from('rooms')
        .update({ status: 'RACING' })
        .eq('id', currentRoom.id);
  };

  const resetLobbyHost = async () => {
      if (!currentRoom) return;

      // 1. Reset players status
      await supabase
        .from('room_players')
        .update({ finish_time: null, position: null })
        .eq('room_id', currentRoom.id);

      // 2. Set Room Status to WAITING (Triggers transition on clients)
      await supabase
        .from('rooms')
        .update({ status: 'WAITING' })
        .eq('id', currentRoom.id);
  };

  const startRaceAnimation = () => {
    setProgress(0);
    let p = 0;
    const interval = setInterval(() => {
      p += 0.5; // Slower for effect
      setProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        setTimeout(() => setStep('RESULTS'), 1000);
      }
    }, 50);
  };

  const leaveRoom = async () => {
      if (window.confirm("Вы уверены, что хотите покинуть группу?")) {
        setStep('LOBBY_SELECT');
        setCurrentRoom(null);
        // Optional: Delete player record from DB logic here
      }
  };

  const copyRoomCode = () => {
    if (currentRoom?.code) {
        navigator.clipboard.writeText(currentRoom.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }
  };

  // --- RENDER ---

  if (step === 'LOGIN') {
      return (
          <div className="flex items-center justify-center h-full p-4">
              <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 w-full max-w-md text-center">
                  <h2 className="text-2xl font-bold text-white mb-6 uppercase italic">Мультиплеер Вход</h2>
                  
                  {error && (
                    <div className="mb-4 bg-red-900/50 border border-red-500 text-red-200 p-3 rounded text-sm">
                        {error}
                    </div>
                  )}

                  <input 
                    type="text" 
                    placeholder="Введите ваш никнейм"
                    className="w-full bg-gray-900 border border-gray-600 rounded p-3 text-white mb-4 focus:border-blue-500 outline-none"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  />
                  <button 
                    onClick={handleLogin}
                    disabled={!username}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded uppercase transition-colors disabled:opacity-50"
                  >
                    Войти
                  </button>
                  <button onClick={onBack} className="mt-4 text-gray-400 hover:text-white text-sm">Назад в меню</button>
              </div>
          </div>
      );
  }

  if (step === 'LOBBY_SELECT') {
      return (
        <div className="flex flex-col items-center justify-center h-full p-4 gap-6">
             <h2 className="text-3xl font-bold text-white uppercase italic">Лобби</h2>
             {error && <div className="bg-red-500/20 text-red-200 p-3 rounded border border-red-500">{error}</div>}
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
                 <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex flex-col items-center gap-4 hover:border-blue-500 transition-colors">
                     <Users size={48} className="text-blue-400" />
                     <h3 className="text-xl font-bold text-white">Создать комнату</h3>
                     <p className="text-gray-400 text-center text-sm">Станьте хостом и выберите трассу.</p>
                     <button onClick={createRoom} className="mt-auto px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold w-full">Создать</button>
                 </div>

                 <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex flex-col items-center gap-4 hover:border-green-500 transition-colors">
                     <LogIn size={48} className="text-green-400" />
                     <h3 className="text-xl font-bold text-white">Присоединиться</h3>
                     <input 
                        type="text" 
                        placeholder="Код комнаты"
                        className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-center text-white font-mono uppercase"
                        value={roomCodeInput}
                        onChange={(e) => setRoomCodeInput(e.target.value)}
                     />
                     <button onClick={joinRoom} className="mt-auto px-6 py-2 bg-green-600 hover:bg-green-500 text-white rounded font-bold w-full">Войти</button>
                 </div>
             </div>
             <button onClick={() => setStep('LOGIN')} className="text-gray-400 hover:text-white">Назад</button>
        </div>
      );
  }

  if (step === 'ROOM') {
      const isHost = players.find(p => p.id === playerId)?.is_host;

      return (
          <div className="p-4 max-w-4xl mx-auto">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-gray-800/50 p-6 rounded-xl border border-gray-700">
                  <div>
                      <h2 className="text-3xl font-bold text-white uppercase italic mb-2">Общее Лобби</h2>
                      <div className="flex items-center gap-3 bg-gray-900 px-4 py-2 rounded-lg border border-gray-600 inline-flex">
                          <span className="text-gray-400 text-sm font-bold uppercase">Код:</span>
                          <span className="text-2xl font-mono font-black text-blue-400 tracking-widest select-all">{currentRoom?.code}</span>
                          <button 
                            onClick={copyRoomCode}
                            className="ml-2 p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
                            title="Копировать код"
                          >
                            {copied ? <Check size={18} className="text-green-400"/> : <Copy size={18} />}
                          </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Отправьте этот код другу, чтобы он вошел.</p>
                  </div>

                  <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                       <div className="text-right">
                          <div className="text-2xl font-bold text-white">{players.length} / 8</div>
                          <div className="text-xs text-gray-400 uppercase">Игроков</div>
                       </div>
                       <button onClick={leaveRoom} className="text-red-400 hover:text-red-300 bg-red-900/20 p-2 rounded flex items-center gap-2 text-xs font-bold" title="Отключиться">
                            <LogOut size={16} /> Выйти
                       </button>
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                  {players.map(player => (
                      <div key={player.id} className={`p-4 rounded-xl border-2 flex items-center gap-4 ${player.id === playerId ? 'bg-blue-900/20 border-blue-500' : 'bg-gray-800 border-gray-700'}`}>
                           <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center">
                               <CarFront className="text-gray-400" />
                           </div>
                           <div>
                               <div className="font-bold text-white flex items-center gap-2">
                                   {player.username}
                                   {player.is_host && <span className="text-[10px] bg-yellow-600 px-1 rounded text-black font-bold">HOST</span>}
                               </div>
                               <div className="text-xs text-gray-500">{player.car_data.name} (R{player.car_data.stats.speed + player.car_data.stats.handling})</div>
                           </div>
                      </div>
                  ))}
                  
                  {/* Empty Slots */}
                  {Array.from({ length: 8 - players.length }).map((_, i) => (
                      <div key={i} className="p-4 rounded-xl border border-dashed border-gray-700 bg-gray-900/50 flex items-center justify-center text-gray-600">
                          Пустой слот
                      </div>
                  ))}
              </div>

              {isHost ? (
                  <div className="text-center">
                      <button 
                        onClick={startRaceHost}
                        disabled={players.length < 2} // Need at least 2 for fun
                        className="px-12 py-4 bg-gradient-to-r from-red-600 to-orange-600 rounded-lg font-black uppercase text-white tracking-widest shadow-lg hover:from-red-500 hover:to-orange-500 text-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95"
                      >
                          {players.length < 2 ? 'Ожидание Игроков...' : 'НАЧАТЬ ГОНКУ (PVP)'}
                      </button>
                      {players.length < 2 && (
                          <div className="flex items-center justify-center gap-2 text-gray-500 text-sm mt-4 animate-pulse">
                              <Loader2 className="animate-spin" size={16} />
                              Ожидание подключения второго игрока...
                          </div>
                      )}
                  </div>
              ) : (
                  <div className="text-center p-8 bg-gray-800 rounded-xl animate-pulse">
                      <h3 className="text-xl font-bold text-blue-400 flex items-center justify-center gap-3">
                           <RefreshCw className="animate-spin" /> Ожидание Хоста...
                      </h3>
                      <p className="text-gray-500 text-sm mt-2">Гонка начнется автоматически, когда хост нажмет старт</p>
                  </div>
              )}
          </div>
      );
  }

  if (step === 'RACING') {
      return (
        <div className="flex-grow flex flex-col items-center justify-center space-y-8 animate-fade-in h-full p-4">
            <h2 className="text-4xl font-black italic text-white animate-pulse">ОНЛАЙН ЗАЕЗД</h2>
            
            <div className="w-full max-w-3xl bg-gray-800 rounded-xl border border-gray-700 p-6 flex flex-col gap-4">
                 {players.map((p, idx) => {
                     return (
                        <div key={p.id} className="relative">
                            <div className="flex justify-between text-xs text-gray-400 mb-1">
                                <span>{p.username}</span>
                                <span>{p.car_data.name}</span>
                            </div>
                            <div className="w-full h-8 bg-gray-900 rounded-full overflow-hidden relative">
                                <div 
                                    className={`absolute top-0 left-0 h-full transition-all duration-300 ease-linear flex items-center justify-end px-2 ${p.id === playerId ? 'bg-blue-600' : 'bg-gray-600'}`}
                                    style={{ 
                                        width: `${Math.min(100, progress * (0.9 + Math.random() * 0.2))}%` 
                                    }}
                                >
                                    <CarFront size={16} className="text-white transform rotate-90" />
                                </div>
                            </div>
                        </div>
                     )
                 })}
            </div>
        </div>
      );
  }

  if (step === 'RESULTS') {
      // Sort players by position (if calculated) or time
      const sortedPlayers = [...players].sort((a, b) => (a.position || 99) - (b.position || 99));
      const isHost = players.find(p => p.id === playerId)?.is_host;

      return (
        <div className="flex flex-col items-center justify-center p-4 animate-fade-in">
            <Trophy size={64} className="text-yellow-400 mb-4" />
            <h2 className="text-3xl font-bold text-white mb-6">Результаты Заезда</h2>
            
            <div className="w-full max-w-2xl bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
                <table className="w-full">
                    <thead className="bg-gray-900 text-gray-400 text-xs uppercase">
                        <tr>
                            <th className="p-3 text-left">Поз</th>
                            <th className="p-3 text-left">Гонщик</th>
                            <th className="p-3 text-left">Авто</th>
                            <th className="p-3 text-right">Время</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {sortedPlayers.map((p) => (
                            <tr key={p.id} className={p.id === playerId ? 'bg-blue-900/30 text-white font-bold' : 'text-gray-300'}>
                                <td className="p-3">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${p.position === 1 ? 'bg-yellow-500 text-black' : 'bg-gray-700'}`}>
                                        {p.position || '-'}
                                    </div>
                                </td>
                                <td className="p-3">{p.username}</td>
                                <td className="p-3 text-sm text-gray-500">{p.car_data.name}</td>
                                <td className="p-3 text-right font-mono text-green-400">{p.finish_time?.toFixed(3) || 'DNF'}s</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-8 flex flex-col items-center gap-4">
                {isHost ? (
                     <button 
                        onClick={resetLobbyHost}
                        className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded font-bold flex items-center gap-2 text-lg shadow-lg"
                     >
                        Следующая гонка <ArrowRight size={20} />
                     </button>
                ) : (
                    <div className="flex items-center gap-2 text-blue-400 animate-pulse bg-blue-900/20 px-4 py-2 rounded-full border border-blue-900">
                        <RefreshCw size={16} className="animate-spin" /> Ожидание хоста...
                    </div>
                )}
                
                <button 
                    onClick={leaveRoom}
                    className="text-gray-500 hover:text-red-400 text-sm mt-4 underline decoration-dotted"
                >
                    Покинуть комнату навсегда
                </button>
            </div>
        </div>
      );
  }

  return null;
};

export default Multiplayer;