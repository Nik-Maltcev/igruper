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
  // РњСѓР»СЊС‚РёРїР»РµРµСЂ вЂ” РѕСЃРЅРѕРІРЅРѕР№ СЂРµР¶РёРј
  const [room, setRoom] = useState<Room | null>(null);
  const [playerId, setPlayerId] = useState<string>(() => localStorage.getItem('mp_player_id') || '');
  const [player, setPlayer] = useState<RoomPlayer | null>(null);
  const [currentView, setCurrentView] = useState<View>('MULTIPLAYER');
  const [purchaseCounts, setPurchaseCounts] = useState<Record<string, number>>({});
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  // Task 18: РџСЂРё Р·Р°РіСЂСѓР·РєРµ СЃС‚СЂР°РЅРёС†С‹ РІРѕСЃСЃС‚Р°РЅР°РІР»РёРІР°РµРј СЃРµСЃСЃРёСЋ РёР· localStorage
  useEffect(() => {
    const savedPlayerId = localStorage.getItem('mp_player_id');
    const savedRoomId = localStorage.getItem('mp_room_id');
    if (savedPlayerId && savedRoomId && !room) {
      // РџСЂРѕР±СѓРµРј РІРѕСЃСЃС‚Р°РЅРѕРІРёС‚СЊ РёРіСЂРѕРєР° Рё РєРѕРјРЅР°С‚Сѓ
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

  // Р—Р°РіСЂСѓР·РєР° РґР°РЅРЅС‹С… РёРіСЂРѕРєР° РїСЂРё РЅР°Р»РёС‡РёРё playerId
  const refreshPlayer = useCallback(async () => {
    if (!playerId) return;
    const p = await fetchPlayer(playerId);
    if (p) setPlayer(p);
  }, [playerId]);

  // Р—Р°РіСЂСѓР·РєР° РєРѕРјРЅР°С‚С‹ РїСЂРё РЅР°Р»РёС‡РёРё room
  const refreshRoom = useCallback(async () => {
    if (!room) return;
    const { data } = await supabase.from('rooms').select('*').eq('id', room.id).single();
    if (data) setRoom(data as Room);
  }, [room?.id]);

  // Realtime РїРѕРґРїРёСЃРєР° РЅР° РґР°РЅРЅС‹Рµ РёРіСЂРѕРєР°
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

  // Realtime РїРѕРґРїРёСЃРєР° РЅР° РєРѕРјРЅР°С‚Сѓ
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

  // Р—Р°РіСЂСѓР·РєР° purchase counts РїСЂРё РІС…РѕРґРµ РІ РєРѕРјРЅР°С‚Сѓ
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

  // РћР±СЂР°Р±РѕС‚С‡РёРєРё
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
    alert(`Р’С‹ РєСѓРїРёР»Рё ${car.name}!`);
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
    // TODO: Р·Р°РїРёСЃР°С‚СЊ СЂРµР·СѓР»СЊС‚Р°С‚С‹ РІ Supabase
    const totalEarnings = results.filter(r => !r.carId.startsWith('bot')).reduce((sum, r) => sum + r.earnings, 0);
    if (player && totalEarnings > 0) {
      await supabase.from('room_players').update({ money: player.money + totalEarnings }).eq('id', playerId);
      await refreshPlayer();
    }
  };

  // Р”Р¶Р°РјС€СѓС‚: СЃРЅСЏС‚СЊ РґРµС‚Р°Р»СЊ Р±РµР·РІРѕР·РІСЂР°С‚РЅРѕ + Р·Р°РїРёСЃР°С‚СЊ РІРёР·РёС‚
  const handleJamshutRemove = async (carId: string, partIndex: number) => {
    if (!player) return;
    // РЈРґР°Р»СЏРµРј РґРµС‚Р°Р»СЊ РёР· РіР°СЂР°Р¶Р°
    const garage = [...player.garage];
    const carIdx = garage.findIndex(c => c.id === carId);
    if (carIdx === -1) return;
    const car = { ...garage[carIdx] };
    car.installedParts = car.installedParts.filter((_: any, i: number) => i !== partIndex);
    garage[carIdx] = car;
    // Р—Р°РїРёСЃС‹РІР°РµРј РІРёР·РёС‚ Рє Р”Р¶Р°РјС€СѓС‚Сѓ
    const shopVisits = { ...player.shop_visits, [carId]: 'Р”Р¶Р°РјС€СѓС‚' };
    await supabase.from('room_players').update({ garage, shop_visits: shopVisits }).eq('id', playerId);
    await refreshPlayer();
  };

  // Task 11: РџСЂРѕРґР°Р¶Р° Р°РІС‚РѕРјРѕР±РёР»СЏ РІ Р±Р°РЅРє
  const handleSellCar = async (carId: string, price: number) => {
    if (!player) return;
    const newGarage = player.garage.filter((c: Car) => c.id !== carId);
    const newMoney = player.money + price;
    await supabase.from('room_players').update({ garage: newGarage, money: newMoney }).eq('id', playerId);
    await refreshPlayer();
  };

  const gameYear = room?.current_year || 1960;
  // РќРѕРјРµСЂ СЌС‚Р°РїР° вЂ” РєР°Р¶РґС‹Рµ 10 РґРЅРµР№ СЌС‚Рѕ 1 СЌС‚Р°Рї (РїСЂРёРјРµСЂРЅРѕ)
  const gameStage = Math.floor((room?.current_day || 0) / 10);
  const cars = player?.garage || [];
  const storage = player?.storage || [];
  const money = player?.money || 0;
  const shopVisits = player?.shop_visits || {};

  if (isLoadingSession) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center text-[#e0e0e0]">
        <div className="text-xl animate-pulse">Р’РћРЎРЎРўРђРќРћР’Р›Р•РќРР• РЎР’РЇР—Р...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-[#e0e0e0] flex flex-col">
      {/* Р’РµСЂС…РЅСЏСЏ РїР°РЅРµР»СЊ вЂ” С‚РѕР»СЊРєРѕ РІ РёРіСЂРµ */}
      {room && room.status === 'PLAYING' && currentView !== 'MULTIPLAYER' && (
        <div className="bg-[#0d0d20] p-2 text-[8px] flex justify-between items-center border-b-2 border-[#222]" style={{ boxShadow: '0 2px 0 #000' }}>
          <div className="flex items-center gap-3">
            <span className="text-[#00aaff]">Р­РџРћРҐРђ: {gameYear}</span>
            <span className="text-[#00ff00]">рџ’° ${money.toLocaleString()}</span>
            <span className="text-[#ffaa00]">рџЏ† {player?.points || 0} РѕС‡РєРѕРІ</span>
            <span className="text-[#888]">рџљ— {cars.length} Р°РІС‚Рѕ</span>
            <span className="text-[#888]">рџ“¦ {storage.length} РЅР° СЃРєР»Р°РґРµ</span>
          </div>
          <button onClick={() => navigate('MULTIPLAYER')}
            className="retro-btn text-[#aaa] text-[8px] py-1 px-3"
            style={{ backgroundColor: '#1a1a2e', border: '2px solid #555' }}>
            в†ђ РљРћРњРќРђРўРђ
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
