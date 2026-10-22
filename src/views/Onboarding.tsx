import { useMemo, useState } from 'preact/hooks';
import { allAccounts } from '../lib/accounts';
import { today } from '../lib/dates';
import { Avatar } from '../ui/Avatar';
import { Icon, IconVerified } from '../ui/icons';
import { CATEGORIES } from '../../shared/categories';
import type { CategoryId } from '../../shared/types';
import { keyC } from '../lib/ranking';
import { setState, type ViewMode } from '../lib/store';

const PRINCIPLES = [
  ['sun', 'Tre edizioni al giorno (mattina, pomeriggio e sera) da quasi duecento fonti affidabili.'],
  ['star', 'Sembra un social: storie, account da seguire, note, notifiche. Ma ogni account è una fonte di qualità.'],
  ['moon', 'Il feed finisce. Dopo ci sono solo approfondimenti, con pause sincere.'],
  ['heart', 'Impara solo da ciò che dici tu: mi piace, non mi piace, salva, segui. Mai dal tempo che passi qui.'],
  ['house', 'Niente registrazione, niente tracciamento: i tuoi gusti restano su questo telefono.'],
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
  const [follows, setFollows] = useState<Set<string>>(new Set());
  const toggleF = (id: string) => {
    const next = new Set(follows);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setFollows(next);
  };
  // Le fonti migliori delle categorie scelte (o di tutte), una o due per categoria.
  const suggested = useMemo(() => {
    const pool = allAccounts()
      .filter((a) => a.category !== 'vicino' && (!picked.size || picked.has(a.category)))
      .sort((a, b) => b.quality - a.quality);
    const per = new Map<string, number>();
    return pool.filter((a) => {
      const n = per.get(a.category) ?? 0;
      per.set(a.category, n + 1);
      return n < (picked.size ? 3 : 1);
    }).slice(0, 10);
  }, [picked]);
  const start = () => {
    const weights: Record<string, number> = {};
    for (const c of picked) weights[keyC(c)] = 1.5;
    const f: Record<string, string> = {};
    for (const id of follows) {
      f[`s:${id}`] = today();
      weights[`s:${id}`] = 1.5;
    }
    setState((s) => ({ weights: { ...s.weights, ...weights }, follows: { ...s.follows, ...f }, since: today(), settings: { ...s.settings, view, onboarded: true } }));
    location.hash = '#/oggi';
  };

  return (
    <div class="screen" style={{ height: '100%', paddingBottom: 0 }}>
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
              <Icon name={e} size={20} />
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
              <Icon name={c.icon} size={16} /> {c.label}
            </button>
          ))}
        </div>

        <h2 class="section-title" style={{ marginBottom: 0 }}>Account consigliati</h2>
        <p class="muted small" style={{ margin: 0 }}>
          Seguili per vedere i loro contenuti in Seguiti e nelle storie.
        </p>
        <div>
          {suggested.map((a) => (
            <div class="acc-row" key={a.id}>
              <Avatar id={a.id} size={44} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <b>
                  {a.name} {a.verified && <IconVerified />}
                </b>
                <span class="muted small">{a.about}</span>
              </span>
              <button class={`btn small${follows.has(a.id) ? ' ghost' : ''}`} onClick={() => toggleF(a.id)} aria-pressed={follows.has(a.id)}>
                {follows.has(a.id) ? 'Segui già' : 'Segui'}
              </button>
            </div>
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
