import { useState } from 'preact/hooks';
import { CATEGORIES } from '../../shared/categories';
import type { CategoryId } from '../../shared/types';
import { keyC } from '../lib/ranking';
import { setState, type ViewMode } from '../lib/store';

const PRINCIPLES = [
  ['🌅', 'Un’edizione al giorno, preparata ogni mattina da fonti affidabili.'],
  ['🔚', 'Il feed finisce. Dopo ci sono solo approfondimenti, con pause sincere.'],
  ['🤍', 'Impara solo da ciò che dici tu: mi piace, non mi piace, salva. Mai dal tempo che passi qui.'],
  ['🔒', 'Niente account, niente tracciamento: i tuoi gusti restano su questo telefono.'],
];

export function Onboarding() {
  const [picked, setPicked] = useState<Set<CategoryId>>(new Set());
  const [view, setView] = useState<ViewMode>('immersive');
  const toggle = (c: CategoryId) => {
    const next = new Set(picked);
    if (next.has(c)) next.delete(c);
    else next.add(c);
    setPicked(next);
  };
  const start = () => {
    const weights: Record<string, number> = {};
    for (const c of picked) weights[keyC(c)] = 1.5;
    setState((s) => ({ weights: { ...s.weights, ...weights }, settings: { ...s.settings, view, onboarded: true } }));
    location.hash = '#/oggi';
  };

  return (
    <div class="screen" style={{ paddingBottom: 0 }}>
      <div class="onboarding">
        <div class="wordmark" style={{ fontSize: '1rem' }}>
          Boomscroll<i>.</i>
        </div>
        <h1>Un feed che finisce.</h1>
        <p class="muted" style={{ margin: 0, fontSize: '1.1rem' }}>
          Al posto dei social: notizie, scienza, arte, lezioni, parole, poesie ed esercizi. Il meglio di ogni giorno, e poi basta.
        </p>
        <ul class="principles">
          {PRINCIPLES.map(([e, t]) => (
            <li key={t}>
              <span aria-hidden="true">{e}</span>
              {t}
            </li>
          ))}
        </ul>

        <h2 class="section-title" style={{ marginBottom: 0 }}>Cosa ti interessa di più?</h2>
        <p class="muted small" style={{ margin: 0 }}>
          Facoltativo: vedrai comunque un po’ di tutto, e l’app imparerà dalle tue reazioni.
        </p>
        <div class="chips">
          {CATEGORIES.filter((c) => c.id !== 'vicino').map((c) => (
            <button key={c.id} class="chip" aria-pressed={picked.has(c.id)} onClick={() => toggle(c.id)}>
              {c.emoji} {c.label}
            </button>
          ))}
        </div>

        <h2 class="section-title" style={{ marginBottom: 0 }}>Come preferisci scorrere?</h2>
        <div class="tabs" role="tablist">
          <button role="tab" aria-selected={view === 'immersive'} onClick={() => setView('immersive')}>
            Schermo intero
          </button>
          <button role="tab" aria-selected={view === 'list'} onClick={() => setView('list')}>
            Lista
          </button>
        </div>
        <p class="muted small" style={{ margin: '-8px 0 0' }}>Puoi cambiarlo quando vuoi dalla barra in alto.</p>

        <button class="btn accent block" onClick={start} style={{ marginTop: '8px' }}>
          Inizia
        </button>
      </div>
    </div>
  );
}
