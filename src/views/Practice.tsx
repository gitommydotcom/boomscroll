import { useEffect, useState } from 'preact/hooks';
import { editionId, type Item } from '../../shared/types';
import { ChessPuzzle } from '../cards/Chess';
import { Breath } from '../cards/Specials';
import { langName } from '../cards/common';
import { exerciseDone, toast } from '../lib/actions';
import { fetchEdition, fetchIndex } from '../lib/data';
import { addDays, shortDate, today } from '../lib/dates';
import { DISTORTIONS, GRATITUDE_PROMPT, challengeFor, journalPromptFor } from '../lib/exercises';
import { setState, useAppState, type Flashcard, type Habit, type JournalEntry } from '../lib/store';
import { ICON_NAMES, Icon, IconBack, IconCheck, IconPlus, IconTrash } from '../ui/icons';

const TOOLS = [
  { id: 'respiro', icon: 'wind', title: 'Respiro', desc: 'Un minuto di respirazione quadrata' },
  { id: 'diario', icon: 'notebook', title: 'Diario', desc: 'Una domanda al giorno' },
  { id: 'gratitudine', icon: 'sun', title: 'Gratitudine', desc: 'Tre cose belle di oggi' },
  { id: 'pensiero', icon: 'brain', title: 'Rileggi un pensiero', desc: 'Ristrutturazione cognitiva in 5 passi' },
  { id: 'focus', icon: 'timer', title: 'Concentrazione', desc: 'Timer per una cosa sola' },
  { id: 'flashcard', icon: 'cards', title: 'Flashcard', desc: 'Le parole che hai raccolto' },
  { id: 'abitudini', icon: 'sprout', title: 'Abitudini', desc: 'Piccole cose, ogni giorno' },
  { id: 'scacchi', icon: 'chess', title: 'Scacchi', desc: 'Un puzzle da risolvere' },
];

const BOX_DAYS = [1, 3, 7, 14, 30, 90];

function Back({ title }: { title: string }) {
  return (
    <>
      <a href="#/pratica" class="row muted" style={{ textDecoration: 'none', marginBottom: '8px' }}>
        <IconBack size={18} /> Pratica
      </a>
      <h1 class="page-title">{title}</h1>
    </>
  );
}

function History({ kind }: { kind: JournalEntry['kind'] }) {
  const s = useAppState();
  const list = s.journal.filter((j) => j.kind === kind);
  if (!list.length) return null;
  const remove = (j: JournalEntry) => {
    if (confirm('Eliminare questa voce?')) setState((st) => ({ journal: st.journal.filter((x) => x !== j) }));
  };
  return (
    <>
      <h2 class="section-title">Le tue voci</h2>
      <div class="stack">
        {list.slice(0, 30).map((j, i) => (
          <div class="panel" key={i}>
            <div class="row between">
              <span class="muted small">{shortDate(j.date)}</span>
              <button class="icon-btn" onClick={() => remove(j)} aria-label="Elimina">
                <IconTrash size={18} />
              </button>
            </div>
            {kind !== 'gratitudine' && <p style={{ margin: '0 0 6px', fontWeight: 600 }}>{j.prompt}</p>}
            <p style={{ margin: 0, whiteSpace: 'pre-line' }}>{j.text}</p>
          </div>
        ))}
      </div>
    </>
  );
}

function Journal() {
  const prompt = journalPromptFor(today());
  const [text, setText] = useState('');
  const save = () => {
    setState((s) => ({ journal: [{ date: today(), kind: 'diario', prompt, text: text.trim() }, ...s.journal] }));
    exerciseDone('diario');
    setText('');
    toast('Salvato nel diario');
  };
  return (
    <>
      <Back title="Diario" />
      <p class="page-sub">Resta solo su questo telefono.</p>
      <div class="panel">
        <p style={{ marginTop: 0, fontFamily: 'var(--font-display)', fontSize: '1.3rem' }}>{prompt}</p>
        <textarea value={text} onInput={(e) => setText(e.currentTarget.value)} placeholder="Scrivi qui…" aria-label={prompt} rows={6} />
        <button class="btn block" style={{ marginTop: '12px' }} disabled={!text.trim()} onClick={save}>
          Salva
        </button>
      </div>
      <History kind="diario" />
    </>
  );
}

function Gratitude() {
  const [three, setThree] = useState(['', '', '']);
  const save = () => {
    const text = three.filter((x) => x.trim()).join('\n');
    setState((s) => ({ journal: [{ date: today(), kind: 'gratitudine', prompt: GRATITUDE_PROMPT, text }, ...s.journal] }));
    exerciseDone('gratitudine');
    setThree(['', '', '']);
    toast('Salvato');
  };
  return (
    <>
      <Back title="Gratitudine" />
      <p class="page-sub">{GRATITUDE_PROMPT}</p>
      <div class="stack">
        {three.map((v, i) => (
          <input key={i} value={v} aria-label={`Cosa ${i + 1}`} placeholder={`${i + 1}.`} onInput={(e) => setThree(three.map((x, j) => (j === i ? e.currentTarget.value : x)))} />
        ))}
        <button class="btn" disabled={!three.some((x) => x.trim())} onClick={save}>
          Salva
        </button>
      </div>
      <History kind="gratitudine" />
    </>
  );
}

function Thought() {
  const [step, setStep] = useState(0);
  const [f, setF] = useState({ situation: '', thought: '', distortions: [] as string[], against: '', alternative: '' });
  const set = (k: keyof typeof f, v: string | string[]) => setF({ ...f, [k]: v });
  const steps = [
    { title: 'Cosa è successo?', hint: 'Descrivi la situazione in modo neutro, come la vedrebbe una telecamera.', key: 'situation' as const },
    { title: 'Che pensiero hai avuto?', hint: 'La frase che ti è passata per la testa, anche se sembra esagerata.', key: 'thought' as const },
    { title: 'Riconosci una trappola?', hint: 'Seleziona quelle che ti sembrano presenti (anche nessuna).', key: 'distortions' as const },
    { title: 'Cosa dice il contrario?', hint: 'Fatti o esperienze che non confermano del tutto quel pensiero.', key: 'against' as const },
    { title: 'Un pensiero più equilibrato', hint: 'Come lo diresti a un amico nella stessa situazione?', key: 'alternative' as const },
  ];
  const cur = steps[step];
  const save = () => {
    const labels = DISTORTIONS.filter((d) => f.distortions.includes(d.id)).map((d) => d.label);
    const text = [
      `Situazione: ${f.situation}`,
      `Pensiero: ${f.thought}`,
      labels.length ? `Trappole: ${labels.join(', ')}` : '',
      `Contro: ${f.against}`,
      `Alternativa: ${f.alternative}`,
    ]
      .filter(Boolean)
      .join('\n');
    setState((s) => ({ journal: [{ date: today(), kind: 'pensiero', prompt: f.thought, text }, ...s.journal] }));
    exerciseDone('pensiero');
    setStep(0);
    setF({ situation: '', thought: '', distortions: [], against: '', alternative: '' });
    toast('Fatto. Rileggerlo domani aiuta.');
  };
  return (
    <>
      <Back title="Rileggi un pensiero" />
      <p class="page-sub">Un esercizio della terapia cognitivo-comportamentale. Non sostituisce un aiuto professionale.</p>
      <div class="panel">
        <div class="muted small">
          Passo {step + 1} di {steps.length}
        </div>
        <h2 style={{ fontSize: '1.4rem', margin: '6px 0' }}>{cur.title}</h2>
        <p class="muted" style={{ marginTop: 0 }}>
          {cur.hint}
        </p>
        {cur.key === 'distortions' ? (
          <div class="stack">
            {DISTORTIONS.map((d) => (
              <button
                key={d.id}
                class="quiz-opt"
                aria-pressed={f.distortions.includes(d.id)}
                style={f.distortions.includes(d.id) ? { borderColor: 'var(--ink)', background: 'var(--paper-2)' } : undefined}
                onClick={() => set('distortions', f.distortions.includes(d.id) ? f.distortions.filter((x) => x !== d.id) : [...f.distortions, d.id])}
              >
                <strong>{d.label}</strong>
                <br />
                <span class="muted small">{d.desc}</span>
              </button>
            ))}
          </div>
        ) : (
          <textarea value={f[cur.key] as string} onInput={(e) => set(cur.key, e.currentTarget.value)} aria-label={cur.title} />
        )}
        <div class="row between" style={{ marginTop: '12px' }}>
          <button class="btn ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>
            Indietro
          </button>
          {step < steps.length - 1 ? (
            <button class="btn" disabled={cur.key !== 'distortions' && !(f[cur.key] as string).trim()} onClick={() => setStep(step + 1)}>
              Avanti
            </button>
          ) : (
            <button class="btn" disabled={!f.alternative.trim()} onClick={save}>
              Salva
            </button>
          )}
        </div>
      </div>
      <History kind="pensiero" />
    </>
  );
}

function Focus() {
  const [minutes, setMinutes] = useState(25);
  const [endAt, setEndAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!endAt) return;
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= endAt) {
        setEndAt(null);
        setDone(true);
        exerciseDone('focus');
        navigator.vibrate?.([200, 100, 200]);
      }
    }, 500);
    return () => clearInterval(t);
  }, [endAt]);
  const left = endAt ? Math.max(0, endAt - now) : minutes * 60_000;
  const mm = String(Math.floor(left / 60_000)).padStart(2, '0');
  const ss = String(Math.floor((left % 60_000) / 1000)).padStart(2, '0');
  return (
    <>
      <Back title="Concentrazione" />
      <p class="page-sub">Scegli una cosa sola. Metti via il telefono: il timer continua.</p>
      <div class="panel" style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '4.5rem', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }} role="timer">
          {mm}:{ss}
        </div>
        {done && <p style={{ fontWeight: 600 }}>Tempo! Fai una pausa di 5 minuti.</p>}
        {!endAt ? (
          <>
            <div class="chips" style={{ justifyContent: 'center', margin: '12px 0' }}>
              {[10, 25, 50].map((m) => (
                <button key={m} class="chip" aria-pressed={minutes === m} onClick={() => setMinutes(m)}>
                  {m} min
                </button>
              ))}
            </div>
            <button
              class="btn block"
              onClick={() => {
                setDone(false);
                setNow(Date.now());
                setEndAt(Date.now() + minutes * 60_000);
              }}
            >
              Inizia
            </button>
          </>
        ) : (
          <button class="btn ghost block" style={{ marginTop: '12px' }} onClick={() => setEndAt(null)}>
            Interrompi
          </button>
        )}
      </div>
    </>
  );
}

function Flashcards() {
  const s = useAppState();
  const t = today();
  const due = Object.values(s.cards)
    .filter((c) => c.due <= t)
    .sort((a, b) => a.due.localeCompare(b.due));
  const [reveal, setReveal] = useState(false);
  const card = due[0];
  const answer = (c: Flashcard, knew: boolean) => {
    const box = knew ? Math.min(c.box + 1, BOX_DAYS.length - 1) : 0;
    setState((st) => ({ cards: { ...st.cards, [c.id]: { ...c, box, due: addDays(t, BOX_DAYS[box]) } } }));
    setReveal(false);
    if (due.length === 1) exerciseDone('flashcard');
  };
  const all = Object.values(s.cards).sort((a, b) => b.added.localeCompare(a.added));
  return (
    <>
      <Back title="Flashcard" />
      <p class="page-sub">
        {all.length ? `${all.length} parole · ${due.length} da ripassare oggi` : 'Aggiungi parole dalle card “Parola del giorno” nel feed.'}
      </p>
      {card ? (
        <div class="panel flash">
          <span class="muted small">{langName(card.lang)}</span>
          <div class="word">{card.word}</div>
          {reveal ? (
            <>
              <p style={{ margin: 0 }}>{card.definitionIt}</p>
              {card.example && (
                <p class="muted small" style={{ margin: 0 }}>
                  “{card.example}”{card.exampleIt && <><br />{card.exampleIt}</>}
                </p>
              )}
              <div class="row" style={{ marginTop: '8px' }}>
                <button class="btn ghost" onClick={() => answer(card, false)}>
                  Da ripassare
                </button>
                <button class="btn" onClick={() => answer(card, true)}>
                  Lo sapevo
                </button>
              </div>
            </>
          ) : (
            <button class="btn" onClick={() => setReveal(true)}>
              Mostra il significato
            </button>
          )}
        </div>
      ) : (
        all.length > 0 && <div class="panel flash">
          <IconCheck size={28} /> Nessuna parola da ripassare oggi.
        </div>
      )}
      {all.length > 0 && (
        <>
          <h2 class="section-title">Tutte le parole</h2>
          {all.map((c) => (
            <div class="setting" key={c.id}>
              <div>
                <strong>{c.word}</strong> <span class="muted small">· {langName(c.lang)}</span>
                <div class="muted small">{c.definitionIt}</div>
              </div>
              <button
                class="icon-btn"
                aria-label={`Elimina ${c.word}`}
                onClick={() =>
                  setState((st) => {
                    const cards = { ...st.cards };
                    delete cards[c.id];
                    return { cards };
                  })
                }
              >
                <IconTrash size={18} />
              </button>
            </div>
          ))}
        </>
      )}
    </>
  );
}

const HABIT_IDEAS = [
  ['book', 'Leggere 10 pagine'],
  ['walk', 'Camminare 20 minuti'],
  ['drop', 'Bere due litri d’acqua'],
  ['moon', 'Niente telefono a letto'],
  ['wind', 'Meditare 5 minuti'],
  ['pen', 'Scrivere tre righe'],
];

const HABIT_ICONS = ['sprout', 'book', 'walk', 'drop', 'moon', 'wind', 'pen', 'sun', 'heart', 'bolt'];

/** Le abitudini salvate prima delle icone hanno un'emoji: al suo posto la prima lettera. */
function HabitIcon({ h }: { h: Habit }) {
  return ICON_NAMES.includes(h.emoji) ? <Icon name={h.emoji} size={20} /> : <b>{h.name.charAt(0).toUpperCase()}</b>;
}

function Habits() {
  const s = useAppState();
  const t = today();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('sprout');
  const add = (n: string, e: string) => {
    if (!n.trim()) return;
    const h: Habit = { id: crypto.randomUUID(), name: n.trim(), emoji: e || 'sprout', days: [], created: t };
    setState((st) => ({ habits: [...st.habits, h] }));
    setName('');
  };
  const toggle = (h: Habit) => {
    const has = h.days.includes(t);
    setState((st) => ({ habits: st.habits.map((x) => (x.id === h.id ? { ...x, days: has ? x.days.filter((d) => d !== t) : [...x.days, t] } : x)) }));
    if (!has) exerciseDone(`abitudine:${h.id}`);
  };
  const remove = (h: Habit) => {
    if (confirm(`Eliminare “${h.name}”?`)) setState((st) => ({ habits: st.habits.filter((x) => x.id !== h.id) }));
  };
  const last14 = Array.from({ length: 14 }, (_, i) => addDays(t, i - 13));

  return (
    <>
      <Back title="Abitudini" />
      <p class="page-sub">Niente serie da non spezzare: conta quante volte ce l’hai fatta, non quando hai mancato.</p>
      {s.habits.map((h) => {
        const n = last14.filter((d) => h.days.includes(d)).length;
        return (
          <div class="habit" key={h.id}>
            <button class="habit-check" aria-pressed={h.days.includes(t)} onClick={() => toggle(h)} aria-label={`${h.name}: fatto oggi`}>
              {h.days.includes(t) ? <IconCheck size={22} /> : <HabitIcon h={h} />}
            </button>
            <div style={{ flex: 1 }}>
              <strong>{h.name}</strong>
              <div class="muted small">{n} volte negli ultimi 14 giorni</div>
              <div class="dots" aria-hidden="true">
                {last14.map((d) => (
                  <i key={d} class={h.days.includes(d) ? 'on' : ''} />
                ))}
              </div>
            </div>
            <button class="icon-btn" onClick={() => remove(h)} aria-label={`Elimina ${h.name}`}>
              <IconTrash size={18} />
            </button>
          </div>
        );
      })}
      <h2 class="section-title">Nuova abitudine</h2>
      <div class="row">
        <input value={name} onInput={(e) => setName(e.currentTarget.value)} placeholder="Es. leggere prima di dormire" aria-label="Nome dell’abitudine" />
        <button class="btn" onClick={() => add(name, icon)} aria-label="Aggiungi">
          <IconPlus size={20} />
        </button>
      </div>
      <div class="icon-pick" role="radiogroup" aria-label="Icona">
        {HABIT_ICONS.map((n) => (
          <button key={n} role="radio" aria-checked={icon === n} onClick={() => setIcon(n)} aria-label={n}>
            <Icon name={n} size={20} />
          </button>
        ))}
      </div>
      <div class="chips" style={{ marginTop: '12px' }}>
        {HABIT_IDEAS.filter(([, n]) => !s.habits.some((h) => h.name === n)).map(([e, n]) => (
          <button key={n} class="chip" onClick={() => add(n, e)}>
            <Icon name={e} size={16} /> {n}
          </button>
        ))}
      </div>
    </>
  );
}

function ChessToday() {
  const [item, setItem] = useState<Item | null | undefined>(undefined);
  useEffect(() => {
    fetchIndex().then(async (idx) => {
      for (const e of idx?.editions.slice(0, 6) ?? []) {
        const ed = await fetchEdition(editionId(e));
        const c = ed?.items.find((i) => i.kind === 'chess');
        if (c) return setItem(c);
      }
      setItem(null);
    });
  }, []);
  return (
    <>
      <Back title="Scacchi" />
      <p class="page-sub">Il puzzle del giorno da Lichess.</p>
      {item === undefined && <p class="muted">Carico…</p>}
      {item === null && <p class="muted">Nessun puzzle disponibile oggi.</p>}
      {item?.chess && <ChessPuzzle data={item.chess} puzzleUrl={item.url} />}
    </>
  );
}

export function Practice({ tool }: { tool?: string }) {
  const s = useAppState();
  const t = today();
  const doneToday = s.exercisesDone[t]?.length ?? 0;
  const dueCards = Object.values(s.cards).filter((c) => c.due <= t).length;
  const challenge = challengeFor(t);
  const challengeDone = (s.exercisesDone[t] ?? []).includes(`sfida:${challenge.title}`);

  let body;
  switch (tool) {
    case 'respiro':
      body = (
        <>
          <Back title="Respiro" />
          <p class="page-sub">Respirazione quadrata: inspira, trattieni, espira, trattieni. Quattro secondi ciascuno.</p>
          <div class="panel">
            <Breath onDone={() => exerciseDone('respiro')} />
          </div>
        </>
      );
      break;
    case 'diario':
      body = <Journal />;
      break;
    case 'gratitudine':
      body = <Gratitude />;
      break;
    case 'pensiero':
      body = <Thought />;
      break;
    case 'focus':
      body = <Focus />;
      break;
    case 'flashcard':
      body = <Flashcards />;
      break;
    case 'abitudini':
      body = <Habits />;
      break;
    case 'scacchi':
      body = <ChessToday />;
      break;
    default:
      body = (
        <>
          <h1 class="page-title">Pratica</h1>
          <p class="page-sub">{doneToday ? `Oggi hai fatto ${doneToday} ${doneToday === 1 ? 'esercizio' : 'esercizi'}. Ottimo lavoro.` : 'Piccoli esercizi per crescere un po’ ogni giorno.'}</p>
          <div class="tiles">
            {dueCards > 0 ? (
              <a class="tile hero" href="#/pratica/flashcard" style={{ textDecoration: 'none' }}>
                <Icon name="cards" size={26} />
                <h3>{dueCards} parole da ripassare</h3>
                <p>Bastano due minuti.</p>
              </a>
            ) : (
              <div class="tile hero">
                <Icon name="bolt" size={26} />
                <h3>Sfida di oggi: {challenge.title}</h3>
                <p>{challenge.text}</p>
                {challengeDone ? (
                  <p class="row" style={{ fontWeight: 600, gap: '6px' }}>
                    <IconCheck size={18} /> Fatto
                  </p>
                ) : (
                  <button class="btn small" style={{ background: 'var(--paper)', color: 'var(--ink)', alignSelf: 'flex-start' }} onClick={() => exerciseDone(`sfida:${challenge.title}`)}>
                    Fatto
                  </button>
                )}
              </div>
            )}
            {TOOLS.map((tl) => (
              <a key={tl.id} class="tile" href={`#/pratica/${tl.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <Icon name={tl.icon} size={26} />
                <h3>{tl.title}</h3>
                <p>{tl.desc}</p>
              </a>
            ))}
          </div>
        </>
      );
  }
  return (
    <div class="screen">
      <div class="page">{body}</div>
    </div>
  );
}
