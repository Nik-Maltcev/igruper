import React from 'react';
import { Car, CarStats } from '../types';
import { getEffectiveStats } from '../services/gameEngine';

interface GarageProps {
  cars: Car[];
  onBack: () => void;
}

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

const Garage: React.FC<GarageProps> = ({ cars, onBack }) => {
  return (
    <div className="p-3 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-3">
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
        <div className="flex flex-col gap-3 pb-20">
          {cars.map((car, idx) => {
            const effective = getEffectiveStats(car);
            const co = car.coefficients || {} as Partial<CarStats>;
            return (
              <div key={`${car.id}-${idx}`}
                className="pixel-card p-0 flex items-stretch overflow-hidden"
                style={{minHeight: '168px', borderColor: CLASS_COLORS[car.carClass || ''] || '#333', borderWidth: '4px'}}>

                {/* Левая часть: имя + теги + детали */}
                <div className="flex flex-col justify-center px-3 py-2 min-w-[140px] max-w-[160px] border-r border-[#222]">
                  <div className="text-[10px] text-white leading-tight mb-1" style={{textShadow:'1px 1px 0 #000'}}>{car.name}</div>
                  <div className="text-[7px] text-white leading-relaxed mb-2">
                    {car.carClass && <div>класс: {car.carClass}</div>}
                    {car.tags?.[0] && <div>{car.tags[0]}</div>}
                    {car.tags?.[1] && <div>{car.tags[1]}</div>}
                    {car.rarity && <div>редкость: {car.rarity}</div>}
                    {car.tags?.slice(2).map((tag: string, ti: number) => (
                      <div key={ti} style={{color:'#ffaa00'}}>{tag}</div>
                    ))}
                  </div>
                </div>

                {/* Картинка */}
                <div className="w-[336px] min-w-[336px] bg-[#111] border-r border-[#222] relative overflow-hidden">
                  <img src={car.image} alt={car.name} className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).onerror = null; (e.target as HTMLImageElement).src = `https://placehold.co/400x200/111/555?text=${encodeURIComponent(car.name.substring(0, 12))}`; }} />
                </div>

                {/* Таблица характеристик + коэффициенты */}
                <div className="flex-grow flex flex-col justify-center border-r border-[#222]">
                  <table className="w-full text-center" style={{borderCollapse:'collapse'}}>
                    <thead>
                      <tr>
                        {STAT_HEADERS.map((h, hi) => (
                          <th key={hi} className="text-[8px] text-[#ddd] px-2 py-1 font-normal border-b border-[#333]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Эффективные значения (с бустами) */}
                      <tr>
                        {STAT_KEYS.map((k, ki) => {
                          const base = car.stats[k];
                          const eff = effective[k];
                          const boosted = eff !== base;
                          return (
                            <td key={ki} className="text-[10px] px-2 py-1 border-b border-[#1a1a2e]" style={{color: boosted ? '#ffff00' : '#fff'}}>
                              {k === 'acceleration' ? eff.toFixed(1) : eff}
                              {STAT_UNITS[ki] && <span className="text-[7px] text-[#999] ml-0.5">{STAT_UNITS[ki]}</span>}
                              {boosted && <span className="text-[#ffff00] ml-0.5">★</span>}
                            </td>
                          );
                        })}
                      </tr>
                      {/* Коэффициенты */}
                      <tr>
                        {STAT_KEYS.map((k, ki) => (
                          <td key={ki} className="text-[9px] px-2 py-1" style={{color: coeffColor((co as any)[k] || 1)}}>
                            {((co as any)[k] || 1).toFixed(1)}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Правая часть: установленные детали */}
                <div className="flex flex-col justify-start px-3 py-2 min-w-[140px] max-w-[180px] overflow-y-auto" style={{maxHeight:'168px'}}>
                  <div className="text-[7px] text-[#555] mb-1">ДЕТАЛИ ({car.installedParts.length}):</div>
                  {car.installedParts.length > 0 ? (
                    <div className="flex flex-col gap-0.5">
                      {car.installedParts.map((part, pIdx) => (
                        <div key={pIdx} className="text-[7px] text-[#4488ff]">🔧 {part.name}</div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[7px] text-[#444]">СТОК</div>
                  )}
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
