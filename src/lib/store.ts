import { createStore, get, set } from 'idb-keyval';
import { useEffect, useState } from 'preact/hooks';
import type { Item } from '../../shared/types';
import { today } from './dates';

export type Reaction = 'like' | 'dislike';
export type ViewMode = 'immersive' | 'list';

export interface City {
  name: string;
  lat: number;
  lon: number;
  /** Id della città se la pipeline raccoglie eventi locali per lei. */
  id?: string;
}

export interface Settings {
  onboarded: boolean;
  view: ViewMode;
  editionSize: number;
  /** 'original' = modalità "Allenami": testo in lingua originale, italiano a richiesta. */
  summaryMode: 'it' | 'original';
  dailyLimitMin: number;
  evening: boolean;
  eveningFrom: string;
  theme: 'auto' | 'light' | 'dark';
  city: City;
}

export interface SavedEntry {
  item: Item;
  savedAt: string;
  /** Prossimo "Ti ricordi?" (null = niente ripasso). */
  review: { next: string; step: number } | null;
}

export interface DayStats {
  seen: number;
  cats: Record<string, number>;
  likes: number;
  dislikes: number;
  saves: number;
  quizOk: number;
  quizTotal: number;
  exercises: number;
  words: number;
  seconds: number;
}

export interface Flashcard {
  id: string;
  word: string;
  lang: string;
  definitionIt: string;
  example?: string;
  exampleIt?: string;
  box: number;
  due: string;
  added: string;
}

export interface Habit {
  id: string;
  name: string;
  emoji: string;
  days: string[];
  created: string;
}

export interface JournalEntry {
  date: string;
  kind: 'diario' | 'gratitudine' | 'pensiero';
  prompt: string;
  text: string;
}

export interface FeedOrder {
  ids: string[];
  explore: string[];
}

export interface State {
  settings: Settings;
  /** Pesi dei gusti: c:categoria, s:fonte, t:tag. */
  weights: Record<string, number>;
  weightsDay: string;
  reactions: Record<string, Reaction>;
  saved: Record<string, SavedEntry>;
  /** id → data in cui è stato visto (per non riproporlo). */
  seen: Record<string, string>;
  stats: Record<string, DayStats>;
  orders: Record<string, FeedOrder>;
  /** Edizioni completate: data → true. */
  finished: Record<string, boolean>;
  quizDone: Record<string, boolean>;
  cards: Record<string, Flashcard>;
  habits: Habit[];
  journal: JournalEntry[];
  /** Esercizi del feed completati o saltati, per data. */
  exercisesDone: Record<string, string[]>;
  recapSeen: string;
}

export const DEFAULT_CITY: City = { name: "L'Aquila", lat: 42.3498, lon: 13.3995, id: 'laquila' };

export const DEFAULT_STATE: State = {
  settings: {
    onboarded: false,
    view: 'immersive',
    editionSize: 30,
    summaryMode: 'it',
    dailyLimitMin: 0,
    evening: true,
    eveningFrom: '21:30',
    theme: 'auto',
    city: DEFAULT_CITY,
  },
  weights: {},
  weightsDay: '',
  reactions: {},
  saved: {},
  seen: {},
  stats: {},
  orders: {},
  finished: {},
  quizDone: {},
  cards: {},
  habits: [],
  journal: [],
  exercisesDone: {},
  recapSeen: '',
};

const idb = createStore('boomscroll', 'kv');
let state: State = DEFAULT_STATE;
let loaded = false;
const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | undefined;

export const getState = () => state;
export const isLoaded = () => loaded;

function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    set('state', state, idb).catch(() => {
      // IndexedDB non disponibile (navigazione privata): l'app funziona lo stesso, senza memoria.
    });
  }, 250);
}

export function setState(update: (s: State) => Partial<State>) {
  state = { ...state, ...update(state) };
  persist();
  listeners.forEach((l) => l());
}

export function updateSettings(patch: Partial<Settings>) {
  setState((s) => ({ settings: { ...s.settings, ...patch } }));
}

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Ridisegna il componente a ogni cambiamento dello stato. */
export function useAppState(): State {
  const [, setTick] = useState(0);
  const force = () => setTick((x) => x + 1);
  useEffect(() => {
    const off = subscribe(force);
    return () => {
      off();
    };
  }, []);
  return state;
}

/** Pulisce i dati vecchi che non servono più. */
function prune(s: State): State {
  const cutoff = new Date(Date.now() - 60 * 86_400_000).toISOString().slice(0, 10);
  const seen = Object.fromEntries(Object.entries(s.seen).filter(([, d]) => d >= cutoff));
  const orders = Object.fromEntries(
    Object.entries(s.orders)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 10),
  );
  return { ...s, seen, orders };
}

export async function loadState(): Promise<void> {
  try {
    const saved = await get<State>('state', idb);
    if (saved) {
      state = prune({
        ...DEFAULT_STATE,
        ...saved,
        settings: { ...DEFAULT_STATE.settings, ...saved.settings },
      });
    }
  } catch {
    // primo avvio o archiviazione non disponibile
  }
  loaded = true;
  listeners.forEach((l) => l());
}

export function flush() {
  clearTimeout(saveTimer);
  return set('state', state, idb).catch(() => undefined);
}

export function replaceState(next: State) {
  state = prune({ ...DEFAULT_STATE, ...next, settings: { ...DEFAULT_STATE.settings, ...next.settings } });
  persist();
  listeners.forEach((l) => l());
}

export const emptyDay = (): DayStats => ({
  seen: 0,
  cats: {},
  likes: 0,
  dislikes: 0,
  saves: 0,
  quizOk: 0,
  quizTotal: 0,
  exercises: 0,
  words: 0,
  seconds: 0,
});

export function bumpStats(patch: (d: DayStats) => Partial<DayStats>, date = today()) {
  setState((s) => {
    const day = s.stats[date] ?? emptyDay();
    return { stats: { ...s.stats, [date]: { ...day, ...patch(day) } } };
  });
}
