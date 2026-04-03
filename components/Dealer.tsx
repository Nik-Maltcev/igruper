import React, { useState, useMemo, useEffect } from 'react';
import { AVAILABLE_CARS } from '../constants';
import { Car, RoomPlayer } from '../types';
import { fetchPlayers } from '../services/multiplayer';

interface DealerProps {
  money: number;
  gameYear: number;
  purchaseCounts: Record<string, number>;
  onBuyCar: (car: Car) => void;
  onBack: () => void;
  roomId: string;
  playerId: string;
  shopVisits: Record<string, string>;
}

const DEALERS = [
  { id: 'АЛЬФА', label: 'АЛЬФА', icon: '🅰️', color: '#ff4444' },
  { id: 'БЕТА', label: 'БЕТА', icon: '🅱️', color: '#4488ff' },
  { id: 'ГАММА', label: 'ГАММА', icon: '🔶', color: '#ffaa00' },
  { id: 'ДЕЛЬТА', label: 'ДЕЛЬТА', icon: '🔷', color: '#44ff44' },
];

const STAT_HEADERS = ['Мощность', 'Крут.момент', 'Скорость', 'Разгон', 'Управляемость', 'Проходимость'];
const STAT_KEYS = ['power', 'torque', 'topSpeed', 'acceleration', 'handling', 'offroad'] as const;
const STAT_UNITS = ['лс', 'Нм', '', 'с', '', ''];

function coeffColor(v: number) {
  if (v > 1) return '#44ff44';
  if (v < 1) return '#ff4444';
  return '#888';
}

const CLASS_COLORS: Record<string, string> = {
  A: '#888888', B: '#ffdd00', C: '#4488ff', D: '#44ff44', E: '#ff8800', R: '#aa44ff', S: '#ff4444',
};

const Dealer: React.FC<DealerProps> = ({ money, gameYear, purchaseCounts, onBuyCar, onBack, roomId, playerId, shopVisits }) => {
  const [selectedDealer, setSelectedDealer] = useState<string | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);

  useEffect(() => {
    if (roomId) {
      fetchPlayers(roomId).then(setPlayers);
    }
  }, [roomId]);

  const allowedDealersCount = useMemo(() => {
    if (players.length < 3) return 4;
    
    // Сортировка по очкам (desc)
    const sorted = [...players].sort((a,b) => b.points - a.points);
    const myRank = sorted.findIndex(p => p.id === playerId) + 1;
    const total = players.length;
    
    if (total === 3) {
      if (myRank === 1) return 1;
      if (myRank === 2) return 2;
      return 3;
    }
    if (total === 4) {
      if (myRank === 1) return 1;
      if (myRank === 2) return 2;
      if (myRank === 3) return 3;
      return 4;
    }
    if (total === 5) {
      if (myRank === 1) return 1;
      if (myRank === 2) return 2;
      if (myRank === 3) return 3;
      return 4;
    }
    if (total === 6) {
      if (myRank <= 2) return 1;
      if (myRank === 3) return 2;
      if (myRank === 4) return 3;
      return 4;
    }
    if (total === 7) {
      if (myRank <= 2) return 1;
      if (myRank <= 4) return 2;
      if (myRank === 5) return 3;
      return 4;
    }
    if (total >= 8) {
      if (myRank <= 2) return 1;
      if (myRank <= 4) return 2;
      if (myRank <= 6) return 3;
      return 4;
    }
    
    return 4;
  }, [players, playerId]);

  const visitedDealers = useMemo(() => {
    return Object.keys(shopVisits).filter(k => k.startsWith('DEALER_') && shopVisits[k] === 'visited').map(k => k.replace('DEALER_', ''));
  }, [shopVisits]);

  const handleDealerClick = (dlrId: string) => {
    if (!visitedDealers.includes(dlrId) && visitedDealers.length >= allowedDealersCount) {
      alert(`Вам доступно только ${allowedDealersCount} автосалона(ов) на этом этапе, согласно вашему рейтингу!`);
      return;
    }
    setSelectedDealer(dlrId);
  };

  const availableCars = useMemo(() => {
    // Показываем только машины текущей эпохи (gameYear и gameYear-1)
    return AVAILABLE_CARS.filter((car: any) => car.year && car.year >= gameYear - 1 && car.year <= gameYear);
  }, [gameYear]);

  const dealerCars = useMemo(() => {
    if (!selectedDealer) return [];
    return availableCars
      .filter((car: any) => car.dealer === selectedDealer)
      .sort((a: any, b: any) => a.price - b.price);
  }, [availableCars, selectedDealer]);

  // Экран выбора салона
  if (!selectedDealer) {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-lg retro-title">🏪 АВТОСАЛОНЫ</h2>
            <div className="text-[10px] text-[#00ff00] mt-2">💰 ${money.toLocaleString()}</div>
          </div>
          <button onClick={onBack} className="retro-btn text-[#aaa] text-[8px] py-1 px-3" style={{backgroundColor:'#1a1a2e', border:'2px solid #555'}}>НАЗАД</button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {DEALERS.map(d => {
            const count = availableCars.filter((c: any) => c.dealer === d.id).length;
            const isVisited = visitedDealers.includes(d.id);
            const isLocked = !isVisited && visitedDealers.length >= allowedDealersCount;
            return (
              <button key={d.id} onClick={() => handleDealerClick(d.id)}
                className={`pixel-card p-6 text-center transition-colors cursor-pointer ${isLocked ? 'opacity-40 grayscale' : 'hover:border-[#00ff00]'}`}
                style={{borderColor: d.color + '66'}}>
                <div className="text-3xl mb-3">{d.icon}</div>
                <div className="text-[12px] mb-2" style={{color: d.color, fontFamily:"'Press Start 2P', monospace"}}>{d.label}</div>
                <div className="text-[8px] text-[#555]">{count} машин {isVisited ? ' (Посещен)' : isLocked ? ' (Недоступен)' : ''}</div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const dealer = DEALERS.find(d => d.id === selectedDealer)!;

  return (
    <div className="p-3 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h2 className="text-lg retro-title">{dealer.icon} {dealer.label}</h2>
          <div className="text-[10px] text-[#00ff00] mt-1">💰 ${money.toLocaleString()} <span className="text-[#555] ml-2">{dealerCars.length} машин</span></div>
        </div>
        <button onClick={() => setSelectedDealer(null)} className="retro-btn text-[#aaa] text-[8px] py-1 px-3" style={{backgroundColor:'#1a1a2e', border:'2px solid #555'}}>← САЛОНЫ</button>
      </div>

      <div className="flex flex-col gap-3 pb-20">
        {dealerCars.map((car: any, idx: number) => {
          const co = car.coefficients || {};
          const remaining = (car.quantity || 1) - (purchaseCounts[car.id] || 0);
          const soldOut = remaining <= 0;
          return (
            <div key={`${car.id}-${idx}`}
              className={`pixel-card p-0 flex items-stretch overflow-hidden ${soldOut ? 'opacity-40' : ''}`}
              style={{minHeight: '168px', borderColor: CLASS_COLORS[car.carClass] || '#333', borderWidth: '4px'}}>

              {/* Левая часть: имя + теги */}
              <div className="flex flex-col justify-center px-3 py-2 min-w-[140px] max-w-[160px] border-r border-[#222]">
                <div className="text-[10px] text-white leading-tight mb-1" style={{textShadow:'1px 1px 0 #000'}}>{car.name}</div>
                <div className="text-[7px] text-white leading-relaxed">
                  {car.carClass && <div>класс: {car.carClass}</div>}
                  {car.tags?.[0] && <div>{car.tags[0]}</div>}
                  {car.tags?.[1] && <div>{car.tags[1]}</div>}
                  {car.rarity && <div>редкость: {car.rarity}</div>}
                  {car.tags?.slice(2).map((tag: string, ti: number) => (
                    <div key={ti} style={{color:'#ffaa00'}}>{tag}</div>
                  ))}
                  <div style={{color: '#ffdd00', fontWeight: 'bold'}}>шины: {car.roadType || 'У'}</div>
                </div>
              </div>

              {/* Картинка */}
              <div className="w-[336px] min-w-[336px] bg-[#111] border-r border-[#222] relative overflow-hidden">
                <img src={car.image} alt={car.name} className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `https://placehold.co/400x200/111/555?text=${encodeURIComponent(car.name.substring(0, 12))}`; }} />
                {/* Количество */}
                <div className="absolute bottom-0 right-0 bg-[#000]/80 px-2 py-0.5 text-[8px]" style={{color: soldOut ? '#ff4444' : '#ffaa00'}}>наличие {remaining}</div>
              </div>

              {/* Таблица характеристик + коэффициенты */}
              <div className="flex-grow flex flex-col justify-center border-r border-[#222]">
                <table className="w-full text-center" style={{borderCollapse:'collapse'}}>
                  {/* Заголовки */}
                  <thead>
                    <tr>
                      {STAT_HEADERS.map((h, hi) => (
                        <th key={hi} className="text-[8px] text-[#ddd] px-2 py-1 font-normal border-b border-[#333]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Значения */}
                    <tr>
                      {STAT_KEYS.map((k, ki) => (
                        <td key={ki} className="text-[10px] px-2 py-1 border-b border-[#1a1a2e]" style={{color: '#fff'}}>
                          {k === 'acceleration' ? car.stats[k].toFixed(1) : car.stats[k]}
                          {STAT_UNITS[ki] && <span className="text-[7px] text-[#999] ml-0.5">{STAT_UNITS[ki]}</span>}
                        </td>
                      ))}
                    </tr>
                    {/* Коэффициенты */}
                    <tr>
                      {STAT_KEYS.map((k, ki) => (
                        <td key={ki} className="text-[9px] px-2 py-1" style={{color: coeffColor(co[k] || 1)}}>
                          {(co[k] || 1).toFixed(1)}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Правая часть: цена + кнопка */}
              <div className="flex flex-col justify-center items-center px-3 py-2 min-w-[96px]">
                <div className="text-[11px] text-[#00ff00] mb-2">${car.price.toLocaleString()}</div>
                <button onClick={() => onBuyCar(car)}
                  disabled={money < car.price || soldOut}
                  className="retro-btn text-[8px] py-1 px-3"
                  style={{
                    backgroundColor: soldOut ? '#1a1a1a' : money >= car.price ? '#003300' : '#1a1a1a',
                    border: `2px solid ${soldOut ? '#ff4444' : money >= car.price ? '#00ff00' : '#333'}`,
                    color: soldOut ? '#ff4444' : money >= car.price ? '#00ff00' : '#555',
                  }}>
                  {soldOut ? 'НЕТ' : money >= car.price ? 'КУПИТЬ' : '—'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Dealer;
