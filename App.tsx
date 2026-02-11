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
  <div className="p-8 text-center py-16">
    <div className="text-2xl mb-4">🚧</div>
    <h2 className="text-[10px] retro-title mb-4">{title}</h2>
    <p className="text-[8px] text-[#555] mb-6">В РАЗРАБОТКЕ</p>
    <button onClick={onBack} className="retro-btn text-[#aaa] text-[8px] py-1 px-3" style={{backgroundColor:'#1a1a2e', border:'2px solid #555'}}>НАЗАД</button>
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
    setMyCars(prev => [...prev, { ...car, id: `my-${Date.now()}`, originalId: car.id }]); // unique ID, keep original
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
    <div className="min-h-screen bg-[#0a0a1a] text-[#e0e0e0] flex flex-col">
      {/* Debug Bar — retro style */}
      <div className="bg-[#0d0d20] p-2 text-[8px] flex justify-between items-center border-b-2 border-[#222]" style={{boxShadow:'0 2px 0 #000'}}>
        <div className="flex items-center gap-3">
          <span className="text-[#555]">[ DEBUG ]</span>
          <span className="text-[#00aaff]">ЭПОХА: {gameYear}</span>
          <select
            value={gameYear}
            onChange={(e) => setGameYear(Number(e.target.value))}
            className="bg-[#111] text-[#0f0] border-2 border-[#333] px-2 py-0.5 text-[8px]"
            style={{fontFamily:"'Press Start 2P', monospace"}}
          >
            {EPOCHS.map(e => (
              <option key={e.year} value={e.year}>{e.label} ({e.year})</option>
            ))}
          </select>
        </div>
        <button 
          onClick={togglePhase}
          className="retro-btn text-[#ffff00] text-[8px] py-1 px-3"
          style={{backgroundColor:'#1a1a2e', border:'2px solid #ffff00', boxShadow:'2px 2px 0 #000'}}
        >
          {gamePhase === 'PREPARATION' ? '▶ 22:00 ГОНКА' : '▶ СЛЕД. ДЕНЬ'}
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
            gameYear={gameYear}
            ownedCarIds={new Set(myCars.map(c => c.originalId || c.id))}
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
