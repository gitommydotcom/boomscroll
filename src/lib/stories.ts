import { CATEGORIES, categoryMeta } from '../../shared/categories';
import type { Item } from '../../shared/types';
import { keyC, scoreItem } from './ranking';
import type { State } from './store';
import type { StoryGroup } from './ui';

const VISUAL = (i: Item) => (!!i.image && i.kind !== 'chess') || i.kind === 'word' || i.kind === 'poem';

/**
 * Le storie dell'edizione: prima gli account che segui, poi "In breve" (le notizie)
 * e una storia per categoria, ordinate secondo i tuoi gusti. Ogni storia ha al massimo 6 schermate.
 */
export function buildStories(items: Item[], s: Pick<State, 'weights' | 'follows'>): StoryGroup[] {
  const w = s.weights;
  const ranked = [...items].filter(VISUAL).sort((a, b) => scoreItem(b, w).total - scoreItem(a, w).total);
  const groups: StoryGroup[] = [];

  const followed = Object.keys(s.follows).filter((k) => k.startsWith('s:'));
  for (const k of followed) {
    const id = k.slice(2);
    const list = items.filter((i) => i.sourceId === id && i.kind !== 'chess').slice(0, 6);
    if (list.length) groups.push({ key: k, label: list[0].sourceName, icon: '', items: list });
  }

  const news = ranked.filter((i) => i.category === 'notizie' && i.image).slice(0, 6);
  if (news.length >= 2) groups.push({ key: 'c:notizie', label: 'In breve', icon: 'news', items: news });

  const cats = CATEGORIES.filter((c) => c.id !== 'notizie' && c.id !== 'vicino')
    .map((c) => ({ c, list: ranked.filter((i) => i.category === c.id).slice(0, 6) }))
    .filter((x) => x.list.length >= 2)
    .sort((a, b) => (w[keyC(b.c.id)] ?? 0) - (w[keyC(a.c.id)] ?? 0));
  for (const { c, list } of cats) groups.push({ key: `c:${c.id}`, label: categoryMeta(c.id).label, icon: c.icon, items: list });
  return groups;
}
