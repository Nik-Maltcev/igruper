import React, { useMemo, useState } from 'react';
import { SHOP_PARTS, SHOPS, getUnlockedBrands } from '../constants';
import { Car, Part } from '../types';
import { DollarSign, AlertCircle, ShoppingCart, Lock, ArrowLeft, CarFront, Store } from 'lucide-react';
import { getEffectiveStats } from '../services/gameEngine';

interface MarketplaceProps {
  money: number;
  gameYear: number;
  cars: Car[];
  shopVisits: Record<string, string>; // carId -> brand (визит за сегодня)
  onBuyPart: (carId: string, part: Part) => void;
  onBack: () => void;
}

const Marketplace: React.FC<MarketplaceProps> = ({ money, gameYear, cars, shopVisits, onBuyPart, onBack }) => {
  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

  const unlockedBrands = useMemo(() => getUnlockedBrands(gameYear), [gameYear]);
  const unlockedShops = useMemo(() => SHOPS.filter(s => s.unlockYear <= gameYear), [gameYear]);
  const lockedShops = useMemo(() => SHOPS.filter(s => s.unlockYear > gameYear).sort((a, b) => a.unlockYear - b.unlockYear), [gameYear]);

  const selectedCar = useMemo(() => cars.find(c => c.id === selectedCarId) || null, [cars, selectedCarId]);
  const ownedPartIds = useMemo(() => {
    if (!selectedCar) return new Set<string>();
    return new Set(selectedCar.installedParts.map(p => p.id));
  }, [selectedCar]);

  // Магазин, в который эта машина уже ездила сегодня
  const visitedBrand = selectedCarId ? shopVisits[selectedCarId] : undefined;

  const shopParts = useMemo(() => {
    if (!selectedBrand) return [];
    return SHOP_PARTS.filter(p => p.brand === selectedBrand);
  }, [selectedBrand]);

  const boostSummary = (part: Part) => {
    const b = part.boosts;
    const items: string[] = [];
    if (b.power) items.push(`${b.power > 0 ? '+' : ''}${b.power} лс`);
    if (b.powerPct) items.push(`${b.powerPct > 0 ? '+' : ''}${b.powerPct}% лс`);
    if (b.torque) items.push(`${b.torque > 0 ? '+' : ''}${b.torque} Нм`);
    if (b.topSpeed) items.push(`${b.topSpeed > 0 ? '+' : ''}${b.topSpeed} км/ч`);
    if (b.topSpeedPct) items.push(`${b.topSpeedPct > 0 ? '+' : ''}${b.topSpeedPct}% скор`);
    if (b.accelerationPct) items.push(`+${b.accelerationPct}% разг`);
    if (b.handling) items.push(`${b.handling > 0 ? '+' : ''}${b.handling} упр`);
    if (b.offroad) items.push(`${b.offroad > 0 ? '+' : ''}${b.offroad} прох`);
    return items;
  };

  // Проверка: есть ли уже деталь с таким слотом на машине
  const hasSlotInstalled = (slot: string): boolean => {
    if (!selectedCar) return false;
    return selectedCar.installedParts.some(p => p.slot === slot);
  };

  // Проверка: выполнен ли пререквизит
  const hasPrerequisite = (requiredSlot: string): boolean => {
    if (!selectedCar) return false;
    return selectedCar.installedParts.some(p => p.slot === requiredSlot);
  };

  // Статус детали: можно ли купить и почему нет
  const getPartStatus = (part: Part): { blocked: boolean; reason?: string } => {
    if (part.requires && !hasPrerequisite(part.requires)) {
      const slotNames: Record<string, string> = {
        intercooler: 'Интеркулер',
        tires: 'Шины',
        camshaft: 'Распредвал',
        differential: 'Дифференциал',
        turbo: 'Турбина',
        compressor: 'Компрессор',
      };
      return { blocked: true, reason: `Нужен ${slotNames[part.requires] || part.requires}` };
    }
    if (part.slot && hasSlotInstalled(part.slot)) {
      return { blocked: true, reason: 'Слот занят' };
    }
    return { blocked: false };
  };

  const goBack = () => {
    if (selectedBrand) { setSelectedBrand(null); }
    else if (selectedCarId) { setSelectedCarId(null); }
    else { onBack(); }
  };

  // ========== ШАГ 1: Выбор машины ==========
  if (!selectedCarId) {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold text-white uppercase italic">Магазин Запчастей</h2>
            <p className="text-gray-400 text-sm mt-1">Выберите машину для закупки деталей</p>
          </div>
          <button onClick={onBack} className="text-gray-400 hover:text-white border border-gray-600 px-4 py-1 rounded">Назад</button>
        </div>

        {cars.length === 0 ? (
          <div className="text-center py-20 bg-gray-800 rounded-xl border border-dashed border-gray-600">
            <CarFront size={48} className="mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400 text-lg">У вас нет машин.</p>
            <p className="text-sm text-gray-500">Сначала купите машину в Автосалоне.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cars.map(car => {
              const visited = shopVisits[car.id];
              const stats = getEffectiveStats(car);
              return (
                <button key={car.id}
                  onClick={() => setSelectedCarId(car.id)}
                  className="bg-gray-800 rounded-xl p-4 border-2 border-gray-700 hover:border-blue-500 transition-all text-left flex gap-4 items-center group">
                  <div className="w-20 h-14 rounded-lg overflow-hidden bg-gray-900 shrink-0">
                    <img src={car.image} alt={car.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="font-bold text-white truncate">{car.name}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">
                      {stats.power} лс · {stats.topSpeed} км/ч · {car.installedParts.length} деталей
                    </div>
                    {visited && (
                      <div className="text-[10px] text-yellow-400 mt-1">
                        Сегодня: {visited}
                      </div>
                    )}
                  </div>
                  <ArrowLeft size={18} className="text-gray-600 rotate-180 group-hover:text-blue-400 shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ========== ШАГ 2: Выбор магазина ==========
  if (!selectedBrand) {
    return (
      <div className="p-4 max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <button onClick={goBack} className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1 mb-1">
              <ArrowLeft size={14} /> Выбор машины
            </button>
            <h2 className="text-2xl font-bold text-white uppercase italic">
              {selectedCar?.name}
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              {visitedBrand
                ? <span className="text-yellow-400">Эта машина уже была в магазине «{visitedBrand}» сегодня. Можно покупать только там.</span>
                : 'Выберите магазин. Одна машина — один магазин за день.'
              }
            </p>
          </div>
          <button onClick={onBack} className="text-gray-400 hover:text-white border border-gray-600 px-4 py-1 rounded">В меню</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {unlockedShops.map(shop => {
            const partsCount = SHOP_PARTS.filter(p => p.brand === shop.brand).length;
            // Если машина уже была в другом магазине — заблокировать все кроме того
            const locked = visitedBrand !== undefined && visitedBrand !== shop.brand;
            return (
              <button key={shop.brand}
                onClick={() => !locked && setSelectedBrand(shop.brand)}
                disabled={locked}
                className={`bg-gray-800 rounded-xl p-5 border-2 transition-all text-left flex items-center gap-4 group
                  ${locked
                    ? 'border-gray-800 opacity-40 cursor-not-allowed'
                    : visitedBrand === shop.brand
                      ? 'border-yellow-500/50 hover:border-yellow-400'
                      : 'border-gray-700 hover:border-blue-500'
                  }`}>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl font-black transition-colors
                  ${locked ? 'bg-gray-900/30 text-gray-600' : 'bg-blue-900/30 text-blue-400 group-hover:bg-blue-900/50'}`}>
                  {shop.brand[0]}
                </div>
                <div className="flex-grow">
                  <div className="font-bold text-white text-lg">{shop.brand}</div>
                  <div className="text-xs text-gray-500">
                    {partsCount} деталей · с {shop.unlockYear} г.
                    {visitedBrand === shop.brand && <span className="text-yellow-400 ml-2">← сегодня тут</span>}
                  </div>
                </div>
                {!locked && <ArrowLeft size={18} className="text-gray-600 rotate-180 group-hover:text-blue-400" />}
                {locked && <Lock size={16} className="text-gray-600" />}
              </button>
            );
          })}
        </div>

        {lockedShops.length > 0 && (
          <div>
            <h3 className="text-sm font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
              <Lock size={14} /> Откроются позже
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {lockedShops.map(shop => (
                <div key={shop.brand} className="bg-gray-900/50 border border-gray-800 rounded-lg p-3 flex items-center gap-3 opacity-50">
                  <Lock size={16} className="text-gray-600 shrink-0" />
                  <div>
                    <div className="text-sm font-bold text-gray-400">{shop.brand}</div>
                    <div className="text-[10px] text-gray-600">{shop.unlockYear} год</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ========== ШАГ 3: Детали выбранного магазина ==========
  const effectiveStats = selectedCar ? getEffectiveStats(selectedCar) : null;

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <div>
          <button onClick={goBack} className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1 mb-1">
            <ArrowLeft size={14} /> Выбор магазина
          </button>
          <h2 className="text-2xl font-bold text-white uppercase italic flex items-center gap-3">
            <Store size={24} className="text-blue-400" />
            {selectedBrand}
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Машина: <span className="text-white font-semibold">{selectedCar?.name}</span> · 
            Баланс: <span className="text-green-400 font-bold">${money.toLocaleString()}</span>
          </p>
        </div>
        <button onClick={onBack} className="text-gray-400 hover:text-white border border-gray-600 px-4 py-1 rounded">В меню</button>
      </div>

      {/* Текущие характеристики машины */}
      {effectiveStats && (
        <div className="bg-gray-800/50 rounded-lg p-3 mb-5 grid grid-cols-3 md:grid-cols-6 gap-2 text-center text-xs">
          <div><span className="text-gray-500">Мощность</span><div className="text-white font-bold">{effectiveStats.power} лс</div></div>
          <div><span className="text-gray-500">Момент</span><div className="text-white font-bold">{effectiveStats.torque} Нм</div></div>
          <div><span className="text-gray-500">Скорость</span><div className="text-white font-bold">{effectiveStats.topSpeed} км/ч</div></div>
          <div><span className="text-gray-500">Разгон</span><div className="text-white font-bold">{effectiveStats.acceleration} сек</div></div>
          <div><span className="text-gray-500">Управл.</span><div className="text-white font-bold">{effectiveStats.handling}</div></div>
          <div><span className="text-gray-500">Проход.</span><div className="text-white font-bold">{effectiveStats.offroad}</div></div>
        </div>
      )}

      {shopParts.length === 0 ? (
        <div className="text-center py-16 bg-gray-800 rounded-xl border border-dashed border-gray-600">
          <AlertCircle size={40} className="mx-auto text-gray-600 mb-3" />
          <p className="text-gray-400">В этом магазине пока нет деталей.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {shopParts.map(part => {
            const owned = ownedPartIds.has(part.id);
            const canAfford = money >= part.price;
            const boosts = boostSummary(part);
            const { blocked, reason } = getPartStatus(part);
            const disabled = owned || blocked || !canAfford;

            return (
              <div key={part.id}
                className={`bg-gray-800 rounded-xl p-4 border-2 transition-all
                  ${owned ? 'border-green-500/30 opacity-60'
                    : blocked ? 'border-red-500/20 opacity-50'
                    : canAfford ? 'border-gray-700 hover:border-blue-500'
                    : 'border-gray-700 opacity-50'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{part.icon}</span>
                    <div>
                      <div className="font-bold text-white text-sm">{part.name}</div>
                      {part.description && <div className="text-[10px] text-gray-500">{part.description}</div>}
                    </div>
                  </div>
                  {owned && (
                    <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-bold">Куплено ✓</span>
                  )}
                  {!owned && blocked && (
                    <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-bold">{reason}</span>
                  )}
                </div>

                {boosts.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {boosts.map((b, i) => (
                      <span key={i} className="text-[10px] bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded-full">{b}</span>
                    ))}
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-green-400 font-bold flex items-center gap-1">
                    <DollarSign size={14} />{part.price.toLocaleString()}
                  </span>
                  {owned ? (
                    <span className="text-gray-500 text-xs">Установлено</span>
                  ) : blocked ? (
                    <span className="text-red-400 text-xs flex items-center gap-1"><Lock size={12} />{reason}</span>
                  ) : (
                    <button
                      onClick={() => selectedCarId && onBuyPart(selectedCarId, part)}
                      disabled={disabled}
                      className={`px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 transition-all
                        ${canAfford
                          ? 'bg-blue-600 hover:bg-blue-500 text-white'
                          : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}>
                      <ShoppingCart size={14} />
                      {canAfford ? 'Купить' : 'Нет денег'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Marketplace;
