import React, { useEffect, useRef, useState } from 'react';

const PHRASES = [
  'ЗАВОДИМ ДВИГАТЕЛЬ...',
  'ПРОГРЕВАЕМ ШИНЫ...',
  'ЗАЛИВАЕМ НИТРО...',
  'СИНХРОНИЗИРУЕМ СЕРВЕР...',
  'РАССТАВЛЯЕМ КОНУСЫ...',
  'ВЫЕЗЖАЕМ НА СТАРТ...',
];

const LoadingScreen = ({ ready }: { ready: boolean }) => {
  const [progress, setProgress] = useState(0);
  const [phraseIdx, setPhraseIdx] = useState(0);
  const readyRef = useRef(ready);

  useEffect(() => { readyRef.current = ready; }, [ready]);

  // Прогресс ползёт до 92%, а когда данные загружены — добивает до 100%
  useEffect(() => {
    const iv = setInterval(() => {
      setProgress(p => {
        const target = readyRef.current ? 100 : 92;
        if (p >= target) return target;
        return Math.min(target, p + (readyRef.current ? 6 : 1.4));
      });
    }, 50);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const iv = setInterval(() => setPhraseIdx(i => (i + 1) % PHRASES.length), 800);
    return () => clearInterval(iv);
  }, []);

  const done = progress >= 100;

  return (
    <div className="ls-root">
      <div className="ls-bg"></div>
      <div className="ls-vignette"></div>
      <div className="ls-scene">
        <div className="ls-title">IGRUPER</div>
        <div className="ls-sub">RACE MANAGER</div>
        <div className="ls-bar-row">
          <div className="ls-bar"><div className="ls-bar-fill" style={{ width: `${progress}%` }}></div></div>
          <div className="ls-pct">{Math.floor(progress)}%</div>
        </div>
        <div className="ls-phrase blink">{done ? 'СТАРТ!' : PHRASES[phraseIdx]}</div>
      </div>
    </div>
  );
};

export default LoadingScreen;
