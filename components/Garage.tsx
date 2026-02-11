import React from 'react';
import { Car, CarStats } from '../types';
import { getEffectiveStats } from '../services/gameEngine';

interface GarageProps {
  cars: Car[];
  onBack: () => void;
}

const STAT_CONFIG: { key: keyof CarStats; label: string; unit: string; color: string; invert?: boolean }[] = [
  { key: 'power', label: 'МОЩ', unit: 'лс', color: '#ff4444' },
  { key: 'torque', label: 'МОМ', unit: 'Нм', color: '#ff8800' },
  { key: 'topSpeed', label: 'СКР', unit: 'км/ч', color: '#4488ff' },
  { key: 'acceleration', label: 'РЗГ', unit: 'сек', color: '#aa44ff', invert: true },
  { key: 'handling', label: 'УПР', unit: '', color: '#44ff44' },
  { key: 'offroad', label: 'ПРХ', unit: '', color: '#ffaa00' },
];

const Garage: React.FC<GarageProps> = ({ cars, onBack }) => {
  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg retro-title">🏎️ МОЙ ГАРАЖ</h2>
        <button onClick={onBack} className="retro-btn text-[#aaa] text-[8px] py-1 px-3" style={{backgroundColor:'#1a1a2e', border:'2px solid #555'}}>
          МЕНЮ
        </button>
      </div>

      {cars.length === 0 ? (
        <div className="text-center py-16 pixel-card p-8">
          <p className="text-[10px] text-[#666] mb-2">ГАРАЖ ПУСТ</p>
          <p className="text-[8px] text-[#444]">КУПИТЕ АВТО В САЛОНЕ</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cars.map((car, idx) => {
            const effective = getEffectiveStats(car);
            return (
              <div key={`${car.id}-${idx}`} className="pixel-card overflow-hidden">
                <div className="relative h-32 bg-[#111]">
                  <img src={car.image} alt={car.name} className="w-full h-full object-cover opacity-80" />
                  {car.tags && car.tags.length > 0 && (
                    <div className="absolute top-1 right-1 flex gap-1 flex-wrap justify-end">
                      {car.tags.map(tag => (
                        <span key={tag} className="bg-[#000]/80 px-1 py-0.5 text-[6px] text-[#aaa] border border-[#333]">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="text-[10px] text-white mb-3" style={{textShadow:'1px 1px 0 #000'}}>{car.name}</h3>
                  <div className="space-y-1.5 mb-3">
                    {STAT_CONFIG.map(({ key, label, unit, color, invert }) => {
                      const base = car.stats[key];
                      const total = effective[key];
                      const boosted = total !== base;
                      const pct = invert ? Math.min(100, (1 / total) * 400) : Math.min(100, total / 4);
                      return (
                        <div key={key} className="flex items-center gap-2">
                          <div className="w-10 text-[7px] text-[#888]">{label}</div>
                          <div className="flex-grow h-3 bg-[#111] border border-[#222] relative overflow-hidden">
                            <div className="h-full absolute left-0 top-0" style={{width:`${pct}%`, backgroundColor: color, opacity: 0.7}} />
                          </div>
                          <div className="w-14 text-right text-[7px]" style={{color}}>
                            {invert ? total.toFixed(1) : total}{unit && <span className="text-[#555] ml-0.5">{unit}</span>}
                            {boosted && <span className="text-[#ffff00] ml-0.5">★</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="border-t border-[#222] pt-2">
                    <div className="text-[7px] text-[#555] mb-1">ДЕТАЛИ:</div>
                    <div className="flex flex-wrap gap-1">
                      {car.installedParts.length > 0 ? (
                        car.installedParts.map((part, pIdx) => (
                          <span key={pIdx} className="px-1.5 py-0.5 bg-[#111] border border-[#333] text-[7px] text-[#4488ff]">
                            🔧 {part.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-[7px] text-[#333]">СТОК</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Garage;
