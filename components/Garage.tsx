import React, { useState } from 'react';
import { Car, CarStats, Part } from '../types';
import { getEffectiveStats } from '../services/gameEngine';

interface GarageProps {
  cars: Car[];
  storage: Part[];
  gameStage?: number; // Номер этапа (0 = начало)
  onBack: () => void;
  onRemovePart: (carId: string, partIndex: number) => void;
  onRemovePartToStorage: (carId: string, partIndex: number) => void;
  onInstallFromStorage: (carId: string, storageIndex: number) => void;
  onSellCar: (carId: string, price: number) => void;
}

const STAT_HEADERS = ['Мощность', 'Крут.момент', 'Скорость', 'Разгон', 'Управляемость', 'Проходимость'];
const STAT_KEYS = ['power', 'torque', 'topSpeed', 'acceleration', 'handling', 'offroad'] as const;
const STAT_UNITS = ['лс', 'Нм', '', 'с', '', ''];
const CLASS_PART_LIMITS: Record<string, number> = { A: 16, B: 14, C: 12, D: 10, E: 8, R: 6, S: 4 };

// Task 11: Расчёт текущей цены автомобиля в зависимости от редкости и номера этапа
function getCurrentPrice(car: Car, stage: number): number {
  const base = car.price;
  const rarity = car.rarity ?? 3;
  let price = base;
  if (rarity === 1) {
    price = Math.max(base * 0.5, base - 600 * stage);
  } else if (rarity === 2) {
    price = Math.max(base * 0.5, base - 300 * stage);
  } else if (rarity === 4) {
    price = base + 500 * stage;
  } else if (rarity === 5) {
    price = base + 1000 * stage;
  }
  return Math.round(price);
}

function coeffColor(v: number) {
  if (v > 1) return '#44ff44';
  if (v < 1) return '#ff4444';
  return '#888';
}

const CLASS_COLORS: Record<string, string> = {
  A: '#888888', B: '#ffdd00', C: '#4488ff', D: '#44ff44', E: '#ff8800', R: '#aa44ff', S: '#ff4444',
};

type GarageTab = 'cars' | 'storage';

const boostBadges = (part: Part) => {
  const b = part.boosts;
  const items: { text: string; positive: boolean }[] = [];
  if (b.power) items.push({ text: `${b.power > 0 ? '+' : ''}${b.power} лс`, positive: b.power > 0 });
  if (b.powerPct) items.push({ text: `${b.powerPct}% лс`, positive: b.powerPct > 0 });
  if (b.torque) items.push({ text: `${b.torque > 0 ? '+' : ''}${b.torque} Нм`, positive: b.torque > 0 });
  if (b.torquePct) items.push({ text: `${b.torquePct}% Нм`, positive: b.torquePct > 0 });
  if (b.topSpeed) items.push({ text: `${b.topSpeed > 0 ? '+' : ''}${b.topSpeed} км/ч`, positive: b.topSpeed > 0 });
  if (b.topSpeedPct) items.push({ text: `${b.topSpeedPct}% скор`, positive: b.topSpeedPct > 0 });
  if (b.accelerationPct) items.push({ text: `+${b.accelerationPct}% разг`, positive: true });
  if (b.handling) items.push({ text: `${b.handling > 0 ? '+' : ''}${b.handling} У`, positive: b.handling > 0 });
  if (b.offroad) items.push({ text: `${b.offroad > 0 ? '+' : ''}${b.offroad} П`, positive: b.offroad > 0 });
  return items;
};

const Garage: React.FC<GarageProps> = ({ cars, storage, gameStage = 0, onBack, onRemovePart, onRemovePartToStorage, onInstallFromStorage, onSellCar }) => {
  const [tab, setTab] = useState<GarageTab>('cars');
  const [installCarId, setInstallCarId] = useState<string | null>(null);

  return (
    <div className="p-3 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg retro-title">🏎️ МОЙ ГАРАЖ</h2>
        <button onClick={onBack} className="retro-btn text-[#aaa] text-[8px] py-1 px-3" style={{ backgroundColor: '#1a1a2e', border: '2px solid #555' }}>
          МЕНЮ
        </button>
      </div>

      {/* Вкладки */}
      <div className="flex gap-2 mb-3">
        <button onClick={() => setTab('cars')}
          className="retro-btn text-[9px] py-1 px-4"
          style={{
            backgroundColor: tab === 'cars' ? '#1a1a4e' : '#0d0d20',
            border: `2px solid ${tab === 'cars' ? '#5555ff' : '#333'}`,
            color: tab === 'cars' ? '#fff' : '#666',
          }}>
          🚗 МАШИНЫ ({cars.length})
        </button>
        <button onClick={() => { setTab('storage'); setInstallCarId(null); }}
          className="retro-btn text-[9px] py-1 px-4"
          style={{
            backgroundColor: tab === 'storage' ? '#1a1a4e' : '#0d0d20',
            border: `2px solid ${tab === 'storage' ? '#ffaa00' : '#333'}`,
            color: tab === 'storage' ? '#fff' : '#666',
          }}>
          📦 СКЛАД ({storage.length})
        </button>
      </div>

      {/* === ВКЛАДКА: МАШИНЫ === */}
      {tab === 'cars' && (
        <>
          {cars.length === 0 ? (
            <div className="text-center py-16 pixel-card p-8">
              <p className="text-[10px] text-[#666] mb-2">ГАРАЖ ПУСТ</p>
              <p className="text-[8px] text-[#444]">КУПИТЕ АВТО В САЛОНЕ</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 pb-20">
              {cars.map((car, idx) => {
                const effective = getEffectiveStats(car);
                const co = car.coefficients || {} as Partial<CarStats>;
                const partLimit = CLASS_PART_LIMITS[car.carClass || 'A'] || 16;
                return (
                  <div key={`${car.id}-${idx}`}
                    className="pixel-card p-0 flex flex-col overflow-hidden"
                    style={{ borderColor: CLASS_COLORS[car.carClass || ''] || '#333', borderWidth: '4px' }}>

                    {/* Верхняя часть: имя+теги | картинка | статы */}
                    <div className="flex items-stretch" style={{ minHeight: '168px' }}>
                      <div className="flex flex-col justify-center px-3 py-2 min-w-[140px] max-w-[160px] border-r border-[#222]">
                        <div className="text-[10px] text-white leading-tight mb-1" style={{ textShadow: '1px 1px 0 #000' }}>{car.name}</div>
                        <div className="text-[7px] text-white leading-relaxed">
                          {car.carClass && <div>класс: {car.carClass}</div>}
                          {car.tags?.[0] && <div>{car.tags[0]}</div>}
                          {car.tags?.[1] && <div>{car.tags[1]}</div>}
                          {car.rarity && <div>редкость: {car.rarity}</div>}
                          {car.tags?.slice(2).map((tag: string, ti: number) => (
                            <div key={ti} style={{ color: '#ffaa00' }}>{tag}</div>
                          ))}
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

                    {/* Task 11: Цена + кнопка ПРОДАТЬ */}
                    <div className="border-t border-[#333] px-4 py-1.5 flex items-center justify-between">
                      <div className="text-[8px] text-[#888]">
                        Цена: <span className="text-[#00ff00]">${getCurrentPrice(car, gameStage).toLocaleString()}</span>
                        {(car.rarity ?? 3) !== 3 && (
                          <span className="ml-2 text-[7px] text-[#555]">
                            (редкость {car.rarity})
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          const price = getCurrentPrice(car, gameStage);
                          if (window.confirm(`Продать ${car.name} в банк за $${price.toLocaleString()}?`)) {
                            onSellCar(car.id, price);
                          }
                        }}
                        className="retro-btn text-[7px] py-0.5 px-2"
                        style={{ backgroundColor: '#001a00', border: '1px solid #00aa00', color: '#00aa00' }}
                      >
                        ПРОДАТЬ
                      </button>
                    </div>

                    {/* Разделитель + Детали */}
                    <div className="border-t-2 border-[#333] px-4 py-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-[8px] text-[#555]">ДЕТАЛИ ({car.installedParts.length}/{partLimit}):</span>
                        {car.installedParts.length > 0 ? (
                          car.installedParts.map((part, pIdx) => (
                            <div key={pIdx} className="flex items-center gap-1 bg-[#111] px-2 py-0.5 border border-[#333]" style={{ borderRadius: '2px' }}>
                              <span className="text-[8px] text-[#4488ff]">🔧 {part.name}</span>
                              <button onClick={() => onRemovePartToStorage(car.id, pIdx)} className="text-[8px] text-[#ffaa00] hover:text-[#ffcc00] ml-1" title="На склад">📦</button>
                              <button onClick={() => onRemovePart(car.id, pIdx)} className="text-[8px] text-[#ff4444] hover:text-[#ff6666] ml-0.5" title="Удалить">✕</button>
                            </div>
                          ))
                        ) : (
                          <span className="text-[8px] text-[#444]">СТОК</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* === ВКЛАДКА: СКЛАД === */}
      {tab === 'storage' && (
        <div className="pb-20">
          {storage.length === 0 ? (
            <div className="text-center py-16 pixel-card p-8">
              <p className="text-[10px] text-[#666] mb-2">📦 СКЛАД ПУСТ</p>
              <p className="text-[8px] text-[#444]">ТРОФЕЙНЫЕ ДЕТАЛИ ПОЯВЯТСЯ ЗДЕСЬ</p>
            </div>
          ) : (
            <>
              {/* Выбор машины для установки */}
              {cars.length > 0 && (
                <div className="mb-3 pixel-card p-2">
                  <div className="text-[8px] text-[#555] mb-1">УСТАНОВИТЬ НА:</div>
                  <div className="flex flex-wrap gap-2">
                    {cars.map(car => (
                      <button key={car.id} onClick={() => setInstallCarId(installCarId === car.id ? null : car.id)}
                        className="text-[8px] px-2 py-1 border"
                        style={{
                          backgroundColor: installCarId === car.id ? '#1a1a4e' : '#111',
                          borderColor: installCarId === car.id ? '#5555ff' : '#333',
                          color: installCarId === car.id ? '#fff' : '#888',
                        }}>
                        {car.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                {storage.map((part, si) => {
                  const badges = boostBadges(part);
                  const targetCar = cars.find(c => c.id === installCarId);
                  const partLimit = targetCar ? (CLASS_PART_LIMITS[targetCar.carClass || 'A'] || 16) : 0;
                  const canInstall = targetCar && targetCar.installedParts.length < partLimit
                    && (!part.slot || !targetCar.installedParts.some(p => p.slot === part.slot));

                  return (
                    <div key={si} className="pixel-card p-0 flex items-stretch overflow-hidden" style={{ borderWidth: '2px' }}>
                      <div className="flex-grow px-3 py-2 border-r border-[#222]">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] text-white">{part.name}</span>
                          {part.slot && <span className="text-[7px] px-1.5 py-0.5 bg-[#1a1a2e] text-[#888] border border-[#333]">{part.slot}</span>}
                          {part.brand && <span className="text-[7px] text-[#555]">{part.brand}</span>}
                        </div>
                        {part.description && (
                          <div className="text-[8px] text-[#777] mb-1">{part.description}</div>
                        )}
                        <div className="flex flex-wrap gap-1">
                          {badges.map((badge, bi) => (
                            <span key={bi} className="text-[9px] px-1.5 py-0.5 font-bold"
                              style={{
                                backgroundColor: badge.positive ? '#002200' : '#220000',
                                border: `1px solid ${badge.positive ? '#00ff00' : '#ff4444'}`,
                                color: badge.positive ? '#00ff00' : '#ff4444',
                              }}>
                              {badge.text}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 px-3 py-2 min-w-[180px]">
                        {installCarId && canInstall && (
                          <button onClick={() => onInstallFromStorage(installCarId, si)}
                            className="retro-btn text-[8px] py-1 px-3"
                            style={{ backgroundColor: '#002200', border: '2px solid #00ff00', color: '#00ff00' }}>
                            УСТАНОВИТЬ
                          </button>
                        )}
                        {installCarId && !canInstall && targetCar && (
                          <span className="text-[7px] text-[#ff4444]">
                            {targetCar.installedParts.length >= partLimit ? 'Лимит' : 'Слот занят'}
                          </span>
                        )}
                        <button className="retro-btn text-[8px] py-1 px-3"
                          style={{ backgroundColor: '#1a1a2e', border: '2px solid #ffaa00', color: '#ffaa00' }}
                          title="Выставить на аукцион (скоро)">
                          🏷️ АУКЦИОН
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Garage;
