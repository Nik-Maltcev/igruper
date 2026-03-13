import React, { useState, useEffect } from 'react';
import { RoomPlayer } from '../types';
import { fetchPlayers } from '../services/multiplayer';
import { getEffectiveStats } from '../services/gameEngine';

interface PlayersProps {
  roomId: string;
  onBack: () => void;
}

const Players: React.FC<PlayersProps> = ({ roomId, onBack }) => {
  const [players, setPlayers] = useState<RoomPlayer[]>([]);

  useEffect(() => {
    fetchPlayers(roomId).then(setPlayers);
  }, [roomId]);
  return (
    <div className="flex flex-col min-h-full p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl md:text-2xl retro-title text-[#44ffaa]">👥 СОПЕРНИКИ</h2>
        <button onClick={onBack} className="retro-btn text-[10px] px-3 py-1 bg-[#1a1a2e] text-[#aaa]">
          НАЗАД
        </button>
      </div>

      <div className="space-y-4 overflow-y-auto pb-20">
        {players.map(p => (
          <div key={p.id} className="pixel-card p-3 border-2 border-[#44ffaa] bg-[#0a0a1a]">
            <div className="flex justify-between items-center mb-2 pb-2 border-b border-[#333]">
              <div className="text-lg text-[#fff] font-bold">
                {p.username} {p.is_host && <span className="text-[12px]">👑</span>}
              </div>
              <div className="text-right text-[10px]">
                <div className="text-[#ffdd00]">💰 {p.money.toLocaleString()} ₽</div>
                <div className="text-[#00ffaa]">🏆 {p.points} очков</div>
              </div>
            </div>

            <div className="mt-2 text-[10px] text-[#aaa] mb-1">
              ГАРАЖ ({p.garage.length}):
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {p.garage.length === 0 ? (
                <div className="text-[10px] text-[#555] italic">Гараж пуст</div>
              ) : (
                p.garage.map(car => {
                  const s = getEffectiveStats(car);
                  let effectiveTire = car.roadType || 'У';
                  const tiresPart = car.installedParts?.find(part => part.slot === 'tires');
                  if (tiresPart) {
                    const n = tiresPart.name.toLowerCase();
                    if (n.includes('слик')) effectiveTire = 'С';
                    else if (n.includes('гоночн')) effectiveTire = 'Г';
                    else if (n.includes('внедор')) effectiveTire = 'В';
                    else if (n.includes('универс')) effectiveTire = 'У';
                  }

                  return (
                    <div key={car.id} className="p-2 border border-[#333] bg-[#111]">
                      <div className="text-[10px] text-[#ccc] mb-1 truncate">{car.name}</div>
                      <div className="flex justify-between text-[8px] text-[#888]">
                        <span>Мощ: <b className="text-[#fff]">{s.power}</b> лс</span>
                        <span>Скор: <b className="text-[#fff]">{s.topSpeed}</b> км/ч</span>
                      </div>
                      <div className="flex justify-between text-[8px] text-[#888] mt-1">
                        <span>Разг: <b className="text-[#fff]">{s.acceleration}</b></span>
                        <span className="text-[#ffdd00]">Шины: {effectiveTire}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Players;
