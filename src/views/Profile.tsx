import { useEffect, useState } from 'preact/hooks';
import { CATEGORIES } from '../../shared/categories';
import { editionSlot, type Edition } from '../../shared/types';
import { GridTile, MiniRow } from '../cards/ItemCards';
import { WeekSummary, sumDays } from '../cards/Specials';
import { account } from '../lib/accounts';
import { Avatar } from '../ui/Avatar';
import { FollowButton } from './Explore';
import { Archive } from './Library';
import { adjustWeight, toast } from '../lib/actions';
import { ACTIONS_URL, getToken, lastRun, setToken, startEdition, type RunStatus } from '../lib/github';
import { fetchEdition, fetchIndex } from '../lib/data';
import { longDate, shortDate, today } from '../lib/dates';
import { MAX_W, keyC } from '../lib/ranking';
import { DEFAULT_STATE, getState, replaceState, setState, updateSettings, useAppState, type State } from '../lib/store';
import { Icon, IconBack, IconClose, IconGear, IconGrid, IconMinus, IconPlus } from '../ui/icons';

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
            <span class="row" style={{ gap: '8px' }}>
              <Icon name={c.icon} size={18} /> {c.label}
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
                {nameOf(k)} <IconClose size={14} />
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
        {longDate(ed.date)}, {editionSlot(ed)} · {ok.length} fonti raggiunte su {ed.sources.length} · riassunti: {ed.ai.model ?? 'non disponibili (estratti delle fonti)'}
      </p>
      <button class="btn ghost small" onClick={() => setOpen(!open)}>
        {open ? 'Nascondi' : 'Mostra'} l’elenco
      </button>
      {open && (
        <div class="small" style={{ marginTop: '8px' }}>
          {[...ok, ...ko].map((x) => (
            <div class="setting" key={x.id} style={{ padding: '6px 0' }}>
              <span>{x.name}</span>
              <span class="muted">{x.ok ? `${x.count} contenuti` : `non raggiunta: ${x.error ?? ''}`}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function Editions() {
  const [run, setRun] = useState<RunStatus | null>(null);
  const [token, setTok] = useState(getToken());
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const refresh = () => lastRun().then(setRun);
  useEffect(() => {
    refresh();
  }, []);
  const running = run && run.status !== 'completed';
  const start = async () => {
    setBusy(true);
    const r = await startEdition();
    setBusy(false);
    if (r === 'ok') {
      toast('Edizione in preparazione: pronta tra circa un’ora');
      setTimeout(refresh, 4000);
    } else if (r === 'unauthorized') toast('Token non valido o senza il permesso Actions');
    else toast('Non riesco a contattare GitHub: riprova più tardi');
  };
  const time = (iso: string) => new Date(iso).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <h2 class="section-title">Edizioni</h2>
      <p class="muted small" style={{ marginTop: 0 }}>
        Tre edizioni al giorno, ognuna con contenuti nuovi: mattina (pronta verso le 6:30), pomeriggio (verso le 13) e sera (verso le 19).
        Quando ne esce una nuova, in Oggi compare l’avviso “È uscita una nuova edizione”.
      </p>
      {run && (
        <p class="small" style={{ margin: '0 0 10px' }}>
          {running
            ? `Edizione in preparazione dalle ${time(run.startedAt)}`
            : run.conclusion === 'success'
              ? `Ultima preparazione completata alle ${time(run.updatedAt)}`
              : `Ultima preparazione non riuscita (${time(run.updatedAt)}): l’edizione precedente resta disponibile`}
        </p>
      )}
      {token ? (
        <div class="row" style={{ flexWrap: 'wrap' }}>
          <button class="btn small" onClick={start} disabled={busy || !!running}>
            {running ? 'Già in preparazione' : 'Crea un’edizione adesso'}
          </button>
          <button
            class="btn ghost small"
            onClick={() => {
              setToken('');
              setTok('');
            }}
          >
            Rimuovi token
          </button>
        </div>
      ) : (
        <details>
          <summary class="small" style={{ cursor: 'pointer' }}>
            Vuoi poter creare un’edizione quando vuoi?
          </summary>
          <ol class="small muted" style={{ paddingLeft: '18px' }}>
            <li>
              Su GitHub apri <i>Settings → Developer settings → Personal access tokens → Fine-grained tokens</i> e crea un token.
            </li>
            <li>
              Repository: solo <b>boomscroll</b>. Permessi: <b>Actions → Read and write</b>.
            </li>
            <li>Incollalo qui sotto: resta solo su questo telefono.</li>
          </ol>
          <div class="row">
            <input type="password" value={draft} onInput={(e) => setDraft(e.currentTarget.value)} placeholder="github_pat_…" aria-label="Token GitHub" />
            <button
              class="btn small"
              disabled={!draft.trim()}
              onClick={() => {
                setToken(draft);
                setTok(draft.trim());
                setDraft('');
              }}
            >
              Salva
            </button>
          </div>
        </details>
      )}
      <p class="small" style={{ margin: '10px 0 0' }}>
        <a href={ACTIONS_URL} target="_blank" rel="noopener">
          Oppure avviala da GitHub: “Run workflow”
        </a>
      </p>
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

export function Settings() {
  const s = useAppState();
  const st = s.settings;
  const todayStats = sumDays(s.stats, today(), 1);
  const week = sumDays(s.stats, today(), 7);

  return (
    <div class="screen">
      <div class="page">
        <a href="#/tu" class="row muted back">
          <IconBack size={18} /> Profilo
        </a>
        <h1 class="page-title">Impostazioni</h1>
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
            {[15, 20, 30, 40, 60, 80].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div class="setting">
          <span>
            Video automatici
            <br />
            <span class="muted small">Nel feed a schermo intero partono da soli, senza audio</span>
          </span>
          <Switch on={st.autoplay} onChange={(v) => updateSettings({ autoplay: v })} label="Video automatici" />
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

        <Editions />

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
            Tre volte al giorno un programma su GitHub raccoglie contenuti da decine di fonti affidabili, elimina i doppioni e li riassume in italiano.
            L’app sceglie per te circa {st.editionSize} contenuti dell’edizione in base alle tue reazioni, con qualche scoperta fuori dalle tue abitudini.
          </p>
          <p style={{ margin: 0 }}>
            Sembra un social, ma non lo è: gli “account” sono fonti affidabili, i commenti sono note che vedi solo tu, le notifiche le calcola il
            telefono e non arrivano mai da sole. Nessuna misura del tempo passato su un contenuto per decidere cosa mostrarti. Il feed finisce.
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

/* ── Il tuo profilo, come su un social ──────────────────────────────────── */

const HIGHLIGHTS = [
  { href: '#/pratica/diario', icon: 'notebook', label: 'Diario' },
  { href: '#/pratica/flashcard', icon: 'cards', label: 'Parole' },
  { href: '#/pratica/abitudini', icon: 'sprout', label: 'Abitudini' },
  { href: '#/pratica/gratitudine', icon: 'sun', label: 'Gratitudine' },
  { href: '#/vicino', icon: 'pin', label: 'Vicino' },
];

function Following() {
  const s = useAppState();
  const keys = Object.keys(s.follows).sort((a, b) => s.follows[b].localeCompare(s.follows[a]));
  return (
    <div class="screen">
      <div class="page">
        <a href="#/tu" class="row muted back">
          <IconBack size={18} /> Profilo
        </a>
        <h1 class="page-title">Seguiti</h1>
        <p class="page-sub">Account e argomenti che segui. I loro contenuti arrivano in Seguiti e nelle storie.</p>
        {!keys.length && (
          <p class="muted">
            Ancora nessuno. Trova qualcuno in <a href="#/esplora">Esplora</a>.
          </p>
        )}
        {keys.map((k) => {
          const isTag = k.startsWith('t:');
          const a = isTag ? null : account(k.slice(2));
          const label = isTag ? `#${k.slice(2).replace(/\s+/g, '')}` : a!.name;
          return (
            <div class="acc-row" key={k}>
              <a href={isTag ? `#/tag/${encodeURIComponent(k.slice(2))}` : `#/fonte/${k.slice(2)}`} class="row" style={{ flex: 1, minWidth: 0, color: 'inherit', textDecoration: 'none' }}>
                {isTag ? (
                  <span class="av" style={{ width: '44px', height: '44px' }}>
                    <span>#</span>
                  </span>
                ) : (
                  <Avatar id={k.slice(2)} size={44} />
                )}
                <span style={{ minWidth: 0 }}>
                  <b>{label}</b>
                  <span class="muted small">{isTag ? 'Argomento' : a!.about}</span>
                </span>
              </a>
              <FollowButton k={k} label={label} small />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Profile({ tab }: { tab?: string }) {
  const s = useAppState();
  if (tab === 'impostazioni') return <Settings />;
  if (tab === 'seguiti') return <Following />;
  const current = tab === 'note' || tab === 'archivio' ? tab : 'salvati';
  const name = s.settings.name || 'Tu';
  const read = Object.values(s.stats).reduce((n, d) => n + d.seen, 0);
  const saved = Object.values(s.saved).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  const withNotes = Object.entries(s.notes)
    .map(([id, list]) => ({ entry: s.saved[id], list }))
    .filter((x) => x.entry)
    .sort((a, b) => b.list[b.list.length - 1].at.localeCompare(a.list[a.list.length - 1].at));
  const rename = () => {
    const n = prompt('Come vuoi chiamarti nel profilo?', s.settings.name);
    if (n !== null) updateSettings({ name: n.trim().slice(0, 40) });
  };

  return (
    <div class="screen">
      <div class="page">
        <div class="row between">
          <h1 class="page-title" style={{ margin: 0 }}>{name}</h1>
          <a class="icon-btn" href="#/tu/impostazioni" aria-label="Impostazioni">
            <IconGear size={22} />
          </a>
        </div>
        <div class="profile-head">
          <span class="av me" style={{ width: '84px', height: '84px', fontSize: '2rem' }}>
            <span>{name.charAt(0).toUpperCase()}</span>
          </span>
          <div class="profile-stats">
            <span>
              <b>{read}</b>letti
            </span>
            <span>
              <b>{saved.length}</b>salvati
            </span>
            <a href="#/tu/seguiti">
              <b>{Object.keys(s.follows).length}</b>seguiti
            </a>
          </div>
        </div>
        <p class="muted small" style={{ margin: '0 0 10px' }}>
          Su Boomscroll dal {shortDate(s.since || today())} · {Object.keys(s.notes).length} {Object.keys(s.notes).length === 1 ? 'nota' : 'note'}
        </p>
        <div class="row" style={{ gap: '8px' }}>
          <button class="btn ghost small" style={{ flex: 1 }} onClick={rename}>
            Modifica nome
          </button>
          <a class="btn ghost small" style={{ flex: 1 }} href="#/tu/impostazioni">
            Gusti e impostazioni
          </a>
        </div>
        <div class="highlights">
          {HIGHLIGHTS.map((h) => (
            <a key={h.href} href={h.href}>
              <span class="av ring seen" style={{ width: '62px', height: '62px' }}>
                <span>
                  <Icon name={h.icon} size={26} />
                </span>
              </span>
              {h.label}
            </a>
          ))}
        </div>
        <div class="icon-tabs" role="tablist">
          <a role="tab" href="#/tu/salvati" aria-selected={current === 'salvati'} aria-label="Salvati">
            <IconGrid size={22} />
          </a>
          <a role="tab" href="#/tu/note" aria-selected={current === 'note'} aria-label="Note">
            <Icon name="bubble" size={22} />
          </a>
          <a role="tab" href="#/tu/archivio" aria-selected={current === 'archivio'} aria-label="Archivio delle edizioni">
            <Icon name="calendar" size={22} />
          </a>
        </div>
        {current === 'salvati' &&
          (saved.length ? (
            <>
              <div class="grid3" style={{ margin: '0 -16px' }}>
                {saved.map((e) => (
                  <GridTile key={e.item.id} item={e.item} />
                ))}
              </div>
              <p class="small" style={{ marginTop: '12px' }}>
                <a href="#/libreria/salvati">Cerca nei salvati</a>
              </p>
            </>
          ) : (
            <div class="empty">
              <h3>Ancora niente di salvato</h3>
              <p>Tocca il segnalibro su un contenuto per ritrovarlo qui.</p>
            </div>
          ))}
        {current === 'note' &&
          (withNotes.length ? (
            withNotes.map(({ entry, list }) => <MiniRow key={entry.item.id} item={entry.item} note={`Tu: ${list[list.length - 1].text}`} />)
          ) : (
            <div class="empty">
              <h3>Nessuna nota</h3>
              <p>Tocca il fumetto su un contenuto per scrivere un pensiero: lo vedi solo tu.</p>
            </div>
          ))}
        {current === 'archivio' && <Archive />}
      </div>
    </div>
  );
}
