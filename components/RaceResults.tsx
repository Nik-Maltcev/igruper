import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { fetchRaceDayResults, POWER_CATEGORIES, getScheduleDay } from '../services/multiplayer';
import { RACES_DATA } from '../constants';
import { Car, RaceDayResult } from '../types';

interface RaceResultsProps {
    roomId: string;
    currentDay: number;
    gameYear?: number;
    onBack: () => void;
}

// Форматирование времени: ДРЭГ — секунды, остальные — минуты:секунды
function formatTime(seconds: number, raceName: string): string {
    const isDrag = raceName.toLowerCase().includes('дрэг');
    if (isDrag) {
        return `${seconds.toFixed(2)} сек`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.round((seconds % 1) * 100);
    if (mins > 0) {
        return `${mins} мин ${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')} сек`;
    }
    return `${secs}.${ms.toString().padStart(2, '0')} сек`;
}

// Цвета машинок по позициям
const CAR_COLORS = ['#ffdd00', '#aaaaaa', '#cd7f32', '#4488ff', '#44ff44', '#ff8800', '#aa44ff', '#ff4444'];

// Порядок показа заездов субботы (Мировая серия): платная → бонусная → главная по категориям мощности
function orderDayResults(races: any[], currentDay: number, gameYear: number): any[] {
    const schedule = getScheduleDay(currentDay);
    if (schedule.raceType !== 'WORLD') return races;
    const epochData = (RACES_DATA.epochs || []).find((e: any) => e.year === gameYear);
    const roundData = epochData?.rounds?.find((r: any) => r.round === 3);
    const paidName = roundData?.races?.[0]?.name;
    const bonusName = roundData?.races?.[1]?.name;
    const orderKey = (r: any): number => {
        const rid = r.race_id || '';
        if (paidName && rid === paidName) return 0;
        if (bonusName && rid === bonusName) return 1;
        if (rid.startsWith('main-cat-')) return 2 + (parseInt(rid.slice('main-cat-'.length), 10) || 0);
        if (rid.startsWith('tournament-section-')) return 100 + (parseInt(rid.slice('tournament-section-'.length), 10) || 0);
        if (rid === 'tournament-final') return 200;
        return 300;
    };
    return [...races].sort((a, b) => orderKey(a) - orderKey(b));
}

export default function RaceResults({ roomId, currentDay, gameYear = 1960, onBack }: RaceResultsProps) {
    const [results, setResults] = useState<RaceDayResult[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [viewStep, setViewStep] = useState<'GRID' | 'ANIMATION' | 'WINNERS'>('GRID');
    const [animationProgress, setAnimationProgress] = useState(0);

    useEffect(() => {
        async function load() {
            setLoading(true);
            const data = await fetchRaceDayResults(roomId, currentDay);
            setResults(orderDayResults((data || []).filter((r: any) => (r.results?.length || 0) > 0), currentDay, gameYear));
            setLoading(false);
        }
        load();
    }, [roomId, currentDay, gameYear]);

    useEffect(() => {
        if (viewStep === 'ANIMATION') {
            const duration = 4000;
            const interval = 50;
            let elapsed = 0;
            const timer = setInterval(() => {
                elapsed += interval;
                const p = Math.min(100, (elapsed / duration) * 100);
                setAnimationProgress(p);
                if (p >= 100) {
                    clearInterval(timer);
                    setTimeout(() => setViewStep('WINNERS'), 600);
                }
            }, interval);
            return () => clearInterval(timer);
        }
    }, [viewStep]);

    // Стартовая решётка — порядок по алфавиту (имя игрока)
    const currentRace = results[currentIdx] || null;
    const gridOrder = useMemo(() => {
        if (!currentRace?.results?.length) return [];
        return [...currentRace.results].sort((a, b) => (a.playerName || '').localeCompare(b.playerName || ''));
    }, [currentIdx, results]);

    // Требование трассы: ищем только в эпохе и раунде этого дня
    // (имена гонок повторяются между эпохами с разными требованиями)
    // null — баннер не показывать (спец-заезд), '' — свободная гонка
    const raceRequirement = useMemo<string | null>(() => {
        if (!currentRace) return null;
        const raceId = currentRace.race_id || '';

        const schedule = getScheduleDay(currentDay);
        const roundNum = schedule.raceType === 'CITY' ? 1
            : schedule.raceType === 'NATIONAL' ? 2
            : schedule.raceType === 'WORLD' ? 3 : 0;
        const epochData = roundNum
            ? (RACES_DATA.epochs || []).find((e: any) => e.year === gameYear)
            : null;
        const roundData = epochData?.rounds?.find((r: any) => r.round === roundNum) || null;

        if (raceId.startsWith('main-cat-')) {
            const ci = parseInt(raceId.replace('main-cat-', ''), 10);
            const cat = POWER_CATEGORIES[ci];
            const underlying = roundData?.races?.[2]?.requirement || '';
            const parts = [cat ? `мощность ${cat.label}` : '', underlying].filter(Boolean);
            return parts.length > 0 ? parts.join(' + ') : null;
        }
        if (raceId.startsWith('tournament-section-')) return 'АВТОСПОРТ';
        if (raceId === 'tournament-final') return null;

        if (schedule.raceType === 'QUALIFICATION') {
            const qual = (RACES_DATA.specials || []).find((s: any) => s.name === 'квалификация');
            const race = (qual?.races || []).find((r: any) => r.name === currentRace.race_name);
            return (race?.requirement || '').trim();
        }
        if (!roundData) return null;
        const race = (roundData.races || []).find((r: any) => r.name === currentRace.race_name);
        if (!race) return null;
        return (race.requirement || roundData.requirement || '').trim();
    }, [currentIdx, results, currentDay, gameYear]);

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

    if (!currentRace) {
        return (
            <div className="p-4 max-w-2xl mx-auto">
                <div className="pixel-card p-4 text-center text-[#ffaa00]">Нет данных для этой гонки.</div>
                <button onClick={onBack} className="mt-4 w-full retro-btn">НАЗАД</button>
            </div>
        );
    }
    const isLastRace = currentIdx === results.length - 1;
    const isDrag = (currentRace.race_name || '').toLowerCase().includes('дрэг');

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
                        <h3 className="text-sm mb-2 text-center text-[#ffaa00]">СТАРТОВАЯ РЕШЕТКА</h3>
                        {raceRequirement !== null && (raceRequirement ? (
                            <div className="text-center mb-3 text-[9px] text-[#ffaa00] bg-[#1a1a00] border border-[#ffaa00] px-3 py-1.5">
                                Требование: <span className="text-white font-bold">{raceRequirement}</span>
                            </div>
                        ) : (
                            <div className="text-center mb-3 text-[9px] text-[#00ff88] bg-[#001a00] border border-[#00aa55] px-3 py-1.5">
                                <span className="font-bold">СВОБОДНАЯ ГОНКА</span> — без требований к машине
                            </div>
                        ))}
                        <div className="overflow-x-auto">
                            <table className="w-full text-[10px] text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-[#333] text-[#aaa]">
                                        <th className="p-2">#</th>
                                        <th className="p-2">Игрок / Машина</th>
                                        <th className="p-2 text-center">Мощн.</th>
                                        <th className="p-2 text-center">Кр.мом.</th>
                                        <th className="p-2 text-center">Скор.</th>
                                        <th className="p-2 text-center">Разг.</th>
                                        <th className="p-2 text-center">Упр.</th>
                                        <th className="p-2 text-center">Прох.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {gridOrder.map((r, i) => (
                                        <tr key={r.carId} className="border-b border-[#222]">
                                            <td className="p-2 text-[#fff]">#{i + 1}</td>
                                            <td className="p-2">
                                                {r.playerName && <span className="text-[#44ff44] font-bold">{r.playerName}</span>}
                                                {r.playerName && <span className="text-[#555] mx-1">—</span>}
                                                <span className="text-[#aaa]">{r.carName}</span>
                                            </td>
                                            <td className="p-2 text-center text-[#fff]">{(r as any).carStats?.power || '—'}</td>
                                            <td className="p-2 text-center text-[#fff]">{(r as any).carStats?.torque || '—'}</td>
                                            <td className="p-2 text-center text-[#fff]">{(r as any).carStats?.topSpeed || '—'}</td>
                                            <td className="p-2 text-center text-[#fff]">{(r as any).carStats?.acceleration?.toFixed(1) || '—'}</td>
                                            <td className="p-2 text-center text-[#fff]">{(r as any).carStats?.handling || '—'}</td>
                                            <td className="p-2 text-center text-[#fff]">{(r as any).carStats?.offroad || '—'}</td>
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
                    <div className="py-6">
                        <h3 className="text-center text-sm mb-6 text-[#ff4444] animate-pulse">ГОНКА ИДЕТ...</h3>
                        
                        {/* Дорога */}
                        <div className="relative bg-[#1a1a1a] border-2 border-[#333] p-3" style={{ borderRadius: '4px' }}>
                            {/* Линия финиша */}
                            <div className="absolute right-[24px] top-0 bottom-0 w-[3px]" style={{
                                background: 'repeating-linear-gradient(to bottom, #fff 0px, #fff 6px, #000 6px, #000 12px)',
                                zIndex: 10
                            }} />
                            <div className="absolute right-[20px] top-[-2px] text-[7px] text-[#ffaa00]" style={{ zIndex: 11 }}>🏁</div>

                            <div className="flex flex-col gap-1">
                                {gridOrder.map((r, i) => {
                                    const minTime = Math.min(...currentRace.results.map(res => res.time));
                                    const progressModifier = minTime / r.time;
                                    const currentProgress = Math.min(95, animationProgress * progressModifier * 0.95);
                                    const color = CAR_COLORS[i % CAR_COLORS.length];

                                    return (
                                        <div key={r.carId} className="relative" style={{ height: '32px' }}>
                                            {/* Полоса дороги */}
                                            <div className="absolute inset-0 border-b border-dashed border-[#333]"
                                                style={{ background: i % 2 === 0 ? '#0d0d0d' : '#141414' }} />
                                            
                                            {/* Имя слева */}
                                            <div className="absolute left-1 top-1/2 -translate-y-1/2 text-[7px] z-[5]" style={{ color }}>
                                                {r.playerName ? `${r.playerName} | ${r.carName.length > 12 ? r.carName.substring(0, 12) + '…' : r.carName}` : (r.carName.length > 15 ? r.carName.substring(0, 15) + '…' : r.carName)}
                                            </div>

                                            {/* Машинка */}
                                            <div
                                                className="absolute top-1/2 text-[16px] z-[5]"
                                                style={{
                                                    left: `${currentProgress}%`,
                                                    transition: 'left 75ms linear',
                                                    filter: `drop-shadow(0 0 4px ${color})`,
                                                    transform: 'translateY(-50%) scaleX(-1)',
                                                }}
                                            >
                                                🏎️
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Прогресс-бар внизу */}
                        <div className="mt-3 h-1 bg-[#222] relative">
                            <div className="h-full bg-[#ff4444] transition-all duration-75" style={{ width: `${animationProgress}%` }} />
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
                                        <span className="text-[10px] text-white">
                                            {r.playerName && <span className="text-[#44ff44]">{r.playerName} — </span>}
                                            {r.carName}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] text-[#ffaa00]">+${r.earnings.toLocaleString()}</div>
                                        {r.points > 0 && <div className="text-[8px] text-[#00ffaa]">+{r.points} очк.</div>}
                                        {(r as any).prizes?.length > 0 && (
                                            <div className="text-[7px] text-[#aa44ff] mt-0.5">
                                                {(r as any).prizes.map((p: any, pi: number) => (
                                                    <span key={pi}>{p.icon || '🎁'} {p.name}{pi < (r as any).prizes.length - 1 ? ', ' : ''}</span>
                                                ))}
                                            </div>
                                        )}
                                        <div className="text-[8px] text-[#aaa]">⏱ {formatTime(r.time, currentRace.race_name)}</div>
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
