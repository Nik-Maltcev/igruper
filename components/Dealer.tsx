import React from 'react';
import { AVAILABLE_CARS } from '../constants';
import { Car } from '../types';
import { DollarSign } from 'lucide-react';

interface DealerProps {
  money: number;
  onBuyCar: (car: Car) => void;
  onBack: () => void;
}

const Dealer: React.FC<DealerProps> = ({ money, onBuyCar, onBack }) => {
  return (
    <div className="p-4 max-w-6xl mx-auto h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-white uppercase italic">Автосалон</h2>
          <div className="text-green-400 font-mono text-xl flex items-center gap-1">
            <DollarSign size={20} /> {money.toLocaleString()}
          </div>
        </div>
        <button onClick={onBack} className="text-gray-400 hover:text-white border border-gray-600 px-4 py-1 rounded">Назад</button>
      </div>

      <div className="flex-grow overflow-y-auto pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {AVAILABLE_CARS.map((car, idx) => (
            <div key={`${car.id}-${idx}`} className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-blue-500 transition-colors shadow-lg flex flex-col">
              <div className="relative h-48 bg-gray-900">
                <img src={car.image} alt={car.name} className="w-full h-full object-cover object-center"
                  onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'https://placehold.co/600x300/333333/ffffff?text=No+Image'; }} />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4 pt-10">
                  <h3 className="font-bold text-white text-xl drop-shadow-md">{car.name}</h3>
                </div>
                {car.tags && car.tags.length > 0 && (
                  <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
                    {car.tags.map(tag => (
                      <span key={tag} className="bg-black/70 px-1.5 py-0.5 rounded text-[10px] text-gray-200">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-4 flex flex-col gap-3 flex-grow">
                <div className="grid grid-cols-3 gap-1 text-center text-[11px] text-gray-400 bg-gray-900 rounded p-2">
                  <div className="flex flex-col"><span className="text-red-400 font-bold">{car.stats.power}</span>лс</div>
                  <div className="flex flex-col"><span className="text-orange-400 font-bold">{car.stats.torque}</span>Нм</div>
                  <div className="flex flex-col"><span className="text-blue-400 font-bold">{car.stats.topSpeed}</span>км/ч</div>
                  <div className="flex flex-col"><span className="text-purple-400 font-bold">{car.stats.acceleration}</span>сек</div>
                  <div className="flex flex-col"><span className="text-green-400 font-bold">{car.stats.handling}</span>упр</div>
                  <div className="flex flex-col"><span className="text-yellow-500 font-bold">{car.stats.offroad}</span>прох</div>
                </div>
                <div className="flex justify-between items-center mt-auto pt-2">
                  <span className="text-green-400 font-mono font-bold text-lg">${car.price.toLocaleString()}</span>
                  <button onClick={() => onBuyCar(car)}
                    disabled={money < car.price}
                    className={`px-4 py-2 rounded font-bold uppercase text-xs tracking-wider ${money >= car.price ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}>
                    Купить
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dealer;
