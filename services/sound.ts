// Звуковой менеджер игры.
// Фоновая музыка: музыка 1 → по окончании музыка 2 → по окончании снова музыка 1
// (замкнутый круг). На экранах стартовой решётки, визуализации гонки и наград
// музыка ставится на паузу — там звучат свои эффекты.
// Эффекты — короткие звуки по событиям (покупки, меню, старт гонки и т.д.).
// Браузеры блокируют автоплей до первого жеста пользователя: startMusic()
// вызывается повторно на первый клик/нажатие клавиши (см. App.tsx).

const MUSIC_VOLUME = 0.3;
const EFFECT_VOLUME = 0.7;
const STORAGE_KEY = 'skm_sound_enabled';

export type Sfx =
  | 'race-visual'  // визуализация гонки с машинками (зациклен на время анимации)
  | 'midnight'     // десять вечера: переход гоночного дня в другой
  | 'catchup'      // картинка с поддержкой отстающих
  | 'dns'          // машинка не едет из-за неподходящих шин
  | 'menu'         // переход в любое из меню
  | 'buy-part'     // покупка детали
  | 'buy-car'      // покупка машины
  | 'buy-fail'     // нехватка денег или занятый слот
  | 'race-entry'   // расстановка машинки на трассу в гоночном центре
  | 'grid'         // стартовая решётка
  | 'rewards';     // экран с наградами после гонки

const SFX_SRC: Record<Sfx, string> = {
  'race-visual': '/sounds/race-visual.mp3',
  'midnight': '/sounds/midnight.mp3',
  'catchup': '/sounds/catchup.mp3',
  'dns': '/sounds/dns.mp3',
  'menu': '/sounds/menu.mp3',
  'buy-part': '/sounds/buy-part.mp3',
  'buy-car': '/sounds/buy-car.mp3',
  'buy-fail': '/sounds/buy-fail.mp3',
  'race-entry': '/sounds/race-entry.mp3',
  'grid': '/sounds/grid.mp3',
  'rewards': '/sounds/rewards.mp3',
};

const MUSIC_SRC = ['/sounds/music-1.mp3', '/sounds/music-2.mp3'];

let enabled = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) !== '0' : true;
let tracks: HTMLAudioElement[] | null = null;
let musicIdx = 0;
let loopEffect: HTMLAudioElement | null = null;

export function isSoundEnabled(): boolean {
  return enabled;
}

export function setSoundEnabled(v: boolean): void {
  enabled = v;
  try { localStorage.setItem(STORAGE_KEY, v ? '1' : '0'); } catch { /* приватный режим */ }
  if (!v) {
    pauseMusic();
    stopLoop();
  }
}

function getTracks(): HTMLAudioElement[] {
  if (!tracks) {
    tracks = MUSIC_SRC.map((src) => {
      const a = new Audio(src);
      a.volume = MUSIC_VOLUME;
      a.preload = 'auto';
      return a;
    });
    // Замкнутый круг: музыка 1 → музыка 2 → музыка 1 → ...
    tracks[0].addEventListener('ended', () => playTrack(1));
    tracks[1].addEventListener('ended', () => playTrack(0));
  }
  return tracks;
}

function playTrack(i: number): void {
  musicIdx = i;
  const list = getTracks();
  list.forEach((t, j) => { if (j !== i) t.pause(); });
  const p = list[i].play();
  if (p) p.catch(() => { /* автоплей заблокирован до жеста — начнём на следующем startMusic */ });
}

// Возобновить/начать фоновую музыку (если включена). Повторные вызовы безопасны.
export function startMusic(): void {
  if (!enabled) return;
  const list = getTracks();
  if (!list[musicIdx].paused) return;
  playTrack(musicIdx);
}

// Пауза фоновой музыки с сохранением позиции (экраны решётки/гонки/наград)
export function pauseMusic(): void {
  if (tracks) tracks.forEach(t => t.pause());
}

// Короткий эффект; с { loop: true } — фоновый звук анимации гонки
export function playEffect(name: Sfx, opts?: { loop?: boolean }): void {
  if (!enabled) return;
  if (opts?.loop) {
    stopLoop();
    const a = new Audio(SFX_SRC[name]);
    a.volume = EFFECT_VOLUME;
    a.loop = true;
    a.play().catch(() => { /* до первого жеста эффекты не играют */ });
    loopEffect = a;
    return;
  }
  const a = new Audio(SFX_SRC[name]);
  a.volume = EFFECT_VOLUME;
  a.play().catch(() => { /* до первого жеста эффекты не играют */ });
}

// Остановить зацикленный эффект (выход из анимации гонки)
export function stopLoop(): void {
  if (loopEffect) {
    loopEffect.pause();
    loopEffect = null;
  }
}
