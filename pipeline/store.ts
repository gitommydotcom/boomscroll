import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Edition, EditionIndex, EditionIndexEntry } from '../shared/types';
import { CITIES } from './sources';

export const DATA_DIR = join(import.meta.dirname, '..', 'public', 'data');
const EDITIONS = join(DATA_DIR, 'editions');
const INDEX = join(DATA_DIR, 'index.json');

export async function readIndex(): Promise<EditionIndex> {
  try {
    return JSON.parse(await readFile(INDEX, 'utf8')) as EditionIndex;
  } catch {
    return { latest: null, updatedAt: new Date().toISOString(), editions: [], cities: CITIES };
  }
}

export async function readEdition(date: string): Promise<Edition | null> {
  try {
    return JSON.parse(await readFile(join(EDITIONS, `${date}.json`), 'utf8')) as Edition;
  } catch {
    return null;
  }
}

/** Id dei contenuti già pubblicati nelle edizioni recenti (esclusa quella di oggi). */
export async function recentIds(index: EditionIndex, today: string, days = 45): Promise<Set<string>> {
  const ids = new Set<string>();
  const dates = index.editions.map((e) => e.date).filter((d) => d !== today).slice(0, days);
  for (const d of dates) {
    const ed = await readEdition(d);
    for (const i of ed?.items ?? []) ids.add(i.id);
    for (const list of Object.values(ed?.local ?? {})) for (const i of list) ids.add(i.id);
  }
  return ids;
}

export async function writeEdition(edition: Edition, index: EditionIndex): Promise<void> {
  await mkdir(EDITIONS, { recursive: true });
  await writeFile(join(EDITIONS, `${edition.date}.json`), JSON.stringify(edition));

  const counts: EditionIndexEntry['categories'] = {};
  for (const i of edition.items) counts[i.category] = (counts[i.category] ?? 0) + 1;
  const highlights = [...edition.items]
    .filter((i) => i.kind === 'article' || i.kind === 'paper')
    .sort((a, b) => b.quality + (b.interest ?? 3) / 5 - (a.quality + (a.interest ?? 3) / 5))
    .slice(0, 3)
    .map((i) => i.titleIt ?? i.title);
  const entry: EditionIndexEntry = { date: edition.date, count: edition.items.length, highlights, categories: counts };

  const editions = [entry, ...index.editions.filter((e) => e.date !== edition.date)].sort((a, b) => b.date.localeCompare(a.date));
  const next: EditionIndex = {
    latest: editions[0].date,
    updatedAt: new Date().toISOString(),
    editions,
    cities: CITIES,
  };
  await writeFile(INDEX, JSON.stringify(next, null, 1));
}
