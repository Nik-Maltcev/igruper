import React, { useState, useEffect, useCallback } from 'react';
import { View, Room, RoomPlayer, Car, Part, RaceResult } from './types';
import { supabase } from './services/supabase';
import {
  fetchPlayer, fetchPurchaseCounts,
  buyPart, buyCar, removePart, removePartToStorage, installFromStorage,
} from './services/multiplayer';
import { findActiveSession, signOut } from './services/auth';
import type { User } from '@supabase/supabase-js';
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
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [room, setRoom] = useState<Room | null>(null);
  const [playerId, setPlayerId] = useState<string>('');
  const [player, setPlayer] = useState<RoomPlayer | null>(null);
  const [currentView, setCurrentView] = useState<View>('MULTIPLAYER');
  const [purchaseCounts, setPurchaseCounts] = useState<Record<string, number>>({});
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthUser(session?.user ?? null);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_ev, session) => {
      setAuthUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleAuthSuccess = useCallback((user: User) => { setAuthUser(user); }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!authUser) { setRoom(null); setPlayer(null); setPlayerId(''); setIsLoadingSession(false); return; }
    findActiveSession(authUser.id).then(async (s) => {
      if (s) {
        const { data: p } = await supabase.from('room_players').select('*').eq('id', s.playerId).single();
        const { data: r } = await supabase.from('rooms').select('*').eq('id', s.roomId).single();
        if (p && r) { setPlayerId(s.playerId); setPlayer(p as any); setRoom(r as Room); }
      }
      setIsLoadingSession(false);
    });
  }, [authUser, authLoading]);

  const refreshPlayer = useCallback(async () => { if (!playerId) return; const p = await fetchPlayer(playerId); if (p) setPlayer(p); }, [playerId]);
  const refreshRoom = useCallback(async () => { if (!room) return; const { data } = await supabase.from('rooms').select('*').eq('id', room.id).single(); if (data) setRoom(data as Room); }, [room?.id]);

  useEffect(() => { if (!playerId) return; refreshPlayer(); const ch = supabase.channel(`player:${playerId}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'room_players', filter: `id=eq.${playerId}` }, () => refreshPlayer()).subscribe(); return () => { supabase.removeChannel(ch); }; }, [playerId]);
  useEffect(() => { if (!room) return; const ch = supabase.channel(`room:${room.id}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${room.id}` }, () => refreshRoom()).subscribe(); return () => { supabase.removeChannel(ch); }; }, [room?.id]);
  useEffect(() => { if (!room) return; fetchPurchaseCounts(room.id).then(setPurchaseCounts); const ch = supabase.channel(`purchases:${room.id}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'purchase_log', filter: `room_id=eq.${room.id}` }, () => fetchPurchaseCounts(room.id).then(setPurchaseCounts)).subscribe(); return () => { supabase.removeChannel(ch); }; }, [room?.id]);

  const handleRoomJoined = (r: Room, pid: string) => { setRoom(r); setPlayerId(pid); };
  const handleRoomLeft = () => { setRoom(null); setPlayer(null); setPlayerId(''); setCurrentView('MULTIPLAYER'); };
  const handleLogout = async () => { await signOut(); handleRoomLeft(); setAuthUser(null); };
  const navigate = (view: View) => setCurrentView(view);

  const handleUseDiscount = async (dealerId: string) => {
    if (!player) return;
    const storage = [...(player.storage || [])];
    const idx = storage.findIndex((item) => 'type' in item && (item).type === 'discount' && (item).dealer === dealerId);
    if (idx >= 0) {
      storage.splice(idx, 1);
      await supabase.from('room_players').update({ storage }).eq('id', playerId);
      await refreshPlayer();
    }
  };

  const handleBuyCar = async (car: Car) => { if (!player || !room) return; const result = await buyCar(player, car, room.id, room.current_day); if (result.error) { alert(result.error); return; } await refreshPlayer(); };
  const handleBuyPart = async (carId: string, part: Part) => { if (!player) return; const result = await buyPart(player, carId, part); if (result.error) { alert(result.error); return; } await refreshPlayer(); };
  const handleRemovePart = async (carId: string, partIndex: number) => { if (!player) return; await removePart(player, carId, partIndex); await refreshPlayer(); };
  const handleRemovePartToStorage = async (carId: string, partIndex: number) => { if (!player) return; await removePartToStorage(player, carId, partIndex); await refreshPlayer(); };
  const handleInstallFromStorage = async (carId: string, storageIndex: number) => { if (!player) return; await installFromStorage(player, carId, storageIndex); await refreshPlayer(); };
  const handleRaceComplete = async (results: RaceResult[]) => { const t = results.filter(r => !r.carId.startsWith('bot')).reduce((s, r) => s + r.earnings, 0); if (player && t > 0) { await supabase.from('room_players').update({ money: player.money + t }).eq('id', playerId); await refreshPlayer(); } };
  const handleJamshutRemove = async (carId: string, partIndex: number) => {
    if (!player) return;
    const garage = [...player.garage]; const ci = garage.findIndex(c => c.id === carId); if (ci === -1) return;
    const car = { ...garage[ci] }; car.installedParts = car.installedParts.filter((_: any, i: number) => i !== partIndex); garage[ci] = car;
    const sv = { ...player.shop_visits, [carId]: '\u0414\u0436\u0430\u043c\u0448\u0443\u0442' };
    await supabase.from('room_players').update({ garage, shop_visits: sv }).eq('id', playerId); await refreshPlayer();
  };
  const handleSellCar = async (carId: string, price: number) => { if (!player) return; const ng = player.garage.filter((c: Car) => c.id !== carId); await supabase.from('room_players').update({ garage: ng, money: player.money + price }).eq('id', playerId); await refreshPlayer(); };

  const gameYear = room?.current_year || 1960;
  const gameStage = Math.floor((room?.current_day || 0) / 10);
  const cars = player?.garage || [];
  const storage = player?.storage || [];
  const money = player?.money || 0;
  const shopVisits = player?.shop_visits || {};

  if (authLoading || isLoadingSession) { return (<div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center text-[#e0e0e0]"><div className="text-xl animate-pulse">ВОССТАНОВЛЕНИЕ СВЯЗИ...</div></div>); }

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-[#e0e0e0] flex flex-col">
      {room && room.status === 'PLAYING' && currentView !== 'MULTIPLAYER' && (
        <div className="bg-[#0d0d20] p-2 text-[8px] flex justify-between items-center border-b-2 border-[#222]" style={{ boxShadow: '0 2px 0 #000' }}>
          <div className="flex items-center gap-3">
            <span className="text-[#00aaff]">ЭПОХА: {gameYear}</span>
            <span className="text-[#00ff00]">💰 ${money.toLocaleString()}</span>
            <span className="text-[#ffaa00]">🏆 {player?.points || 0} очков</span>
            <span className="text-[#888]">🚗 {cars.length} авто</span>
            <span className="text-[#888]">📦 {storage.length} на складе</span>
          </div>
          <button onClick={() => navigate('MULTIPLAYER')} className="retro-btn text-[#aaa] text-[8px] py-1 px-3" style={{ backgroundColor: '#1a1a2e', border: '2px solid #555' }}>← КОМНАТА</button>
        </div>
      )}
      <main className="flex-grow relative overflow-hidden">
        {currentView === 'MULTIPLAYER' && (<Multiplayer room={room} player={player} playerId={playerId} authUser={authUser} onRoomJoined={handleRoomJoined} onRoomLeft={handleRoomLeft} onLogout={handleLogout} onAuthSuccess={handleAuthSuccess} onNavigate={navigate} onBack={() => {}} />)}
        {currentView === 'GARAGE' && (<Garage cars={cars} storage={storage} gameStage={gameStage} currentDay={room?.current_day || 0} onBack={() => navigate('MULTIPLAYER')} onRemovePart={handleRemovePart} onRemovePartToStorage={handleRemovePartToStorage} onInstallFromStorage={handleInstallFromStorage} onSellCar={handleSellCar} />)}
        {currentView === 'DEALER' && (<Dealer money={money} gameYear={gameYear} purchaseCounts={purchaseCounts} onBuyCar={handleBuyCar} onBack={() => navigate('MULTIPLAYER')} roomId={room?.id || ''} playerId={playerId} shopVisits={shopVisits} playerStorage={storage} onUseDiscount={handleUseDiscount} />)}
        {currentView === 'SHOP' && (<Marketplace money={money} gameYear={gameYear} cars={cars} shopVisits={shopVisits} onBuyPart={handleBuyPart} onRemovePart={handleJamshutRemove} onBack={() => navigate('MULTIPLAYER')} />)}
        {currentView === 'WORKLIST' && (<RaceCenter phase={room?.phase === 'RACE_SETUP' ? 'RACE_DAY' : 'PREPARATION'} epochRevealed={room?.current_day !== undefined && room.current_day > 3} cars={cars} gameYear={gameYear} roomId={room?.id} playerId={playerId} currentDay={room?.current_day} raceWeather={room?.race_weather} tournamentState={room?.tournament_state} onBack={() => navigate('MULTIPLAYER')} onRaceComplete={handleRaceComplete} />)}
        {currentView === 'RULES' && <Rules onBack={() => navigate('MULTIPLAYER')} />}
        {currentView === 'SCHEDULE' && (<RaceSchedule gameYear={gameYear} onBack={() => navigate('MULTIPLAYER')} />)}
        {currentView === 'PLAYERS' && room && (<Players roomId={room.id} onBack={() => navigate('MULTIPLAYER')} />)}
        {currentView === 'RACE_RESULTS' && room && (<RaceResults roomId={room.id} currentDay={room.current_day} onBack={() => navigate('MULTIPLAYER')} />)}
      </main>
    </div>
  );
};

export default App;
