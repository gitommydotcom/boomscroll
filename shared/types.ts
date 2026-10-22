// Tipi condivisi tra la pipeline (Node) e l'app (browser).

export type CategoryId =
  | 'notizie'
  | 'scienza'
  | 'tech'
  | 'arte'
  | 'design'
  | 'lingue'
  | 'poesia'
  | 'antropologia'
  | 'psicologia'
  | 'produttivita'
  | 'abitudini'
  | 'universita'
  | 'curiosita'
  | 'divertimento'
  | 'storia'
  | 'natura'
  | 'cultura'
  | 'filosofia'
  | 'vicino';

export type ItemKind =
  | 'article'
  | 'paper'
  | 'artwork'
  | 'image'
  | 'poem'
  | 'video'
  | 'word'
  | 'comic'
  | 'chess'
  | 'event';

export interface Quiz {
  q: string;
  options: string[];
  answer: number;
}

export interface WordData {
  word: string;
  lang: string;
  definitionIt: string;
  example?: string;
  exampleIt?: string;
}

export interface ChessData {
  /** Posizione di partenza del puzzle (FEN). */
  fen: string;
  /** Mosse della soluzione in UCI, alternate: tu, avversario, tu… */
  solution: string[];
  rating: number;
  themes: string[];
}

export interface ArtData {
  artist?: string;
  date?: string;
  medium?: string;
  museum: string;
}

export interface Item {
  id: string;
  kind: ItemKind;
  category: CategoryId;
  sourceId: string;
  sourceName: string;
  url: string;
  /** Titolo originale. */
  title: string;
  /** Traduzione italiana del titolo (solo se la lingua non è l'italiano). */
  titleIt?: string;
  /** Riassunto in italiano. */
  summary: string;
  /** Breve estratto nella lingua originale. */
  excerpt?: string;
  /** Traduzione italiana dell'estratto (lingue "difficili"). */
  excerptIt?: string;
  lang: string;
  author?: string;
  image?: string;
  imageAlt?: string;
  /** Presente quando l'immagine non viene dalla fonte (es. illustrativa da Wikipedia). */
  imageNote?: string;
  publishedAt: string;
  readingMinutes?: number;
  tags: string[];
  /** Affidabilità/qualità della fonte, 0..1. */
  quality: number;
  /** Interesse stimato dall'IA, 1..5 (assente se l'IA non era disponibile). */
  interest?: number;
  /** true se il riassunto è stato scritto dall'IA. */
  ai: boolean;
  quiz?: Quiz;
  word?: WordData;
  chess?: ChessData;
  art?: ArtData;
  youtubeId?: string;
  /** Numeri reali dalla fonte (punti su Hacker News, visualizzazioni su YouTube…). */
  stats?: ItemStats;
}

export interface ItemStats {
  points?: number;
  comments?: number;
  views?: number;
}

export interface SourceReport {
  id: string;
  name: string;
  ok: boolean;
  count: number;
  error?: string;
}

export type Slot = 'mattina' | 'pomeriggio' | 'sera';
export const SLOTS: Slot[] = ['mattina', 'pomeriggio', 'sera'];
export const SLOT_LABEL: Record<Slot, string> = { mattina: 'del mattino', pomeriggio: 'del pomeriggio', sera: 'della sera' };

/** Le edizioni vecchie (una al giorno) non hanno id: valgono come edizione del mattino. */
export const editionId = (e: { id?: string; date: string }) => e.id ?? e.date;
export const editionSlot = (e: { slot?: Slot }): Slot => e.slot ?? 'mattina';

export interface Edition {
  /** Data e fascia, es. "2026-10-22-sera". */
  id?: string;
  slot?: Slot;
  date: string;
  generatedAt: string;
  items: Item[];
  /** Eventi e proposte locali, per città (chiave = id città). */
  local: Record<string, Item[]>;
  sources: SourceReport[];
  ai: { model: string | null; calls: number; failures: number };
}

export interface EditionIndexEntry {
  id?: string;
  slot?: Slot;
  generatedAt?: string;
  date: string;
  count: number;
  highlights: string[];
  categories: Partial<Record<CategoryId, number>>;
}

export interface EditionIndex {
  /** Id dell'edizione più recente. */
  latest: string | null;
  updatedAt: string;
  editions: EditionIndexEntry[];
  /** Città per cui la pipeline raccoglie eventi locali. */
  cities: { id: string; name: string; lat: number; lon: number }[];
}

/** Lingue per cui mostriamo la traduzione italiana dell'estratto. */
export const EASY_LANGS = ['it', 'en', 'fr', 'es'];
export const isHardLang = (lang: string) => !EASY_LANGS.includes(lang.slice(0, 2).toLowerCase());
