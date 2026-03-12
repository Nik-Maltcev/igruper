import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { fetchRaceDayResults } from '../services/multiplayer';
import { Car, RaceDayResult } from '../types';

interface RaceResultsProps {
    roomId: string;
    currentDay: number;
    onBack: () => void;
}

export default function RaceResults({ roomId, currentDay, onBack }: RaceResultsProps) {
    const [results, setResults] = useState<RaceDayResult[]>([]);
    const [loading, setLoading] = useState(true);

    // Текущая гонка, которую смотрим (индекс в массиве results)
    const [currentIdx, setCurrentIdx] = useState(0);

    // Состояние просмотра текущей гонки: 'GRID' (сетка машин) -> 'ANIMATION' (гонка) -> 'WINNERS' (результаты)
    const [viewStep, setViewStep] = useState<'GRID' | 'ANIMATION' | 'WINNERS'>('GRID');

    // Для анимации
    const [animationProgress, setAnimationProgress] = useState(0);

    useEffect(() => {
        async function load() {
            setLoading(true);
            const data = await fetchRaceDayResults(roomId, currentDay);
            setResults(data);
            setLoading(false);
        }
        load();
    }, [roomId, currentDay]);

    useEffect(() => {
        if (viewStep === 'ANIMATION') {
            const duration = 3000; // 3 секунды
            const interval = 50;
            let elapsed = 0;
            const timer = setInterval(() => {
                elapsed += interval;
                const p = Math.min(100, (elapsed / duration) * 100);
                setAnimationProgress(p);
                if (p >= 100) {
                    clearInterval(timer);
                    setTimeout(() => setViewStep('WINNERS'), 500);
                }
            }, interval);
            return () => clearInterval(timer);
        }
    }, [viewStep]);

    if (loading) {
        return <div className="p-4 text-center text-white">Загрузка результатов...</div>;
    }

    if (results.length === 0) {
        return (
            <div className="p-4 max-w-2xl mx-auto">
                <div className="pixel-card p-4 text-center text-[#ffaa00]">
                    В этот день гонок не проводилось.
                </div>
                <button onClick={onBack} className="mt-4 w-full retro-btn">НАЗАД</button>
            </div>
        );
    }

    const currentRace = results[currentIdx];
    const isLastRace = currentIdx === results.length - 1;

    const handleNext = () => {
        if (viewStep === 'GRID') {
            setViewStep('ANIMATION');
            setAnimationProgress(0);
        } else if (viewStep === 'WINNERS') {
            if (!isLastRace) {
                setCurrentIdx(i => i + 1);
                setViewStep('GRID');
            } else {
                onBack();
            }
        }
    };

    return (
        <div className="p-4 max-w-6xl mx-auto text-white">
            <div className="mb-4 flex justify-between items-end">
                <div>
                    <h2 className="text-xl retro-title text-[#00ffaa]">🏆 РЕЗУЛЬТАТЫ ДНЯ {currentDay}</h2>
                    <div className="text-[10px] text-[#aaa]">Гонка {currentIdx + 1} из {results.length}: <span className="text-white">{currentRace.race_name}</span></div>
                </div>
                <div className="text-[12px] px-3 py-1 bg-[#1a1a2e] border border-[#333]">
                    Погода: {currentRace.weather === 'SUNNY' ? '☀️ ЯСНО' : currentRace.weather === 'RAIN' ? '🌧️ ДОЖДЬ' : '⛈ ШТОРМ'}
                </div>
            </div>

            <div className="pixel-card p-4 bg-[#0a0a14] border-[#333]">

                {viewStep === 'GRID' && (
                    <div>
                        <h3 className="text-sm mb-4 text-center text-[#ffaa00]">СТАРТОВАЯ РЕШЕТКА</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-[10px] text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[#333] text-[#aaa]">
                                        <th className="p-2">Место на старте</th>
                                        <th className="p-2">Машина</th>
                                        <th className="p-2 text-center text-[#44ff44]">% к победе</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentRace.results.map((r, i) => (
                                        <tr key={r.carId} className="border-b border-[#222]">
                                            <td className="p-2 text-[#fff]">#{i + 1}</td>
                                            <td className="p-2 font-bold text-[#aaa]">{r.carName}</td>
                                            <td className="p-2 text-center text-[#44ff44]">
                                                —
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="text-center mt-4 text-[8px] text-[#555]">
                                В таблице показана стартовая расстановка. Погода и характеристики машин повлияют на итоговое время.
                            </div>
                        </div>

                        <button onClick={handleNext} className="mt-6 w-full retro-btn py-3 text-[14px] bg-[#004400] border-[#00ff00] text-[#00ff00] hover:bg-[#003300]">
                            СТАРТ ГОНКИ ▶
                        </button>
                    </div>
                )}

                {viewStep === 'ANIMATION' && (
                    <div className="py-8">
                        <h3 className="text-center text-sm mb-8 text-[#ff4444] animate-pulse">ГОНКА ИДЕТ...</h3>
                        <div className="flex flex-col gap-4">
                            {currentRace.results.map((r, i) => {
                                // Для анимации рассчитываем "скорость" каждой машины так, чтобы победитель (с самым маленьким временем) приехал первым
                                // Победитель имеет progressModifier = 1.0 (заканчивает гонку быстрее всего)
                                // Остальные имеют меньший модификатор, чтобы отстать
                                const minTime = Math.min(...currentRace.results.map(res => res.time));
                                const progressModifier = minTime / r.time;
                                const currentProgress = Math.min(100, animationProgress * progressModifier);

                                return (
                                    <div key={r.carId} className="flex flex-col relative">
                                        <div className="flex justify-between text-[8px] mb-1 text-[#aaa]">
                                            <span>{r.carName}</span>
                                        </div>
                                        <div className="h-2 bg-[#222] relative border-y border-[#111]">
                                            <div
                                                className="h-full bg-[#ffaa00] absolute top-0 left-0 transition-all duration-75"
                                                style={{ width: `${currentProgress}%` }}
                                            />
                                            <div
                                                className="absolute top-1/2 -translate-y-1/2 text-[10px]"
                                                style={{ left: `calc(${currentProgress}% - 8px)`, transition: 'left 75ms linear' }}
                                            >
                                                🏎️
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {viewStep === 'WINNERS' && (
                    <div className="animate-fade-in">
                        <h3 className="text-sm mb-4 text-center text-[#00ffaa]">РЕЗУЛЬТАТЫ ЗАЕЗДА</h3>
                        <div className="flex flex-col gap-2">
                            {currentRace.results.sort((a, b) => a.position - b.position).map((r, idx) => (
                                <div key={r.carId} className={`flex justify-between items-center p-2 border ${idx === 0 ? 'border-[#ffdd00] bg-[#332200]' : idx === 1 ? 'border-[#aaaaaa] bg-[#222222]' : idx === 2 ? 'border-[#cd7f32] bg-[#331a00]' : 'border-[#333] bg-[#111]'}`}>
                                    <div className="flex items-center gap-3">
                                        <span className={`text-[12px] font-bold ${idx === 0 ? 'text-[#ffdd00]' : idx === 1 ? 'text-[#aaaaaa]' : idx === 2 ? 'text-[#cd7f32]' : 'text-[#777]'}`}>
                                            #{r.position}
                                        </span>
                                        <span className="text-[10px] text-white">{r.carName}</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] text-[#ffaa00]">+${r.earnings.toLocaleString()}</div>
                                        <div className="text-[8px] text-[#aaa]">Время: {r.time} сек</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button onClick={handleNext} className="mt-6 w-full retro-btn py-3 text-[14px]">
                            {isLastRace ? 'ЗАВЕРШИТЬ ДЕНЬ 🏁' : 'СЛЕДУЮЩАЯ ГОНКА ▶'}
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
}
