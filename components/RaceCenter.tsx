import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Car, RaceResult, RaceEntry } from '../types';
import { RACES_DATA } from '../constants';
import { submitRaceEntry, fetchRaceEntries, fetchPlayers, POWER_CATEGORIES, joinTournament } from '../services/multiplayer';
import { getEffectiveStats } from '../services/gameEngine';
import { supabase } from '../services/supabase';

interface RaceCenterProps {
  phase: string;
  epochRevealed?: boolean;
  cars: Car[];
  gameYear: number;
  roomId?: string;
  playerId?: string;
  currentDay?: number;
  raceWeather?: any; // { isRaining: boolean, rainyTrackIdx: number | null }
  onBack: () => void;
  playerMoney?: number;
  onMoneyChange?: (delta: number) => void;
  onRaceComplete: (results: RaceResult[]) => void;
  tournamentState?: any;
}

const STAT_HEADERS = ['Мощность', 'Крут.момент', 'Скорость', 'Разгон', 'Управляемость', 'Проходимость'];
const STAT_KEYS = ['power', 'torque', 'topSpeed', 'acceleration', 'handling', 'offroad'] as const;

// Проверка требований трассы (простая эвристика по строке requirement)
function checkRequirement(car, req) {
  if (!req || req.trim() === '') return true;
  
  // Split by + for combined requirements (e.g. "хэтчбек + США")
  const conditions = req.split('+').map(s => s.trim().toLowerCase()).filter(Boolean);
  
  // ALL conditions must be met
  return conditions.every(r => checkSingleRequirement(car, r));
}

function checkSingleRequirement(car, r) {
  // Normalize common Cyrillic/Latin mixups
  r = r.replace(/^с(?=h)/i, 'c'); // сhevrolet -> chevrolet
  // Effective tire type
  let effectiveTire = car.roadType || null;
  const tiresPart = car.installedParts?.find(p => p.slot === 'tires');
  if (tiresPart) {
    const n = tiresPart.name.toLowerCase();
    if (n.includes('слик')) effectiveTire = 'С';
    else if (n.includes('гоночн')) effectiveTire = 'Г';
    else if (n.includes('внедор')) effectiveTire = 'В';
    else if (n.includes('универс')) effectiveTire = 'У';
  }

  // Автоспорт
  if (r === 'автоспорт') return !!car.tags?.some(t => t.toLowerCase() === 'автоспорт');

  // Эпоха (e.g. "эпоха - 70-ые", "эпоха 60-ые", "эпоха -60-ые")
  const epochMatch = r.match(/эпоха[\s-]*(?:(\d{2}))/);
  if (epochMatch) {
    const targetEpoch = parseInt(epochMatch[1]);
    return car.epoch === targetEpoch;
  }

  // Редкость (e.g. "редкость 3", "редкость 1")
  const rarityMatch = r.match(/[рp]едкость\s*(\d)/);
  if (rarityMatch) {
    return car.rarity === parseInt(rarityMatch[1]);
  }

  // Классы (A-S)
  const classMatch = r.match(/([a-zа-я])[-\s]*класс/) || r.match(/класс[\s:]*([a-zа-я])/);
  if (classMatch) {
    let letter = classMatch[1].toUpperCase();
    if (letter === 'А') letter = 'A';
    if (letter === 'В') letter = 'B';
    if (letter === 'С') letter = 'C';
    if (letter === 'Д') letter = 'D';
    if (letter === 'Е') letter = 'E';
    return car.carClass === letter;
  }
  // Also handle "1 авто X класса" patterns
  if (r.includes('авто') && r.includes('класс')) {
    const m = r.match(/авто\s+([a-zа-я])[-\s]*класс/);
    if (m) {
      let letter = m[1].toUpperCase();
      if (letter === 'А') letter = 'A';
      if (letter === 'В') letter = 'B';
      if (letter === 'С') letter = 'C';
      return car.carClass === letter;
    }
  }

  // Тип кузова/теги
  if ((r.includes('хэтчбэк') || r.includes('хэтчбек')) || r.includes('hatch') || r.includes('hot hatch')) return !!car.tags?.some(t => (t.toLowerCase() === 'хэтчбэк' || t.toLowerCase() === 'хэтчбек'));
  if (r.includes('купе')) return !!car.tags?.some(t => t.toLowerCase() === 'купе');
  if (r.includes('седан')) return !!car.tags?.some(t => t.toLowerCase() === 'седан');
  if (r.includes('внедорожник')) return !!car.tags?.some(t => t.toLowerCase() === 'внедорожник');
  if (r.includes('muscle') || r.includes('muscle car')) return !!car.tags?.some(t => t.toLowerCase() === 'muscle car');
  if (r.includes('комфорт')) return !!car.tags?.some(t => t.toLowerCase() === 'комфорт');
  if (r.includes('коллекция')) return !!car.tags?.some(t => t.toLowerCase() === 'коллекция');
  if (r.includes('widow maker')) return !!car.tags?.some(t => t.toLowerCase() === 'widow maker');

  // Страны
  if (r.includes('франция')) return !!car.tags?.some(t => t.toLowerCase() === 'франция');
  if (r.includes('сша')) return !!car.tags?.some(t => t.toLowerCase() === 'сша');
  if (r.includes('италия')) return !!car.tags?.some(t => t.toLowerCase() === 'италия');
  if (r.includes('германия')) return !!car.tags?.some(t => t.toLowerCase() === 'германия');
  if (r.includes('япония')) return !!car.tags?.some(t => t.toLowerCase() === 'япония');
  if (r.includes('ссср')) return !!car.tags?.some(t => t.toLowerCase() === 'ссср');

  // Марки авто (Porsche, Ferrari, etc.)
  const brands = ['porsche', 'ferrari', 'lamborghini', 'bmw', 'ford', 'chevrolet', 'renault', 'citroen', 'Chevrolet'];
  for (const brand of brands) {
    if (r.includes(brand.toLowerCase())) return car.name.toLowerCase().includes(brand.toLowerCase());
  }

  // Шины
  if (r.includes('слик')) return effectiveTire === 'С';
  if (r.includes('шины внедорожн') || r === 'внедорожные шины') return effectiveTire === 'В';
  if (r.includes('шины универсальн') || r === 'универсальные шины') return effectiveTire === 'У';
  if (r.includes('гоночные шины') || r.includes('гоночных шин')) return effectiveTire === 'Г';

  // Мощность ranges
  const powerRange = r.match(/(\d+)[-–](\d+)\s*л[сc]/);
  if (powerRange) return car.stats.power >= parseInt(powerRange[1]) && car.stats.power <= parseInt(powerRange[2]);
  // General "мощность до X" and "мощность менее X" patterns
  const powerTo = r.match(/мощность\s*до\s*(\d+)/);
  if (powerTo) return car.stats.power <= parseInt(powerTo[1]);
  const powerAbove = r.match(/мощность\s*выше\s*(\d+)/);
  if (powerAbove) return car.stats.power > parseInt(powerAbove[1]);
  const powerBelow = r.match(/мощность\s*менее\s*(\d+)/);
  if (powerBelow) return car.stats.power < parseInt(powerBelow[1]);

  // Статы (Управляемость выше X, Проходимость выше X, Скорость выше X)
  const handlingAbove = r.match(/управляемость\s*выше\s*(\d+)/);
  if (handlingAbove) return car.stats.handling > parseInt(handlingAbove[1]);
  const offroadAbove = r.match(/проходимость\s*выше\s*(\d+)/);
  if (offroadAbove) return car.stats.offroad > parseInt(offroadAbove[1]);
  const speedAbove = r.match(/скорость\s*выше\s*(\d+)/);
  if (speedAbove) return car.stats.topSpeed > parseInt(speedAbove[1]);

  // Оплатить 1000 - это не фильтр машин, пропускаем
  if (r.includes('оплатить 1000')) return true;

  // Полный лимит деталей
  if (r.includes('полностью установленны') || r.includes('полным установленным лимитом')) {
    const limits = { A: 16, B: 14, C: 12, D: 10, E: 8, R: 6, S: 4 };
    const limit = limits[car.carClass] || 16;
    return car.installedParts.length >= limit;
  }

  // Немецкий = Германия
  if (r.includes('нем ') || r.includes('немецк')) return !!car.tags?.some(t => t.toLowerCase() === 'германия');

  // По умолчанию разрешаем
  return true;
}

function weightColor(v: number) {
  if (v >= 6) return '#ff4444';
  if (v >= 4) return '#ffaa00';
  if (v >= 2) return '#ffdd00';
  if (v >= 1) return '#aaa';
  return '#333';
}

const RaceCenter: React.FC<RaceCenterProps> = ({
  phase, epochRevealed = false, cars, gameYear,
  roomId, playerId, currentDay = 0, raceWeather,
  onBack, onRaceComplete, playerMoney = 0, onMoneyChange, tournamentState,
}) => {
  const [entries, setEntries] = useState<RaceEntry[]>([]);
  const [pickingRaceId, setPickingRaceId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [allPlayers, setAllPlayers] = useState<any[]>([]);

  const [showPaidConfirm, setShowPaidConfirm] = useState(false);
  const [paidRaceId, setPaidRaceId] = useState(null);
  const [mainRaceCategory, setMainRaceCategory] = useState(null);
  const availableEpochs = useMemo(() => {
    return (RACES_DATA.epochs || []).filter((e: any) => e.year <= gameYear);
  }, [gameYear]);

  const specials = RACES_DATA.specials || [];
  const qualification = specials.find((s: any) => s.name === 'квалификация');

  // Загружаем заявки текущего дня
  const loadEntries = useCallback(async () => {
    if (!roomId || !currentDay) return;
    const data = await fetchRaceEntries(roomId, currentDay);
    setEntries(data);
  }, [roomId, currentDay]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  // Загружаем список игроков для отображения имён на стартовой решётке
  useEffect(() => {
    if (!roomId) return;
    fetchPlayers(roomId).then(setAllPlayers);
  }, [roomId]);

  // Определяем предстоящую гонку
  const cycleDay = currentDay <= 3 ? currentDay : ((currentDay - 4) % 7) + 4;
  const isCityRace = cycleDay >= 4 && cycleDay <= 5;
  const isWorldSeries = cycleDay >= 8 && cycleDay <= 9;
  const epochData = availableEpochs.find((e: any) => e.year === gameYear);
  
  let targetRace: { title: string, titleColor: string, rounds: any[] } | null = null;
  if (cycleDay <= 2) {
    if (qualification) targetRace = { title: 'КВАЛИФИКАЦИЯ', titleColor: '#ffaa00', rounds: [{ round: 1, requirement: '', races: qualification.races }] };
  } else if (cycleDay >= 4 && cycleDay <= 5) {
    const round = epochData?.rounds.find((r: any) => r.round === 1);
    if (round) targetRace = { title: `ГОРОДСКИЕ СОРЕВНОВАНИЯ`, titleColor: '#4488ff', rounds: [round] };
  } else if (cycleDay >= 6 && cycleDay <= 7) {
    const round = epochData?.rounds.find((r: any) => r.round === 2);
    if (round) targetRace = { title: `НАЦИОНАЛЬНЫЕ СОРЕВНОВАНИЯ`, titleColor: '#ff44aa', rounds: [round] };
  } else if (cycleDay >= 8 && cycleDay <= 9) {
    const round = epochData?.rounds.find((r: any) => r.round === 3);
    if (round) targetRace = { title: `МИРОВАЯ СЕРИЯ`, titleColor: '#ffdd00', rounds: [round] };
  }

  // Получить имя игрока и название машины по entry
  const getEntryLabel = (entry: RaceEntry) => {
    const p = allPlayers.find(pl => pl.id === entry.player_id);
    const playerName = p?.username || 'Игрок';

    const car = p?.garage?.find((c: any) => c.id === entry.car_id);
    const carName = car?.name || 'Авто';
    return `${playerName} — ${carName}`;
  };

  // Заявка игрока на конкретную гонку
  const myEntryForRace = (raceId: string) =>
    entries.find(e => e.player_id === playerId && e.race_id === raceId);

  const handleEnterCar = async (raceId: string, carId: string) => {
    if (!roomId || !playerId) return;

    // Проверка: участвует ли эта машина уже в другой гонке сегодня?
    if (carId) {
      const alreadyAssigned = entries.find(e => e.player_id === playerId && e.car_id === carId && e.race_id !== raceId);
      if (alreadyAssigned) {
        alert('Эта машина уже заявлена на другую гонку сегодня!');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (carId) {
        await submitRaceEntry(roomId, playerId, raceId, carId, currentDay);
      } else {
        // Отмена заявки
        await supabase.from('race_entries').delete()
          .eq('room_id', roomId).eq('player_id', playerId)
          .eq('race_id', raceId).eq('day', currentDay);
      }
      await loadEntries();
      setPickingRaceId(null);
    } catch (e: any) {
      alert(`Ошибка при заявке на гонку: ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Все гонки всех раундов в плоский список для поиска заявок
  const allRaces = useMemo(() => {
    const result: any[] = [];
    (RACES_DATA.epochs || []).forEach((e: any) =>
      (e.rounds || []).forEach((r: any) =>
        (r.races || []).forEach((race: any) => result.push(race))
      )
    );
    (RACES_DATA.specials || []).forEach((s: any) =>
      (s.races || []).forEach((race: any) => result.push(race))
    );
    return result;
  }, []);

  const EntryButton = ({ race, raceIndex = 0 }: { race: any; raceIndex?: number }) => {
    const raceId = race.name || race.id || Math.random().toString();
    const myEntry = myEntryForRace(raceId);
    const myCar = myEntry ? cars.find(c => c.id === myEntry.car_id) : null;
    const otherEntries = entries.filter(e => e.race_id === raceId && e.player_id !== playerId);

    if (!roomId || !playerId || phase !== 'RACE_DAY') return null;

    if (myEntry && myCar) {
      return (
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <div className="flex items-center gap-1 bg-[#002200] border border-[#00aa00] px-2 py-1">
            <span className="text-[8px] text-[#00ff00]">✔ {myCar.name}</span>
            <button
              onClick={() => handleEnterCar(raceId, '')}
              className="text-[7px] text-[#ff4444] ml-1 hover:text-[#ff6666]"
              title="Отменить заявку (без возврата)"
            >✕</button>
          </div>
          {otherEntries.length > 0 && (
            <span className="text-[7px] text-[#888] ml-2">Записано: {otherEntries.length + 1}</span>
          )}
        </div>
      );
    }

    return (
      <div className="mt-2">

        {pickingRaceId === 'main-categories' && isWorldSeries && raceIndex === 2 ? (
          <div className="flex flex-col gap-2">
            <div className="text-[8px] text-[#ffdd00] mb-1">Выберите категорию мощности:</div>
            {POWER_CATEGORIES.map((cat, ci) => {
              const catRaceId = `main-cat-${ci}`;
              const catEntry = entries.find(e => e.race_id === catRaceId && e.player_id === playerId);
              const catCar = catEntry ? cars.find(c => c.id === catEntry.car_id) : null;
              const matchingCars = cars.filter(c => {
                const eff = getEffectiveStats(c);
                return eff.power >= cat.min && eff.power <= cat.max && checkRequirement(c, race.requirement);
              });
              return (
                <div key={ci} className="border border-[#333] p-2 bg-[#0a0a14]">
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] text-[#ffdd00]">{cat.label}</span>
                    {catEntry && catCar ? (
                      <div className="flex items-center gap-1">
                        <span className="text-[7px] text-[#00ff00]">✔ {catCar.name}</span>
                        <button onClick={async () => {
                          await supabase.from('race_entries').delete().eq('room_id', roomId).eq('player_id', playerId).eq('race_id', catRaceId).eq('day', currentDay);
                          loadEntries();
                        }} className="text-[7px] text-[#ff4444]">✕</button>
                      </div>
                    ) : mainRaceCategory === ci ? (
                      <div className="flex flex-wrap gap-1">
                        {matchingCars.length === 0 ? (
                          <span className="text-[7px] text-[#ff4444]">Нет подходящих машин</span>
                        ) : matchingCars.map(car => {
                          const alreadyInOtherCat = entries.some(e => e.car_id === car.id && e.race_id.startsWith('main-cat-') && e.player_id === playerId);
                          return (
                            <button key={car.id} disabled={alreadyInOtherCat}
                              onClick={async () => {
                                if (alreadyInOtherCat) { alert('Эта машина уже заявлена в другую категорию'); return; }
                                await submitRaceEntry(roomId, playerId, catRaceId, car.id, currentDay);
                                loadEntries();
                                setMainRaceCategory(null);
                              }}
                              className="text-[7px] px-2 py-1 border"
                              style={{ borderColor: alreadyInOtherCat ? '#555' : '#00aa00', color: alreadyInOtherCat ? '#555' : '#00ff00', opacity: alreadyInOtherCat ? 0.5 : 1 }}>
                              {car.name} ({getEffectiveStats(car).power}лс)
                            </button>
                          );
                        })}
                        <button onClick={() => setMainRaceCategory(null)} className="text-[7px] px-1 text-[#555]">✕</button>
                      </div>
                    ) : (
                      <button onClick={() => setMainRaceCategory(ci)} className="text-[7px] px-2 py-0.5 border border-[#444] text-[#aaa]">
                        Выбрать ({matchingCars.length})
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            <button onClick={() => { setPickingRaceId(null); setMainRaceCategory(null); }} className="text-[7px] px-2 py-1 border border-[#333] text-[#555]">Закрыть</button>
          </div>
        ) : null}
        {pickingRaceId === raceId ? (
          <div className="flex flex-col gap-1">
            <div className="text-[7px] text-[#888] mb-1">
              Выберите машину <span className="text-[#ffaa00]">{race.requirement ? `(Метка: ${race.requirement})` : ''}</span>:
            </div>
            {cars.filter(c => checkRequirement(c, race.requirement) && !(isCityRace && c.tags?.some(t => t.toLowerCase() === 'автоспорт'))).length === 0 ? (
              <span className="text-[7px] text-[#ff4444]">Нет подходящих машин в гараже</span>
            ) : (
              <div className="flex flex-wrap gap-1">
                {cars.filter(c => checkRequirement(c, race.requirement) && !(isCityRace && c.tags?.some(t => t.toLowerCase() === 'автоспорт'))).map(car => {
                  const s = getEffectiveStats(car);

                  let effectiveTire = car.roadType || null;
                  const tiresPart = car.installedParts?.find(p => p.slot === 'tires');
                  if (tiresPart) {
                    const n = tiresPart.name.toLowerCase();
                    if (n.includes('слик')) effectiveTire = 'С';
                    else if (n.includes('гоночн')) effectiveTire = 'Г';
                    else if (n.includes('внедор')) effectiveTire = 'В';
                    else if (n.includes('универс')) effectiveTire = 'У';
                  }

                  const isAssignedElsewhere = entries.some(e => e.player_id === playerId && e.car_id === car.id && e.race_id !== raceId);

                  return (
                    <button
                      key={car.id}
                      disabled={submitting || isAssignedElsewhere}
                      onClick={() => handleEnterCar(raceId, car.id)}
                      className="text-[7px] px-2 py-1 border hover:border-[#00ff00] transition-colors"
                      style={{
                        backgroundColor: isAssignedElsewhere ? '#330000' : '#001a00',
                        borderColor: isAssignedElsewhere ? '#880000' : '#333',
                        color: isAssignedElsewhere ? '#888' : '#ccc',
                        opacity: isAssignedElsewhere ? 0.5 : 1,
                        cursor: isAssignedElsewhere ? 'not-allowed' : 'pointer'
                      }}
                      title={isAssignedElsewhere ? "Машина уже участвует в другой гонке" : ""}
                    >
                      <div>{car.name}</div>
                      <div style={{ color: '#888' }}>
                        {s.topSpeed}км/ч · {s.power}лс
                        {effectiveTire && <span className="text-[#ffdd00]"> · шины: {effectiveTire}</span>}
                      </div>
                      {isAssignedElsewhere && <div className="text-[#ff4444] mt-1">ЗАНЯТА</div>}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPickingRaceId(null)}
                  className="text-[7px] px-2 py-1 border border-[#333] text-[#555]"
                >✕</button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => { if (isWorldSeries && raceIndex === 0) { handlePaidRaceRegister(raceId); } else if (isWorldSeries && raceIndex === 2) { setPickingRaceId('main-categories'); } else { setPickingRaceId(raceId); } }}
              className="retro-btn text-[7px] py-0.5 px-2"
              style={{ backgroundColor: '#001a00', border: '1px solid #00aa00', color: '#00aa00' }}
            >
              🏎 ЗАПИСАТЬСЯ
            </button>
            {otherEntries.length > 0 && (
              <span className="text-[7px] text-[#888] ml-2">Записано: {otherEntries.length}</span>
            )}
          </div>
        )}
      </div>
    );
  };

  
  // Paid Race: confirm entry fee before car selection
  const handlePaidRaceRegister = async (raceId) => {
    if (playerMoney < 1000) {
      alert('Недостаточно средств (нужно 1000)');
      return;
    }
    if (window.confirm('Готовы заплатить 1000 за участие в Платной гонке?')) {
      if (onMoneyChange) await onMoneyChange(-1000);
      setPickingRaceId(raceId);
    }
  };

  
if (!targetRace) {
    return (
      <div className="p-3 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg retro-title text-[#aaa]">🏎 ГОНОЧНЫЙ ЦЕНТР</h2>
          <button onClick={onBack} className="retro-btn text-[#aaa] text-[8px] py-1 px-3" style={{ backgroundColor: '#1a1a2e', border: '2px solid #555' }}>МЕНЮ</button>
        </div>
        <div className="pixel-card p-4 text-center border-[#333]">
          <div className="text-[9px] text-[#555] mb-1">🏁 НЕТ ДОСТУПНЫХ ГОНОК</div>
          <div className="text-[7px] text-[#444]">Сегодня день закупки в Автосалонах. Гоночные расстановки недоступны.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-4">
          <h2 className="text-lg retro-title" style={{ color: targetRace.titleColor }}>🏁 {targetRace.title}</h2>
          {raceWeather && (
            <div className="text-[12px]" title={raceWeather.isRaining ? 'Ожидается дождь на одной из трасс' : 'Солнечная погода'}>
              {raceWeather.isRaining ? '🌧️ ДОЖДЬ' : '☀️ ЯСНО'}
            </div>
          )}
        </div>
        <button onClick={onBack} className="retro-btn text-[#aaa] text-[8px] py-1 px-3" style={{ backgroundColor: '#1a1a2e', border: '2px solid #555' }}>МЕНЮ</button>
      </div>

      <div className="flex flex-col gap-4 pb-20">
        {targetRace.rounds.map((round: any, ri: number) => (
          <div key={ri}>
            {round.requirement && (
              <div className="mb-2 bg-[#330000] p-2 border border-[#ff4444]">
                <div className="text-[8px] text-[#ff4444] mb-1">ОБЩЕЕ ТРЕБОВАНИЕ РАУНДА:</div>
                <div className="text-[10px] text-white font-bold">{round.requirement}</div>
              </div>
            )}
            <div className="flex flex-col gap-3">
              {round.races.map((race: any, rri: number) => (
                <RaceCard key={rri} race={race} entryButton={<EntryButton race={race} raceIndex={rri} />} />
              ))}
            </div>
          </div>
        ))}
      </div>
    
      {/* ТУРНИР */}
      {tournamentState && tournamentState.tournamentName && (
        <div className="pixel-card p-4 mt-4 border-[#aa44ff]">
          <h3 className="text-sm text-[#aa44ff] mb-2">🏆 ТУРНИР: {tournamentState.tournamentName}</h3>
          <div className="text-[8px] text-[#aaa] mb-2">
            Участок {tournamentState.completedSections + 1} из 3 | Требование: <span className="text-[#ffaa00]">АВТОСПОРТ</span>
          </div>
          {tournamentState.entries?.some(e => e.playerId === playerId) ? (
            <div className="text-[8px] text-[#00ff00]">✔ Вы уже записаны на турнир</div>
          ) : tournamentState.completedSections > 0 ? (
            <div className="text-[8px] text-[#ff4444]">Турнир уже начался, запись закрыта</div>
          ) : (
            <div>
              <div className="text-[8px] text-[#888] mb-1">Выберите машину с меткой АВТОСПОРТ:</div>
              <div className="flex flex-wrap gap-1">
                {cars.filter(c => c.tags?.some(t => t.toLowerCase() === 'автоспорт') && !c.lockedForTournament).length === 0 ? (
                  <span className="text-[7px] text-[#ff4444]">Нет подходящих машин</span>
                ) : cars.filter(c => c.tags?.some(t => t.toLowerCase() === 'автоспорт') && !c.lockedForTournament).map(car => (
                  <button key={car.id}
                    onClick={async () => {
                      if (!roomId || !playerId) return;
                      const { data: roomData } = await supabase.from('rooms').select('*').eq('id', roomId).single();
                      if (!roomData) return;
                      const player = (await fetchPlayers(roomId)).find(p => p.id === playerId);
                      if (!player) return;
                      const result = await joinTournament(player, car.id, roomData);
                      if (result.error) { alert(result.error); return; }
                      alert('Машина отправлена на турнир!');
                    }}
                    className="text-[7px] px-2 py-1 border border-[#aa44ff] text-[#aa44ff] hover:bg-[#1a0033]">
                    {car.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Карточка гонки
const RaceCard: React.FC<{ race: any; entryButton?: React.ReactNode }> = ({ race, entryButton }) => {
  return (
    <div className="pixel-card p-0 overflow-hidden" style={{ borderColor: '#555', borderWidth: '2px' }}>
      <div className="flex items-stretch" style={{ minHeight: '72px' }}>
        {/* Левая часть: название */}
        <div className="flex flex-col justify-center px-3 py-2 min-w-[160px] max-w-[200px] border-r border-[#222]">
          <div className="text-[10px] text-white leading-tight" style={{ textShadow: '1px 1px 0 #000' }}>{race.name}</div>
          {race.requirement && (
            <div className="text-[7px] text-[#ffaa00] mt-1">{race.requirement}</div>
          )}
        </div>

        {/* Таблица весов */}
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
                {STAT_KEYS.map((k, ki) => (
                  <td key={ki} className="text-[11px] px-2 py-1" style={{ color: weightColor(race.weights[k]) }}>
                    {race.weights[k]}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Кнопка записи — под таблицей */}
      {entryButton && (
        <div className="border-t border-[#1a1a2e] px-3 py-2">
          {entryButton}
        </div>
      )}

      

    
      

      
    </div>
  );
}

export default RaceCenter;
