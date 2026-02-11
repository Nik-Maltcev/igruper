import React from 'react';
import { View, GamePhase } from '../types';

interface DashboardProps {
  onNavigate: (view: View) => void;
  gamePhase: GamePhase;
  day: number;
}

const MENU_ITEMS: { label: string; view: View; emoji: string; color: string }[] = [
  { label: 'Гараж', view: 'GARAGE', emoji: '🏎️', color: '#ff4444' },
  { label: 'Мультиплеер', view: 'MULTIPLAYER', emoji: '🌐', color: '#44ff44' },
  { label: 'Автосалон', view: 'DEALER', emoji: '🏪', color: '#4488ff' },
  { label: 'Запчасти', view: 'SHOP', emoji: '🔧', color: '#ffaa00' },
  { label: 'Аукцион', view: 'AUCTION', emoji: '🔨', color: '#aa44ff' },
  { label: 'Заезды', view: 'WORKLIST', emoji: '🏁', color: '#ff4488' },
  { label: 'Игроки', view: 'PLAYERS', emoji: '👥', color: '#44ffaa' },
  { label: 'Правила', view: 'RULES', emoji: '📖', color: '#8888ff' },
];

const Dashboard: React.FC<DashboardProps> = ({ onNavigate, gamePhase, day }) => {
  return (
    <div className="flex flex-col items-center min-h-full p-4">
      {/* Title */}
      <div className="text-center mb-8 mt-4">
        <h1 className="text-2xl md:text-4xl retro-title font-bold tracking-wider leading-relaxed">
          SUPERIGRUPER
        </h1>
        <div className="mt-4 inline-block bg-[#1a1a2e] border-2 border-[#333] px-4 py-2" style={{boxShadow:'3px 3px 0 #000'}}>
          <span className="text-[10px] text-[#00ff00]">ДЕНЬ {day}</span>
          <span className="text-[10px] text-[#555] mx-2">|</span>
          <span className="text-[10px] text-[#ffff00]">
            {gamePhase === 'PREPARATION' ? '⚙ ПОДГОТОВКА' : '🏁 ГОНКА'}
          </span>
        </div>
      </div>

      {/* Menu Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 w-full max-w-3xl">
        {MENU_ITEMS.map(item => (
          <button
            key={item.view}
            onClick={() => onNavigate(item.view)}
            className="retro-btn text-white text-center flex flex-col items-center gap-2 py-5 px-3"
            style={{ backgroundColor: '#1a1a2e', border: `3px solid ${item.color}` }}
          >
            <span className="text-2xl" style={{filter:'drop-shadow(2px 2px 0 #000)'}}>{item.emoji}</span>
            <span className="text-[8px] md:text-[10px] leading-tight" style={{color: item.color}}>{item.label}</span>
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-8 text-[8px] text-[#444] flex items-center gap-2">
        <span className="blink">▶</span>
        <span>ВЫБЕРИТЕ РАЗДЕЛ</span>
      </div>
    </div>
  );
};

export default Dashboard;
