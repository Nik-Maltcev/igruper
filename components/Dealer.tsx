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

const ROAD_COLORS: Record<string, string> = {
  'У': '#aaaaaa', 'Г': '#ffaa00', 'В': '#44bb44', 'С': '#ff4444',
};
const ROAD_LABELS: Record<string, string> = {
  'У': 'Улица', 'Г': 'Город', 'В': 'Бездорожье', 'С': 'Спорт',
};

const Dealer: React.FC<DealerProps> = ({ money, gameYear, ownedCarIds, onBuyCar, onBack }) => {
  const [selectedDealer, setSelectedDealer] = useState<string | null>(null);

  // Фильтруем машины по текущему году
  const availableCars = useMemo(() => {
    return AVAILABLE_CARS.filter((car: any) => car.year && car.year <= gameYear);
  }, [gameYear]);

  // Машины выбранного салона
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
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg retro-title">{dealer.icon} {dealer.label}</h2>
          <div className="text-[10px] text-[#00ff00] mt-2">💰 ${money.toLocaleString()}</div>
          <div className="text-[8px] text-[#555] mt-1">{dealerCars.length} машин</div>
        </div>
        <button onClick={() => setSelectedDealer(null)} className="retro-btn text-[#aaa] text-[8px] py-1 px-3" style={{backgroundColor:'#1a1a2e', border:'2px solid #555'}}>← САЛОНЫ</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
        {dealerCars.map((car: any, idx: number) => {
          const owned = ownedCarIds.has(car.id);
          const roadColor = ROAD_COLORS[car.roadType] || '#555';
          const roadLabel = ROAD_LABELS[car.roadType] || car.roadType;
          const co = car.coefficients || {};
          return (
            <div key={`${car.id}-${idx}`} className={`pixel-card p-0 overflow-hidden ${owned ? 'opacity-50' : ''}`}>
              <div className="relative h-36 bg-[#111]">
                <img src={car.image} alt={car.name} className="w-full h-full object-cover opacity-90"
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `https://placehold.co/600x300/111/555?text=${encodeURIComponent(car.name.substring(0, 20))}`; }} />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0a0a1a] to-transparent p-3 pt-8">
                  <h3 className="text-[10px] text-white" style={{textShadow:'2px 2px 0 #000'}}>{car.name}</h3>
                </div>
                {/* Теги */}
                <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
                  {car.roadType && (
                    <span className="px-1.5 py-0.5 text-[7px] border" style={{backgroundColor:'#000000cc', color: roadColor, borderColor: roadColor + '66'}}>{roadLabel}</span>
                  )}
                  {car.tags?.slice(0, 2).map((tag: string) => (
                    <span key={tag} className="bg-[#000]/80 px-1.5 py-0.5 text-[7px] text-[#aaa] border border-[#333]">{tag}</span>
                  ))}
                </div>
                {/* Количество */}
                <div className="absolute top-2 right-2 bg-[#000]/80 px-1.5 py-0.5 text-[7px] border border-[#333]">
                  <span className="text-[#ffaa00]">×{car.quantity || 1}</span>
                </div>
              </div>
              <div className="p-3">
                {/* Характеристики */}
                <div className="grid grid-cols-3 gap-1 text-center text-[7px] bg-[#111] p-2 border border-[#222] mb-1">
                  <div><span className="text-[#ff4444] block">{car.stats.power}</span><span className="text-[#555]">ЛС</span></div>
                  <div><span className="text-[#ff8800] block">{car.stats.torque}</span><span className="text-[#555]">НМ</span></div>
                  <div><span className="text-[#4488ff] block">{car.stats.topSpeed}</span><span className="text-[#555]">КМ/Ч</span></div>
                  <div><span className="text-[#aa44ff] block">{car.stats.acceleration}</span><span className="text-[#555]">СЕК</span></div>
                  <div><span className="text-[#44ff44] block">{car.stats.handling}</span><span className="text-[#555]">УПР</span></div>
                  <div><span className="text-[#ffaa00] block">{car.stats.offroad}</span><span className="text-[#555]">ПРОХ</span></div>
                </div>
                {/* Коэффициенты */}
                <div className="grid grid-cols-3 gap-1 text-center text-[6px] bg-[#0a0a15] p-1 border border-[#1a1a2e] mb-3">
                  <div><span className={co.power > 1 ? 'text-[#44ff44]' : co.power < 1 ? 'text-[#ff4444]' : 'text-[#555]'}>×{co.power}</span></div>
                  <div><span className={co.torque > 1 ? 'text-[#44ff44]' : co.torque < 1 ? 'text-[#ff4444]' : 'text-[#555]'}>×{co.torque}</span></div>
                  <div><span className={co.topSpeed > 1 ? 'text-[#44ff44]' : co.topSpeed < 1 ? 'text-[#ff4444]' : 'text-[#555]'}>×{co.topSpeed}</span></div>
                  <div><span className={co.acceleration > 1 ? 'text-[#44ff44]' : co.acceleration < 1 ? 'text-[#ff4444]' : 'text-[#555]'}>×{co.acceleration}</span></div>
                  <div><span className={co.handling > 1 ? 'text-[#44ff44]' : co.handling < 1 ? 'text-[#ff4444]' : 'text-[#555]'}>×{co.handling}</span></div>
                  <div><span className={co.offroad > 1 ? 'text-[#44ff44]' : co.offroad < 1 ? 'text-[#ff4444]' : 'text-[#555]'}>×{co.offroad}</span></div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-[#00ff00]">${car.price.toLocaleString()}</span>
                  <button onClick={() => onBuyCar(car)}
                    disabled={money < car.price || owned}
                    className="retro-btn text-[8px] py-1 px-3"
                    style={{
                      backgroundColor: owned ? '#1a1a1a' : money >= car.price ? '#003300' : '#1a1a1a',
                      border: `2px solid ${owned ? '#44ff44' : money >= car.price ? '#00ff00' : '#333'}`,
                      color: owned ? '#44ff44' : money >= car.price ? '#00ff00' : '#555',
                    }}>
                    {owned ? 'КУПЛЕНО ✓' : money >= car.price ? 'КУПИТЬ' : 'МАЛО $'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Dealer;
