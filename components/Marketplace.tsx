import React, { useMemo, useState } from 'react';
import { SHOPS } from '../constants';
import { Car, Part } from '../types';
import { getEffectiveStats } from '../services/gameEngine';

interface MarketplaceProps {
  money: number;
  gameYear: number;
  cars: Car[];
  shopVisits: Record<string, string>;
  onBuyPart: (carId: string, part: Part) => void;
  onRemovePart: (carId: string, partIndex: number) => void;
  onBack: () => void;
}

const CLASS_PART_LIMITS: Record<string, number> = { A: 16, B: 14, C: 12, D: 10, E: 8, R: 6, S: 4 };

const JAMSHUT_BRAND = 'Джамшут';

const Marketplace: React.FC<MarketplaceProps> = ({ money, gameYear, cars, shopVisits, onBuyPart, onRemovePart, onBack }) => {
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);
  const [selectedShopIdx, setSelectedShopIdx] = useState<number | null>(null);
  const [showJamshut, setShowJamshut] = useState(false);

  const unlockedShops = useMemo(() => SHOPS.filter(s => s.unlockYear <= gameYear), [gameYear]);
  const lockedShops = useMemo(() => SHOPS.filter(s => s.unlockYear > gameYear).sort((a, b) => a.unlockYear - b.unlockYear), [gameYear]);

  const selectedCar = useMemo(() => cars.find(c => c.id === selectedCarId) || null, [cars, selectedCarId]);
  const ownedPartIds = useMemo(() => {
    if (!selectedCar) return new Set<string>();
    return new Set(selectedCar.installedParts.map(p => p.id));
  }, [selectedCar]);

  const visitedBrand = selectedCarId ? shopVisits[selectedCarId] : undefined;

  const getPartLimit = () => {
    if (!selectedCar) return 16;
    return CLASS_PART_LIMITS[selectedCar.carClass || 'A'] || 16;
  };

  const hasPrerequisite = (requiredSlot: string): boolean => {
    if (!selectedCar) return false;
    return selectedCar.installedParts.some(p => p.slot === requiredSlot);
  };

  const getPartStatus = (part: Part): { blocked: boolean; reason?: string } => {
    if (part.requires && !hasPrerequisite(part.requires)) {
      return { blocked: true, reason: 'Нужен интеркулер' };
    }
    if (selectedCar && selectedCar.installedParts.length >= getPartLimit()) {
      return { blocked: true, reason: `Лимит ${getPartLimit()}` };
    }
    if (part.slot && selectedCar?.installedParts.some(p => p.slot === part.slot)) {
      return { blocked: true, reason: 'Слот занят' };
    }
    return { blocked: false };
  };

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

  // ШАГ 1: Выбор машины
  if (!selectedCarId) {
    return (
      <div className="p-3 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-lg retro-title">🔧 МАГАЗИН ЗАПЧАСТЕЙ</h2>
            <div className="text-[10px] text-[#00ff00] mt-1">💰 ${money.toLocaleString()}</div>
          </div>
          <button onClick={onBack} className="retro-btn text-[#aaa] text-[8px] py-1 px-3"
            style={{ backgroundColor: '#1a1a2e', border: '2px solid #555' }}>НАЗАД</button>
        </div>

        <div className="text-[8px] text-[#555] mb-3">ВЫБЕРИТЕ МАШИНУ ДЛЯ ЗАКУПКИ:</div>

        {cars.length === 0 ? (
          <div className="pixel-card p-8 text-center">
            <div className="text-[10px] text-[#666]">НЕТ МАШИН</div>
            <div className="text-[8px] text-[#444] mt-1">КУПИТЕ АВТО В САЛОНЕ</div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {cars.map(car => {
              const stats = getEffectiveStats(car);
              const visited = shopVisits[car.id];
              return (
                <button key={car.id} onClick={() => setSelectedCarId(car.id)}
                  className="pixel-card p-3 flex items-center gap-3 hover:border-[#5555ff] transition-colors text-left">
                  <div className="w-20 h-12 bg-[#111] overflow-hidden flex-shrink-0">
                    <img src={car.image} alt={car.name} className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = ''; }} />
                  </div>
                  <div className="flex-grow">
                    <div className="text-[9px] text-white">{car.name}</div>
                    <div className="text-[7px] text-[#555]">
                      {stats.power} лс · {stats.topSpeed} км/ч · {car.installedParts.length}/{CLASS_PART_LIMITS[car.carClass || 'A'] || 16} дет.
                    </div>
                    {visited && <div className="text-[7px] text-[#ffaa00]">Сегодня: {visited}</div>}
                  </div>
                  <div className="text-[8px] text-[#555]">▶</div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ШАГ 2: Магазины — карточки
  const currentShop = selectedShopIdx !== null ? unlockedShops[selectedShopIdx] : null;

  if (!currentShop) {
    return (
      <div className="p-3 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h2 className="text-lg retro-title">🔧 МАГАЗИНЫ</h2>
            <div className="text-[10px] mt-1">
              <span className="text-white">{selectedCar?.name}</span>
              <span className="text-[#00ff00] ml-3">💰 ${money.toLocaleString()}</span>
              <span className="text-[#555] ml-3">{selectedCar?.installedParts.length}/{getPartLimit()} дет.</span>
            </div>
            {visitedBrand && (
              <div className="text-[8px] text-[#ffaa00] mt-1">Машина сегодня в «{visitedBrand}». Только там можно покупать.</div>
            )}
          </div>
          <button onClick={() => setSelectedCarId(null)} className="retro-btn text-[#aaa] text-[8px] py-1 px-3"
            style={{ backgroundColor: '#1a1a2e', border: '2px solid #555' }}>← МАШИНЫ</button>
        </div>

        <div className="flex flex-col gap-3 pb-10">
          {unlockedShops.map((shop, idx) => {
            const locked = visitedBrand !== undefined && visitedBrand !== shop.brand;
            return (
              <button key={shop.brand} onClick={() => !locked && setSelectedShopIdx(idx)}
                disabled={locked}
                className={`pixel-card p-0 flex items-stretch overflow-hidden transition-colors ${locked ? 'opacity-30' : 'hover:border-[#5555ff]'}`}
                style={{ borderWidth: '3px', borderColor: locked ? '#222' : visitedBrand === shop.brand ? '#ffaa00' : '#333' }}>
                {/* Левая часть: название + год */}
                <div className="flex flex-col justify-center px-4 py-3 min-w-[160px] border-r border-[#222]">
                  <div className="text-[11px] text-white" style={{ textShadow: '1px 1px 0 #000' }}>{shop.brand}</div>
                  <div className="text-[7px] text-[#555] mt-1">с {shop.unlockYear} года</div>
                  {visitedBrand === shop.brand && <div className="text-[7px] text-[#ffaa00] mt-1">← СЕГОДНЯ ТУТ</div>}
                </div>
                {/* Детали превью */}
                <div className="flex-grow px-3 py-2 flex flex-wrap gap-1 items-center">
                  {shop.parts.slice(0, 6).map((p, pi) => (
                    <span key={pi} className="text-[7px] px-1.5 py-0.5 bg-[#111] border border-[#222] text-[#888]">
                      {p.name}
                    </span>
                  ))}
                  {shop.parts.length > 6 && (
                    <span className="text-[7px] text-[#555]">+{shop.parts.length - 6}</span>
                  )}
                </div>
                {/* Количество + стрелка */}
                <div className="flex flex-col justify-center items-center px-4 min-w-[80px]">
                  <div className="text-[10px] text-[#4488ff]">{shop.parts.length}</div>
                  <div className="text-[7px] text-[#555]">деталей</div>
                  {!locked && <div className="text-[8px] text-[#555] mt-1">▶</div>}
                </div>
              </button>
            );
          })}

          {/* Заблокированные магазины */}
          {lockedShops.length > 0 && (
            <div className="mt-2">
              <div className="text-[7px] text-[#555] mb-2">🔒 ОТКРОЮТСЯ ПОЗЖЕ:</div>
              <div className="flex flex-wrap gap-2">
                {lockedShops.map(shop => (
                  <div key={shop.brand} className="px-2 py-1 bg-[#111] border border-[#222] text-[7px] text-[#444]">
                    {shop.brand} ({shop.unlockYear})
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Джамшут — мастерская по снятию деталей */}
          {(() => {
            const jamshutLocked = visitedBrand !== undefined && visitedBrand !== JAMSHUT_BRAND;
            const hasParts = selectedCar && selectedCar.installedParts.length > 0;
            return (
              <button onClick={() => !jamshutLocked && hasParts && setShowJamshut(true)}
                disabled={jamshutLocked || !hasParts}
                className={`pixel-card p-0 flex items-stretch overflow-hidden transition-colors ${jamshutLocked ? 'opacity-30' : !hasParts ? 'opacity-50' : 'hover:border-[#ff8800]'}`}
                style={{ borderWidth: '3px', borderColor: jamshutLocked ? '#222' : visitedBrand === JAMSHUT_BRAND ? '#ff8800' : '#553300' }}>
                <div className="flex flex-col justify-center px-4 py-3 min-w-[160px] border-r border-[#222]">
                  <div className="text-[11px] text-[#ff8800]" style={{ textShadow: '1px 1px 0 #000' }}>🔨 Джамшут</div>
                  <div className="text-[7px] text-[#888] mt-1">Снятие деталей</div>
                  {visitedBrand === JAMSHUT_BRAND && <div className="text-[7px] text-[#ff8800] mt-1">← СЕГОДНЯ ТУТ</div>}
                </div>
                <div className="flex-grow px-3 py-2 flex items-center">
                  <span className="text-[8px] text-[#888]">Джамшут снимет деталь бесплатно, но заберёт её себе</span>
                </div>
                <div className="flex flex-col justify-center items-center px-4 min-w-[80px]">
                  {!jamshutLocked && hasParts && <div className="text-[8px] text-[#555]">▶</div>}
                </div>
              </button>
            );
          })()}
        </div>
      </div>
    );
  }

  // ШАГ 2.5: Джамшут — снятие деталей
  if (showJamshut && selectedCar) {
    return (
      <div className="p-3 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h2 className="text-lg retro-title" style={{color:'#ff8800'}}>🔨 ДЖАМШУТ</h2>
            <div className="text-[10px] mt-1">
              <span className="text-white">{selectedCar.name}</span>
              <span className="text-[#555] ml-3">{selectedCar.installedParts.length}/{getPartLimit()} дет.</span>
            </div>
            <div className="text-[8px] text-[#888] mt-1">Джамшут снимет деталь бесплатно, но заберёт её себе навсегда</div>
          </div>
          <button onClick={() => setShowJamshut(false)} className="retro-btn text-[#aaa] text-[8px] py-1 px-3"
            style={{ backgroundColor: '#1a1a2e', border: '2px solid #555' }}>← МАГАЗИНЫ</button>
        </div>

        {selectedCar.installedParts.length === 0 ? (
          <div className="pixel-card p-8 text-center">
            <div className="text-[10px] text-[#666]">НЕТ ДЕТАЛЕЙ</div>
            <div className="text-[8px] text-[#444] mt-1">МАШИНА В СТОКЕ</div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 pb-20">
            {selectedCar.installedParts.map((part, pIdx) => {
              const badges = boostBadges(part);
              return (
                <div key={pIdx} className="pixel-card p-0 flex items-stretch overflow-hidden"
                  style={{ borderWidth: '2px', borderColor: '#553300' }}>
                  <div className="flex-grow px-3 py-2 border-r border-[#222]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] text-white">{part.name}</span>
                      {part.slot && <span className="text-[7px] px-1.5 py-0.5 bg-[#1a1a2e] text-[#888] border border-[#333]">{part.slot}</span>}
                    </div>
                    {/* Бейджи — показываем что потеряете */}
                    <div className="flex flex-wrap gap-1">
                      {badges.map((badge, bi) => (
                        <span key={bi} className="text-[9px] px-1.5 py-0.5 font-bold"
                          style={{
                            backgroundColor: '#220000',
                            border: '1px solid #ff4444',
                            color: '#ff4444',
                          }}>
                          {badge.text.replace('+', '−')}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center px-3 py-2 min-w-[140px]">
                    <button
                      onClick={() => {
                        if (window.confirm(`Джамшут снимет "${part.name}" и заберёт себе. Продолжить?`)) {
                          onRemovePart(selectedCarId!, pIdx);
                        }
                      }}
                      className="retro-btn text-[8px] py-1 px-3"
                      style={{ backgroundColor: '#330000', border: '2px solid #ff8800', color: '#ff8800' }}>
                      🔨 СНЯТЬ
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ШАГ 3: Детали выбранного магазина
  return (
    <div className="p-3 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h2 className="text-lg retro-title">🏪 {currentShop.brand}</h2>
          <div className="text-[10px] mt-1">
            <span className="text-white">{selectedCar?.name}</span>
            <span className="text-[#00ff00] ml-3">💰 ${money.toLocaleString()}</span>
            <span className="text-[#555] ml-3">{selectedCar?.installedParts.length}/{getPartLimit()} дет.</span>
          </div>
        </div>
        <button onClick={() => setSelectedShopIdx(null)} className="retro-btn text-[#aaa] text-[8px] py-1 px-3"
          style={{ backgroundColor: '#1a1a2e', border: '2px solid #555' }}>← МАГАЗИНЫ</button>
      </div>

      <div className="flex flex-col gap-2 pb-20">
        {currentShop.parts.map((part) => {
          const owned = ownedPartIds.has(part.id);
          const canAfford = money >= part.price;
          const { blocked, reason } = getPartStatus(part);
          const disabled = owned || blocked || !canAfford;

          return (
            <div key={part.id}
              className={`pixel-card p-0 flex items-stretch overflow-hidden ${owned ? 'opacity-40' : blocked ? 'opacity-50' : ''}`}
              style={{ borderWidth: '2px', borderColor: owned ? '#44ff44' : blocked ? '#ff4444' : '#333' }}>

              {/* Название + описание + характеристики */}
              <div className="flex-grow px-3 py-2 border-r border-[#222]">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] text-white">{part.name}</span>
                  {part.slot && <span className="text-[7px] px-1.5 py-0.5 bg-[#1a1a2e] text-[#888] border border-[#333]">{part.slot}</span>}
                </div>
                {part.description && (
                  <div className="text-[8px] text-[#777] mb-1.5 leading-relaxed">{part.description}</div>
                )}
                {/* Бейджи характеристик */}
                <div className="flex flex-wrap gap-1">
                  {boostBadges(part).map((badge, bi) => (
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

              {/* Цена + кнопка */}
              <div className="flex items-center gap-3 px-3 py-2 min-w-[160px]">
                <div className="text-[10px] text-[#00ff00]">${part.price.toLocaleString()}</div>
                {owned ? (
                  <span className="text-[8px] text-[#44ff44]">✓</span>
                ) : blocked ? (
                  <span className="text-[7px] text-[#ff4444]">{reason}</span>
                ) : (
                  <button
                    onClick={() => selectedCarId && onBuyPart(selectedCarId, part)}
                    disabled={disabled}
                    className="retro-btn text-[8px] py-1 px-3"
                    style={{
                      backgroundColor: canAfford ? '#003300' : '#1a1a1a',
                      border: `2px solid ${canAfford ? '#00ff00' : '#333'}`,
                      color: canAfford ? '#00ff00' : '#555',
                    }}>
                    {canAfford ? 'КУПИТЬ' : '—'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Marketplace;
