import React, { useState, useMemo } from 'react';
import { AVAILABLE_CARS } from '../constants';
import { Car } from '../types';

interface DealerProps {
  money: number;
  gameYear: number;
  ownedCarIds: Set<string>;
  onBuyCar: (car: Car) => void;
  onBack: () => void;
}

const DEALERS = [
  { id: 'АЛЬФА', label: 'АЛЬФА', icon: '🅰️', color: '#ff4444' },
  { id: 'БЕТА', label: 'БЕТА', icon: '🅱️', color: '#4488ff' },
  { id: 'ГАММА', label: 'ГАММА', icon: '🔶', color: '#ffaa00' },
  { id: 'ДЕЛЬТА', label: 'ДЕЛЬТА', icon: '🔷', color: '#44ff44' },
];

const STAT_HEADERS = ['МОЩ', 'КРУТ', 'СКОР', 'РАЗГ', 'УПР', 'ПРОХ'];
const STAT_KEYS = ['power', 'torque', 'topSpeed', 'acceleration', 'handling', 'offroad'] as const;
const STAT_UNITS = ['лс', 'Нм', '', 'с', '', ''];

function coeffColor(v: number) {
  if (v > 1) return '#44ff44';
  if (v < 1) return '#ff4444';
  return '#888';
}

const Dealer: React.FC<DealerProps> = ({ money, gameYear, ownedCarIds, onBuyCar, onBack }) => {
  const [selectedDealer, setSelectedDealer] = useState<string | null>(null);

  const availableCars = useMemo(() => {
    return AVAILABLE_CARS.filter((car: any) => car.year && car.year <= gameYear);
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
            return (
              <button key={d.id} onClick={() => setSelectedDealer(d.id)}
                className="pixel-card p-6 text-center hover:border-[#00ff00] transition-colors cursor-pointer"
                style={{borderColor: d.color + '66'}}>
                <div className="text-3xl mb-3">{d.icon}</div>
                <div className="text-[12px] mb-2" style={{color: d.color, fontFamily:"'Press Start 2P', monospace"}}>{d.label}</div>
                <div className="text-[8px] text-[#555]">{count} машин</div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const dealer = DEALERS.find(d => d.id === selectedDealer)!;

  return (
    <div className="p-3 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h2 className="text-lg retro-title">{dealer.icon} {dealer.label}</h2>
          <div className="text-[10px] text-[#00ff00] mt-1">💰 ${money.toLocaleString()} <span className="text-[#555] ml-2">{dealerCars.length} машин</span></div>
        </div>
        <button onClick={() => setSelectedDealer(null)} className="retro-btn text-[#aaa] text-[8px] py-1 px-3" style={{backgroundColor:'#1a1a2e', border:'2px solid #555'}}>← САЛОНЫ</button>
      </div>

      <div className="flex flex-col gap-2 pb-20">
        {dealerCars.map((car: any, idx: number) => {
          const owned = ownedCarIds.has(car.id);
          const co = car.coefficients || {};
          return (
            <div key={`${car.id}-${idx}`}
              className={`pixel-card p-0 flex items-stretch overflow-hidden ${owned ? 'opacity-40' : ''}`}
              style={{minHeight: '140px'}}>

              {/* Левая часть: имя + теги */}
              <div className="flex flex-col justify-center px-2 py-1 min-w-[100px] max-w-[120px] border-r border-[#222]">
                <div className="text-[8px] text-white leading-tight mb-1" style={{textShadow:'1px 1px 0 #000'}}>{car.name}</div>
                <div className="flex flex-wrap gap-0.5">
                  {car.tags?.slice(0, 3).map((tag: string) => (
                    <span key={tag} className="text-[5px] text-[#666] bg-[#111] px-1 py-0 border border-[#222]">{tag}</span>
                  ))}
                </div>
              </div>

              {/* Картинка */}
              <div className="w-[280px] min-w-[280px] bg-[#111] border-r border-[#222] relative overflow-hidden">
                <img src={car.image} alt={car.name} className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `https://placehold.co/400x200/111/555?text=${encodeURIComponent(car.name.substring(0, 12))}`; }} />
                {/* Количество */}
                <div className="absolute bottom-0 right-0 bg-[#000]/80 px-1.5 py-0.5 text-[7px] text-[#ffaa00]">×{car.quantity || 1}</div>
              </div>

              {/* Таблица характеристик + коэффициенты */}
              <div className="flex-grow flex flex-col justify-center border-r border-[#222]">
                <table className="w-full text-center" style={{borderCollapse:'collapse'}}>
                  {/* Заголовки */}
                  <thead>
                    <tr>
                      {STAT_HEADERS.map((h, hi) => (
                        <th key={hi} className="text-[5px] text-[#555] px-1 py-0 font-normal border-b border-[#222]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Значения */}
                    <tr>
                      {STAT_KEYS.map((k, ki) => (
                        <td key={ki} className="text-[8px] px-1 py-0.5 border-b border-[#1a1a2e]" style={{color: '#ddd'}}>
                          {k === 'acceleration' ? car.stats[k].toFixed(1) : car.stats[k]}
                          {STAT_UNITS[ki] && <span className="text-[5px] text-[#555] ml-0.5">{STAT_UNITS[ki]}</span>}
                        </td>
                      ))}
                    </tr>
                    {/* Коэффициенты */}
                    <tr>
                      {STAT_KEYS.map((k, ki) => (
                        <td key={ki} className="text-[7px] px-1 py-0.5" style={{color: coeffColor(co[k] || 1)}}>
                          {(co[k] || 1).toFixed(1)}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Правая часть: цена + кнопка */}
              <div className="flex flex-col justify-center items-center px-2 py-1 min-w-[80px]">
                <div className="text-[9px] text-[#00ff00] mb-1">${car.price.toLocaleString()}</div>
                <button onClick={() => onBuyCar(car)}
                  disabled={money < car.price || owned}
                  className="retro-btn text-[7px] py-0.5 px-2"
                  style={{
                    backgroundColor: owned ? '#1a1a1a' : money >= car.price ? '#003300' : '#1a1a1a',
                    border: `2px solid ${owned ? '#44ff44' : money >= car.price ? '#00ff00' : '#333'}`,
                    color: owned ? '#44ff44' : money >= car.price ? '#00ff00' : '#555',
                  }}>
                  {owned ? '✓' : money >= car.price ? 'КУПИТЬ' : '—'}
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
