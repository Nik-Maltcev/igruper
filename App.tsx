import React, { useState } from 'react';
import { View, GamePhase, Car, Part, RaceResult } from './types';
import { INITIAL_MONEY, SHOP_PARTS, EPOCHS } from './constants';

import Dashboard from './components/Dashboard';
import Garage from './components/Garage';
import Dealer from './components/Dealer';
import Marketplace from './components/Marketplace';
import RaceCenter from './components/RaceCenter';
import Multiplayer from './components/Multiplayer';
import Rules from './components/Rules';

// Mock components for less critical views to keep file count low within constraints
const PlaceholderView = ({ title, onBack }: { title: string, onBack: () => void }) => (
  <div className="p-8 text-center">
    <h2 className="text-2xl font-bold text-white mb-4">{title}</h2>
    <p className="text-gray-400 mb-8">Этот раздел в разработке.</p>
    <button onClick={onBack} className="px-4 py-2 bg-gray-700 rounded text-white">Назад</button>
  </div>
);

const App = () => {
  // Global Game State
  const [currentView, setCurrentView] = useState<View>('DASHBOARD');
  const [gamePhase, setGamePhase] = useState<GamePhase>('PREPARATION');
  const [day, setDay] = useState<number>(1);
  const [money, setMoney] = useState<number>(INITIAL_MONEY);
  const [myCars, setMyCars] = useState<Car[]>([]);
  const [gameYear, setGameYear] = useState<number>(1960);
  // Трекинг: какая машина в какой магазин ездила сегодня (carId -> brand)
  const [shopVisits, setShopVisits] = useState<Record<string, string>>({});
  
  // Navigation Handler
  const navigate = (view: View) => setCurrentView(view);

  // Debug/Admin function to force phase change
  const togglePhase = () => {
    if (gamePhase === 'PREPARATION') {
      setGamePhase('RACE_DAY');
    } else {
      setGamePhase('PREPARATION');
      setDay(d => d + 1);
      setShopVisits({}); // Сброс визитов в магазины при новом дне
    }
  };

  // Logic Handlers
  const handleBuyCar = (car: Car) => {
    setMoney(prev => prev - car.price);
    setMyCars(prev => [...prev, { ...car, id: `my-${Date.now()}` }]); // unique ID
    alert(`Вы купили ${car.name}! Проверьте гараж.`);
  };

  const handleBuyPart = (carId: string, part: Part) => {
    setMoney(prev => prev - part.price);
    setMyCars(prev => prev.map(car => 
      car.id === carId
        ? { ...car, installedParts: [...car.installedParts, part] }
        : car
    ));
    // Записываем визит: эта машина теперь привязана к этому магазину на сегодня
    if (part.brand) {
      setShopVisits(prev => ({ ...prev, [carId]: part.brand! }));
    }
  };

  const handleRaceComplete = (results: RaceResult[]) => {
    // Add winnings
    const totalEarnings = results.filter(r => !r.carId.startsWith('bot')).reduce((sum, r) => sum + r.earnings, 0);
    setMoney(prev => prev + totalEarnings);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col">
      {/* Admin / Time Control Bar (To Simulate 22:00 Cron Job) */}
      <div className="bg-black/50 p-2 text-xs flex justify-between items-center border-b border-gray-800">
        <div className="font-mono text-gray-500 flex items-center gap-3">
          <span>РЕЖИМ ОТЛАДКИ</span>
          <span className="text-blue-400">Эпоха: {gameYear}</span>
          <select
            value={gameYear}
            onChange={(e) => setGameYear(Number(e.target.value))}
            className="bg-gray-800 text-white border border-gray-600 rounded px-2 py-0.5 text-xs"
          >
            {EPOCHS.map(e => (
              <option key={e.year} value={e.year}>{e.label} ({e.year})</option>
            ))}
          </select>
        </div>
        <button 
          onClick={togglePhase}
          className="bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded text-yellow-500 font-bold border border-yellow-500/30"
        >
          {gamePhase === 'PREPARATION' ? '>> 22:00 (НАЧАТЬ ГОНКУ)' : '>> СЛЕДУЮЩИЙ ДЕНЬ'}
        </button>
      </div>

      <main className="flex-grow relative overflow-hidden">
        {currentView === 'DASHBOARD' && (
          <Dashboard 
            onNavigate={navigate} 
            gamePhase={gamePhase} 
            day={day} 
          />
        )}

        {currentView === 'GARAGE' && (
          <Garage 
            cars={myCars} 
            onBack={() => navigate('DASHBOARD')} 
          />
        )}

        {currentView === 'DEALER' && (
          <Dealer
            money={money}
            onBuyCar={handleBuyCar}
            onBack={() => navigate('DASHBOARD')}
          />
        )}

        {currentView === 'SHOP' && (
          <Marketplace 
            money={money}
            gameYear={gameYear}
            cars={myCars}
            shopVisits={shopVisits}
            onBuyPart={handleBuyPart}
            onBack={() => navigate('DASHBOARD')}
          />
        )}

        {currentView === 'WORKLIST' && (
          <RaceCenter 
            phase={gamePhase}
            cars={myCars}
            onBack={() => navigate('DASHBOARD')}
            onRaceComplete={handleRaceComplete}
          />
        )}

        {currentView === 'MULTIPLAYER' && (
          <Multiplayer 
            myCars={myCars}
            onBack={() => navigate('DASHBOARD')}
          />
        )}

        {/* Placeholders for other image buttons */}
        {(currentView === 'AUCTION' || currentView === 'PLAYERS') && (
          <PlaceholderView title={currentView} onBack={() => navigate('DASHBOARD')} />
        )}

        {currentView === 'RULES' && (
          <Rules onBack={() => navigate('DASHBOARD')} />
        )}
      </main>
    </div>
  );
};

export default App;
