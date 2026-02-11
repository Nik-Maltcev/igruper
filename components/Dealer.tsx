import React from 'react';
import { AVAILABLE_CARS } from '../constants';
import { Car } from '../types';

interface DealerProps {
  money: number;
  ownedCarIds: Set<string>;
  onBuyCar: (car: Car) => void;
  onBack: () => void;
}

const Dealer: React.FC<DealerProps> = ({ money, ownedCarIds, onBuyCar, onBack }) => {
  return (
    <div className="p-4 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg retro-title">🏪 АВТОСАЛОН</h2>
          <div className="text-[10px] text-[#00ff00] mt-2">
            💰 ${money.toLocaleString()}
          </div>
        </div>
        <button onClick={onBack} className="retro-btn text-[#aaa] text-[8px] py-1 px-3" style={{backgroundColor:'#1a1a2e', border:'2px solid #555'}}>
          НАЗАД
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
        {AVAILABLE_CARS.map((car, idx) => {
          const owned = ownedCarIds.has(car.id);
          return (
          <div key={`${car.id}-${idx}`} className={`pixel-card p-0 overflow-hidden ${owned ? 'opacity-50' : ''}`}>
            <div className="relative h-36 bg-[#111]">
              <img src={car.image} alt={car.name} className="w-full h-full object-cover opacity-90"
                onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'https://placehold.co/600x300/111/555?text=NO+IMG'; }} />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[#0a0a1a] to-transparent p-3 pt-8">
                <h3 className="text-[10px] text-white" style={{textShadow:'2px 2px 0 #000'}}>{car.name}</h3>
              </div>
              {car.tags && car.tags.length > 0 && (
                <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
                  {car.tags.map(tag => (
                    <span key={tag} className="bg-[#000]/80 px-1.5 py-0.5 text-[7px] text-[#aaa] border border-[#333]">{tag}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="p-3">
              <div className="grid grid-cols-3 gap-1 text-center text-[7px] bg-[#111] p-2 border border-[#222] mb-3">
                <div><span className="text-[#ff4444] block">{car.stats.power}</span><span className="text-[#555]">ЛС</span></div>
                <div><span className="text-[#ff8800] block">{car.stats.torque}</span><span className="text-[#555]">НМ</span></div>
                <div><span className="text-[#4488ff] block">{car.stats.topSpeed}</span><span className="text-[#555]">КМ/Ч</span></div>
                <div><span className="text-[#aa44ff] block">{car.stats.acceleration}</span><span className="text-[#555]">СЕК</span></div>
                <div><span className="text-[#44ff44] block">{car.stats.handling}</span><span className="text-[#555]">УПР</span></div>
                <div><span className="text-[#ffaa00] block">{car.stats.offroad}</span><span className="text-[#555]">ПРОХ</span></div>
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
