import React, { useState, useEffect } from 'react';
import { Car, GamePhase, Track, RaceResult } from '../types';
import { TRACKS } from '../constants';
import { simulateRace } from '../services/gameEngine';
import { Play, Flag, Trophy, Clock, CloudRain, Sun, CarFront } from 'lucide-react';

interface RaceCenterProps {
  phase: GamePhase;
  cars: Car[];
  onBack: () => void;
  onRaceComplete: (results: RaceResult[]) => void;
}

const RaceCenter: React.FC<RaceCenterProps> = ({ phase, cars, onBack, onRaceComplete }) => {
  const [selectedTrack, setSelectedTrack] = useState<Track>(TRACKS[0]);
  const [weather, setWeather] = useState<'SUNNY' | 'RAIN' | 'STORM'>('SUNNY');
  const [raceState, setRaceState] = useState<'IDLE' | 'RACING' | 'FINISHED'>('IDLE');
  const [results, setResults] = useState<RaceResult[]>([]);
  
  // Animation state
  const [progress, setProgress] = useState(0);

  // Randomize weather on mount
  useEffect(() => {
    const r = Math.random();
    if (r > 0.8) setWeather('STORM');
    else if (r > 0.6) setWeather('RAIN');
    else setWeather('SUNNY');
  }, []);

  const getWeatherText = (w: string) => {
    if (w === 'SUNNY') return 'ЯСНО';
    if (w === 'RAIN') return 'ДОЖДЬ';
    if (w === 'STORM') return 'ШТОРМ';
    return w;
  };

  // Handle Race Start
  const handleStartRace = () => {
    if (cars.length === 0) {
      alert("Вам нужна машина для гонки!");
      return;
    }
    setRaceState('RACING');
    setProgress(0);

    // Calculate results immediately, but show animation
    const raceResults = simulateRace(cars, selectedTrack, weather);
    setResults(raceResults);

    // Animation loop
    let p = 0;
    const interval = setInterval(() => {
      p += 1; // 1% per tick
      setProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        setTimeout(() => {
            setRaceState('FINISHED');
            onRaceComplete(raceResults);
        }, 500);
      }
    }, 50); // 5 seconds total duration approx
  };

  if (phase === 'PREPARATION') {
    return (
      <div className="p-4 max-w-4xl mx-auto text-center py-20">
        <Clock size={64} className="mx-auto text-blue-500 mb-6" />
        <h2 className="text-3xl font-bold text-white mb-2">Регистрация закрыта</h2>
        <p className="text-gray-400 mb-8">
          Автоматические гонки проходят в 22:00. <br/>
          Используйте это время для покупки машин и тюнинга в гараже.
        </p>
        <button onClick={onBack} className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white">В главное меню</button>
      </div>
    );
  }

  // RACING PHASE
  return (
    <div className="p-4 max-w-4xl mx-auto h-full flex flex-col">
       <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-white uppercase italic flex items-center gap-3">
          <Flag className="text-red-500" /> Список Заездов
        </h2>
        <button onClick={onBack} className="text-gray-400 hover:text-white">Назад</button>
      </div>

      {raceState === 'IDLE' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Track Selection */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-gray-400 font-bold uppercase text-sm">Выберите Трассу</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {TRACKS.map(track => (
                    <div 
                        key={track.id} 
                        onClick={() => setSelectedTrack(track)}
                        className={`cursor-pointer rounded-xl overflow-hidden border-2 transition-all relative ${selectedTrack.id === track.id ? 'border-blue-500 shadow-lg shadow-blue-500/20' : 'border-gray-700 opacity-60 hover:opacity-100'}`}
                    >
                        <div className="h-32 bg-gray-800 relative">
                            <img src={track.image} className="w-full h-full object-cover" alt={track.name} />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <span className="font-black text-2xl uppercase italic text-white tracking-widest">{track.name}</span>
                            </div>
                        </div>
                        <div className="p-3 bg-gray-800">
                             <p className="text-xs text-gray-400">{track.description}</p>
                        </div>
                    </div>
                ))}
            </div>
          </div>

          {/* Race Info & Button */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 flex flex-col">
            <h3 className="text-gray-400 font-bold uppercase text-sm mb-4">Условия</h3>
            
            <div className="flex items-center gap-4 mb-6">
                {weather === 'SUNNY' ? <Sun className="text-yellow-400" size={32} /> : <CloudRain className="text-blue-400" size={32} />}
                <div>
                    <div className="font-bold text-white">{getWeatherText(weather)}</div>
                    <div className="text-xs text-gray-500">Сцепление: {weather === 'SUNNY' ? '100%' : '70%'}</div>
                </div>
            </div>

            <div className="mt-auto">
                <p className="text-sm text-gray-400 mb-4 text-center">
                    В гараже: <span className="text-white font-bold">{cars.length} машин</span> готово.
                </p>
                <button 
                    onClick={handleStartRace}
                    className="w-full py-4 bg-gradient-to-r from-red-600 to-orange-600 rounded-lg font-black uppercase text-white tracking-widest shadow-lg hover:from-red-500 hover:to-orange-500 transform active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                    <Play fill="white" /> Запуск Двигателей
                </button>
            </div>
          </div>
        </div>
      )}

      {raceState === 'RACING' && (
        <div className="flex-grow flex flex-col items-center justify-center space-y-8 animate-fade-in">
            <h2 className="text-4xl font-black italic text-white animate-pulse">ИДЕТ ГОНКА</h2>
            
            <div className="w-full max-w-2xl bg-gray-800 h-64 rounded-xl border border-gray-700 relative overflow-hidden p-4 flex flex-col justify-center gap-6">
                 {/* Decorative Track Lines */}
                 <div className="absolute inset-0 flex flex-col justify-between py-8 opacity-10 pointer-events-none">
                    <div className="border-b border-dashed border-white"></div>
                    <div className="border-b border-dashed border-white"></div>
                    <div className="border-b border-dashed border-white"></div>
                 </div>

                 {/* Visualizer for Player */}
                 <div className="relative">
                    <div className="text-xs text-blue-400 font-bold mb-1 uppercase">Вы</div>
                    <div className="w-full h-8 bg-gray-900 rounded-full overflow-hidden relative">
                        <div 
                            className="absolute top-0 left-0 h-full bg-blue-600 transition-all duration-300 ease-linear flex items-center justify-end px-2"
                            style={{ width: `${progress}%` }}
                        >
                            <CarFront size={16} className="text-white transform rotate-90" />
                        </div>
                    </div>
                 </div>

                 {/* Visualizer for Opponent (Simulated slightly behind or ahead random) */}
                 <div className="relative">
                    <div className="text-xs text-red-400 font-bold mb-1 uppercase">Соперник</div>
                    <div className="w-full h-8 bg-gray-900 rounded-full overflow-hidden relative">
                         <div 
                            className="absolute top-0 left-0 h-full bg-red-600 transition-all duration-300 ease-linear flex items-center justify-end px-2"
                            style={{ width: `${Math.min(100, progress * (0.9 + Math.random() * 0.2))}%` }}
                        >
                            <CarFront size={16} className="text-white transform rotate-90" />
                        </div>
                    </div>
                 </div>
            </div>

            <div className="text-gray-400 font-mono text-xl">
                Дистанция: {progress}%
            </div>
        </div>
      )}

      {raceState === 'FINISHED' && (
        <div className="flex-grow flex flex-col items-center justify-center animate-fade-in">
            <Trophy size={64} className="text-yellow-400 mb-4" />
            <h2 className="text-3xl font-bold text-white mb-6">Результаты Гонки</h2>
            
            <div className="w-full max-w-xl bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
                <table className="w-full">
                    <thead className="bg-gray-900 text-gray-400 text-xs uppercase">
                        <tr>
                            <th className="p-3 text-left">Поз</th>
                            <th className="p-3 text-left">Авто</th>
                            <th className="p-3 text-right">Время</th>
                            <th className="p-3 text-right">Приз</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {results.map((res) => (
                            <tr key={res.carId} className={res.carId.startsWith('bot') ? 'text-gray-400' : 'bg-blue-900/30 text-white font-bold'}>
                                <td className="p-3">
                                    <div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs">
                                        {res.position}
                                    </div>
                                </td>
                                <td className="p-3">{res.carName}</td>
                                <td className="p-3 text-right font-mono">{res.time.toFixed(3)}s</td>
                                <td className="p-3 text-right text-green-400 font-mono">+${res.earnings}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <button 
                onClick={() => setRaceState('IDLE')}
                className="mt-8 px-8 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded font-bold"
            >
                Гнать Снова
            </button>
        </div>
      )}
    </div>
  );
};

export default RaceCenter;
