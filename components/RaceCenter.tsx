import React, { useState, useMemo } from 'react';
import { Car, RaceResult } from '../types';
import { RACES_DATA } from '../constants';

interface RaceCenterProps {
  phase: string;
  cars: Car[];
  gameYear: number;
  onBack: () => void;
  onRaceComplete: (results: RaceResult[]) => void;
}

const STAT_HEADERS = ['Мощность', 'Крут.момент', 'Скорость', 'Разгон', 'Управляемость', 'Проходимость'];
const STAT_KEYS = ['power', 'torque', 'topSpeed', 'acceleration', 'handling', 'offroad'] as const;

function weightColor(v: number) {
  if (v >= 6) return '#ff4444';
  if (v >= 4) return '#ffaa00';
  if (v >= 2) return '#ffdd00';
  if (v >= 1) return '#aaa';
  return '#333';
}

const RaceCenter: React.FC<RaceCenterProps> = ({ phase, cars, gameYear, onBack, onRaceComplete }) => {
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const availableEpochs = useMemo(() => {
    return (RACES_DATA.epochs || []).filter((e: any) => e.year <= gameYear);
  }, [gameYear]);

  const specials = RACES_DATA.specials || [];

  // Квалификация
  const qualification = specials.find((s: any) => s.name === 'квалификация');
  // Ралли доступные по году
  const availableRallies = specials.filter((s: any) =>
    s.years && s.years.some((y: number) => y <= gameYear)
  );
  // Гонка Чемпионов
  const championship = specials.find((s: any) => s.name === 'Гонка Чемпионов');
  const championshipAvailable = championship?.years?.some((y: number) => y <= gameYear);
  // полуФинал / Финал
  const semiFinal = specials.find((s: any) => s.name === 'полуФинал');
  const final = specials.find((s: any) => s.name === 'Финал');

  // Выбранная эпоха
  const selectedEpoch = availableEpochs.find((e: any) => e.year === selectedYear);

  if (!selectedYear) {
    return (
      <div className="p-3 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg retro-title">🏁 ГОНКИ</h2>
          <button onClick={onBack} className="retro-btn text-[#aaa] text-[8px] py-1 px-3" style={{backgroundColor:'#1a1a2e', border:'2px solid #555'}}>МЕНЮ</button>
        </div>

        {/* Квалификация */}
        {qualification && (
          <div className="mb-4">
            <div className="text-[9px] text-[#ffaa00] mb-2">🏅 КВАЛИФИКАЦИЯ (1958)</div>
            <div className="flex flex-col gap-2">
              {qualification.races.map((race: any, ri: number) => (
                <RaceCard key={ri} race={race} />
              ))}
            </div>
          </div>
        )}

        {/* Эпохи */}
        <div className="text-[9px] text-[#555] mb-2">ЭПОХИ:</div>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 mb-4">
          {availableEpochs.map((e: any) => (
            <button key={e.year} onClick={() => setSelectedYear(e.year)}
              className="pixel-card p-2 text-center hover:border-[#00ff00] transition-colors cursor-pointer"
              style={{borderColor: '#333'}}>
              <div className="text-[10px] text-white" style={{fontFamily:"'Press Start 2P', monospace"}}>{e.year}</div>
              <div className="text-[7px] text-[#555]">{e.rounds.reduce((s: number, r: any) => s + r.races.length, 0)} гонок</div>
            </button>
          ))}
        </div>

        {/* Ралли */}
        {availableRallies.length > 0 && (
          <div className="mb-4">
            <div className="text-[9px] text-[#44ff44] mb-1">🌍 РАЛЛИ</div>
            <div className="text-[7px] text-[#ff4444] mb-2">⚠ только авто с меткой «автоспорт» · машина не участвует в обычных гонках всю неделю</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {availableRallies.map((r: any, ri: number) => (
                <button key={ri} onClick={() => setSelectedYear(-ri - 100)}
                  className="pixel-card p-3 text-center hover:border-[#44ff44] transition-colors cursor-pointer"
                  style={{borderColor: '#44ff4466'}}>
                  <div className="text-[9px] text-[#44ff44]">{r.name}</div>
                  <div className="text-[7px] text-[#555]">{r.races.length} этапов</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Гонка Чемпионов */}
        {championshipAvailable && (
          <div className="mb-4">
            <div className="text-[9px] text-[#ff8800] mb-1">🏆 ГОНКА ЧЕМПИОНОВ</div>
            <div className="text-[7px] text-[#ff4444] mb-2">⚠ только авто с меткой «автоспорт» · машина не участвует в обычных гонках всю неделю</div>
            <button onClick={() => setSelectedYear(-200)}
              className="pixel-card p-3 text-center hover:border-[#ff8800] transition-colors cursor-pointer w-full"
              style={{borderColor: '#ff880066'}}>
              <div className="text-[9px] text-[#ff8800]">Гонка Чемпионов</div>
              <div className="text-[7px] text-[#555]">{championship.races.length} этапов</div>
            </button>
          </div>
        )}

        {/* полуФинал / Финал */}
        <div className="grid grid-cols-2 gap-2">
          {semiFinal && (
            <button onClick={() => setSelectedYear(-300)}
              className="pixel-card p-3 text-center hover:border-[#aa44ff] transition-colors cursor-pointer"
              style={{borderColor: '#aa44ff66'}}>
              <div className="text-[9px] text-[#aa44ff]">полуФинал</div>
              <div className="text-[7px] text-[#555]">{semiFinal.races.length} гонок</div>
            </button>
          )}
          {final && (
            <button onClick={() => setSelectedYear(-400)}
              className="pixel-card p-3 text-center hover:border-[#ff4444] transition-colors cursor-pointer"
              style={{borderColor: '#ff444466'}}>
              <div className="text-[9px] text-[#ff4444]">ФИНАЛ</div>
              <div className="text-[7px] text-[#555]">{final.races.length} гонок</div>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Определяем что показывать
  let title = '';
  let titleColor = '#fff';
  let rounds: any[] = [];

  if (selectedYear > 0 && selectedEpoch) {
    title = `${selectedEpoch.year}`;
    rounds = selectedEpoch.rounds;
  } else if (selectedYear <= -100 && selectedYear > -200) {
    const idx = -(selectedYear + 100);
    const rally = availableRallies[idx];
    if (rally) { title = rally.name; titleColor = '#44ff44'; rounds = [{ round: 1, requirement: '', races: rally.races }]; }
  } else if (selectedYear === -200 && championship) {
    title = 'Гонка Чемпионов'; titleColor = '#ff8800';
    rounds = [{ round: 1, requirement: '', races: championship.races }];
  } else if (selectedYear === -300 && semiFinal) {
    title = 'полуФинал'; titleColor = '#aa44ff';
    rounds = [{ round: 1, requirement: semiFinal.requirement || '', races: semiFinal.races }];
  } else if (selectedYear === -400 && final) {
    title = 'ФИНАЛ'; titleColor = '#ff4444';
    rounds = [{ round: 1, requirement: final.requirement || '', races: final.races }];
  }

  return (
    <div className="p-3 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h2 className="text-lg retro-title" style={{color: titleColor}}>🏁 {title}</h2>
        </div>
        <button onClick={() => setSelectedYear(null)} className="retro-btn text-[#aaa] text-[8px] py-1 px-3" style={{backgroundColor:'#1a1a2e', border:'2px solid #555'}}>← НАЗАД</button>
      </div>

      <div className="flex flex-col gap-4 pb-20">
        {rounds.map((round: any, ri: number) => (
          <div key={ri}>
            <div className="flex items-center gap-2 mb-2">
              <div className="text-[10px] text-[#ffaa00]">РАУНД {round.round}</div>
              {round.requirement && <div className="text-[8px] text-[#ff4444] bg-[#330000] px-2 py-0.5 border border-[#ff4444]">{round.requirement}</div>}
            </div>
            <div className="flex flex-col gap-3">
              {round.races.map((race: any, rri: number) => (
                <RaceCard key={rri} race={race} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Карточка гонки — горизонтальный формат как у машин
function RaceCard({ race, key: _key }: { race: any; key?: any }) {
  return (
    <div className="pixel-card p-0 flex items-stretch overflow-hidden" style={{minHeight: '72px', borderColor: '#555', borderWidth: '2px'}}>
      {/* Левая часть: название */}
      <div className="flex flex-col justify-center px-3 py-2 min-w-[160px] max-w-[200px] border-r border-[#222]">
        <div className="text-[10px] text-white leading-tight" style={{textShadow:'1px 1px 0 #000'}}>{race.name}</div>
        {race.requirement && (
          <div className="text-[7px] text-[#ffaa00] mt-1">{race.requirement}</div>
        )}
      </div>

      {/* Таблица весов */}
      <div className="flex-grow flex flex-col justify-center">
        <table className="w-full text-center" style={{borderCollapse:'collapse'}}>
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
                <td key={ki} className="text-[11px] px-2 py-1" style={{color: weightColor(race.weights[k])}}>
                  {race.weights[k]}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default RaceCenter;
