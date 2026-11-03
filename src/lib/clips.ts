/**
 * Clip brevi: quali mostrare, in che ordine, e il limite di oggi (giri e pause attive).
 * Tutto calcolato sul telefono, come il resto del feed.
 */
import type { Item } from '../../shared/types';
import { seeded, today } from './dates';
import { isMuted, scoreItem } from './ranking';
import { getState, setState, type ClipDay, type State } from './store';

export const isClip = (i: Item) => !!i.short && !!i.youtubeId;

/** Il conteggio di oggi (si azzera a mezzanotte). */
export function clipDay(s: Pick<State, 'clips'> = getState()): ClipDay {
  return s.clips.date === today() ? s.clips : { date: today(), inRound: 0, rounds: 0 };
}

/** Limite raggiunto: ultimo giro concluso. */
export function clipsDone(s: Pick<State, 'clips' | 'settings'> = getState()): boolean {
  const d = clipDay(s);
  return d.rounds >= s.settings.clipRounds - 1 && d.inRound >= s.settings.clipRound;
}

/**
 * Le clip da guardare: solo quelle mai viste (più quella scelta, se c'è), ordinate per gusti
 * con un po' di varietà stabile per la giornata, senza due clip di fila dello stesso canale.
 */
export function orderClips(items: Item[], start?: string): Item[] {
  const st = getState();
  const rnd = seeded(`clips-${today()}`);
  const ranked = items
    .filter((i) => isClip(i) && !isMuted(i, st.weights) && (!st.seen[i.id] || i.id === start))
    .map((i) => ({ i, k: scoreItem(i, st.weights).total + rnd() * 0.6 }))
    .sort((a, b) => b.k - a.k)
    .map((x) => x.i);
  const out: Item[] = [];
  const first = ranked.findIndex((i) => i.id === start);
  if (first >= 0) out.push(...ranked.splice(first, 1));
  while (ranked.length) {
    let k = ranked.findIndex((i) => i.sourceId !== out.at(-1)?.sourceId);
    if (k < 0) k = 0;
    out.push(...ranked.splice(k, 1));
  }
  return out;
}

/** Una clip in più nel giro di oggi. */
export function countClip(perRound: number) {
  setState((s) => {
    const d = clipDay(s);
    return { clips: { ...d, inRound: Math.min(perRound, d.inRound + 1) } };
  });
}

/** Pausa attiva completata: si apre il giro successivo. */
export function nextRound() {
  setState((s) => {
    const d = clipDay(s);
    return { clips: { date: d.date, inRound: 0, rounds: d.rounds + 1 } };
  });
}
