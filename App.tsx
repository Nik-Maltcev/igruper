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

const App = () => {
  // Мультиплеер — основной режим
  const [room, setRoom] = useState<Room | null>(null);
  const [playerId, setPlayerId] = useState<string>(() => localStorage.getItem('mp_player_id') || '');
  const [player, setPlayer] = useState<RoomPlayer | null>(null);
  const [currentView, setCurrentView] = useState<View>('MULTIPLAYER');
  const [purchaseCounts, setPurchaseCounts] = useState<Record<string, number>>({});

  // Task 18: При загрузке страницы восстанавливаем сессию из localStorage
  useEffect(() => {
    const savedPlayerId = localStorage.getItem('mp_player_id');
    const savedRoomId = localStorage.getItem('mp_room_id');
    if (savedPlayerId && savedRoomId && !room) {
      // Пробуем восстановить игрока и комнату
      supabase.from('room_players').select('*').eq('id', savedPlayerId).single().then(({ data: pData }) => {
        if (!pData) {
          localStorage.removeItem('mp_player_id');
          localStorage.removeItem('mp_room_id');
          return;
        }
        supabase.from('rooms').select('*').eq('id', savedRoomId).single().then(({ data: rData }) => {
          if (!rData) {
            localStorage.removeItem('mp_player_id');
            localStorage.removeItem('mp_room_id');
            return;
          }
          setPlayerId(savedPlayerId);
          setPlayer(pData as any);
          setRoom(rData as Room);
        });
      });
    }
  }, []);

  // Загрузка данных игрока при наличии playerId
  const refreshPlayer = useCallback(async () => {
    if (!playerId) return;
    const p = await fetchPlayer(playerId);
    if (p) setPlayer(p);
  }, [playerId]);

  // Загрузка комнаты при наличии room
  const refreshRoom = useCallback(async () => {
    if (!room) return;
    const { data } = await supabase.from('rooms').select('*').eq('id', room.id).single();
    if (data) setRoom(data as Room);
  }, [room?.id]);

  // Realtime подписка на данные игрока
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

  // Realtime подписка на комнату
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

  // Загрузка purchase counts при входе в комнату
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

  // Обработчики
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
    alert(`Вы купили ${car.name}!`);
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
    // TODO: записать результаты в Supabase
    const totalEarnings = results.filter(r => !r.carId.startsWith('bot')).reduce((sum, r) => sum + r.earnings, 0);
    if (player && totalEarnings > 0) {
      await supabase.from('room_players').update({ money: player.money + totalEarnings }).eq('id', playerId);
      await refreshPlayer();
    }
  };

  // Джамшут: снять деталь безвозвратно + записать визит
  const handleJamshutRemove = async (carId: string, partIndex: number) => {
    if (!player) return;
    // Удаляем деталь из гаража
    const garage = [...player.garage];
    const carIdx = garage.findIndex(c => c.id === carId);
    if (carIdx === -1) return;
    const car = { ...garage[carIdx] };
    car.installedParts = car.installedParts.filter((_: any, i: number) => i !== partIndex);
    garage[carIdx] = car;
    // Записываем визит к Джамшуту
    const shopVisits = { ...player.shop_visits, [carId]: 'Джамшут' };
    await supabase.from('room_players').update({ garage, shop_visits: shopVisits }).eq('id', playerId);
    await refreshPlayer();
  };

  // Task 11: Продажа автомобиля в банк
  const handleSellCar = async (carId: string, price: number) => {
    if (!player) return;
    const newGarage = player.garage.filter((c: Car) => c.id !== carId);
    const newMoney = player.money + price;
    await supabase.from('room_players').update({ garage: newGarage, money: newMoney }).eq('id', playerId);
    await refreshPlayer();
  };

  const gameYear = room?.current_year || 1960;
  // Номер этапа — каждые 10 дней это 1 этап (примерно)
  const gameStage = Math.floor((room?.current_day || 0) / 10);
  const cars = player?.garage || [];
  const storage = player?.storage || [];
  const money = player?.money || 0;
  const shopVisits = player?.shop_visits || {};

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-[#e0e0e0] flex flex-col">
      {/* Верхняя панель — только в игре */}
      {room && room.status === 'PLAYING' && currentView !== 'MULTIPLAYER' && (
        <div className="bg-[#0d0d20] p-2 text-[8px] flex justify-between items-center border-b-2 border-[#222]" style={{ boxShadow: '0 2px 0 #000' }}>
          <div className="flex items-center gap-3">
            <span className="text-[#00aaff]">ЭПОХА: {gameYear}</span>
            <span className="text-[#00ff00]">💰 ${money.toLocaleString()}</span>
            <span className="text-[#ffaa00]">🏆 {player?.points || 0} очков</span>
            <span className="text-[#888]">🚗 {cars.length} авто</span>
            <span className="text-[#888]">📦 {storage.length} на складе</span>
          </div>
          <button onClick={() => navigate('MULTIPLAYER')}
            className="retro-btn text-[#aaa] text-[8px] py-1 px-3"
            style={{ backgroundColor: '#1a1a2e', border: '2px solid #555' }}>
            ← КОМНАТА
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
            phase={room?.phase === 'RACING' ? 'RACE_DAY' : 'PREPARATION'}
            epochRevealed={room?.phase === 'RACE_SETUP' || room?.phase === 'RACING'}
            cars={cars}
            gameYear={gameYear}
            roomId={room?.id}
            playerId={playerId}
            currentDay={room?.current_day}
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
      </main>
    </div>
  );
};

export default App;
