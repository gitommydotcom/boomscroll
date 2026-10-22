import type { CategoryId } from './types';

export interface CategoryMeta {
  id: CategoryId;
  label: string;
  emoji: string;
  /** Colore di fondo delle card: scuro abbastanza da reggere testo bianco. */
  color: string;
}

export const CATEGORIES: CategoryMeta[] = [
  { id: 'notizie', label: 'Notizie', emoji: '🗞️', color: '#2F4858' },
  { id: 'scienza', label: 'Scienza', emoji: '🔭', color: '#2E5E4E' },
  { id: 'tech', label: 'Tech', emoji: '💡', color: '#3D3B8E' },
  { id: 'arte', label: 'Arte', emoji: '🎨', color: '#8E3628' },
  { id: 'design', label: 'Design', emoji: '📐', color: '#8F4A1F' },
  { id: 'lingue', label: 'Lingue', emoji: '🗣️', color: '#5B4B8A' },
  { id: 'poesia', label: 'Poesia', emoji: '🪶', color: '#7A3B5C' },
  { id: 'antropologia', label: 'Antropologia', emoji: '🏺', color: '#5E4F31' },
  { id: 'psicologia', label: 'Psicologia', emoji: '🧠', color: '#33606F' },
  { id: 'produttivita', label: 'Produttività', emoji: '⏳', color: '#46642B' },
  { id: 'abitudini', label: 'Abitudini', emoji: '🌱', color: '#2C6457' },
  { id: 'universita', label: 'Università', emoji: '🎓', color: '#5A2E3B' },
  { id: 'curiosita', label: 'Curiosità', emoji: '🧭', color: '#765A18' },
  { id: 'divertimento', label: 'Divertimento', emoji: '🎲', color: '#A93F31' },
  { id: 'vicino', label: 'Vicino a te', emoji: '📍', color: '#2E5A7A' },
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

const byId = new Map(CATEGORIES.map((c) => [c.id, c]));
export const categoryMeta = (id: CategoryId): CategoryMeta => byId.get(id) ?? CATEGORIES[0];
export const isCategory = (s: string): s is CategoryId => byId.has(s as CategoryId);
