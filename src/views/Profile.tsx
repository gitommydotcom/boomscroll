import { useEffect, useState } from 'preact/hooks';
import { CATEGORIES } from '../../shared/categories';
import type { Edition } from '../../shared/types';
import { WeekSummary, sumDays } from '../cards/Specials';
import { adjustWeight, toast } from '../lib/actions';
import { fetchEdition, fetchIndex } from '../lib/data';
import { longDate, today } from '../lib/dates';
import { MAX_W, keyC } from '../lib/ranking';
import { DEFAULT_STATE, getState, replaceState, setState, updateSettings, useAppState, type State } from '../lib/store';
import { IconMinus, IconPlus } from '../ui/icons';

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button class="switch" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} />;
}

function Tastes() {
  const s = useAppState();
  const w = s.weights;
  const others = Object.entries(w)
    .filter(([k]) => !k.startsWith('c:'))
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  const liked = others.filter(([, v]) => v > 0.4).slice(0, 10);
  const muted = others.filter(([, v]) => v <= -1).slice(0, 10);
  const nameOf = (k: string) => (k.startsWith('t:') ? `#${k.slice(2)}` : k.slice(2));

  return (
    <>
      <h2 class="section-title">I tuoi gusti</h2>
      <p class="muted small" style={{ marginTop: 0 }}>
        Imparati solo dalle tue reazioni. Puoi correggerli: + per vedere di più, − per vedere di meno.
      </p>
      {CATEGORIES.filter((c) => c.id !== 'vicino').map((c) => {
        const v = w[keyC(c.id)] ?? 0;
        const pct = ((v + MAX_W) / (2 * MAX_W)) * 100;
        return (
          <div class="taste-row" key={c.id}>
            <span>
              {c.emoji} {c.label}
            </span>
            <span class="bar" aria-label={`Interesse per ${c.label}`}>
              <i style={{ width: `${pct}%`, background: v < -0.5 ? 'var(--bad)' : v > 0.5 ? 'var(--good)' : undefined }} />
            </span>
            <span class="step-btns">
              <button onClick={() => adjustWeight(keyC(c.id), -1)} aria-label={`Meno ${c.label}`}>
                <IconMinus size={16} />
              </button>
              <button onClick={() => adjustWeight(keyC(c.id), 1)} aria-label={`Più ${c.label}`}>
                <IconPlus size={16} />
              </button>
            </span>
          </div>
        );
      })}
      {liked.length > 0 && (
        <>
          <h3 style={{ fontSize: '1rem', margin: '16px 0 6px', fontFamily: 'var(--font-ui)' }}>Ti piacciono</h3>
          <div class="chips">
            {liked.map(([k]) => (
              <span class="chip" key={k}>
                {nameOf(k)}
              </span>
            ))}
          </div>
        </>
      )}
      {muted.length > 0 && (
        <>
          <h3 style={{ fontSize: '1rem', margin: '16px 0 6px', fontFamily: 'var(--font-ui)' }}>Ne vedi meno (tocca per ripristinare)</h3>
          <div class="chips">
            {muted.map(([k, v]) => (
              <button class="chip" key={k} onClick={() => adjustWeight(k, -v)}>
                {nameOf(k)} ✕
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}

function Sources() {
  const [ed, setEd] = useState<Edition | null>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    fetchIndex().then((idx) => {
      if (idx?.latest) fetchEdition(idx.latest).then(setEd);
    });
  }, []);
  if (!ed) return null;
  const ok = ed.sources.filter((x) => x.ok);
  const ko = ed.sources.filter((x) => !x.ok);
  return (
    <>
      <h2 class="section-title">Fonti dell’ultima edizione</h2>
      <p class="muted small" style={{ marginTop: 0 }}>
        {longDate(ed.date)} · {ok.length} fonti raggiunte su {ed.sources.length} · riassunti: {ed.ai.model ?? 'non disponibili (estratti delle fonti)'}
      </p>
      <button class="btn ghost small" onClick={() => setOpen(!open)}>
        {open ? 'Nascondi' : 'Mostra'} l’elenco
      </button>
      {open && (
        <div class="small" style={{ marginTop: '8px' }}>
          {[...ok, ...ko].map((x) => (
            <div class="setting" key={x.id} style={{ padding: '6px 0' }}>
              <span>{x.name}</span>
              <span class="muted">{x.ok ? `✓ ${x.count}` : `✕ ${x.error ?? ''}`}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function exportData() {
  const blob = new Blob([JSON.stringify({ app: 'boomscroll', version: 1, exportedAt: new Date().toISOString(), state: getState() }, null, 1)], {
    type: 'application/json',
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `boomscroll-${today()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function importData(file: File) {
  file
    .text()
    .then((t) => {
      const data = JSON.parse(t);
      if (data?.app !== 'boomscroll' || !data.state) throw new Error();
      replaceState(data.state as State);
      toast('Dati importati');
    })
    .catch(() => toast('File non valido'));
}

export function Profile() {
  const s = useAppState();
  const st = s.settings;
  const todayStats = sumDays(s.stats, today(), 1);
  const week = sumDays(s.stats, today(), 7);

  return (
    <div class="screen">
      <div class="page">
        <h1 class="page-title">Tu</h1>
        <p class="page-sub">
          Oggi: {todayStats.seen} contenuti, {Math.round(todayStats.seconds / 60)} minuti{st.dailyLimitMin ? ` su ${st.dailyLimitMin}` : ''}.
        </p>

        <h2 class="section-title">Ultimi 7 giorni</h2>
        <WeekSummary stats={week} />

        <Tastes />

        <h2 class="section-title">Lettura</h2>
        <div class="setting">
          <span>Vista del feed</span>
          <select value={st.view} onChange={(e) => updateSettings({ view: e.currentTarget.value as State['settings']['view'] })}>
            <option value="immersive">Schermo intero</option>
            <option value="list">Lista</option>
          </select>
        </div>
        <div class="setting">
          <span>
            Contenuti per edizione
            <br />
            <span class="muted small">Vale dalla prossima edizione</span>
          </span>
          <select value={st.editionSize} onChange={(e) => updateSettings({ editionSize: Number(e.currentTarget.value) })}>
            {[15, 20, 30, 40].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div class="setting">
          <span>
            Modalità “Allenami”
            <br />
            <span class="muted small">Inglese, francese e spagnolo in lingua originale, l’italiano a richiesta</span>
          </span>
          <Switch on={st.summaryMode === 'original'} onChange={(v) => updateSettings({ summaryMode: v ? 'original' : 'it' })} label="Modalità Allenami" />
        </div>

        <h2 class="section-title">Benessere</h2>
        <div class="setting">
          <span>
            Limite giornaliero
            <br />
            <span class="muted small">Un promemoria gentile, non un blocco</span>
          </span>
          <select value={st.dailyLimitMin} onChange={(e) => updateSettings({ dailyLimitMin: Number(e.currentTarget.value) })}>
            <option value={0}>Nessuno</option>
            {[10, 15, 20, 30, 45, 60].map((n) => (
              <option key={n} value={n}>
                {n} min
              </option>
            ))}
          </select>
        </div>
        <div class="setting">
          <span>
            Modalità sera
            <br />
            <span class="muted small">Toni caldi e immagini meno sature</span>
          </span>
          <Switch on={st.evening} onChange={(v) => updateSettings({ evening: v })} label="Modalità sera" />
        </div>
        {st.evening && (
          <div class="setting">
            <span>Dalle ore</span>
            <input type="time" value={st.eveningFrom} onInput={(e) => updateSettings({ eveningFrom: e.currentTarget.value || '21:30' })} style={{ width: 'auto' }} />
          </div>
        )}
        <div class="setting">
          <span>Tema</span>
          <select value={st.theme} onChange={(e) => updateSettings({ theme: e.currentTarget.value as State['settings']['theme'] })}>
            <option value="auto">Come il telefono</option>
            <option value="light">Chiaro</option>
            <option value="dark">Scuro</option>
          </select>
        </div>

        <Sources />

        <h2 class="section-title">I tuoi dati</h2>
        <p class="muted small" style={{ marginTop: 0 }}>
          Tutto resta su questo dispositivo. Esporta un file per fare un backup o passare a un altro telefono.
        </p>
        <div class="row" style={{ flexWrap: 'wrap' }}>
          <button class="btn ghost small" onClick={exportData}>
            Esporta
          </button>
          <label class="btn ghost small">
            Importa
            <input type="file" accept="application/json" class="sr-only" onChange={(e) => e.currentTarget.files?.[0] && importData(e.currentTarget.files[0])} />
          </label>
          <button
            class="btn ghost small"
            onClick={() => {
              if (confirm('Azzerare i gusti? Salvati, diario e abitudini restano.')) setState(() => ({ weights: {}, reactions: {} }));
            }}
          >
            Azzera i gusti
          </button>
          <button
            class="btn ghost small"
            style={{ color: 'var(--bad)' }}
            onClick={() => {
              if (confirm('Cancellare tutti i dati di Boomscroll da questo telefono?')) replaceState(DEFAULT_STATE);
            }}
          >
            Cancella tutto
          </button>
        </div>

        <h2 class="section-title">Come funziona</h2>
        <div class="stack muted small">
          <p style={{ margin: 0 }}>
            Ogni mattina un programma su GitHub raccoglie contenuti da decine di fonti affidabili, elimina i doppioni e li riassume in italiano.
            L’app sceglie per te circa {st.editionSize} contenuti dell’edizione in base alle tue reazioni, con qualche scoperta fuori dalle tue abitudini.
          </p>
          <p style={{ margin: 0 }}>
            Niente notifiche, niente autoplay, nessuna misura del tempo passato su un contenuto per decidere cosa mostrarti. Il feed finisce.
          </p>
          <p style={{ margin: 0 }}>
            <a href="https://github.com/gitommydotcom/boomscroll" target="_blank" rel="noopener">
              Codice sorgente su GitHub
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
