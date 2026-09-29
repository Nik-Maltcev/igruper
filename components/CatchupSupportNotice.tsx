import React from 'react';

// Данные строки 'catchup-support' из race_day_results (пишет advanceDay при смене дня)
interface CatchupData {
  lastPlayer?: string;
  sponsorBonus?: number;
  leaderTax?: boolean;
  leader?: string;
  leaderStreak?: number;
  leaderToLast?: number;
  leaderToSecondLast?: number;
  secondLastPlayer?: string;
}

interface CatchupSupportNoticeProps {
  data: CatchupData;
  onClose: () => void;
}

/**
 * Автоматическая табличка «Поддержка отстающих» — появляется у всех игроков
 * при входе в день этапа (день 10 цикла), когда начисляются деньги поддержки.
 */
const CatchupSupportNotice: React.FC<CatchupSupportNoticeProps> = ({ data, onClose }) => {
  const {
    lastPlayer, sponsorBonus = 0, leaderTax, leader, leaderStreak,
    leaderToLast = 0, leaderToSecondLast = 0, secondLastPlayer,
  } = data;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
      <div className="pixel-card p-5 max-w-md w-full text-center" style={{ borderColor: '#ffaa00', borderWidth: '3px' }}>
        <h3 className="text-sm retro-title mb-3" style={{ color: '#ffaa00' }}>🤝 ПОДДЕРЖКА ОТСТАЮЩИХ</h3>
        <div className="text-[10px] text-white leading-relaxed text-left space-y-3">
          <div>
            💰 Спонсорская помощь игроку <span className="text-[#00ff00] font-bold">{lastPlayer}</span>{' '}
            (занимающему последнее место в турнирной таблице) —{' '}
            <span className="text-[#00ff00] font-bold">${sponsorBonus.toLocaleString('ru-RU')}</span>
          </div>
          {leaderTax && leader && (
            <div>
              👑 <span className="text-[#ffdd00] font-bold">{leader}</span>
              {leaderStreak && leaderStreak >= 2 ? ` (${leaderStreak} этапа подряд на 1-м месте)` : ''}{' '}
              в качестве благотворительности выделяет{' '}
              {leaderToSecondLast > 0 && secondLastPlayer && (
                <>
                  <span className="text-[#00ff00] font-bold">${leaderToSecondLast.toLocaleString('ru-RU')}</span>{' '}
                  игроку <span className="text-[#ffdd00] font-bold">{secondLastPlayer}</span>{' '}
                  (предпоследнему в турнирной таблице) и{' '}
                </>
              )}
              <span className="text-[#00ff00] font-bold">${leaderToLast.toLocaleString('ru-RU')}</span>{' '}
              игроку <span className="text-[#ffdd00] font-bold">{lastPlayer}</span>{' '}
              (последнему в турнирной таблице)
            </div>
          )}
        </div>
        <button onClick={onClose} className="mt-4 w-full retro-btn py-2 text-[10px]">
          ПОНЯТНО
        </button>
      </div>
    </div>
  );
};

export default CatchupSupportNotice;
