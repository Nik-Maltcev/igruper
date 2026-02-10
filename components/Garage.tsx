import React from 'react';
import { Car, Part, CarStats, StatType } from '../types';
import { getEffectiveStats } from '../services/gameEngine';
import { Wrench, Gauge, ArrowUpCircle, Zap, RotateCw, Mountain, Disc } from 'lucide-react';

interface GarageProps {
  cars: Car[];
  onBack: () => void;
}

const STAT_CONFIG: { key: keyof CarStats; label: string; unit: string; color: string; invert?: boolean }[] = [
  { key: 'power', label: 'Мощность', unit: 'лс', color: 'bg-red-500' },
  { key: 'torque', label: 'Момент', unit: 'Нм', color: 'bg-orange-500' },
  { key: 'topSpeed', label: 'Скорость', unit: 'км/ч', color: 'bg-blue-500' },
  { key: 'acceleration', label: 'Разгон', unit: 'сек', color: 'bg-purple-500', invert: true },
  { key: 'handling', label: 'Управл.', unit: '', color: 'bg-green-500' },
  { key: 'offroad', label: 'Проход.', unit: '', color: 'bg-yellow-600' },
];

const Garage: React.FC<GarageProps> = ({ cars, onBack }) => {
  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-white uppercase italic">Мой Гараж</h2>
        <button onClick={onBack} className="text-gray-400 hover:text-white">В меню</button>
      </div>

      {cars.length === 0 ? (
        <div className="text-center py-20 bg-gray-800 rounded-xl border border-dashed border-gray-600">
          <p className="text-gray-400 text-lg">Ваш гараж пуст.</p>
          <p className="text-sm text-gray-500">Посетите Автосалон или Аукцион, чтобы купить авто.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cars.map((car, idx) => {
            const effective = getEffectiveStats(car);
            return (
              <div key={`${car.id}-${idx}`} className="bg-gray-800 rounded-xl overflow-hidden shadow-xl border border-gray-700">
                <div className="relative h-40 bg-gray-900">
                  <img src={car.image} alt={car.name} className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity" />
                  {car.tags && car.tags.length > 0 && (
                    <div className="absolute top-2 right-2 flex gap-1 flex-wrap justify-end">
                      {car.tags.map(tag => (
                        <span key={tag} className="bg-black/60 px-2 py-0.5 rounded text-[10px] font-mono text-white">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-xl font-bold text-white mb-3">{car.name}</h3>
                  <div className="space-y-2 mb-4">
                    {STAT_CONFIG.map(({ key, label, unit, color, invert }) => {
                      const base = car.stats[key];
                      const total = effective[key];
                      const boosted = total !== base;
                      return (
                        <div key={key} className="flex items-center gap-2">
                          <div className="w-20 text-[11px] font-bold text-gray-400 uppercase">{label}</div>
                          <div className="flex-grow h-2 bg-gray-700 rounded-full overflow-hidden relative">
                            <div className={`h-full ${color} absolute left-0 top-0`}
                              style={{ width: `${invert ? Math.min(100, (1 / total) * 400) : Math.min(100, total / 4)}%` }}
                            />
                          </div>
                          <div className="w-16 text-right text-xs font-mono text-white">
                            {invert ? total.toFixed(1) : total}
                            {unit && <span className="text-gray-500 ml-0.5">{unit}</span>}
                            {boosted && <span className="text-green-400 ml-1">★</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="pt-3 border-t border-gray-700">
                    <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Детали</h4>
                    <div className="flex flex-wrap gap-2">
                      {car.installedParts.length > 0 ? (
                        car.installedParts.map((part, pIdx) => (
                          <span key={pIdx} className="px-2 py-1 bg-gray-700 rounded text-xs text-blue-300 flex items-center gap-1">
                            <Wrench size={10} /> {part.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-600 italic">Сток</span>
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
