import React, { useState, useEffect } from 'react';
import { AVAILABLE_CARS } from '../constants';
import { Car, CarStats, RoomPlayer } from '../types';
import { fetchPlayers } from '../services/multiplayer';
import { getEffectiveStats } from '../services/gameEngine';


function getCarClass(car) {
  if (car.carClass) return car.carClass;
  if (car.originalId) {
    const orig = AVAILABLE_CARS.find(c => c.id === car.originalId);
    if (orig?.carClass) return orig.carClass;
  }
  // Try to find by name
  const byName = AVAILABLE_CARS.find(c => c.name === car.name);
  if (byName?.carClass) return byName.carClass;
  return 'A';
}
interface PlayersProps {
  roomId: string;
  onBack: () => void;
}

const STAT_HEADERS = ['Мощность', 'Крут.момент', 'Скорость', 'Разгон', 'Управляемость', 'Проходимость'];
const STAT_KEYS = ['power', 'torque', 'topSpeed', 'acceleration', 'handling', 'offroad'] as const;
const STAT_UNITS = ['лс', 'Нм', '', 'с', '', ''];

const CLASS_COLORS: Record<string, string> = {
  A: '#888888', B: '#ffdd00', C: '#4488ff', D: '#44ff44', E: '#ff8800', R: '#aa44ff', S: '#ff4444',
};

const CLASS_PART_LIMITS: Record<string, number> = { A: 16, B: 14, C: 12, D: 10, E: 8, R: 6, S: 4 };

function coeffColor(v: number) {
  if (v > 1) return '#44ff44';
  if (v < 1) return '#ff4444';
  return '#888';
}

const Players: React.FC<PlayersProps> = ({ roomId, onBack }) => {
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);

  useEffect(() => {
    fetchPlayers(roomId).then(list =>
      setPlayers([...list].sort((a, b) => b.points - a.points))
    );
  }, [roomId]);

  return (
    <div className="p-3 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg retro-title text-[#44ffaa]">👥 СОПЕРНИКИ</h2>
        <button onClick={onBack} className="retro-btn text-[#aaa] text-[8px] py-1 px-3" style={{ backgroundColor: '#1a1a2e', border: '2px solid #555' }}>
          МЕНЮ
        </button>
      </div>

      <div className="flex flex-col gap-3 pb-20">
        {players.map(p => (
          <div key={p.id} className="pixel-card p-0 overflow-hidden" style={{ borderColor: '#44ffaa', borderWidth: '2px' }}>
            {/* Шапка игрока */}
            <button
              className="w-full flex justify-between items-center px-4 py-2 bg-[#0a0a1a] hover:bg-[#111] transition-colors cursor-pointer"
              onClick={() => setExpandedPlayer(expandedPlayer === p.id ? null : p.id)}
            >
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-[#fff] font-bold">{p.username}</span>
                {p.is_host && <span className="text-[10px]">👑</span>}
                <span className="text-[9px] text-[#666]">({p.garage.length} авто)</span>
              </div>
              <div className="flex items-center gap-3 text-[9px]">
                <span className="text-[#ffdd00]">💰 {p.money.toLocaleString()}</span>
                <span className="text-[#00ffaa]">🏆 {p.points}</span>
                <span className="text-[#555]">{expandedPlayer === p.id ? '▲' : '▼'}</span>
              </div>
            </button>

            {/* Гараж — раскрывается */}
            {expandedPlayer === p.id && (
              <div className="flex flex-col gap-3 p-3 bg-[#050510]">
                {p.garage.length === 0 ? (
                  <div className="text-center py-4 text-[10px] text-[#555]">Гараж пуст</div>
                ) : (
                  p.garage.map((car: Car, idx: number) => {
                    const effective = getEffectiveStats(car);
                    const co = car.coefficients || {} as Partial<CarStats>;
                    const partLimit = CLASS_PART_LIMITS[getCarClass(car)] || 16;

                    return (
                      <div key={`${car.id}-${idx}`}
                        className="pixel-card p-0 flex flex-col overflow-hidden"
                        style={{ borderColor: CLASS_COLORS[getCarClass(car) || ''] || '#333', borderWidth: '8px' }}>

                        {/* Верхняя часть: имя+теги | картинка | статы */}
                        <div className="flex items-stretch" style={{ minHeight: '168px' }}>
                          <div className="flex flex-col justify-center px-3 py-2 min-w-[140px] max-w-[160px] border-r border-[#222]">
                            <div className="text-[10px] text-white leading-tight mb-1" style={{ textShadow: '1px 1px 0 #000' }}>{car.name}</div>
                            <div className="text-[7px] text-white leading-relaxed">
                              {car.carClass && <div>класс: {car.carClass}</div>}
                              {car.epoch && <div style={{color: '#00aaff'}}>эпоха: {car.epoch}</div>}
                              {car.tags?.[0] && <div>{car.tags[0]}</div>}
                              {car.tags?.[1] && <div>{car.tags[1]}</div>}
                              {car.rarity && <div>редкость: {car.rarity}</div>}
                              {car.tags?.slice(2).map((tag: string, ti: number) => (
                                <div key={ti} style={{ color: '#ffaa00' }}>{tag}</div>
                              ))}
                              {(() => {
                                const tiresPart = car.installedParts?.find(pt => pt.slot === 'tires');
                                let letter = null;
                                if (tiresPart) {
                                  const n = tiresPart.name.toLowerCase();
                                  letter = n.includes('слик') ? 'С' : n.includes('гоночн') ? 'Г' : n.includes('внедор') ? 'В' : n.includes('универс') ? 'У' : null;
                                }
                                if (!letter && car.roadType) letter = car.roadType;
                                if (!letter) return null;
                                return <div style={{ color: '#ffdd00', fontWeight: 'bold' }}>шины: {letter}</div>;
                              })()}
                            </div>
                          </div>

                          <div className="w-[336px] min-w-[336px] bg-[#111] border-r border-[#222] relative overflow-hidden">
                            <img src={car.image} alt={car.name} className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).onerror = null; (e.target as HTMLImageElement).src = `https://placehold.co/400x200/111/555?text=${encodeURIComponent(car.name.substring(0, 12))}`; }} />
                          </div>

                          <div className="flex-grow flex flex-col justify-center">
                            <table className="w-full text-center" style={{ borderCollapse: 'collapse' }}>
                              <thead>
                                <tr>
                                  {STAT_HEADERS.map((h, hi) => (
                                    <th key={hi} className="text-[8px] text-[#ddd] px-2 py-1 font-normal border-b border-[#333]">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  {STAT_KEYS.map((k, ki) => {
                                    const base = car.stats[k];
                                    const eff = effective[k];
                                    const boosted = eff !== base;
                                    return (
                                      <td key={ki} className="text-[10px] px-2 py-1 border-b border-[#1a1a2e]" style={{ color: boosted ? '#ffff00' : '#fff' }}>
                                        {k === 'acceleration' ? eff.toFixed(2) : eff}
                                        {STAT_UNITS[ki] && <span className="text-[7px] text-[#999] ml-0.5">{STAT_UNITS[ki]}</span>}
                                        {boosted && <span className="text-[#ffff00] ml-0.5">★</span>}
                                      </td>
                                    );
                                  })}
                                </tr>
                                <tr>
                                  {STAT_KEYS.map((k, ki) => (
                                    <td key={ki} className="text-[9px] px-2 py-1" style={{ color: coeffColor((co as any)[k] || 1) }}>
                                      {((co as any)[k] || 1).toFixed(1)}
                                    </td>
                                  ))}
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Детали (только чтение) */}
                        <div className="border-t-2 border-[#333] px-4 py-2">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-[8px] text-[#555]">ДЕТАЛИ ({car.installedParts.length}/{partLimit}):</span>
                            {car.installedParts.length > 0 ? (
                              car.installedParts.map((part, pIdx) => (
                                <div key={pIdx} className="flex items-center gap-1 bg-[#111] px-2 py-0.5 border border-[#333]" style={{ borderRadius: '2px' }}>
                                  <span className="text-[8px] text-[#4488ff]">🔧 {part.name}</span>
                                </div>
                              ))
                            ) : (
                              <span className="text-[8px] text-[#444]">СТОК</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Players;
