import React, { useMemo } from 'react';
import { RACES_DATA, TOURNAMENTS_DATA } from '../constants';

interface RaceScheduleProps {
  gameYear: number;
  onBack: () => void;
}

const STAT_HEADERS = ['Мощность', 'Крут.момент', 'Скорость', 'Разгон', 'Управляемость', 'Проходимость'];
const STAT_KEYS = ['power', 'torque', 'topSpeed', 'acceleration', 'handling', 'offroad'] as const;

const DAY_LABELS = [
  { round: 1, label: 'ВТОРНИК — Городские Состязания', color: '#ffdd00', bgColor: '#2a2a00' },
  { round: 2, label: 'ЧЕТВЕРГ — Национальное Соревнование', color: '#ffaa00', bgColor: '#2a1a00' },
  { round: 3, label: 'СУББОТА — Мировая Серия', color: '#ff4444', bgColor: '#2a0000' },
];

function weightColor(v: number) {
  if (v >= 6) return '#ff4444';
  if (v >= 4) return '#ffaa00';
  if (v >= 2) return '#ffdd00';
  if (v >= 1) return '#ccc';
  return '#333';
}

const RaceSchedule: React.FC<RaceScheduleProps> = ({ gameYear, onBack }) => {
  const epoch = useMemo(() => {
    const epochs = RACES_DATA.epochs || [];
    // Находим эпоху для текущего года (ближайшую <= gameYear)
    const sorted = epochs.filter((e: any) => e.year <= gameYear).sort((a: any, b: any) => b.year - a.year);
    return sorted[0] || null;
  }, [gameYear]);

  const currentTournament = useMemo(() => {
    return TOURNAMENTS_DATA.find(t => t.years.includes(gameYear)) || null;
  }, [gameYear]);

  if (!epoch) {
    return (
      <div className="p-3 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg retro-title">📋 РАСПИСАНИЕ ГОНОК</h2>
          <button onClick={onBack} className="retro-btn text-[#aaa] text-[8px] py-1 px-3"
            style={{backgroundColor:'#1a1a2e', border:'2px solid #555'}}>← НАЗАД</button>
        </div>
        <div className="pixel-card p-8 text-center">
          <div className="text-[10px] text-[#666]">НЕТ ДАННЫХ ДЛЯ ЭПОХИ {gameYear}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-3">
        <div>
          <h2 className="text-lg retro-title">📋 РАСПИСАНИЕ ГОНОК</h2>
          <div className="text-[9px] text-[#00aaff] mt-1">Эпоха {epoch.year}</div>
        </div>
        <button onClick={onBack} className="retro-btn text-[#aaa] text-[8px] py-1 px-3"
          style={{backgroundColor:'#1a1a2e', border:'2px solid #555'}}>← НАЗАД</button>
      </div>

      {/* Таблица */}
      <div className="pixel-card p-0 overflow-hidden" style={{borderWidth:'3px'}}>
        <table className="w-full" style={{borderCollapse:'collapse'}}>
          <thead>
            <tr className="bg-[#1a0000]">
              <th className="text-[9px] text-white px-3 py-2 text-left border-b-2 border-[#333] min-w-[140px]">Трасса</th>
              {STAT_HEADERS.map((h, i) => (
                <th key={i} className="text-[8px] text-[#ddd] px-2 py-2 text-center border-b-2 border-[#333] font-normal">{h}</th>
              ))}
              <th className="text-[9px] text-white px-3 py-2 text-left border-b-2 border-[#333]">Требование</th>
            </tr>
          </thead>
          <tbody>
            {/* Заголовок эпохи */}
            <tr>
              <td colSpan={8} className="text-[10px] text-white px-3 py-1.5 font-bold"
                style={{backgroundColor:'#00aa00', color:'#000'}}>
                {epoch.year}
              </td>
            </tr>

            {epoch.rounds.map((round: any, ri: number) => {
              const dayInfo = DAY_LABELS[ri] || { label: `РАУНД ${round.round}`, color: '#888', bgColor: '#111' };
              return (
                <React.Fragment key={ri}>
                  {/* Заголовок дня */}
                  <tr>
                    <td colSpan={8} className="text-[9px] px-3 py-1.5"
                      style={{backgroundColor: dayInfo.bgColor, color: dayInfo.color, borderTop: '2px solid #333'}}>
                      {dayInfo.label}
                      {round.requirement && (
                        <span className="ml-3 text-[8px] text-[#ff4444]">⚠ {round.requirement}</span>
                      )}
                    </td>
                  </tr>

                  {/* Трассы */}
                  {round.races.map((race: any, rri: number) => (
                    <tr key={rri} className="hover:bg-[#111] transition-colors"
                      style={{borderBottom: '1px solid #1a1a2e'}}>
                      <td className="text-[9px] text-white px-3 py-1.5 border-r border-[#222]">{race.name}</td>
                      {STAT_KEYS.map((k, ki) => (
                        <td key={ki} className="text-[10px] text-center px-2 py-1.5 border-r border-[#1a1a2e]"
                          style={{color: weightColor(race.weights[k])}}>
                          {race.weights[k]}
                        </td>
                      ))}
                      <td className="text-[8px] text-[#ffaa00] px-3 py-1.5">{race.requirement || ''}</td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Турнир текущего года */}
      {currentTournament && (
        <div className="pixel-card p-0 overflow-hidden mt-4" style={{borderWidth:'3px', borderColor: '#aa44ff'}}>
          <table className="w-full" style={{borderCollapse:'collapse'}}>
            <thead>
              <tr className="bg-[#1a0033]">
                <th className="text-[9px] text-white px-3 py-2 text-left border-b-2 border-[#333] min-w-[140px]">Участок</th>
                {STAT_HEADERS.map((h, i) => (
                  <th key={i} className="text-[8px] text-[#ddd] px-2 py-2 text-center border-b-2 border-[#333] font-normal">{h}</th>
                ))}
                <th className="text-[9px] text-white px-3 py-2 text-left border-b-2 border-[#333]">Требование</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={8} className="text-[10px] px-3 py-1.5 font-bold"
                  style={{backgroundColor:'#aa44ff', color:'#000'}}>
                  🏆 ТУРНИР: {currentTournament.name} ({gameYear})
                </td>
              </tr>
              <tr>
                <td colSpan={8} className="text-[8px] px-3 py-1"
                  style={{backgroundColor:'#1a0033', color:'#aa44ff'}}>
                  Вторник — участок 1 · Четверг — участок 2 · Суббота — участок 3 (финал + награды)
                </td>
              </tr>
              {currentTournament.sections.map((section, si) => {
                const dayLabel = si === 0 ? 'Вт' : si === 1 ? 'Чт' : 'Сб';
                return (
                  <tr key={si} className="hover:bg-[#111] transition-colors"
                    style={{borderBottom: '1px solid #1a1a2e'}}>
                    <td className="text-[9px] text-white px-3 py-1.5 border-r border-[#222]">
                      <span className="text-[#aa44ff]">[{dayLabel}]</span> {section.name}
                    </td>
                    {STAT_KEYS.map((k, ki) => {
                      const rawWeight = section.weights[k];
                      const displayWeight = Math.round(rawWeight * 15);
                      return (
                        <td key={ki} className="text-[10px] text-center px-2 py-1.5 border-r border-[#1a1a2e]"
                          style={{color: weightColor(displayWeight)}}>
                          {displayWeight}
                        </td>
                      );
                    })}
                    <td className="text-[8px] text-[#ffaa00] px-3 py-1.5">АВТОСПОРТ</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RaceSchedule;
