import React, { useState, useEffect, useCallback } from 'react';
import { View, Room, RoomPlayer, Car, Part, RaceResult } from './types';
import { EPOCHS } from './constants';
import { supabase } from './services/supabase';
import {
  fetchPlayer, fetchPurchaseCounts,
  buyPart, buyCar, removePart, removePartToStorage, installFromStorage,
} from './services/multiplayer';

import Garage from './components/Garage';
import Dealer from './components/Dealer';
import Marketplace from './components/Marketplace';
import RaceCenter from './components/RaceCenter';
import Multiplayer from './components/Multiplayer';
import Rules from './components/Rules';
import RaceSchedule from './components/RaceSchedule';
import RaceResults from './components/RaceResults';
import Players from './components/Players';

const App = () => {
  // ╨Ь╤Г╨╗╤М╤В╨╕╨┐╨╗╨╡╨╡╤А тАФ ╨╛╤Б╨╜╨╛╨▓╨╜╨╛╨╣ ╤А╨╡╨╢╨╕╨╝
  const [room, setRoom] = useState<Room | null>(null);
  const [playerId, setPlayerId] = useState<string>(() => localStorage.getItem('mp_player_id') || '');
  const [player, setPlayer] = useState<RoomPlayer | null>(null);
  const [currentView, setCurrentView] = useState<View>('MULTIPLAYER');
  const [purchaseCounts, setPurchaseCounts] = useState<Record<string, number>>({});
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  // Task 18: ╨Я╤А╨╕ ╨╖╨░╨│╤А╤Г╨╖╨║╨╡ ╤Б╤В╤А╨░╨╜╨╕╤Ж╤Л ╨▓╨╛╤Б╤Б╤В╨░╨╜╨░╨▓╨╗╨╕╨▓╨░╨╡╨╝ ╤Б╨╡╤Б╤Б╨╕╤О ╨╕╨╖ localStorage
  useEffect(() => {
    const savedPlayerId = localStorage.getItem('mp_player_id');
    const savedRoomId = localStorage.getItem('mp_room_id');
    if (savedPlayerId && savedRoomId && !room) {
      // ╨Я╤А╨╛╨▒╤Г╨╡╨╝ ╨▓╨╛╤Б╤Б╤В╨░╨╜╨╛╨▓╨╕╤В╤М ╨╕╨│╤А╨╛╨║╨░ ╨╕ ╨║╨╛╨╝╨╜╨░╤В╤Г
      supabase.from('room_players').select('*').eq('id', savedPlayerId).single().then(({ data: pData }) => {
        if (!pData) {
          localStorage.removeItem('mp_player_id');
          localStorage.removeItem('mp_room_id');
          setIsLoadingSession(false);
          return;
        }
        supabase.from('rooms').select('*').eq('id', savedRoomId).single().then(({ data: rData }) => {
          if (!rData) {
            localStorage.removeItem('mp_player_id');
            localStorage.removeItem('mp_room_id');
            setIsLoadingSession(false);
            return;
          }
          setPlayerId(savedPlayerId);
          setPlayer(pData as any);
          setRoom(rData as Room);
          setIsLoadingSession(false);
        });
      });
    } else {
      setIsLoadingSession(false);
    }
  }, []);

  // ╨Ч╨░╨│╤А╤Г╨╖╨║╨░ ╨┤╨░╨╜╨╜╤Л╤Е ╨╕╨│╤А╨╛╨║╨░ ╨┐╤А╨╕ ╨╜╨░╨╗╨╕╤З╨╕╨╕ playerId
  const refreshPlayer = useCallback(async () => {
    if (!playerId) return;
    const p = await fetchPlayer(playerId);
    if (p) setPlayer(p);
  }, [playerId]);

  // ╨Ч╨░╨│╤А╤Г╨╖╨║╨░ ╨║╨╛╨╝╨╜╨░╤В╤Л ╨┐╤А╨╕ ╨╜╨░╨╗╨╕╤З╨╕╨╕ room
  const refreshRoom = useCallback(async () => {
    if (!room) return;
    const { data } = await supabase.from('rooms').select('*').eq('id', room.id).single();
    if (data) setRoom(data as Room);
  }, [room?.id]);

  // Realtime ╨┐╨╛╨┤╨┐╨╕╤Б╨║╨░ ╨╜╨░ ╨┤╨░╨╜╨╜╤Л╨╡ ╨╕╨│╤А╨╛╨║╨░
  useEffect(() => {
    if (!playerId) return;
    refreshPlayer();
    const channel = supabase
      .channel(`player:${playerId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'room_players',
        filter: `id=eq.${playerId}`,
      }, () => { refreshPlayer(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [playerId]);

  // Realtime ╨┐╨╛╨┤╨┐╨╕╤Б╨║╨░ ╨╜╨░ ╨║╨╛╨╝╨╜╨░╤В╤Г
  useEffect(() => {
    if (!room) return;
    const channel = supabase
      .channel(`room:${room.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'rooms',
        filter: `id=eq.${room.id}`,
      }, () => { refreshRoom(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [room?.id]);

  // ╨Ч╨░╨│╤А╤Г╨╖╨║╨░ purchase counts ╨┐╤А╨╕ ╨▓╤Е╨╛╨┤╨╡ ╨▓ ╨║╨╛╨╝╨╜╨░╤В╤Г
  useEffect(() => {
    if (!room) return;
    fetchPurchaseCounts(room.id).then(setPurchaseCounts);
    const channel = supabase
      .channel(`purchases:${room.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'purchase_log',
        filter: `room_id=eq.${room.id}`,
      }, () => { fetchPurchaseCounts(room.id).then(setPurchaseCounts); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [room?.id]);

  // ╨Ю╨▒╤А╨░╨▒╨╛╤В╤З╨╕╨║╨╕
  const handleRoomJoined = (r: Room, pid: string) => {
    setRoom(r);
    setPlayerId(pid);
    localStorage.setItem('mp_player_id', pid);
    localStorage.setItem('mp_room_id', r.id);
  };

  const handleRoomLeft = () => {
    setRoom(null);
    setPlayer(null);
    setPlayerId('');
    localStorage.removeItem('mp_player_id');
    localStorage.removeItem('mp_room_id');
    setCurrentView('MULTIPLAYER');
  };

  const navigate = (view: View) => setCurrentView(view);

  const handleBuyCar = async (car: Car) => {
    if (!player || !room) return;
    const result = await buyCar(player, car, room.id);
    if (result.error) { alert(result.error); return; }
    await refreshPlayer();
    alert(`╨Т╤Л ╨║╤Г╨┐╨╕╨╗╨╕ ${car.name}!`);
  };

  const handleBuyPart = async (carId: string, part: Part) => {
    if (!player) return;
    const result = await buyPart(player, carId, part);
    if (result.error) { alert(result.error); return; }
    await refreshPlayer();
  };

  const handleRemovePart = async (carId: string, partIndex: number) => {
    if (!player) return;
    await removePart(player, carId, partIndex);
    await refreshPlayer();
  };

  const handleRemovePartToStorage = async (carId: string, partIndex: number) => {
    if (!player) return;
    await removePartToStorage(player, carId, partIndex);
    await refreshPlayer();
  };

  const handleInstallFromStorage = async (carId: string, storageIndex: number) => {
    if (!player) return;
    await installFromStorage(player, carId, storageIndex);
    await refreshPlayer();
  };

  const handleRaceComplete = async (results: RaceResult[]) => {
    // TODO: ╨╖╨░╨┐╨╕╤Б╨░╤В╤М ╤А╨╡╨╖╤Г╨╗╤М╤В╨░╤В╤Л ╨▓ Supabase
    const totalEarnings = results.filter(r => !r.carId.startsWith('bot')).reduce((sum, r) => sum + r.earnings, 0);
    if (player && totalEarnings > 0) {
      await supabase.from('room_players').update({ money: player.money + totalEarnings }).eq('id', playerId);
      await refreshPlayer();
    }
  };

  // ╨Ф╨╢╨░╨╝╤И╤Г╤В: ╤Б╨╜╤П╤В╤М ╨┤╨╡╤В╨░╨╗╤М ╨▒╨╡╨╖╨▓╨╛╨╖╨▓╤А╨░╤В╨╜╨╛ + ╨╖╨░╨┐╨╕╤Б╨░╤В╤М ╨▓╨╕╨╖╨╕╤В
  const handleJamshutRemove = async (carId: string, partIndex: number) => {
    if (!player) return;
    // ╨г╨┤╨░╨╗╤П╨╡╨╝ ╨┤╨╡╤В╨░╨╗╤М ╨╕╨╖ ╨│╨░╤А╨░╨╢╨░
    const garage = [...player.garage];
    const carIdx = garage.findIndex(c => c.id === carId);
    if (carIdx === -1) return;
    const car = { ...garage[carIdx] };
    car.installedParts = car.installedParts.filter((_: any, i: number) => i !== partIndex);
    garage[carIdx] = car;
    // ╨Ч╨░╨┐╨╕╤Б╤Л╨▓╨░╨╡╨╝ ╨▓╨╕╨╖╨╕╤В ╨║ ╨Ф╨╢╨░╨╝╤И╤Г╤В╤Г
    const shopVisits = { ...player.shop_visits, [carId]: '╨Ф╨╢╨░╨╝╤И╤Г╤В' };
    await supabase.from('room_players').update({ garage, shop_visits: shopVisits }).eq('id', playerId);
    await refreshPlayer();
  };

  // Task 11: ╨Я╤А╨╛╨┤╨░╨╢╨░ ╨░╨▓╤В╨╛╨╝╨╛╨▒╨╕╨╗╤П ╨▓ ╨▒╨░╨╜╨║
  const handleSellCar = async (carId: string, price: number) => {
    if (!player) return;
    const newGarage = player.garage.filter((c: Car) => c.id !== carId);
    const newMoney = player.money + price;
    await supabase.from('room_players').update({ garage: newGarage, money: newMoney }).eq('id', playerId);
    await refreshPlayer();
  };

  const gameYear = room?.current_year || 1960;
  // ╨Э╨╛╨╝╨╡╤А ╤Н╤В╨░╨┐╨░ тАФ ╨║╨░╨╢╨┤╤Л╨╡ 10 ╨┤╨╜╨╡╨╣ ╤Н╤В╨╛ 1 ╤Н╤В╨░╨┐ (╨┐╤А╨╕╨╝╨╡╤А╨╜╨╛)
  const gameStage = Math.floor((room?.current_day || 0) / 10);
  const cars = player?.garage || [];
  const storage = player?.storage || [];
  const money = player?.money || 0;
  const shopVisits = player?.shop_visits || {};

  if (isLoadingSession) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center text-[#e0e0e0]">
        <div className="text-xl animate-pulse">╨Т╨Ю╨б╨б╨в╨Р╨Э╨Ю╨Т╨Ы╨Х╨Э╨Ш╨Х ╨б╨Т╨п╨Ч╨Ш...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-[#e0e0e0] flex flex-col">
      {/* ╨Т╨╡╤А╤Е╨╜╤П╤П ╨┐╨░╨╜╨╡╨╗╤М тАФ ╤В╨╛╨╗╤М╨║╨╛ ╨▓ ╨╕╨│╤А╨╡ */}
      {room && room.status === 'PLAYING' && currentView !== 'MULTIPLAYER' && (
        <div className="bg-[#0d0d20] p-2 text-[8px] flex justify-between items-center border-b-2 border-[#222]" style={{ boxShadow: '0 2px 0 #000' }}>
          <div className="flex items-center gap-3">
            <span className="text-[#00aaff]">╨н╨Я╨Ю╨е╨Р: {gameYear}</span>
            <span className="text-[#00ff00]">ЁЯТ░ ${money.toLocaleString()}</span>
            <span className="text-[#ffaa00]">ЁЯПЖ {player?.points || 0} ╨╛╤З╨║╨╛╨▓</span>
            <span className="text-[#888]">ЁЯЪЧ {cars.length} ╨░╨▓╤В╨╛</span>
            <span className="text-[#888]">ЁЯУж {storage.length} ╨╜╨░ ╤Б╨║╨╗╨░╨┤╨╡</span>
          </div>
          <button onClick={() => navigate('MULTIPLAYER')}
            className="retro-btn text-[#aaa] text-[8px] py-1 px-3"
            style={{ backgroundColor: '#1a1a2e', border: '2px solid #555' }}>
            тЖР ╨Ъ╨Ю╨Ь╨Э╨Р╨в╨Р
          </button>
        </div>
      )}

      <main className="flex-grow relative overflow-hidden">
        {currentView === 'MULTIPLAYER' && (
          <Multiplayer
            room={room}
            player={player}
            playerId={playerId}
            onRoomJoined={handleRoomJoined}
            onRoomLeft={handleRoomLeft}
            onNavigate={navigate}
            onBack={() => { }}
          />
        )}

        {currentView === 'GARAGE' && (
          <Garage
            cars={cars}
            storage={storage}
            gameStage={gameStage}
            onBack={() => navigate('MULTIPLAYER')}
            onRemovePart={handleRemovePart}
            onRemovePartToStorage={handleRemovePartToStorage}
            onInstallFromStorage={handleInstallFromStorage}
            onSellCar={handleSellCar}
          />
        )}

        {currentView === 'DEALER' && (
          <Dealer
            money={money}
            gameYear={gameYear}
            purchaseCounts={purchaseCounts}
            onBuyCar={handleBuyCar}
            onBack={() => navigate('MULTIPLAYER')}
            roomId={room?.id || ''}
            playerId={playerId}
            shopVisits={shopVisits}
          />
        )}

        {currentView === 'SHOP' && (
          <Marketplace
            money={money}
            gameYear={gameYear}
            cars={cars}
            shopVisits={shopVisits}
            onBuyPart={handleBuyPart}
            onRemovePart={handleJamshutRemove}
            onBack={() => navigate('MULTIPLAYER')}
          />
        )}

        {currentView === 'WORKLIST' && (
          <RaceCenter
            phase={room?.phase === 'RACE_SETUP' ? 'RACE_DAY' : 'PREPARATION'}
            epochRevealed={room?.current_day !== undefined && room.current_day > 3}
            cars={cars}
            gameYear={gameYear}
            roomId={room?.id}
            playerId={playerId}
            currentDay={room?.current_day}
            raceWeather={room?.race_weather}
            tournamentState={room?.tournament_state}
            onBack={() => navigate('MULTIPLAYER')}
            onRaceComplete={handleRaceComplete}
          />
        )}

        {currentView === 'RULES' && (
          <Rules onBack={() => navigate('MULTIPLAYER')} />
        )}

        {currentView === 'SCHEDULE' && (
          <RaceSchedule
            gameYear={gameYear}
            onBack={() => navigate('MULTIPLAYER')}
          />
        )}

        {currentView === 'PLAYERS' && room && (
          <Players
            roomId={room.id}
            onBack={() => navigate('MULTIPLAYER')}
          />
        )}

        {currentView === 'RACE_RESULTS' && room && (
          <RaceResults
            roomId={room.id}
            currentDay={room.current_day}
            onBack={() => navigate('MULTIPLAYER')}
          />
        )}

        {currentView === 'SCHEDULE' && (
          <RaceSchedule
            gameYear={gameYear}
            onBack={() => navigate('MULTIPLAYER')}
          />
        )}
      </main>
    </div>
  );
};

export default App;
