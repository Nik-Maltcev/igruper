import React, { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, Trophy, AlertTriangle, Crown, Droplets, Wrench, DollarSign } from 'lucide-react';

interface RulesProps {
  onBack: () => void;
}

type Section = 'order' | 'weather' | 'parts' | 'competitions' | 'kings' | 'prices' | 'rewards' | 'penalties';

const Rules: React.FC<RulesProps> = ({ onBack }) => {
  const [open, setOpen] = useState<Set<Section>>(new Set(['order']));

  const toggle = (s: Section) => {
    setOpen(prev => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  };

  const Accordion = ({ id, title, icon: Icon, children }: { id: Section; title: string; icon: any; children: React.ReactNode }) => (
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
      <button onClick={() => toggle(id)} className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-750 transition-colors">
        <Icon size={20} className="text-blue-400 shrink-0" />
        <span className="font-bold text-white flex-grow uppercase text-sm tracking-wide">{title}</span>
        {open.has(id) ? <ChevronUp size={18} className="text-gray-500" /> : <ChevronDown size={18} className="text-gray-500" />}
      </button>
      {open.has(id) && <div className="px-4 pb-4 text-sm text-gray-300 leading-relaxed space-y-3">{children}</div>}
    </div>
  );

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-white uppercase italic flex items-center gap-3">
          <BookOpen className="text-blue-400" /> Правила
        </h2>
        <button onClick={onBack} className="text-gray-400 hover:text-white border border-gray-600 px-4 py-1 rounded">Назад</button>
      </div>

      <div className="space-y-3">

        <Accordion id="order" title="Порядок хода" icon={BookOpen}>
          <p>Сначала админ делает ход и сообщает об этом в чате. После этого игроки в любое время до 22:00 присылают в личку свои ходы о покупках и расстановке на трассы.</p>
          <p>В первый день совершаются покупки во всех городах. Во второй день — расстановка на трассы и сама гонка.</p>
          <p>До совершения расстановки объявляется, будет дождь или нет. Если дождь будет, после расстановки тачек становится известно, на какой трассе именно.</p>
          <p>Управляемость и Проходимость не могут быть ниже 1. Если деталь снижает эти характеристики ниже единицы, она не может быть установлена.</p>
          <p className="text-yellow-300">Если одна из характеристик становится меньше 1 из-за дождя, машина не может ехать и автоматически получает последнее место.</p>
          <p>Между игроками возможны обмен и торговля, но только в пределах одного города. Тачки нельзя перевозить из одного города в другой, кроме тех, которые отправляются на Турнир (их можно возвращать в любой город).</p>
        </Accordion>

        <Accordion id="weather" title="Влияние осадков на шины" icon={Droplets}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-900 text-gray-400 uppercase">
                  <th className="p-2 text-left border border-gray-700">Трасса</th>
                  <th className="p-2 text-center border border-gray-700">Универсальные</th>
                  <th className="p-2 text-center border border-gray-700">Гоночные</th>
                  <th className="p-2 text-center border border-gray-700">Внедорожные</th>
                  <th className="p-2 text-center border border-gray-700">Слики</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                <tr>
                  <td className="p-2 border border-gray-700 font-bold">Песок / Болото</td>
                  <td className="p-2 border border-gray-700 text-center text-red-300">-10П -10У +0.5сек</td>
                  <td className="p-2 border border-gray-700 text-center text-red-400">-15П -20У +1сек</td>
                  <td className="p-2 border border-gray-700 text-center text-green-400">0</td>
                  <td className="p-2 border border-gray-700 text-center text-red-500 font-bold">Не едет</td>
                </tr>
                <tr className="bg-gray-900/50">
                  <td className="p-2 border border-gray-700 font-bold">Снег / Лёд / Полигон</td>
                  <td className="p-2 border border-gray-700 text-center text-red-300">-15П -20У +1сек</td>
                  <td className="p-2 border border-gray-700 text-center text-red-400">-20П -25У +1.5сек</td>
                  <td className="p-2 border border-gray-700 text-center text-green-400">0</td>
                  <td className="p-2 border border-gray-700 text-center text-red-500 font-bold">Не едет</td>
                </tr>
                <tr>
                  <td className="p-2 border border-gray-700 font-bold">Грунтовка / Мотокросс</td>
                  <td className="p-2 border border-gray-700 text-center text-red-300">-10П -5У</td>
                  <td className="p-2 border border-gray-700 text-center text-red-400">-15П -10У</td>
                  <td className="p-2 border border-gray-700 text-center text-green-400">0</td>
                  <td className="p-2 border border-gray-700 text-center text-red-500 font-bold">Не едет</td>
                </tr>
                <tr className="bg-gray-900/50">
                  <td className="p-2 border border-gray-700 font-bold">Сельская дорога / Лес</td>
                  <td className="p-2 border border-gray-700 text-center text-red-300">-5П</td>
                  <td className="p-2 border border-gray-700 text-center text-red-400">-15У -5П +0.5сек</td>
                  <td className="p-2 border border-gray-700 text-center text-yellow-300">-5У</td>
                  <td className="p-2 border border-gray-700 text-center text-red-500">-30У -10П +1.5сек</td>
                </tr>
                <tr>
                  <td className="p-2 border border-gray-700 font-bold">Асфальт (все остальные)</td>
                  <td className="p-2 border border-gray-700 text-center text-green-400">0</td>
                  <td className="p-2 border border-gray-700 text-center text-red-300">-20У</td>
                  <td className="p-2 border border-gray-700 text-center text-red-300">-15У +1сек</td>
                  <td className="p-2 border border-gray-700 text-center text-red-400">-30У +1сек</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Accordion>

        <Accordion id="parts" title="Примечания по деталям" icon={Wrench}>
          <ul className="list-disc list-inside space-y-2">
            <li>Чтобы установить турбину или компрессор, сначала нужно обязательно установить интеркулер.</li>
            <li>Прирост скорости в фиксированных км/ч плюсуется независимо от коэффициента машины.</li>
            <li>Прирост, указанный в процентах, зависит от коэффициента машины.</li>
            <li>Распредвал можно установить только один: Нижний, Верхний или Универсальный.</li>
            <li>Шины можно установить только одни: Слики, Гоночные, Универсальные или Внедорожные.</li>
            <li>Дифференциал можно установить только один: повышенного трения (ДиффПТ — акцент на Управляемости) или самоблокирующийся (ДиффСБ — акцент на Проходимости).</li>
          </ul>
        </Accordion>

        <Accordion id="competitions" title="Соревнования" icon={Trophy}>
          <div className="space-y-4">
            <div>
              <h4 className="font-bold text-blue-300 mb-1">City Challenge (CC) — Городские состязания</h4>
              <p>Проходят в первый день. Не допускаются автомобили с пометкой АВТОСПОРТ. К каждой трассе своё требование, на каждую трассу выходит одна машина. Деньги присуждаются за каждый заезд, баллы — за общее положение по городу.</p>
            </div>
            <div>
              <h4 className="font-bold text-green-300 mb-1">National Tournament (NT) — Национальное соревнование</h4>
              <p>Устанавливается требование сразу на три трассы. Игрок получает баллы с учётом всех трёх заездов.</p>
            </div>
            <div>
              <h4 className="font-bold text-yellow-300 mb-1">World Series (WS) — Мировая серия</h4>
              <p>Состоит из: гонки за корону, бонусного заезда за призом и главной прибыльной гонки. На главную гонку можно отправить несколько машин из разных категорий мощности (теоретически до 7 в каждом городе). Все три гонки проходят не одновременно — одну машину можно отправлять на все три заезда.</p>
              <p className="text-yellow-200">Участие стоит 1000.</p>
            </div>
            <div>
              <h4 className="font-bold text-purple-300 mb-1">Турниры (Ралли и Гонка Чемпионов)</h4>
              <p>Проводятся периодически, только для автомобилей с пометкой АВТОСПОРТ. Игрок может отправить одну машину из любого города. Турнир длится весь этап (3 матча), машина в это время не находится в гараже и не участвует в других гонках.</p>
              <p>Карта турнира делится на 3 участка с разными индексами. Если машина отстаёт на первом участке, она может опередить на последующих.</p>
              <p>Всем участникам гарантированы денежные призы.</p>
            </div>
          </div>

          <div className="mt-3 p-3 bg-gray-900 rounded border border-gray-700">
            <h4 className="font-bold text-white mb-2 text-xs uppercase">Категории по мощности</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <span className="bg-gray-800 px-2 py-1 rounded text-center">0–120 лс</span>
              <span className="bg-gray-800 px-2 py-1 rounded text-center">121–200 лс</span>
              <span className="bg-gray-800 px-2 py-1 rounded text-center">201–300 лс</span>
              <span className="bg-gray-800 px-2 py-1 rounded text-center">301–450 лс</span>
              <span className="bg-gray-800 px-2 py-1 rounded text-center">451–650 лс</span>
              <span className="bg-gray-800 px-2 py-1 rounded text-center">651–900 лс</span>
              <span className="bg-gray-800 px-2 py-1 rounded text-center">900+ лс</span>
            </div>
          </div>

          <div className="mt-3 p-3 bg-blue-900/20 rounded border border-blue-800 text-xs">
            <p>При одинаковом финише: денежный приз делится между текущим и следующим местом, а следующий игрок занимает место после. Баллы всем одинаково финишировавшим присваиваются как за лучшее из занятых мест.</p>
          </div>

          <div className="mt-3 p-3 bg-green-900/20 rounded border border-green-800 text-xs">
            <p><span className="font-bold text-green-300">Система поддержки догоняющих:</span> занимающий последнее место получает 10 000 после окончания этапа. Игрок на 1 месте два и более этапов подряд обязан выделить 4 000 последнему и 2 500 предпоследнему.</p>
          </div>
        </Accordion>

        <Accordion id="kings" title="Короли дисциплин" icon={Crown}>
          <p>В игре есть титул короля четырёх дисциплин: Дрэг, Дрифт, Слалом и Мотокросс.</p>
          <p>Корону получает тот, кто победит в WS в соответствующей гонке.</p>
          <p>Корона даёт право ставить на соответствующие дисциплины в чемпионате CC (и только тут) любые машины, не взирая на условия.</p>
          <p>Корона переходит к другому игроку, если тот победит актуального короля на этой трассе в следующий раз.</p>
          <p>При получении короны в городских состязаниях не обязательно выполнять требования по выигранной дисциплине.</p>
        </Accordion>

        <Accordion id="prices" title="Изменение цен на авто" icon={DollarSign}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-900 text-gray-400 uppercase">
                  <th className="p-2 text-left border border-gray-700">Класс редкости</th>
                  <th className="p-2 text-left border border-gray-700">Изменение за этап</th>
                  <th className="p-2 text-left border border-gray-700">Лимит</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                <tr><td className="p-2 border border-gray-700">Класс 1</td><td className="p-2 border border-gray-700 text-red-400">−600</td><td className="p-2 border border-gray-700">до половины начальной цены</td></tr>
                <tr className="bg-gray-900/50"><td className="p-2 border border-gray-700">Класс 2</td><td className="p-2 border border-gray-700 text-red-300">−300</td><td className="p-2 border border-gray-700">до половины начальной цены</td></tr>
                <tr><td className="p-2 border border-gray-700">Класс 3</td><td className="p-2 border border-gray-700 text-gray-400">0</td><td className="p-2 border border-gray-700">—</td></tr>
                <tr className="bg-gray-900/50"><td className="p-2 border border-gray-700">Класс 4</td><td className="p-2 border border-gray-700 text-green-400">+500</td><td className="p-2 border border-gray-700">—</td></tr>
                <tr><td className="p-2 border border-gray-700">Класс 5</td><td className="p-2 border border-gray-700 text-green-400">+1 000</td><td className="p-2 border border-gray-700">—</td></tr>
              </tbody>
            </table>
          </div>
        </Accordion>

        <Accordion id="rewards" title="Награды" icon={Trophy}>
          <div className="space-y-4">
            <div>
              <h4 className="font-bold text-blue-300 mb-2">City Challenge (деньги за каждую гонку, баллы за общее по городу)</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-1 text-xs">
                <span className="bg-yellow-900/30 px-2 py-1 rounded">1 место — 3 500 · 6 баллов</span>
                <span className="bg-gray-900 px-2 py-1 rounded">2 место — 2 700 · 5 баллов</span>
                <span className="bg-gray-900 px-2 py-1 rounded">3 место — 2 000 · 4 балла</span>
                <span className="bg-gray-900 px-2 py-1 rounded">4 место — 1 500 · 3 балла</span>
                <span className="bg-gray-900 px-2 py-1 rounded">5 место — 1 000 · 2 балла</span>
                <span className="bg-gray-900 px-2 py-1 rounded">6 место — 700 · 1 балл</span>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-green-300 mb-2">National Tournament (общее требование ко всем трём гонкам)</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-1 text-xs">
                <span className="bg-yellow-900/30 px-2 py-1 rounded">1 — 10 000 · 15 баллов</span>
                <span className="bg-gray-900 px-2 py-1 rounded">2 — 8 000 · 12 баллов</span>
                <span className="bg-gray-900 px-2 py-1 rounded">3 — 6 500 · 10 баллов</span>
                <span className="bg-gray-900 px-2 py-1 rounded">4 — 5 200 · 7 баллов</span>
                <span className="bg-gray-900 px-2 py-1 rounded">5 — 4 100 · 5 баллов</span>
                <span className="bg-gray-900 px-2 py-1 rounded">6 — 3 300 · 3 балла</span>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-yellow-300 mb-2">World Series — Гонка за корону</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-1 text-xs">
                <span className="bg-yellow-900/30 px-2 py-1 rounded">1 — Корона + 5 000</span>
                <span className="bg-gray-900 px-2 py-1 rounded">2 — 3 800</span>
                <span className="bg-gray-900 px-2 py-1 rounded">3 — 2 500</span>
                <span className="bg-gray-900 px-2 py-1 rounded">4 — 1 000</span>
                <span className="bg-gray-900 px-2 py-1 rounded">5 — 500</span>
                <span className="bg-gray-900 px-2 py-1 rounded">6 — 0</span>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-yellow-300 mb-2">World Series — Bonus Track</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-1 text-xs">
                <span className="bg-yellow-900/30 px-2 py-1 rounded">1 — 5 000 + 2 приза</span>
                <span className="bg-gray-900 px-2 py-1 rounded">2 — 4 500 + 1 приз</span>
                <span className="bg-gray-900 px-2 py-1 rounded">3 — 3 000 + 1 приз</span>
                <span className="bg-gray-900 px-2 py-1 rounded">4 — 1 500 + 1 приз</span>
                <span className="bg-gray-900 px-2 py-1 rounded">5 — приз</span>
                <span className="bg-gray-900 px-2 py-1 rounded">6 — 1 500</span>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-yellow-300 mb-2">World Series — Главная гонка</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-1 text-xs">
                <span className="bg-yellow-900/30 px-2 py-1 rounded">1 — 13 500</span>
                <span className="bg-gray-900 px-2 py-1 rounded">2 — 11 000</span>
                <span className="bg-gray-900 px-2 py-1 rounded">3 — 10 000</span>
                <span className="bg-gray-900 px-2 py-1 rounded">4 — 8 500</span>
                <span className="bg-gray-900 px-2 py-1 rounded">5 — 7 000</span>
                <span className="bg-gray-900 px-2 py-1 rounded">6 — 5 000</span>
              </div>
            </div>
            <div>
              <h4 className="font-bold text-purple-300 mb-2">Турнир</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-1 text-xs">
                <span className="bg-yellow-900/30 px-2 py-1 rounded">1 — 15 000 · 25 баллов</span>
                <span className="bg-gray-900 px-2 py-1 rounded">2 — 13 000 · 20 баллов</span>
                <span className="bg-gray-900 px-2 py-1 rounded">3 — 12 500 · 15 баллов</span>
                <span className="bg-gray-900 px-2 py-1 rounded">4 — 12 000 · 11 баллов</span>
                <span className="bg-gray-900 px-2 py-1 rounded">5 — 11 500 · 8 баллов</span>
                <span className="bg-gray-900 px-2 py-1 rounded">6 — 10 000 · 5 баллов</span>
              </div>
            </div>
          </div>
        </Accordion>

        <Accordion id="penalties" title="Наказания" icon={AlertTriangle}>
          <p>Игрок сам должен следить за правильностью хода.</p>
          <p className="text-red-300">Если он заново заказал деталь, которая уже установлена на автомобиле, а админ этого не заметил — при обнаружении ошибки игрока ожидает штраф 2 000 и безвозмездно снимается лишняя деталь.</p>
        </Accordion>

      </div>
    </div>
  );
};

export default Rules;
