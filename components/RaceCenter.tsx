import React, { useState, useEffect } from 'react';
import { Car, GamePhase, Track, RaceResult } from '../types';
import { TRACKS } from '../constants';
import { simulateRace } from '../services/gameEngine';

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
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const r = Math.random();
    if (r > 0.8) setWeather('STORM');
    else if (r > 0.6) setWeather('RAIN');
    else setWeather('SUNNY');
  }, []);

  const getWeatherText = (w: string) => {
    if (w === 'SUNNY') return '☀ ЯСНО';
    if (w === 'RAIN') return '🌧 ДОЖДЬ';
    if (w === 'STORM') return '⛈ ШТОРМ';
    return w;
  };

  const handleStartRace = () => {
    if (cars.length === 0) { alert('Нужна машина!'); return; }
    setRaceState('RACING');
    setProgress(0);
    const raceResults = simulateRace(cars, selectedTrack, weather);
    setResults(raceResults);
    let p = 0;
    const interval = setInterval(() => {
      p += 1;
      setProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        setTimeout(() => { setRaceState('FINISHED'); onRaceComplete(raceResults); }, 500);
      }
    }, 50);
  };

  if (phase === 'PREPARATION') {
    return (
      <div className="p-4 max-w-4xl mx-auto text-center py-16">
        <div className="text-4xl mb-4">⏰</div>
        <h2 className="text-sm retro-title mb-4">РЕГИСТРАЦИЯ ЗАКРЫТА</h2>
        <p className="text-[8px] text-[#666] mb-6 leading-relaxed">
          ГОНКИ В 22:00.<br/>ИСПОЛЬЗУЙТЕ ВРЕМЯ ДЛЯ ТЮНИНГА.
        </p>
        <button onClick={onBack} className="retro-btn text-[#aaa] text-[8px] py-2 px-4" style={{backgroundColor:'#1a1a2e', border:'2px solid #555'}}>В МЕНЮ</button>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-sm retro-title">🏁 СПИСОК ЗАЕЗДОВ</h2>
        <button onClick={onBack} className="retro-btn text-[#aaa] text-[8px] py-1 px-3" style={{backgroundColor:'#1a1a2e', border:'2px solid #555'}}>НАЗАД</button>
      </div>

      {raceState === 'IDLE' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-3">
            <p className="text-[7px] text-[#555] uppercase">ВЫБЕРИТЕ ТРАССУ:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {TRACKS.map(track => (
                <button key={track.id} onClick={() => setSelectedTrack(track)}
                  className={`pixel-card p-0 overflow-hidden text-left ${selectedTrack.id === track.id ? 'border-[#5555ff]' : 'opacity-60 hover:opacity-100'}`}>
                  <div className="h-24 bg-[#111] relative">
                    <img src={track.image} className="w-full h-full object-cover opacity-70" alt={track.name} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[10px] text-white uppercase" style={{textShadow:'2px 2px 0 #000'}}>{track.name}</span>
                    </div>
                  </div>
                  <div className="p-2">
                    <p className="text-[7px] text-[#555]">{track.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="pixel-card p-4 flex flex-col">
            <p className="text-[7px] text-[#555] uppercase mb-3">УСЛОВИЯ:</p>
            <div className="bg-[#111] border border-[#222] p-3 mb-4 text-center">
              <div className="text-lg mb-1">{weather === 'SUNNY' ? '☀' : weather === 'RAIN' ? '🌧' : '⛈'}</div>
              <div className="text-[9px] text-white">{getWeatherText(weather)}</div>
              <div className="text-[6px] text-[#555] mt-1">СЦЕПЛЕНИЕ: {weather === 'SUNNY' ? '100%' : '70%'}</div>
            </div>
            <p className="text-[7px] text-[#666] text-center mb-4">
              ГАРАЖ: <span className="text-white">{cars.length} МАШИН</span>
            </p>
            <button onClick={handleStartRace}
              className="retro-btn text-[9px] py-3 w-full mt-auto"
              style={{backgroundColor:'#330000', border:'3px solid #ff4444', color:'#ff4444'}}>
              ▶ ЗАПУСК
            </button>
          </div>
        </div>
      )}

      {raceState === 'RACING' && (
        <div className="flex flex-col items-center justify-center py-12 space-y-6">
          <h2 className="text-sm retro-title blink">ИДЕТ ГОНКА...</h2>
          <div className="w-full max-w-2xl pixel-card p-4 space-y-4">
            <div>
              <div className="text-[7px] text-[#4488ff] mb-1">ВЫ</div>
              <div className="w-full h-6 bg-[#111] border border-[#222] relative overflow-hidden">
                <div className="absolute top-0 left-0 h-full bg-[#000066] border-r-2 border-[#5555ff] transition-all" style={{width:`${progress}%`}} />
                <span className="absolute right-1 top-0.5 text-[7px] text-[#5555ff]">🏎</span>
              </div>
            </div>
            <div>
              <div className="text-[7px] text-[#ff4444] mb-1">СОПЕРНИК</div>
              <div className="w-full h-6 bg-[#111] border border-[#222] relative overflow-hidden">
                <div className="absolute top-0 left-0 h-full bg-[#330000] border-r-2 border-[#ff4444] transition-all" style={{width:`${Math.min(100, progress * (0.9 + Math.random() * 0.2))}%`}} />
                <span className="absolute right-1 top-0.5 text-[7px] text-[#ff4444]">🏎</span>
              </div>
            </div>
          </div>
          <div className="text-[10px] text-[#555]">{progress}%</div>
        </div>
      )}

      {raceState === 'FINISHED' && (
        <div className="flex flex-col items-center py-8">
          <div className="text-3xl mb-3">🏆</div>
          <h2 className="text-sm retro-title mb-6">РЕЗУЛЬТАТЫ</h2>
          <div className="w-full max-w-xl pixel-card overflow-hidden">
            <div className="grid grid-cols-4 bg-[#111] p-2 text-[7px] text-[#555] uppercase border-b border-[#222]">
              <span>ПОЗ</span><span>АВТО</span><span className="text-right">ВРЕМЯ</span><span className="text-right">ПРИЗ</span>
            </div>
            {results.map(res => (
              <div key={res.carId}
                className={`grid grid-cols-4 p-2 text-[8px] border-b border-[#111] ${res.carId.startsWith('bot') ? 'text-[#666]' : 'text-white bg-[#000066]/20'}`}>
                <span className="flex items-center gap-1">
                  {res.position === 1 && '🥇'}
                  {res.position === 2 && '🥈'}
                  {res.position === 3 && '🥉'}
                  {res.position > 3 && `#${res.position}`}
                </span>
                <span className="truncate">{res.carName}</span>
                <span className="text-right text-[#aaa]">{res.time.toFixed(3)}s</span>
                <span className="text-right text-[#00ff00]">+${res.earnings}</span>
              </div>
            ))}
          </div>
          <button onClick={() => setRaceState('IDLE')}
            className="retro-btn text-[8px] py-2 px-6 mt-6"
            style={{backgroundColor:'#1a1a2e', border:'2px solid #5555ff', color:'#5555ff'}}>
            ЕЩЁ ЗАЕЗД
          </button>
        </div>
      )}
    </div>
  );
};

export default RaceCenter;
