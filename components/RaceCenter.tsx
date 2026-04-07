import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Car, RaceResult, RaceEntry } from '../types';
import { RACES_DATA } from '../constants';
import { submitRaceEntry, fetchRaceEntries, fetchPlayers } from '../services/multiplayer';
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
  onRaceComplete: (results: RaceResult[]) => void;
}

const STAT_HEADERS = ['Мощность', 'Крут.момент', 'Скорость', 'Разгон', 'Управляемость', 'Проходимость'];
const STAT_KEYS = ['power', 'torque', 'topSpeed', 'acceleration', 'handling', 'offroad'] as const;

// Проверка требований трассы (простая эвристика по строке requirement)
function checkRequirement(car: Car, req: string): boolean {
  if (!req || req.trim() === '') return true;
  const r = req.toLowerCase();

  // Классы
  if (r.includes('а-класс') || r.includes('а класс')) return car.carClass === 'A';
  if (r.includes('в класс') || r.includes('в-класс') || r.includes('b класс') || r.includes('b-класс')) return car.carClass === 'B' || car.carClass === 'В';
  if (r.includes('с класс') || r.includes('с-класс') || r.includes('c класс') || r.includes('c-класс')) return car.carClass === 'C' || car.carClass === 'С';

  // Тип кузова/теги 
  if (r.includes('хэтчбек') || r.includes('hatch')) return !!car.tags?.some(t => t.toLowerCase() === 'хэтчбек');
  if (r.includes('купе')) return !!car.tags?.some(t => t.toLowerCase() === 'купе');
  if (r.includes('седан')) return !!car.tags?.some(t => t.toLowerCase() === 'седан');
  if (r.includes('внедорожник')) return !!car.tags?.some(t => t.toLowerCase() === 'внедорожник');
  if (r.includes('muscle')) return !!car.tags?.some(t => t.toLowerCase() === 'muscle car');
  if (r.includes('комфорт')) return !!car.tags?.some(t => t.toLowerCase() === 'комфорт');
  if (r.includes('коллекция')) return !!car.tags?.some(t => t.toLowerCase() === 'коллекция');

  // Страны
  if (r.includes('франция')) return !!car.tags?.some(t => t.toLowerCase() === 'франция');
  if (r.includes('сша')) return !!car.tags?.some(t => t.toLowerCase() === 'сша');
  if (r.includes('италия')) return !!car.tags?.some(t => t.toLowerCase() === 'италия');
  if (r.includes('германия')) return !!car.tags?.some(t => t.toLowerCase() === 'германия');
  if (r.includes('япония')) return !!car.tags?.some(t => t.toLowerCase() === 'япония');
  if (r.includes('ссср')) return !!car.tags?.some(t => t.toLowerCase() === 'ссср');

  // Определяем фактические шины авто
  let effectiveTire = car.roadType || null;
  const tiresPart = car.installedParts?.find(p => p.slot === 'tires');
  if (tiresPart) {
    const n = tiresPart.name.toLowerCase();
    if (n.includes('слик')) effectiveTire = 'С';
    else if (n.includes('гоночн')) effectiveTire = 'Г';
    else if (n.includes('внедор')) effectiveTire = 'В';
    else if (n.includes('универс')) effectiveTire = 'У';
  }

  // Шины и дороги (р1, р2, шины внед)
  if (r.includes('р1') || r.includes('p1')) return effectiveTire === 'У';
  if (r.includes('р2') || r.includes('p2')) return effectiveTire === 'Г';
  if (r.includes('р3') || r.includes('p3')) return effectiveTire === 'С';
  if (r.includes('р4') || r.includes('p4')) return effectiveTire === 'В';
  if (r.includes('слики')) return effectiveTire === 'С';
  if (r.includes('шины внед') || r.includes('внедорожн')) return effectiveTire === 'В';
  if (r.includes('шины унив') || r.includes('универс')) return effectiveTire === 'У';
  if (r.includes('гоночных ш') || r.includes('гоночн')) return effectiveTire === 'Г';

  // Лошадиные силы (120-200, до 121, 201-300)
  const powerMatch = r.match(/(\d+)-(\d+)\s*лс/);
  if (powerMatch) {
    const min = parseInt(powerMatch[1]);
    const max = parseInt(powerMatch[2]);
    return car.stats.power >= min && car.stats.power <= max;
  }
  if (r.includes('до 121 лс') || r.includes('до 121')) return car.stats.power < 121;

  // Вес/модель (1000)
  if (r.includes('1000')) return car.name.includes('1000') || !!car.tags?.some(t => t.includes('1000'));

  // По умолчанию разрешаем если эвристика не поняла
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
  onBack, onRaceComplete,
}) => {
  const [entries, setEntries] = useState<RaceEntry[]>([]);
  const [pickingRaceId, setPickingRaceId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [allPlayers, setAllPlayers] = useState<any[]>([]);

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

  const EntryButton = ({ race }: { race: any }) => {
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
              title="Отменить заявку"
            >✕</button>
          </div>
          {otherEntries.length > 0 && (
            <div className="mt-1">
              <div className="text-[7px] text-[#888] mb-0.5">Стартовая решётка:</div>
              {otherEntries.map(e => (
                <div key={e.id} className="text-[7px] text-[#aaa]">• {getEntryLabel(e)}</div>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="mt-2">
        {pickingRaceId === raceId ? (
          <div className="flex flex-col gap-1">
            <div className="text-[7px] text-[#888] mb-1">
              Выберите машину <span className="text-[#ffaa00]">{race.requirement ? `(Метка: ${race.requirement})` : ''}</span>:
            </div>
            {cars.filter(c => checkRequirement(c, race.requirement) && !(isCityRace && c.tags?.some(t => t === 'АВТОСПОРТ'))).length === 0 ? (
              <span className="text-[7px] text-[#ff4444]">Нет подходящих машин в гараже</span>
            ) : (
              <div className="flex flex-wrap gap-1">
                {cars.filter(c => checkRequirement(c, race.requirement) && !(isCityRace && c.tags?.some(t => t === 'АВТОСПОРТ'))).map(car => {
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
              onClick={() => setPickingRaceId(raceId)}
              className="retro-btn text-[7px] py-0.5 px-2"
              style={{ backgroundColor: '#001a00', border: '1px solid #00aa00', color: '#00aa00' }}
            >
              🏎 ЗАПИСАТЬСЯ
            </button>
            {otherEntries.length > 0 && (
              <div className="mt-1">
                <div className="text-[7px] text-[#888] mb-0.5">Стартовая решётка:</div>
                {otherEntries.map(e => (
                  <div key={e.id} className="text-[7px] text-[#aaa]">• {getEntryLabel(e)}</div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
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
                <RaceCard key={rri} race={race} entryButton={<EntryButton race={race} />} />
              ))}
            </div>
          </div>
        ))}
      </div>
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
