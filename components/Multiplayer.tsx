import React, { useState, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { Car, Room, RoomPlayer } from '../types';
import { TRACKS } from '../constants';
import { simulateRace } from '../services/gameEngine';

interface MultiplayerProps {
  myCars: Car[];
  onBack: () => void;
}

const Multiplayer: React.FC<MultiplayerProps> = ({ myCars, onBack }) => {
  const [username, setUsername] = useState('');
  const [step, setStep] = useState<'LOGIN' | 'LOBBY_SELECT' | 'ROOM' | 'RACING' | 'RESULTS'>('LOGIN');
  const [roomCodeInput, setRoomCodeInput] = useState('');
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [playerId, setPlayerId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [progress, setProgress] = useState(0);
  const stepRef = useRef(step);
  useEffect(() => { stepRef.current = step; }, [step]);

  if (!isSupabaseConfigured()) {
    return (
      <div className="p-4 max-w-2xl mx-auto text-center mt-8">
        <div className="pixel-card p-6 border-[#ff4444]">
          <div className="text-2xl mb-3">⚠</div>
          <h2 className="text-[10px] text-[#ff4444] mb-3">SUPABASE НЕ НАСТРОЕН</h2>
          <p className="text-[7px] text-[#666] mb-4 leading-relaxed">
            ДЛЯ МУЛЬТИПЛЕЕРА НУЖНА БД.<br/>
            НАСТРОЙТЕ SUPABASE В services/supabase.ts
          </p>
          <button onClick={onBack} className="retro-btn text-[#aaa] text-[8px] py-1 px-3" style={{backgroundColor:'#1a1a2e', border:'2px solid #555'}}>НАЗАД</button>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (!currentRoom) return;
    const channel = supabase
      .channel(`room:${currentRoom.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${currentRoom.id}` }, () => {
        fetchPlayers(currentRoom.id);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${currentRoom.id}` }, (payload) => {
        const newRoom = payload.new as Room;
        setCurrentRoom(newRoom);
        if (newRoom.status === 'RACING' && stepRef.current !== 'RACING') {
          setStep('RACING');
          startRaceAnimation();
        } else if (newRoom.status === 'WAITING' && (stepRef.current === 'RESULTS' || stepRef.current === 'RACING')) {
          setStep('ROOM');
          setProgress(0);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentRoom?.id]);

  const fetchPlayers = async (roomId: string) => {
    const { data } = await supabase.from('room_players').select('*').eq('room_id', roomId);
    if (data) setPlayers(data);
  };

  const handleLogin = () => {
    setError(null);
    if (!username.trim()) { setError('ВВЕДИТЕ НИКНЕЙМ'); return; }
    if (myCars.length === 0) { setError('НЕТ МАШИН! КУПИТЕ В САЛОНЕ.'); return; }
    setStep('LOBBY_SELECT');
  };

  const createRoom = async () => {
    setError(null);
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const myId = crypto.randomUUID();
    const { data: roomData, error: roomError } = await supabase
      .from('rooms').insert({ code, status: 'WAITING', host_id: myId, track_id: TRACKS[0].id }).select().single();
    if (roomError) { setError(roomError.message); return; }
    const { error: playerError } = await supabase
      .from('room_players').insert({ id: myId, room_id: roomData.id, username, is_host: true, car_data: myCars[0] });
    if (playerError) { setError(playerError.message); return; }
    setPlayerId(myId); setCurrentRoom(roomData); fetchPlayers(roomData.id); setStep('ROOM');
  };

  const joinRoom = async () => {
    setError(null);
    if (!roomCodeInput) return;
    const { data: roomData, error: findError } = await supabase
      .from('rooms').select('*').eq('code', roomCodeInput.toUpperCase()).single();
    if (findError || !roomData) { setError('КОМНАТА НЕ НАЙДЕНА'); return; }
    if (roomData.status !== 'WAITING') { setError('ГОНКА УЖЕ ИДЁТ'); return; }
    const { count } = await supabase.from('room_players').select('*', { count: 'exact', head: true }).eq('room_id', roomData.id);
    if (count !== null && count >= 8) { setError('КОМНАТА ПОЛНА (8/8)'); return; }
    const myId = crypto.randomUUID();
    const { error: joinError } = await supabase
      .from('room_players').insert({ id: myId, room_id: roomData.id, username, is_host: false, car_data: myCars[0] });
    if (joinError) { setError(joinError.message); return; }
    setPlayerId(myId); setCurrentRoom(roomData); fetchPlayers(roomData.id); setStep('ROOM');
  };

  const startRaceHost = async () => {
    if (!currentRoom || players.length < 1) return;
    const carsForSim = players.map(p => ({ ...p.car_data, id: p.id }));
    const track = TRACKS.find(t => t.id === currentRoom.track_id) || TRACKS[0];
    const results = simulateRace(carsForSim, track, 'SUNNY', false);
    const updates = results.map(res =>
      supabase.from('room_players').update({ finish_time: res.time, position: res.position }).eq('id', res.carId)
    );
    await Promise.all(updates);
    await supabase.from('rooms').update({ status: 'RACING' }).eq('id', currentRoom.id);
  };

  const resetLobbyHost = async () => {
    if (!currentRoom) return;
    await supabase.from('room_players').update({ finish_time: null, position: null }).eq('room_id', currentRoom.id);
    await supabase.from('rooms').update({ status: 'WAITING' }).eq('id', currentRoom.id);
  };

  const startRaceAnimation = () => {
    setProgress(0);
    let p = 0;
    const interval = setInterval(() => {
      p += 0.5;
      setProgress(p);
      if (p >= 100) { clearInterval(interval); setTimeout(() => setStep('RESULTS'), 1000); }
    }, 50);
  };

  const leaveRoom = async () => {
    if (window.confirm('ПОКИНУТЬ КОМНАТУ?')) {
      setStep('LOBBY_SELECT'); setCurrentRoom(null);
    }
  };

  const copyRoomCode = () => {
    if (currentRoom?.code) {
      navigator.clipboard.writeText(currentRoom.code);
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    }
  };

  // --- RENDER ---
  if (step === 'LOGIN') {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="pixel-card p-6 w-full max-w-md text-center">
          <h2 className="text-[10px] retro-title mb-6">🌐 МУЛЬТИПЛЕЕР</h2>
          {error && <div className="bg-[#330000] border border-[#ff4444] text-[#ff4444] text-[7px] p-2 mb-4">{error}</div>}
          <input type="text" placeholder="НИКНЕЙМ"
            className="w-full bg-[#111] border-2 border-[#333] p-2 text-[9px] text-white text-center mb-4 outline-none focus:border-[#5555ff]"
            style={{fontFamily:'Press Start 2P'}}
            value={username} onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
          <button onClick={handleLogin} disabled={!username}
            className="retro-btn text-[8px] py-2 px-6 w-full"
            style={{backgroundColor:'#000066', border:'2px solid #5555ff', color:'#5555ff'}}>
            ВОЙТИ
          </button>
          <button onClick={onBack} className="text-[7px] text-[#444] mt-4 block mx-auto hover:text-[#888]">НАЗАД</button>
        </div>
      </div>
    );
  }

  if (step === 'LOBBY_SELECT') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 gap-4">
        <h2 className="text-sm retro-title">🌐 ЛОББИ</h2>
        {error && <div className="bg-[#330000] border border-[#ff4444] text-[#ff4444] text-[7px] p-2">{error}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl">
          <div className="pixel-card p-5 text-center flex flex-col items-center gap-3">
            <div className="text-2xl">👥</div>
            <h3 className="text-[9px] text-white">СОЗДАТЬ</h3>
            <p className="text-[6px] text-[#555]">СТАНЬТЕ ХОСТОМ</p>
            <button onClick={createRoom} className="retro-btn text-[8px] py-2 px-4 w-full mt-auto"
              style={{backgroundColor:'#000066', border:'2px solid #5555ff', color:'#5555ff'}}>СОЗДАТЬ</button>
          </div>
          <div className="pixel-card p-5 text-center flex flex-col items-center gap-3">
            <div className="text-2xl">🚪</div>
            <h3 className="text-[9px] text-white">ВОЙТИ</h3>
            <input type="text" placeholder="КОД"
              className="w-full bg-[#111] border-2 border-[#333] p-2 text-[9px] text-white text-center uppercase outline-none focus:border-[#44ff44]"
              style={{fontFamily:'Press Start 2P'}}
              value={roomCodeInput} onChange={(e) => setRoomCodeInput(e.target.value)} />
            <button onClick={joinRoom} className="retro-btn text-[8px] py-2 px-4 w-full mt-auto"
              style={{backgroundColor:'#003300', border:'2px solid #44ff44', color:'#44ff44'}}>ВОЙТИ</button>
          </div>
        </div>
        <button onClick={() => setStep('LOGIN')} className="text-[7px] text-[#444] hover:text-[#888]">НАЗАД</button>
      </div>
    );
  }

  if (step === 'ROOM') {
    const isHost = players.find(p => p.id === playerId)?.is_host;
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <div className="pixel-card p-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-[10px] retro-title mb-2">ОБЩЕЕ ЛОББИ</h2>
              <div className="flex items-center gap-2 bg-[#111] border border-[#333] px-3 py-1.5 inline-flex">
                <span className="text-[7px] text-[#555]">КОД:</span>
                <span className="text-[12px] text-[#4488ff]" style={{letterSpacing:'3px'}}>{currentRoom?.code}</span>
                <button onClick={copyRoomCode} className="text-[7px] text-[#555] hover:text-[#aaa] ml-1">
                  {copied ? '✓' : '📋'}
                </button>
              </div>
              <p className="text-[6px] text-[#444] mt-1">ОТПРАВЬТЕ КОД ДРУГУ</p>
            </div>
            <div className="text-right flex items-center gap-3">
              <div>
                <div className="text-[12px] text-white">{players.length}/8</div>
                <div className="text-[6px] text-[#555]">ИГРОКОВ</div>
              </div>
              <button onClick={leaveRoom} className="retro-btn text-[7px] py-1 px-2"
                style={{backgroundColor:'#330000', border:'2px solid #ff4444', color:'#ff4444'}}>ВЫЙТИ</button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {players.map(player => (
            <div key={player.id} className={`pixel-card p-3 flex items-center gap-3 ${player.id === playerId ? 'border-[#5555ff]' : ''}`}>
              <div className="w-8 h-8 bg-[#111] border border-[#333] flex items-center justify-center text-sm">🏎</div>
              <div>
                <div className="text-[8px] text-white flex items-center gap-1">
                  {player.username}
                  {player.is_host && <span className="text-[6px] bg-[#ffff00] text-black px-1">HOST</span>}
                </div>
                <div className="text-[6px] text-[#555]">{player.car_data.name}</div>
              </div>
            </div>
          ))}
          {Array.from({ length: 8 - players.length }).map((_, i) => (
            <div key={i} className="border border-dashed border-[#222] p-3 flex items-center justify-center text-[7px] text-[#333]">
              ПУСТО
            </div>
          ))}
        </div>

        <div className="text-center">
          {isHost ? (
            <button onClick={startRaceHost} disabled={players.length < 2}
              className="retro-btn text-[9px] py-3 px-8"
              style={{backgroundColor: players.length >= 2 ? '#330000' : '#1a1a1a', border:`3px solid ${players.length >= 2 ? '#ff4444' : '#333'}`, color: players.length >= 2 ? '#ff4444' : '#555'}}>
              {players.length < 2 ? 'ЖДЁМ ИГРОКОВ...' : '▶ НАЧАТЬ ГОНКУ'}
            </button>
          ) : (
            <div className="pixel-card p-4 inline-block">
              <p className="text-[8px] text-[#4488ff] blink">⏳ ОЖИДАНИЕ ХОСТА...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (step === 'RACING') {
    return (
      <div className="flex flex-col items-center justify-center py-12 p-4 space-y-6">
        <h2 className="text-sm retro-title blink">ОНЛАЙН ЗАЕЗД</h2>
        <div className="w-full max-w-3xl pixel-card p-4 space-y-3">
          {players.map(p => (
            <div key={p.id}>
              <div className="flex justify-between text-[7px] text-[#555] mb-1">
                <span>{p.username}</span><span>{p.car_data.name}</span>
              </div>
              <div className="w-full h-5 bg-[#111] border border-[#222] relative overflow-hidden">
                <div className={`absolute top-0 left-0 h-full transition-all ${p.id === playerId ? 'bg-[#000066] border-r-2 border-[#5555ff]' : 'bg-[#222] border-r-2 border-[#555]'}`}
                  style={{width:`${Math.min(100, progress * (0.9 + Math.random() * 0.2))}%`}} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (step === 'RESULTS') {
    const sortedPlayers = [...players].sort((a, b) => (a.position || 99) - (b.position || 99));
    const isHost = players.find(p => p.id === playerId)?.is_host;
    return (
      <div className="flex flex-col items-center py-8 p-4">
        <div className="text-3xl mb-3">🏆</div>
        <h2 className="text-sm retro-title mb-6">РЕЗУЛЬТАТЫ</h2>
        <div className="w-full max-w-2xl pixel-card overflow-hidden">
          <div className="grid grid-cols-4 bg-[#111] p-2 text-[7px] text-[#555] uppercase border-b border-[#222]">
            <span>ПОЗ</span><span>ГОНЩИК</span><span>АВТО</span><span className="text-right">ВРЕМЯ</span>
          </div>
          {sortedPlayers.map(p => (
            <div key={p.id}
              className={`grid grid-cols-4 p-2 text-[8px] border-b border-[#111] ${p.id === playerId ? 'text-white bg-[#000066]/20' : 'text-[#666]'}`}>
              <span>{p.position === 1 ? '🥇' : p.position === 2 ? '🥈' : p.position === 3 ? '🥉' : `#${p.position || '-'}`}</span>
              <span>{p.username}</span>
              <span className="text-[#555]">{p.car_data.name}</span>
              <span className="text-right text-[#00ff00]">{p.finish_time?.toFixed(3) || 'DNF'}s</span>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-col items-center gap-3">
          {isHost ? (
            <button onClick={resetLobbyHost} className="retro-btn text-[8px] py-2 px-6"
              style={{backgroundColor:'#000066', border:'2px solid #5555ff', color:'#5555ff'}}>
              СЛЕДУЮЩАЯ ГОНКА ▶
            </button>
          ) : (
            <div className="text-[7px] text-[#4488ff] blink">⏳ ОЖИДАНИЕ ХОСТА...</div>
          )}
          <button onClick={leaveRoom} className="text-[6px] text-[#444] hover:text-[#ff4444]">ПОКИНУТЬ КОМНАТУ</button>
        </div>
      </div>
    );
  }

  return null;
};

export default Multiplayer;
