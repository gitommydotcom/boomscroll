import type { CategoryId } from './types';

export interface CategoryMeta {
  id: CategoryId;
  label: string;
  /** Nome dell'icona (vedi src/ui/icons.tsx). */
  icon: string;
}

export const CATEGORIES: CategoryMeta[] = [
  { id: 'notizie', label: 'Notizie', icon: 'news' },
  { id: 'scienza', label: 'Scienza', icon: 'atom' },
  { id: 'tech', label: 'Tech', icon: 'chip' },
  { id: 'arte', label: 'Arte', icon: 'palette' },
  { id: 'design', label: 'Design', icon: 'ruler' },
  { id: 'storia', label: 'Storia', icon: 'columns' },
  { id: 'natura', label: 'Natura', icon: 'tree' },
  { id: 'cultura', label: 'Libri, film e musica', icon: 'book' },
  { id: 'filosofia', label: 'Filosofia', icon: 'quote' },
  { id: 'lingue', label: 'Lingue', icon: 'translate' },
  { id: 'poesia', label: 'Poesia', icon: 'feather' },
  { id: 'antropologia', label: 'Antropologia', icon: 'globe' },
  { id: 'psicologia', label: 'Psicologia', icon: 'brain' },
  { id: 'produttivita', label: 'Produttività', icon: 'timer' },
  { id: 'abitudini', label: 'Abitudini', icon: 'sprout' },
  { id: 'universita', label: 'Università', icon: 'cap' },
  { id: 'curiosita', label: 'Curiosità', icon: 'compass' },
  { id: 'divertimento', label: 'Divertimento', icon: 'dice' },
  { id: 'vicino', label: 'Vicino a te', icon: 'pin' },
];

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

const byId = new Map(CATEGORIES.map((c) => [c.id, c]));
export const categoryMeta = (id: CategoryId): CategoryMeta => byId.get(id) ?? CATEGORIES[0];
export const isCategory = (s: string): s is CategoryId => byId.has(s as CategoryId);
