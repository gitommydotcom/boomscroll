import { useEffect, useMemo, useState } from 'preact/hooks';
import { categoryMeta } from '../../shared/categories';
import type { Item } from '../../shared/types';
import { exerciseDone, reviewAnswer } from '../lib/actions';
import { addDays, isoWeek, shortDate, today } from '../lib/dates';
import { GRATITUDE_PROMPT, type FeedExercise } from '../lib/exercises';
import { bumpStats, emptyDay, setState, useAppState, type DayStats, type SavedEntry } from '../lib/store';
import { openDetail } from '../lib/ui';
import { IconCheck } from '../ui/icons';

/* ── Respiro ────────────────────────────────────────────────────────────── */

const PHASES = ['Inspira', 'Trattieni', 'Espira', 'Trattieni'];

/** Respirazione quadrata 4-4-4-4, quattro cicli (circa un minuto). */
export function Breath({ onDone }: { onDone?: () => void }) {
  const [running, setRunning] = useState(false);
  const [tick, setTick] = useState(0);
  const total = 16;
  useEffect(() => {
    if (!running) return;
    if (tick >= total) {
      setRunning(false);
      onDone?.();
      return;
    }
    const t = setTimeout(() => setTick((x) => x + 1), 4000);
    return () => clearTimeout(t);
  }, [running, tick]);
  const phase = tick % 4;
  const expanded = running && (phase === 0 || phase === 1);
  return (
    <div>
      <div class="breath" aria-hidden="true">
        <div class={`breath-circle${expanded ? ' in' : ''}`} />
      </div>
      <p class="breath-label" role="status">
        {running ? `${PHASES[phase]}… (${Math.floor(tick / 4) + 1}/4)` : tick >= total ? 'Fatto. Come va?' : 'Un minuto, quattro respiri lenti.'}
      </p>
      {!running && (
        <button
          class="btn block"
          onClick={() => {
            setTick(0);
            setRunning(true);
          }}
        >
          {tick >= total ? 'Ancora una volta' : 'Inizia'}
        </button>
      )}
    </div>
  );
}

/* ── Esercizi nel feed ──────────────────────────────────────────────────── */

export function ExerciseCard({ ex }: { ex: FeedExercise }) {
  const s = useAppState();
  const done = (s.exercisesDone[today()] ?? []).includes(ex.key);
  const [text, setText] = useState('');
  const [three, setThree] = useState(['', '', '']);

  const complete = () => exerciseDone(ex.key);
  const saveJournal = (kind: 'diario' | 'gratitudine', prompt: string, body: string) => {
    setState((st) => ({ journal: [{ date: today(), kind, prompt, text: body }, ...st.journal] }));
    complete();
  };

  const kicker = { respiro: 'Pausa · Respiro', diario: 'Diario', gratitudine: 'Gratitudine', sfida: 'Micro-sfida' }[ex.type];

  return (
    <section class="special">
      <div class="kicker">🌿 {kicker}</div>
      {done ? (
        <>
          <h2>Fatto ✓</h2>
          <p>Bel lavoro. Lo trovi anche nella sezione Pratica.</p>
        </>
      ) : ex.type === 'respiro' ? (
        <>
          <h2>Respira con me</h2>
          <Breath onDone={complete} />
        </>
      ) : ex.type === 'diario' ? (
        <>
          <h2>{ex.prompt}</h2>
          <textarea value={text} onInput={(e) => setText(e.currentTarget.value)} placeholder="Scrivi qualche riga, solo per te…" aria-label={ex.prompt} />
          <button class="btn block" style={{ marginTop: '12px' }} disabled={!text.trim()} onClick={() => saveJournal('diario', ex.prompt, text.trim())}>
            Salva nel diario
          </button>
        </>
      ) : ex.type === 'gratitudine' ? (
        <>
          <h2>{GRATITUDE_PROMPT}</h2>
          <div class="stack">
            {three.map((v, i) => (
              <input
                key={i}
                value={v}
                aria-label={`Cosa ${i + 1}`}
                placeholder={`${i + 1}.`}
                onInput={(e) => setThree(three.map((x, j) => (j === i ? e.currentTarget.value : x)))}
              />
            ))}
          </div>
          <button
            class="btn block"
            style={{ marginTop: '12px' }}
            disabled={three.filter((x) => x.trim()).length === 0}
            onClick={() => saveJournal('gratitudine', GRATITUDE_PROMPT, three.filter((x) => x.trim()).join('\n'))}
          >
            Salva
          </button>
        </>
      ) : (
        <>
          <h2>{ex.title}</h2>
          <p>{ex.text}</p>
          <div class="row">
            <button class="btn" onClick={complete}>
              <IconCheck size={18} /> Fatto
            </button>
            <button
              class="btn ghost"
              onClick={() =>
                setState((st) => ({ exercisesDone: { ...st.exercisesDone, [today()]: [...(st.exercisesDone[today()] ?? []), ex.key] } }))
              }
            >
              Non oggi
            </button>
          </div>
        </>
      )}
    </section>
  );
}

/* ── Pausa ──────────────────────────────────────────────────────────────── */

const PAUSE_LINES = [
  'Alza lo sguardo dallo schermo e cerca il punto più lontano che vedi.',
  'Rilassa le spalle. Tre respiri lenti.',
  'C’è qualcosa di quello che hai letto che vuoi raccontare a qualcuno?',
  'Hai bevuto un bicchiere d’acqua di recente?',
  'Ok continuare. Ma va benissimo anche smettere qui.',
];

export function PauseCard({ n, count }: { n: number; count: number }) {
  return (
    <section class="special">
      <div class="kicker">⏸ Pausa</div>
      <h2>Hai visto altri {count} contenuti.</h2>
      <p>{PAUSE_LINES[n % PAUSE_LINES.length]}</p>
      <p class="muted small">Scorri per continuare, oppure chiudi l’app: domani c’è un’edizione nuova.</p>
    </section>
  );
}

/* ── Quiz del giorno ────────────────────────────────────────────────────── */

export function QuizCard({ items, date }: { items: Item[]; date: string }) {
  const s = useAppState();
  const done = s.quizDone[date];
  const [answers, setAnswers] = useState<Record<string, number>>({});
  // Domande sui contenuti che hai letto (prima quelli che ti sono piaciuti); ferme dalla prima risposta.
  const live = useMemo(() => {
    const withQ = items.filter((i) => i.quiz);
    const read = withQ.filter((i) => s.seen[i.id]);
    const liked = read.filter((i) => s.reactions[i.id] === 'like');
    return [...new Set([...liked, ...read, ...withQ])].slice(0, 3);
  }, [items, s.seen, s.reactions]);
  const [frozen, setFrozen] = useState<Item[] | null>(null);
  const qs = frozen ?? live;
  if (!qs.length) return null;
  const answered = Object.keys(answers).length;
  const correct = qs.filter((i) => answers[i.id] === i.quiz!.answer).length;

  const choose = (item: Item, idx: number) => {
    if (answers[item.id] !== undefined || done) return;
    if (!frozen) setFrozen(qs);
    const next = { ...answers, [item.id]: idx };
    setAnswers(next);
    if (Object.keys(next).length === qs.length) {
      const ok = qs.filter((i) => next[i.id] === i.quiz!.answer).length;
      bumpStats((d) => ({ quizOk: d.quizOk + ok, quizTotal: d.quizTotal + qs.length }));
      setState((st) => ({ quizDone: { ...st.quizDone, [date]: true } }));
    }
  };

  return (
    <section class="special">
      <div class="kicker">🧩 Quiz del giorno</div>
      <h2>Ti ricordi cosa hai letto?</h2>
      <p class="muted small">Richiamare alla memoria è il modo migliore per ricordare.</p>
      {done && !answered ? (
        <p>Quiz di oggi già fatto ✓</p>
      ) : (
        qs.map((item) => {
          const a = answers[item.id];
          return (
            <div key={item.id} style={{ marginTop: '18px' }}>
              <strong>{item.quiz!.q}</strong>
              {item.quiz!.options.map((o, idx) => (
                <button
                  key={idx}
                  class={`quiz-opt${a !== undefined && idx === item.quiz!.answer ? ' right' : ''}${a === idx && idx !== item.quiz!.answer ? ' wrong' : ''}`}
                  onClick={() => choose(item, idx)}
                  aria-pressed={a === idx}
                >
                  {o}
                </button>
              ))}
            </div>
          );
        })
      )}
      {answered === qs.length && (
        <p style={{ marginTop: '16px', fontWeight: 600 }}>
          {correct === qs.length ? `Perfetto: ${correct} su ${qs.length}! 🎉` : `${correct} su ${qs.length}. Domani un altro giro.`}
        </p>
      )}
    </section>
  );
}

/* ── Ti ricordi? ────────────────────────────────────────────────────────── */

export function RecallCard({ entry }: { entry: SavedEntry }) {
  const [answered, setAnswered] = useState<string | null>(null);
  const item = entry.item;
  const answer = (a: 'remember' | 'again' | 'stop') => {
    reviewAnswer(item.id, a);
    setAnswered(a);
    if (a === 'again') openDetail(item);
  };
  return (
    <section class="special">
      <div class="kicker">🔁 Ti ricordi questo?</div>
      <p class="muted small" style={{ margin: '4px 0 0' }}>
        Salvato il {shortDate(entry.savedAt.slice(0, 10))} · {categoryMeta(item.category).label}
      </p>
      <h2>{item.titleIt ?? item.title}</h2>
      {answered ? (
        <p>{answered === 'remember' ? 'Ottimo, tornerà più avanti.' : answered === 'stop' ? 'Ok, niente più ripassi per questo.' : 'Riletto: tornerà tra pochi giorni.'}</p>
      ) : (
        <>
          <p>Prova a ricordare il punto principale, poi controlla.</p>
          <div class="row" style={{ flexWrap: 'wrap' }}>
            <button class="btn" onClick={() => answer('remember')}>
              Me lo ricordo
            </button>
            <button class="btn ghost" onClick={() => answer('again')}>
              Rileggi
            </button>
            <button class="btn ghost small" onClick={() => answer('stop')}>
              Basta ripassi
            </button>
          </div>
        </>
      )}
    </section>
  );
}

/* ── Riepiloghi ─────────────────────────────────────────────────────────── */

export function sumDays(stats: Record<string, DayStats>, from: string, days: number): DayStats {
  const out = emptyDay();
  for (let i = 0; i < days; i++) {
    const d = stats[addDays(from, -i)];
    if (!d) continue;
    out.seen += d.seen;
    out.likes += d.likes;
    out.saves += d.saves;
    out.quizOk += d.quizOk;
    out.quizTotal += d.quizTotal;
    out.exercises += d.exercises;
    out.words += d.words;
    out.seconds += d.seconds;
    for (const [k, v] of Object.entries(d.cats)) out.cats[k] = (out.cats[k] ?? 0) + v;
  }
  return out;
}

export function WeekSummary({ stats }: { stats: DayStats }) {
  const top = Object.entries(stats.cats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  return (
    <>
      <div class="stat-grid">
        <div class="stat">
          <b>{stats.seen}</b>
          <span>contenuti</span>
        </div>
        <div class="stat">
          <b>{Math.round(stats.seconds / 60)}</b>
          <span>minuti</span>
        </div>
        <div class="stat">
          <b>{stats.saves}</b>
          <span>salvati</span>
        </div>
        <div class="stat">
          <b>{stats.exercises}</b>
          <span>esercizi</span>
        </div>
        <div class="stat">
          <b>{stats.words}</b>
          <span>parole</span>
        </div>
        <div class="stat">
          <b>{stats.quizTotal ? `${Math.round((100 * stats.quizOk) / stats.quizTotal)}%` : '–'}</b>
          <span>quiz</span>
        </div>
      </div>
      {top.length > 0 && (
        <p>
          Hai esplorato soprattutto:{' '}
          {top.map(([c, n], i) => (
            <span key={c}>
              {i ? ', ' : ''}
              {categoryMeta(c as Item['category']).emoji} {categoryMeta(c as Item['category']).label} ({n})
            </span>
          ))}
          .
        </p>
      )}
    </>
  );
}

export function WeekCard() {
  const s = useAppState();
  const week = useMemo(() => sumDays(s.stats, addDays(today(), -1), 7), []);
  return (
    <section class="special">
      <div class="kicker">📅 La tua settimana</div>
      <h2>Sette giorni di Boomscroll</h2>
      <WeekSummary stats={week} />
      <button class="btn ghost small" onClick={() => setState(() => ({ recapSeen: isoWeek(today()) }))}>
        Ok, grazie
      </button>
    </section>
  );
}

export function EndCard({ date, name, next, onMore, isToday }: { date: string; name: string; next: string; onMore: () => void; isToday: boolean }) {
  const s = useAppState();
  const d = s.stats[today()] ?? emptyDay();
  useEffect(() => {
    if (!s.finished[date]) setState((st) => ({ finished: { ...st.finished, [date]: true } }));
  }, [date]);
  return (
    <section class="special">
      <div class="kicker">🌙 Fine dell’edizione</div>
      <h2>{isToday ? `Hai finito l’${name.charAt(0).toLowerCase()}${name.slice(1)}.` : 'Hai finito questa edizione.'}</h2>
      <div class="stat-grid">
        <div class="stat">
          <b>{d.seen}</b>
          <span>letti oggi</span>
        </div>
        <div class="stat">
          <b>{d.saves}</b>
          <span>salvati</span>
        </div>
        <div class="stat">
          <b>{d.exercises}</b>
          <span>esercizi</span>
        </div>
      </div>
      <p>Questo è un buon momento per chiudere l’app e fare altro. {next}</p>
      <button class="btn ghost block" onClick={onMore}>
        Continua con gli approfondimenti
      </button>
    </section>
  );
}

export function FinishedCard() {
  return (
    <section class="special">
      <div class="kicker">🌿 Fine</div>
      <h2>Hai visto tutto. Davvero.</h2>
      <p>Hai scorso anche gli approfondimenti degli ultimi giorni. Il feed finisce qui: a domani!</p>
    </section>
  );
}
