import React, { useState } from 'react';

interface RulesProps {
  onBack: () => void;
}

type Section = 'order' | 'weather' | 'parts' | 'competitions' | 'kings' | 'prices' | 'rewards' | 'penalties';

const SECTIONS: { id: Section; title: string; emoji: string }[] = [
  { id: 'order', title: 'ПОРЯДОК ХОДА', emoji: '📋' },
  { id: 'weather', title: 'ВЛИЯНИЕ ОСАДКОВ', emoji: '🌧' },
  { id: 'parts', title: 'ДЕТАЛИ', emoji: '🔧' },
  { id: 'competitions', title: 'СОРЕВНОВАНИЯ', emoji: '🏆' },
  { id: 'kings', title: 'КОРОЛИ ДИСЦИПЛИН', emoji: '👑' },
  { id: 'prices', title: 'ЦЕНЫ НА АВТО', emoji: '💰' },
  { id: 'rewards', title: 'НАГРАДЫ', emoji: '🎖' },
  { id: 'penalties', title: 'НАКАЗАНИЯ', emoji: '⚠' },
];

const Rules: React.FC<RulesProps> = ({ onBack }) => {
  const [open, setOpen] = useState<Set<Section>>(new Set(['order']));

  const toggle = (s: Section) => {
    setOpen(prev => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  };

  const tbl = "text-[7px] border border-[#222] p-1.5";
  const hdr = "text-[6px] border border-[#222] p-1.5 text-[#555] uppercase bg-[#111]";

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-sm retro-title">📖 ПРАВИЛА</h2>
        <button onClick={onBack} className="retro-btn text-[#aaa] text-[8px] py-1 px-3" style={{backgroundColor:'#1a1a2e', border:'2px solid #555'}}>НАЗАД</button>
      </div>

      <div className="space-y-2">
        {SECTIONS.map(sec => (
          <div key={sec.id} className="pixel-card overflow-hidden">
            <button onClick={() => toggle(sec.id)} className="w-full flex items-center gap-2 p-3 text-left hover:bg-[#222]/30">
              <span>{sec.emoji}</span>
              <span className="text-[8px] text-white flex-grow">{sec.title}</span>
              <span className="text-[8px] text-[#555]">{open.has(sec.id) ? '▼' : '▶'}</span>
            </button>

            {open.has(sec.id) && (
              <div className="px-3 pb-3 text-[7px] text-[#aaa] leading-relaxed space-y-2">

                {sec.id === 'order' && <>
                  <p>Сначала админ делает ход и сообщает об этом в чате. После этого игроки в любое время до 22:00 присылают в личку свои ходы о покупках и расстановке на трассы.</p>
                  <p>В первый день совершаются покупки во всех городах. Во второй день — расстановка на трассы и сама гонка.</p>
                  <p>До совершения расстановки объявляется, будет дождь или нет.</p>
                  <p>Управляемость и Проходимость не могут быть ниже 1.</p>
                  <p className="text-[#ffff00]">Если характеристика &lt; 1 из-за дождя — машина не едет, последнее место.</p>
                  <p>Обмен и торговля только в пределах одного города. Тачки нельзя перевозить между городами, кроме отправленных на Турнир.</p>
                </>}

                {sec.id === 'weather' && (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead><tr>
                        <th className={hdr}>Трасса</th><th className={hdr}>Универс.</th><th className={hdr}>Гоночные</th><th className={hdr}>Внедор.</th><th className={hdr}>Слики</th>
                      </tr></thead>
                      <tbody>
                        <tr><td className={tbl}>Песок/Болото</td><td className={`${tbl} text-[#ff6666]`}>-10П -10У +0.5с</td><td className={`${tbl} text-[#ff4444]`}>-15П -20У +1с</td><td className={`${tbl} text-[#44ff44]`}>0</td><td className={`${tbl} text-[#ff4444]`}>Не едет</td></tr>
                        <tr><td className={tbl}>Снег/Лёд</td><td className={`${tbl} text-[#ff6666]`}>-15П -20У +1с</td><td className={`${tbl} text-[#ff4444]`}>-20П -25У +1.5с</td><td className={`${tbl} text-[#44ff44]`}>0</td><td className={`${tbl} text-[#ff4444]`}>Не едет</td></tr>
                        <tr><td className={tbl}>Грунтовка</td><td className={`${tbl} text-[#ff6666]`}>-10П -5У</td><td className={`${tbl} text-[#ff4444]`}>-15П -10У</td><td className={`${tbl} text-[#44ff44]`}>0</td><td className={`${tbl} text-[#ff4444]`}>Не едет</td></tr>
                        <tr><td className={tbl}>Село/Лес</td><td className={`${tbl} text-[#ff6666]`}>-5П</td><td className={`${tbl} text-[#ff4444]`}>-15У -5П +0.5с</td><td className={`${tbl} text-[#ffff00]`}>-5У</td><td className={`${tbl} text-[#ff4444]`}>-30У -10П +1.5с</td></tr>
                        <tr><td className={tbl}>Асфальт</td><td className={`${tbl} text-[#44ff44]`}>0</td><td className={`${tbl} text-[#ff6666]`}>-20У</td><td className={`${tbl} text-[#ff6666]`}>-15У +1с</td><td className={`${tbl} text-[#ff4444]`}>-30У +1с</td></tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {sec.id === 'parts' && (
                  <ul className="space-y-1.5 list-none">
                    <li>▸ Для турбины/компрессора нужен интеркулер.</li>
                    <li>▸ Фиксированные км/ч плюсуются напрямую.</li>
                    <li>▸ Процентный прирост зависит от коэффициента машины.</li>
                    <li>▸ Распредвал — только один (Нижний/Верхний/Универсальный).</li>
                    <li>▸ Шины — только одни (Слики/Гоночные/Универсальные/Внедорожные).</li>
                    <li>▸ Дифференциал — только один (ДиффПТ или ДиффСБ).</li>
                  </ul>
                )}

                {sec.id === 'competitions' && <>
                  <div className="bg-[#111] border border-[#222] p-2 mb-2">
                    <span className="text-[#4488ff]">CC</span> <span className="text-[#555]">—</span> City Challenge. День 1. Без АВТОСПОРТ. 1 машина на трассу. Деньги за заезд, баллы за город.
                  </div>
                  <div className="bg-[#111] border border-[#222] p-2 mb-2">
                    <span className="text-[#44ff44]">NT</span> <span className="text-[#555]">—</span> National Tournament. Требование на 3 трассы. Баллы по сумме.
                  </div>
                  <div className="bg-[#111] border border-[#222] p-2 mb-2">
                    <span className="text-[#ffff00]">WS</span> <span className="text-[#555]">—</span> World Series. Корона + бонус + главная гонка. Участие 1000. До 7 машин.
                  </div>
                  <div className="bg-[#111] border border-[#222] p-2 mb-2">
                    <span className="text-[#aa44ff]">Турниры</span> <span className="text-[#555]">—</span> Ралли/Гонка Чемпионов. Только АВТОСПОРТ. 1 машина, 3 матча.
                  </div>
                  <div className="bg-[#111] border border-[#222] p-2 text-[6px]">
                    <span className="text-[#555]">КАТЕГОРИИ:</span> 0-120 · 121-200 · 201-300 · 301-450 · 451-650 · 651-900 · 900+ лс
                  </div>
                </>}

                {sec.id === 'kings' && <>
                  <p>Титулы: Дрэг, Дрифт, Слалом, Мотокросс.</p>
                  <p>Корону получает победитель WS в дисциплине.</p>
                  <p>Корона позволяет ставить любые машины на CC в этой дисциплине.</p>
                  <p>Корона переходит при поражении на следующем WS.</p>
                </>}

                {sec.id === 'prices' && (
                  <table className="w-full border-collapse">
                    <thead><tr><th className={hdr}>Класс</th><th className={hdr}>За этап</th><th className={hdr}>Лимит</th></tr></thead>
                    <tbody>
                      <tr><td className={tbl}>1</td><td className={`${tbl} text-[#ff4444]`}>−600</td><td className={tbl}>½ цены</td></tr>
                      <tr><td className={tbl}>2</td><td className={`${tbl} text-[#ff6666]`}>−300</td><td className={tbl}>½ цены</td></tr>
                      <tr><td className={tbl}>3</td><td className={`${tbl} text-[#888]`}>0</td><td className={tbl}>—</td></tr>
                      <tr><td className={tbl}>4</td><td className={`${tbl} text-[#44ff44]`}>+500</td><td className={tbl}>—</td></tr>
                      <tr><td className={tbl}>5</td><td className={`${tbl} text-[#44ff44]`}>+1000</td><td className={tbl}>—</td></tr>
                    </tbody>
                  </table>
                )}

                {sec.id === 'rewards' && (
                  <div className="space-y-3">
                    <div>
                      <p className="text-[#4488ff] mb-1">CC (за гонку / баллы за город):</p>
                      <div className="grid grid-cols-3 gap-1 text-[6px]">
                        <span className="bg-[#111] border border-[#222] p-1">1: 3500 · 6б</span>
                        <span className="bg-[#111] border border-[#222] p-1">2: 2700 · 5б</span>
                        <span className="bg-[#111] border border-[#222] p-1">3: 2000 · 4б</span>
                        <span className="bg-[#111] border border-[#222] p-1">4: 1500 · 3б</span>
                        <span className="bg-[#111] border border-[#222] p-1">5: 1000 · 2б</span>
                        <span className="bg-[#111] border border-[#222] p-1">6: 700 · 1б</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[#44ff44] mb-1">NT:</p>
                      <div className="grid grid-cols-3 gap-1 text-[6px]">
                        <span className="bg-[#111] border border-[#222] p-1">1: 10000 · 15б</span>
                        <span className="bg-[#111] border border-[#222] p-1">2: 8000 · 12б</span>
                        <span className="bg-[#111] border border-[#222] p-1">3: 6500 · 10б</span>
                        <span className="bg-[#111] border border-[#222] p-1">4: 5200 · 7б</span>
                        <span className="bg-[#111] border border-[#222] p-1">5: 4100 · 5б</span>
                        <span className="bg-[#111] border border-[#222] p-1">6: 3300 · 3б</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[#ffff00] mb-1">WS — Корона:</p>
                      <div className="grid grid-cols-3 gap-1 text-[6px]">
                        <span className="bg-[#111] border border-[#222] p-1">1: 👑+5000</span>
                        <span className="bg-[#111] border border-[#222] p-1">2: 3800</span>
                        <span className="bg-[#111] border border-[#222] p-1">3: 2500</span>
                        <span className="bg-[#111] border border-[#222] p-1">4: 1000</span>
                        <span className="bg-[#111] border border-[#222] p-1">5: 500</span>
                        <span className="bg-[#111] border border-[#222] p-1">6: 0</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[#ffff00] mb-1">WS — Главная:</p>
                      <div className="grid grid-cols-3 gap-1 text-[6px]">
                        <span className="bg-[#111] border border-[#222] p-1">1: 13500</span>
                        <span className="bg-[#111] border border-[#222] p-1">2: 11000</span>
                        <span className="bg-[#111] border border-[#222] p-1">3: 10000</span>
                        <span className="bg-[#111] border border-[#222] p-1">4: 8500</span>
                        <span className="bg-[#111] border border-[#222] p-1">5: 7000</span>
                        <span className="bg-[#111] border border-[#222] p-1">6: 5000</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-[#aa44ff] mb-1">Турнир:</p>
                      <div className="grid grid-cols-3 gap-1 text-[6px]">
                        <span className="bg-[#111] border border-[#222] p-1">1: 15000 · 25б</span>
                        <span className="bg-[#111] border border-[#222] p-1">2: 13000 · 20б</span>
                        <span className="bg-[#111] border border-[#222] p-1">3: 12500 · 15б</span>
                        <span className="bg-[#111] border border-[#222] p-1">4: 12000 · 11б</span>
                        <span className="bg-[#111] border border-[#222] p-1">5: 11500 · 8б</span>
                        <span className="bg-[#111] border border-[#222] p-1">6: 10000 · 5б</span>
                      </div>
                    </div>
                    <div className="bg-[#003300] border border-[#44ff44] p-2 text-[6px] text-[#44ff44]">
                      Поддержка: последний получает 10000 после этапа. Лидер 2+ этапов подряд отдаёт 4000 последнему и 2500 предпоследнему.
                    </div>
                  </div>
                )}

                {sec.id === 'penalties' && <>
                  <p>Игрок сам следит за правильностью хода.</p>
                  <p className="text-[#ff4444]">Повторная деталь = штраф 2000 + снятие лишней детали.</p>
                </>}

              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Rules;
