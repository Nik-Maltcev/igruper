import React from 'react';
import { View, GamePhase } from '../types';
import { 
  CarFront, 
  CalendarDays, 
  ShoppingBag, 
  Store, 
  Gavel, 
  Trophy, 
  Users, 
  BookOpen,
  ClipboardList,
  Globe
} from 'lucide-react';

interface DashboardProps {
  onNavigate: (view: View) => void;
  gamePhase: GamePhase;
  day: number;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate, gamePhase, day }) => {
  
  // Helper to render the big buttons
  const MenuButton = ({ 
    label, 
    icon: Icon, 
    view, 
    highlight = false,
    subtitle = "" 
  }: { 
    label: string, 
    icon: any, 
    view: View, 
    highlight?: boolean,
    subtitle?: string
  }) => (
    <button
      onClick={() => onNavigate(view)}
      className={`relative p-6 rounded-xl flex flex-col items-center justify-center gap-3 transition-all duration-200 transform hover:scale-[1.02] active:scale-95 shadow-lg border-2
        ${highlight 
          ? 'bg-gradient-to-br from-indigo-900 to-blue-900 border-blue-400 text-white' 
          : 'bg-gray-800 border-gray-700 hover:border-gray-500 text-gray-200'}
      `}
    >
      <Icon size={32} className={highlight ? "text-blue-300" : "text-gray-400"} />
      <div className="text-center">
        <h3 className="text-xl font-bold uppercase tracking-wider">{label}</h3>
        {subtitle && <p className="text-xs opacity-75 mt-1">{subtitle}</p>}
      </div>
    </button>
  );

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-4 animate-fade-in">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 italic uppercase">
          Street King Manager
        </h1>
        <div className="mt-2 inline-flex items-center px-4 py-1 rounded-full bg-gray-900 border border-gray-700 text-sm font-mono text-blue-400">
          <span className="mr-2">ДЕНЬ {day}</span>
          <span className="text-gray-500">|</span>
          <span className="ml-2 uppercase text-white">{gamePhase === 'PREPARATION' ? 'Покупка и Тюнинг' : 'День Гонки'}</span>
        </div>
      </header>

      {/* The Grid from the user image */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow">
        
        {/* Left Column */}
        <div className="flex flex-col gap-4">
          <MenuButton label="Гараж" icon={CarFront} view="GARAGE" />
          <MenuButton label="Мультиплеер" icon={Globe} view="MULTIPLAYER" highlight={true} subtitle="Онлайн Гонки" />
          <MenuButton label="Автосалон" icon={Store} view="DEALER" />
          <MenuButton label="Магазин Запчастей" icon={ShoppingBag} view="SHOP" />
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-4">
          <MenuButton label="Аукцион" icon={Gavel} view="AUCTION" />
          
          {/* The "Worklist" / Main Action Button */}
          <MenuButton 
            label="Заезды (Боты)" 
            icon={ClipboardList} 
            view="WORKLIST" 
            subtitle={gamePhase === 'PREPARATION' ? "Управление и Настройка" : "Центр Гонок"}
          />

          <MenuButton label="Игроки" icon={Users} view="PLAYERS" />
          <MenuButton label="Правила" icon={BookOpen} view="RULES" />
        </div>

      </div>

      <footer className="mt-8 text-center text-gray-600 text-sm">
        Время сервера: {new Date().toLocaleTimeString()}
      </footer>
    </div>
  );
};

export default Dashboard;
