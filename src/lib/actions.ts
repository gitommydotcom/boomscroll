import type { Item } from '../../shared/types';
import { addDays, daysBetween, today } from './dates';
import { applySignal, decay, type Signal } from './ranking';
import { bumpStats, getState, setState, type Flashcard, type Reaction } from './store';

let toastFn: (msg: string) => void = () => {};
export const onToast = (fn: (msg: string) => void) => (toastFn = fn);
export const toast = (msg: string) => toastFn(msg);

/** Attenua i pesi una volta al giorno. */
export function dailyDecay() {
  const s = getState();
  const t = today();
  if (s.weightsDay === t) return;
  const days = s.weightsDay ? daysBetween(s.weightsDay, t) : 0;
  setState(() => ({ weights: decay(s.weights, days), weightsDay: t }));
}

function signal(item: Item, sig: Signal, sign = 1) {
  setState((s) => ({ weights: applySignal(s.weights, item, sig, sign) }));
}

export function react(item: Item, r: Reaction) {
  const prev = getState().reactions[item.id];
  if (prev) signal(item, prev, -1);
  const next = prev === r ? undefined : r;
  if (next) signal(item, next);
  setState((s) => {
    const reactions = { ...s.reactions };
    if (next) reactions[item.id] = next;
    else delete reactions[item.id];
    return { reactions };
  });
  if (next === 'like') {
    bumpStats((d) => ({ likes: d.likes + 1 }));
    haptic();
  }
  if (next === 'dislike') {
    bumpStats((d) => ({ dislikes: d.dislikes + 1 }));
    toast('Capito: ne vedrai meno di simili');
  }
}

export function toggleSave(item: Item) {
  const was = !!getState().saved[item.id];
  signal(item, 'save', was ? -1 : 1);
  setState((s) => {
    const saved = { ...s.saved };
    if (was) delete saved[item.id];
    else saved[item.id] = { item, savedAt: new Date().toISOString(), review: { next: addDays(today(), 7), step: 0 } };
    return { saved };
  });
  if (!was) {
    bumpStats((d) => ({ saves: d.saves + 1 }));
    toast('Salvato · te lo riproporrò tra una settimana');
  }
}

export function lessOf(item: Item, what: 'source' | 'topic') {
  signal(item, what === 'source' ? 'less-source' : 'less-topic');
  toast(what === 'source' ? `Meno contenuti da ${item.sourceName}` : 'Meno contenuti di questo tipo');
}

export function adjustWeight(key: string, delta: number) {
  setState((s) => {
    const v = Math.max(-5, Math.min(5, (s.weights[key] ?? 0) + delta));
    const weights = { ...s.weights };
    if (Math.abs(v) < 0.01) delete weights[key];
    else weights[key] = Math.round(v * 100) / 100;
    return { weights };
  });
}

export function markSeen(item: Item) {
  const s = getState();
  if (s.seen[item.id]) return;
  const t = today();
  setState((st) => ({ seen: { ...st.seen, [item.id]: t } }));
  bumpStats((d) => ({ seen: d.seen + 1, cats: { ...d.cats, [item.category]: (d.cats[item.category] ?? 0) + 1 } }));
}

const REVIEW_STEPS = [7, 21, 60, 180];

export function reviewAnswer(id: string, answer: 'remember' | 'again' | 'stop') {
  setState((s) => {
    const entry = s.saved[id];
    if (!entry) return {};
    let review = entry.review;
    if (answer === 'stop' || !review) review = null;
    else if (answer === 'remember') {
      const step = review.step + 1;
      review = step >= REVIEW_STEPS.length ? null : { step, next: addDays(today(), REVIEW_STEPS[step]) };
    } else review = { step: review.step, next: addDays(today(), 3) };
    return { saved: { ...s.saved, [id]: { ...entry, review } } };
  });
}

export function addFlashcard(item: Item) {
  if (!item.word) return;
  const id = `${item.word.lang}:${item.word.word.toLowerCase()}`;
  if (getState().cards[id]) {
    toast('È già tra le tue flashcard');
    return;
  }
  const card: Flashcard = {
    id,
    word: item.word.word,
    lang: item.word.lang,
    definitionIt: item.word.definitionIt,
    example: item.word.example,
    exampleIt: item.word.exampleIt,
    box: 0,
    due: today(),
    added: today(),
  };
  setState((s) => ({ cards: { ...s.cards, [id]: card } }));
  bumpStats((d) => ({ words: d.words + 1 }));
  toast('Aggiunta alle flashcard');
}

export function exerciseDone(key: string) {
  const t = today();
  setState((s) => ({ exercisesDone: { ...s.exercisesDone, [t]: [...(s.exercisesDone[t] ?? []), key] } }));
  bumpStats((d) => ({ exercises: d.exercises + 1 }));
}

export async function share(item: Item) {
  const data = { title: item.titleIt ?? item.title, text: item.summary, url: item.url };
  try {
    if (navigator.share) await navigator.share(data);
    else {
      await navigator.clipboard.writeText(item.url);
      toast('Link copiato');
    }
  } catch {
    // condivisione annullata
  }
}

/* ── Social: seguire account e argomenti, note ──────────────────────────── */

/** key: "s:<fonte>" per un account, "t:<argomento>" per un hashtag. */
export const isFollowing = (key: string) => !!getState().follows[key];

export function toggleFollow(key: string, label: string) {
  const was = isFollowing(key);
  setState((s) => {
    const follows = { ...s.follows };
    if (was) delete follows[key];
    else follows[key] = today();
    return { follows };
  });
  // Seguire è anche un segnale forte per i gusti.
  adjustWeight(key, was ? -1.5 : 1.5);
  toast(was ? `Non segui più ${label}` : `Segui ${label}: lo trovi anche in Seguiti`);
}

export function addNote(item: Item, text: string) {
  const t = text.trim();
  if (!t) return;
  setState((s) => ({ notes: { ...s.notes, [item.id]: [...(s.notes[item.id] ?? []), { text: t, at: new Date().toISOString() }] } }));
  // Una nota vale come un salvataggio: la ritrovi nel profilo.
  if (!getState().saved[item.id]) {
    signal(item, 'save');
    setState((s) => ({ saved: { ...s.saved, [item.id]: { item, savedAt: new Date().toISOString(), review: { next: addDays(today(), 7), step: 0 } } } }));
  }
}

export function removeNote(itemId: string, at: string) {
  setState((s) => {
    const list = (s.notes[itemId] ?? []).filter((n) => n.at !== at);
    const notes = { ...s.notes };
    if (list.length) notes[itemId] = list;
    else delete notes[itemId];
    return { notes };
  });
}

/** Piccola vibrazione di conferma, dove il telefono la supporta. */
export const haptic = () => navigator.vibrate?.(8);
