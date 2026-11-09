import React from 'react';
import { POWER_CATEGORIES, POWER_CATEGORY_ROMAN, getPowerCategoryIndex } from '../services/multiplayer';

// Цвет металла монетки от младшей категории к старшей
const COIN_COLORS = ['#8899aa', '#7fb069', '#4488ff', '#aa44ff', '#ff8800', '#ff4444', '#ffdd00'];

// Монетка с римским номером категории мощности, висит на правом краю карточки
// машины. Номер считается по ЭФФЕКТИВНОЙ мощности: при установке/снятии деталей
// машина переходит между категориями, и монетка это сразу показывает.
// Родитель должен быть position: relative.
const PowerBadge: React.FC<{ power: number }> = ({ power }) => {
  const idx = getPowerCategoryIndex(power);
  const cat = POWER_CATEGORIES[idx];
  const color = COIN_COLORS[idx] || '#ffdd00';
  return (
    <div
      title={`Категория мощности: ${POWER_CATEGORY_ROMAN[idx]} (${cat.label})`}
      style={{
        position: 'absolute',
        right: -14,
        top: '50%',
        transform: 'translateY(-50%)',
        zIndex: 5,
        pointerEvents: 'auto',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: `radial-gradient(circle at 30% 28%, rgba(255,255,255,.75) 0%, rgba(255,255,255,0) 42%), linear-gradient(135deg, ${color} 0%, ${color} 45%, #1a1a2e 130%)`,
          border: '2px solid #111',
          boxShadow: `0 0 0 2px ${color}66, 3px 3px 0 #000, inset 0 0 8px rgba(0,0,0,.55)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: idx >= 5 ? 8 : 10,
            color: '#fff',
            textShadow: '1px 1px 0 #000',
          }}
        >
          {POWER_CATEGORY_ROMAN[idx]}
        </span>
      </div>
    </div>
  );
};

export default PowerBadge;
