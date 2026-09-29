import React from 'react';
import { Car } from '../types';

// Особые метки — единственные, что выделяются цветом
const SPECIAL_TAGS = ['muscle car', 'комфорт', 'коллекция', 'автоспорт', 'widow maker', 'hot hatch'];
const COUNTRIES = ['сша', 'германия', 'франция', 'италия', 'япония', 'ссср'];
const BODY_TYPES = ['хэтчбек', 'купе', 'седан', 'внедорожник'];
// Тег вида «класс B» / «классb» дублирует поле carClass — в списке меток не показывается
const CLASS_TAG_RE = /^класс\s*([a-z])$/i;

/**
 * Метки машины в каноническом порядке:
 *   класс, эпоха, кузов, редкость, страна — без выделения,
 *   далее особые метки — оранжевым, прочие неизвестные теги — серыми.
 * Класс/эпоха/редкость берутся из полей машины, кузов/страна/особые — из тегов,
 * поэтому теги «класс B» и «00» (эпоха 2000-х у машин с epoch = 0) не дублируют поля.
 */
const CarTags: React.FC<{ car: Car }> = ({ car }) => {
  let country: string | null = null;
  let body: string | null = null;
  let classFromTag: string | null = null;
  let epochFromTag: string | null = null;
  const special: string[] = [];
  const other: string[] = [];

  for (const tag of car.tags || []) {
    const lower = tag.toLowerCase();
    const classMatch = CLASS_TAG_RE.exec(lower);
    if (classMatch) {
      if (!classFromTag) classFromTag = classMatch[1].toUpperCase();
    } else if (lower === '00') {
      if (!epochFromTag) epochFromTag = '00';
    } else if (COUNTRIES.includes(lower)) {
      if (!country) country = tag;
    } else if (BODY_TYPES.includes(lower)) {
      if (!body) body = tag;
    } else if (SPECIAL_TAGS.includes(lower)) {
      special.push(tag);
    } else {
      other.push(tag);
    }
  }

  const epochValue = car.epoch && car.epoch > 0 ? String(car.epoch) : epochFromTag;

  return (
    <>
      {(car.carClass || classFromTag) && <div>класс: {car.carClass || classFromTag}</div>}
      {epochValue && <div>эпоха: {epochValue}</div>}
      {body && <div>кузов: {body}</div>}
      {car.rarity != null && <div>редкость: {car.rarity}</div>}
      {country && <div>страна: {country}</div>}
      {special.map((tag, i) => (
        <div key={`special-${i}`} style={{ color: '#ffaa00' }}>{tag}</div>
      ))}
      {other.map((tag, i) => (
        <div key={`other-${i}`}>{tag}</div>
      ))}
    </>
  );
};

export default CarTags;
