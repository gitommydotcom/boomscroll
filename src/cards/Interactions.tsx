/**
 * Interazioni del feed e delle clip: piccoli momenti attivi tra un contenuto e l'altro.
 * Tutte in bianco e nero, con animazioni morbide (ridotte se il telefono lo chiede).
 */
import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { categoryMeta } from '../../shared/categories';
import type { Item } from '../../shared/types';
import { addMood, adjustWeight, answerCard, BOX_DAYS, exerciseDone, haptic, react, toast } from '../lib/actions';
import { hash, seeded, today } from '../lib/dates';
import { bumpStats, getState, useAppState, type Flashcard } from '../lib/store';
import { openDetail } from '../lib/ui';
import { Icon, IconCheck } from '../ui/icons';
import { langName, titles } from './common';

const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const ease = (p: number) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, p)));
const vibrate = (pattern: number | number[]) => navigator.vibrate?.(pattern);

/** Chiama `onFrame` a ogni fotogramma finché `running` è vero (o finché restituisce false). */
function useFrames(running: boolean, onFrame: (elapsed: number) => boolean | void) {
  const cb = useRef(onFrame);
  cb.current = onFrame;
  useEffect(() => {
    if (!running) return;
    const t0 = performance.now();
    let id = 0;
    const loop = (now: number) => {
      if (cb.current(now - t0) === false) return;
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [running]);
}

/* ── Spunta animata ─────────────────────────────────────────────────────── */

export function DoneMark({ size = 64 }: { size?: number }) {
  return (
    <svg class="done-mark" width={size} height={size} viewBox="0 0 52 52" aria-hidden="true">
      <circle class="dm-ring" cx="26" cy="26" r="23" pathLength={100} />
      <path class="dm-check" d="M15.5 27.5 22.5 34 37 18.5" pathLength={100} />
    </svg>
  );
}

/** Messaggio di fine esercizio: spunta che si disegna e una riga di testo. */
export function DoneNote({ title = 'Fatto.', children }: { title?: string; children?: ComponentChildren }) {
  return (
    <div class="done-note" role="status">
      <DoneMark />
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  );
}

/* ── Respiro quadrato ───────────────────────────────────────────────────── */

const PHASES = [
  { label: 'Inspira', hint: 'dal naso, lentamente' },
  { label: 'Trattieni', hint: 'a polmoni pieni' },
  { label: 'Espira', hint: 'dalla bocca, piano' },
  { label: 'Trattieni', hint: 'a polmoni vuoti' },
];
const PHASE_MS = 4000;
const CYCLE_MS = PHASE_MS * 4;
/** Quadrato con angoli arrotondati, percorso in senso orario dall'angolo in alto a sinistra. */
const BOX = 'M58 28H142A30 30 0 0 1 172 58V142A30 30 0 0 1 142 172H58A30 30 0 0 1 28 142V58A30 30 0 0 1 58 28Z';

/** Dimensione del cerchio nel tempo: si gonfia, resta, si sgonfia, resta. */
function orbScale(t: number) {
  if (t < 0) return 0.55;
  const phase = Math.floor(t / PHASE_MS) % 4;
  const p = (t % PHASE_MS) / PHASE_MS;
  if (phase === 0) return 0.55 + 0.45 * ease(p);
  if (phase === 1) return 1 + 0.012 * Math.sin(p * Math.PI * 4);
  if (phase === 2) return 1 - 0.45 * ease(p);
  return 0.55;
}

/**
 * Respirazione quadrata 4-4-4-4: un punto percorre il quadrato (un lato per fase),
 * il cerchio al centro si gonfia e si sgonfia con due aloni che lo seguono in ritardo.
 */
export function BoxBreath({ cycles = 4, onDone, intro }: { cycles?: number; onDone?: () => void; intro?: string }) {
  const [state, setState] = useState<'idle' | 'run' | 'done'>('idle');
  const [tick, setTick] = useState({ phase: 0, count: 4, cycle: 0 });
  const uid = useMemo(() => `bx${Math.random().toString(36).slice(2, 8)}`, []);
  const track = useRef<SVGPathElement>(null);
  const prog = useRef<SVGPathElement>(null);
  const dot = useRef<SVGCircleElement>(null);
  const orb = useRef<SVGGElement>(null);
  const halo1 = useRef<SVGGElement>(null);
  const halo2 = useRef<SVGGElement>(null);
  const last = useRef('');
  const still = useMemo(reducedMotion, []);

  useFrames(state === 'run', (t) => {
    const total = cycles * CYCLE_MS;
    if (t >= total) {
      setState('done');
      vibrate(30);
      onDone?.();
      return false;
    }
    const cycle = Math.floor(t / CYCLE_MS);
    const u = (t % CYCLE_MS) / CYCLE_MS;
    // I cicli pari disegnano il quadrato, quelli dispari lo cancellano: il movimento non si interrompe mai.
    prog.current?.setAttribute('stroke-dashoffset', String(cycle % 2 === 0 ? 100 - u * 100 : -u * 100));
    const path = track.current;
    if (path && dot.current) {
      const pt = path.getPointAtLength(u * path.getTotalLength());
      dot.current.setAttribute('cx', pt.x.toFixed(2));
      dot.current.setAttribute('cy', pt.y.toFixed(2));
    }
    const sc = (lag: number) => `scale(${(still ? 0.8 : orbScale(t - lag)).toFixed(4)})`;
    if (orb.current) orb.current.style.transform = sc(0);
    if (halo1.current) halo1.current.style.transform = sc(220);
    if (halo2.current) halo2.current.style.transform = sc(480);
    const phase = Math.floor(t / PHASE_MS) % 4;
    const count = 4 - Math.floor((t % PHASE_MS) / 1000);
    const key = `${cycle}-${phase}-${count}`;
    if (key !== last.current) {
      if (!last.current.startsWith(`${cycle}-${phase}-`)) vibrate(phase % 2 === 0 ? 14 : 6);
      last.current = key;
      setTick({ phase, count, cycle });
    }
  });

  // Fuori dall'esercizio, il cerchio torna fermo (lo anima solo il CSS, a riposo).
  useEffect(() => {
    if (state === 'run') return;
    for (const r of [orb, halo1, halo2]) if (r.current) r.current.style.transform = '';
    prog.current?.setAttribute('stroke-dashoffset', state === 'done' ? '0' : '100');
    last.current = '';
  }, [state]);

  const start = () => {
    setTick({ phase: 0, count: 4, cycle: 0 });
    setState('run');
    haptic();
  };
  const ph = PHASES[tick.phase];

  return (
    <div class={`bx ${state}`}>
      <div class="bx-stage" aria-hidden="true">
        <svg viewBox="14 14 172 172" class="bx-svg">
          <defs>
            <radialGradient id={uid} cx="38%" cy="32%" r="75%">
              <stop offset="0%" class="bx-s1" />
              <stop offset="100%" class="bx-s2" />
            </radialGradient>
          </defs>
          <path ref={track} d={BOX} class="bx-track" />
          <path ref={prog} d={BOX} class="bx-prog" pathLength={100} stroke-dasharray="100 100" stroke-dashoffset="100" />
          <g transform="translate(100 100)">
            <g ref={halo2} class="bx-orb-g">
              <circle r="56" class="bx-halo2" />
            </g>
            <g ref={halo1} class="bx-orb-g">
              <circle r="48" class="bx-halo1" />
            </g>
            <g ref={orb} class="bx-orb-g">
              <circle r="40" fill={`url(#${uid})`} />
            </g>
          </g>
          <circle ref={dot} r="5.5" cx="58" cy="28" class="bx-dot" />
        </svg>
        {state === 'run' && (
          <span class="bx-count" key={`${tick.cycle}-${tick.phase}-${tick.count}`}>
            {tick.count}
          </span>
        )}
        {state === 'done' && (
          <span class="bx-done">
            <IconCheck size={34} />
          </span>
        )}
      </div>
      <div class="bx-text" role="status" aria-live="polite">
        {state === 'run' ? (
          <>
            <p class="bx-phase" key={`${tick.cycle}-${tick.phase}`}>
              {ph.label}
            </p>
            <p class="bx-hint">{ph.hint}</p>
          </>
        ) : state === 'done' ? (
          <>
            <p class="bx-phase">Fatto. Come va?</p>
            <p class="bx-hint">Il respiro lento calma il battito: bastano pochi cicli.</p>
          </>
        ) : (
          <>
            <p class="bx-phase">{intro ?? `${cycles === 4 ? 'Un minuto' : 'Mezzo minuto'}, ${cycles} respiri lenti`}</p>
            <p class="bx-hint">Segui il punto: inspira, trattieni, espira, trattieni. Quattro secondi ciascuno.</p>
          </>
        )}
      </div>
      <div class="bx-pips" aria-hidden="true">
        {Array.from({ length: cycles }, (_, i) => (
          <i key={i} class={state === 'done' || (state === 'run' && i < tick.cycle) ? 'on' : state === 'run' && i === tick.cycle ? 'now' : ''} />
        ))}
      </div>
      {state !== 'run' && (
        <button class="btn block" onClick={start}>
          {state === 'done' ? 'Ancora una volta' : 'Inizia'}
        </button>
      )}
    </div>
  );
}

/* ── Esercizi a tempo (sguardo lontano, stretching…) ────────────────────── */

export interface TimedStep {
  title: string;
  text: string;
  seconds: number;
  icon: string;
}

/** Anello che si svuota secondo per secondo, con i secondi rimasti al centro. */
function TimerRing({ ms, total, icon }: { ms: number; total: number; icon: string }) {
  const left = Math.max(0, Math.ceil((total - ms) / 1000));
  return (
    <div class="ring" aria-hidden="true">
      <svg viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="52" class="ring-track" />
        <circle cx="60" cy="60" r="52" class="ring-prog" pathLength={100} stroke-dasharray="100 100" stroke-dashoffset={String((ms / total) * 100)} />
      </svg>
      <span class="ring-icon">
        <Icon name={icon} size={22} />
      </span>
      <span class="ring-num" key={left}>
        {left}
      </span>
    </div>
  );
}

/** Una sequenza di passi a tempo: un anello per passo, una vibrazione a ogni cambio. */
export function TimedSteps({ steps, onDone, cta = 'Inizia' }: { steps: TimedStep[]; onDone?: () => void; cta?: string }) {
  const [state, setState] = useState<'idle' | 'run' | 'done'>('idle');
  const [pos, setPos] = useState({ step: 0, ms: 0 });
  const bounds = useMemo(() => steps.reduce<number[]>((acc, s) => [...acc, (acc.at(-1) ?? 0) + s.seconds * 1000], []), [steps]);

  useFrames(state === 'run', (t) => {
    if (t >= bounds.at(-1)!) {
      setState('done');
      vibrate(30);
      onDone?.();
      return false;
    }
    const step = bounds.findIndex((b) => t < b);
    const ms = t - (step ? bounds[step - 1] : 0);
    setPos((p) => {
      if (p.step !== step) vibrate(12);
      return { step, ms };
    });
  });

  if (state === 'done') return <DoneNote title="Fatto.">Bel lavoro: corpo e occhi ringraziano.</DoneNote>;
  const cur = steps[pos.step];
  return (
    <div class={`timed ${state}`}>
      {state === 'run' ? (
        <>
          <TimerRing ms={pos.ms} total={cur.seconds * 1000} icon={cur.icon} />
          <div class="timed-text" key={pos.step} role="status" aria-live="polite">
            <b>{cur.title}</b>
            <p>{cur.text}</p>
          </div>
          {steps.length > 1 && (
            <div class="bx-pips" aria-hidden="true">
              {steps.map((_, i) => (
                <i key={i} class={i < pos.step ? 'on' : i === pos.step ? 'now' : ''} />
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <ol class="timed-list">
            {steps.map((s, i) => (
              <li key={i}>
                <span class="timed-ic">
                  <Icon name={s.icon} size={18} />
                </span>
                <span>
                  <b>{s.title}</b> · {s.seconds} s<br />
                  <span class="muted small">{s.text}</span>
                </span>
              </li>
            ))}
          </ol>
          <button
            class="btn block"
            onClick={() => {
              setPos({ step: 0, ms: 0 });
              setState('run');
              haptic();
            }}
          >
            {cta}
          </button>
        </>
      )}
    </div>
  );
}

export const EYES: TimedStep[] = [
  { title: 'Guarda lontano', text: 'Cerca il punto più lontano che vedi, fuori dalla finestra se puoi. Lascia che gli occhi si rilassino.', seconds: 20, icon: 'eye' },
];
export const STRETCH: TimedStep[] = [
  { title: 'Collo a destra', text: 'Inclina piano la testa verso la spalla destra. Respira.', seconds: 12, icon: 'arms' },
  { title: 'Collo a sinistra', text: 'Ora verso la spalla sinistra, senza forzare.', seconds: 12, icon: 'arms' },
  { title: 'Spalle', text: 'Portale su verso le orecchie, poi lasciale cadere. Ripeti piano.', seconds: 12, icon: 'arms' },
];
export const STAND: TimedStep[] = [
  { title: 'In piedi', text: 'Alzati e allunga le braccia verso il soffitto, più in alto che puoi.', seconds: 10, icon: 'arms' },
  { title: 'Qualche passo', text: 'Cammina un po’, anche solo fino alla finestra e ritorno.', seconds: 20, icon: 'walk' },
];
export const PALMING: TimedStep[] = [
  { title: 'Scalda le mani', text: 'Strofina i palmi uno contro l’altro, veloce.', seconds: 8, icon: 'hands' },
  { title: 'Occhi al buio', text: 'Chiudi gli occhi e coprili con i palmi caldi, senza premere. Respira piano.', seconds: 20, icon: 'eye' },
];

/** Card del feed con un esercizio a tempo. */
export function TimedCard({ kind }: { kind: 'sguardo' | 'stretching' }) {
  const s = useAppState();
  const done = (s.exercisesDone[today()] ?? []).includes(kind);
  const eyes = kind === 'sguardo';
  return (
    <section class="special">
      <div class="kicker">
        <Icon name={eyes ? 'eye' : 'arms'} size={15} /> Pausa attiva
      </div>
      <h2>{eyes ? 'Venti secondi per gli occhi' : 'Sciogli collo e spalle'}</h2>
      {done ? (
        <DoneNote title="Già fatto oggi.">Ottimo: lo ritrovi anche nella sezione Pratica.</DoneNote>
      ) : (
        <>
          <p>{eyes ? 'Regola 20-20-20: ogni 20 minuti di schermo, 20 secondi guardando lontano.' : 'Un minuto scarso, seduto o in piedi.'}</p>
          <TimedSteps steps={eyes ? EYES : STRETCH} onDone={() => exerciseDone(kind)} />
        </>
      )}
    </section>
  );
}

/* ── Quiz lampo ─────────────────────────────────────────────────────────── */

/** Una domanda su un contenuto appena visto, con risposta immediata. */
export function FlashQuiz({ item }: { item: Item }) {
  const q = item.quiz!;
  const [a, setA] = useState<number | null>(null);
  const mode = getState().settings.summaryMode;
  const choose = (i: number) => {
    if (a !== null) return;
    setA(i);
    const ok = i === q.answer;
    vibrate(ok ? 12 : [8, 60, 8]);
    bumpStats((d) => ({ quizOk: d.quizOk + (ok ? 1 : 0), quizTotal: d.quizTotal + 1 }));
  };
  return (
    <section class="special">
      <div class="kicker">
        <Icon name="bolt" size={15} /> Quiz lampo
      </div>
      <p class="muted small" style={{ margin: '6px 0 0' }}>
        Su un contenuto che hai appena visto
      </p>
      <h2>{q.q}</h2>
      {q.options.map((o, i) => (
        <button
          key={i}
          class={`quiz-opt${a !== null && i === q.answer ? ' right' : ''}${a === i && i !== q.answer ? ' wrong' : ''}${a !== null && a !== i && i !== q.answer ? ' dim' : ''}`}
          onClick={() => choose(i)}
          aria-pressed={a === i}
        >
          <span class="quiz-letter">{'ABC'[i]}</span>
          {o}
        </button>
      ))}
      {a !== null && (
        <div class="flash-result" role="status">
          <b>{a === q.answer ? 'Esatto.' : 'Quasi.'}</b> Era in “{titles(item, mode).main}”.{' '}
          <button class="link" onClick={() => openDetail(item)}>
            Rileggi
          </button>
        </div>
      )}
    </section>
  );
}

/* ── Questo o quello ────────────────────────────────────────────────────── */

/** Due contenuti a confronto: la scelta insegna al feed cosa ti interessa di più. */
export function ThisOrThat({ a, b }: { a: Item; b: Item }) {
  const [pick, setPick] = useState<Item | null>(null);
  const mode = getState().settings.summaryMode;
  const choose = (x: Item, y: Item) => {
    if (pick) return;
    setPick(x);
    haptic();
    adjustWeight(`c:${x.category}`, 0.4);
    adjustWeight(`s:${x.sourceId}`, 0.2);
    if (y.category !== x.category) adjustWeight(`c:${y.category}`, -0.15);
  };
  const tile = (x: Item, y: Item) => (
    <button
      class={`tot-opt${pick === x ? ' chosen' : pick ? ' dropped' : ''}`}
      onClick={() => choose(x, y)}
      aria-pressed={pick === x}
      aria-label={titles(x, mode).main}
    >
      {x.image && <img src={x.image} alt="" loading="lazy" referrerpolicy="no-referrer" />}
      <span class="tot-shade" />
      <span class="tot-cat">
        <Icon name={categoryMeta(x.category).icon} size={13} /> {categoryMeta(x.category).label}
      </span>
      <span class="tot-title">{titles(x, mode).main}</span>
      {pick === x && (
        <span class="tot-check">
          <IconCheck size={20} />
        </span>
      )}
    </button>
  );
  return (
    <section class="special">
      <div class="kicker">
        <Icon name="split" size={15} /> Questo o quello?
      </div>
      <h2>Cosa leggeresti adesso?</h2>
      <div class="tot">
        {tile(a, b)}
        <span class="tot-or" aria-hidden="true">
          o
        </span>
        {tile(b, a)}
      </div>
      {pick ? (
        <div class="flash-result" role="status">
          <b>Segnato.</b> Più {categoryMeta(pick.category).label.toLowerCase()} nei prossimi giorni.{' '}
          <button class="link" onClick={() => openDetail(pick)}>
            Leggilo ora
          </button>
        </div>
      ) : (
        <p class="muted small" style={{ marginTop: '10px' }}>
          La tua scelta aggiusta i gusti del feed, sul telefono.
        </p>
      )}
    </section>
  );
}

/* ── Indovina l'anno ────────────────────────────────────────────────────── */

/** Anno di un'opera dai metadati del museo ("c. 1665", "1885–86"…); null se incerto. */
export function artYear(item: Item): number | null {
  const d = item.art?.date;
  if (!d || /a\.\s?C|B\.?C|secolo|century|dynasty|dinastia/i.test(d)) return null;
  const m = d.match(/\b(1[0-9]{3}|20[0-2][0-9])\b/);
  return m ? Number(m[1]) : null;
}

export function GuessYear({ item, year }: { item: Item; year: number }) {
  // Un intervallo diverso per ogni opera, così la risposta non sta mai al centro.
  const range = useMemo(() => {
    const rnd = seeded(item.id);
    const span = 140 + Math.round(rnd() * 160);
    let min = Math.round((year - span * (0.15 + 0.7 * rnd())) / 10) * 10;
    const maxYear = new Date().getFullYear();
    if (min + span > maxYear) min = maxYear - span;
    return { min, max: min + span };
  }, [item.id, year]);
  const [guess, setGuess] = useState(Math.round((range.min + range.max) / 2 / 5) * 5);
  const [shown, setShown] = useState(false);
  const diff = Math.abs(guess - year);
  const pct = (y: number) => `${((y - range.min) / (range.max - range.min)) * 100}%`;
  const verdict = diff <= 5 ? 'Perfetto!' : diff <= 25 ? 'Ottimo occhio.' : diff <= 75 ? 'Non male.' : 'Lontano, ma ora lo sai.';
  const mode = getState().settings.summaryMode;
  return (
    <section class="special">
      <div class="kicker">
        <Icon name="hourglass" size={15} /> Indovina l’anno
      </div>
      <h2>Quando è stata realizzata?</h2>
      {item.image && <img class="guess-img" src={item.image} alt={item.imageAlt ?? ''} loading="lazy" referrerpolicy="no-referrer" />}
      <div class={`guess${shown ? ' shown' : ''}`}>
        <div class="guess-year" aria-live="polite">
          {shown ? year : guess}
        </div>
        <div class="guess-track">
          <input
            type="range"
            min={range.min}
            max={range.max}
            step={5}
            value={guess}
            disabled={shown}
            onInput={(e) => setGuess(Number(e.currentTarget.value))}
            aria-label="Il tuo anno"
          />
          {shown && (
            <>
              <span class="guess-mark you" style={{ left: pct(guess) }} title="Tu" />
              <span class="guess-mark real" style={{ left: pct(year) }} title="Anno vero" />
            </>
          )}
        </div>
        <div class="guess-scale muted small">
          <span>{range.min}</span>
          <span>{range.max}</span>
        </div>
      </div>
      {shown ? (
        <div class="flash-result" role="status">
          <b>{verdict}</b> {diff ? `Hai detto ${guess}: ${diff} anni di differenza.` : 'Anno esatto.'}
          <br />
          <span class="muted">
            {titles(item, mode).main}
            {item.art?.artist ? ` · ${item.art.artist}` : ''}
            {item.art?.museum ? ` · ${item.art.museum}` : ''}
          </span>{' '}
          <button class="link" onClick={() => openDetail(item)}>
            Apri l’opera
          </button>
        </div>
      ) : (
        <button
          class="btn block"
          style={{ marginTop: '12px' }}
          onClick={() => {
            setShown(true);
            vibrate(diff <= 25 ? 20 : 8);
          }}
        >
          Conferma {guess}
        </button>
      )}
    </section>
  );
}

/* ── Come stai? ─────────────────────────────────────────────────────────── */

const MOODS = ['Giù', 'Così così', 'Ok', 'Bene', 'Benissimo'];

/** Faccina minimale: la bocca si piega secondo l'umore (1-5). */
export function MoodFace({ v, size = 40 }: { v: number; size?: number }) {
  const k = [-3, -1.5, 0, 2, 3.5][v - 1];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9.2" />
      <path d="M8.6 9.6h.01M15.4 9.6h.01" stroke-width="2.6" />
      <path d={`M8 ${15 - k / 3} Q12 ${15 + k} 16 ${15 - k / 3}`} />
    </svg>
  );
}

const MOOD_REPLY = [
  'Grazie di averlo detto. Forse è il momento di una pausa vera, lontano dallo schermo.',
  'Capita. Un minuto di respiro lento può aiutare più di altri contenuti.',
  'Ok. Prenditi quello che ti serve, senza fretta.',
  'Bene. Continua pure, ma ricordati di alzare lo sguardo ogni tanto.',
  'Ottimo. Goditela: magari raccontalo a qualcuno.',
];

export function MoodCheck() {
  const s = useAppState();
  const [v, setV] = useState<number | null>(null);
  // Dopo la risposta, le ultime volte comprendono già quella di adesso.
  const recent = s.moods.slice(-7);
  const choose = (x: number) => {
    if (v) return;
    setV(x);
    addMood(x);
    haptic();
  };
  return (
    <section class="special">
      <div class="kicker">
        <Icon name="smile" size={15} /> Check-in
      </div>
      <h2>Come ti senti adesso?</h2>
      <div class={`moods${v ? ' picked' : ''}`} role="radiogroup" aria-label="Come ti senti">
        {MOODS.map((label, i) => (
          <button key={i} role="radio" aria-checked={v === i + 1} class={v === i + 1 ? 'on' : ''} onClick={() => choose(i + 1)}>
            <MoodFace v={i + 1} />
            <span>{label}</span>
          </button>
        ))}
      </div>
      {v ? (
        <div class="flash-result" role="status">
          {MOOD_REPLY[v - 1]}
          {v <= 2 && (
            <>
              {' '}
              <a class="link" href="#/pratica/respiro">
                Respira un minuto
              </a>
            </>
          )}
          {recent.length > 1 && (
            <div class="mood-trail" aria-label="Le ultime volte">
              <span class="muted small">Le ultime volte</span>
              {recent.map((m, i) => (
                <MoodFace key={i} v={m.v} size={20} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <p class="muted small" style={{ marginTop: '10px' }}>
          Resta sul tuo telefono: serve solo a te, per notare come ti fa sentire lo scorrere.
        </p>
      )}
    </section>
  );
}

/* ── Flashcard da girare ────────────────────────────────────────────────── */

export function FlashcardFlip({ card }: { card: Flashcard }) {
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState<boolean | null>(null);
  const answer = (knew: boolean) => {
    answerCard(card, knew);
    setDone(knew);
    haptic();
  };
  const next = done === null ? 0 : BOX_DAYS[done ? Math.min(card.box + 1, BOX_DAYS.length - 1) : 0];
  return (
    <section class="special">
      <div class="kicker">
        <Icon name="cards" size={15} /> Ripasso lampo
      </div>
      <h2>Ti ricordi questa parola?</h2>
      {done !== null ? (
        <DoneNote title={done ? 'La sapevi.' : 'Ok, la rivedrai presto.'}>Tornerà tra {next === 1 ? 'un giorno' : `${next} giorni`}.</DoneNote>
      ) : (
        <>
          <button class={`flip${flipped ? ' on' : ''}`} onClick={() => setFlipped((f) => !f)} aria-label={flipped ? 'Mostra la parola' : 'Mostra la definizione'}>
            <span class="flip-inner">
              <span class="flip-face front">
                <span class="muted small">{langName(card.lang)}</span>
                <b>{card.word}</b>
                <span class="muted small">Tocca per girarla</span>
              </span>
              <span class="flip-face back">
                <b class="flip-def">{card.definitionIt}</b>
                {card.example && <span class="muted small">“{card.example}”</span>}
              </span>
            </span>
          </button>
          {flipped && (
            <div class="row" style={{ marginTop: '12px' }}>
              <button class="btn ghost" onClick={() => answer(false)}>
                Da ripassare
              </button>
              <button class="btn" onClick={() => answer(true)}>
                Lo sapevo
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

/* ── Clip nel feed ──────────────────────────────────────────────────────── */

/** Copertina verticale di una clip, con ripiego sulla miniatura standard. */
export function ClipPoster({ item, eager }: { item: Item; eager?: boolean }) {
  const [src, setSrc] = useState(`https://i.ytimg.com/vi/${item.youtubeId}/oar2.jpg`);
  const fallback = `https://i.ytimg.com/vi/${item.youtubeId}/hqdefault.jpg`;
  return (
    <img
      class="clip-poster"
      src={src}
      alt=""
      loading={eager ? 'eager' : 'lazy'}
      referrerpolicy="no-referrer"
      onError={() => src !== fallback && setSrc(fallback)}
      onLoad={(e) => {
        // Se manca la copertina verticale YouTube risponde con un'immagine minuscola.
        if (src !== fallback && (e.currentTarget as HTMLImageElement).naturalWidth <= 120) setSrc(fallback);
      }}
    />
  );
}

/** Riga di clip nel feed, come i Reels tra i post: un tocco apre la sezione Clip. */
export function ClipsRail({ items }: { items: Item[] }) {
  const s = useAppState();
  const mode = s.settings.summaryMode;
  return (
    <section class="special clips-card">
      <div class="kicker">
        <Icon name="clip" size={15} /> Clip
      </div>
      <h2>Clip brevi, scelte per te</h2>
      <p class="muted small" style={{ marginTop: '-4px' }}>
        Solo da canali di qualità. {s.settings.clipRound} di fila al massimo, poi una pausa attiva.
      </p>
      <div class="clips-rail">
        {items.slice(0, 10).map((i) => (
          <a key={i.id} class="clip-thumb" href={`#/clip/${i.id}`} aria-label={titles(i, mode).main}>
            <ClipPoster item={i} />
            <span class="clip-thumb-shade" />
            <span class="clip-thumb-text">{titles(i, mode).main}</span>
            <span class="clip-thumb-name">{i.sourceName}</span>
          </a>
        ))}
      </div>
      <a class="btn block" href="#/clip" style={{ marginTop: '12px' }}>
        <Icon name="clip" size={18} /> Guarda le clip
      </a>
    </section>
  );
}

/* ── Pause attive tra un giro di clip e l'altro ─────────────────────────── */

type GateKind = 'respiro' | 'sguardo' | 'ricorda' | 'preferita' | 'stretching' | 'alzati' | 'palming';

/** Quale di queste hai appena visto? Una clip del giro e due mai viste. */
function RecallClips({ seen, others, onDone }: { seen: Item; others: Item[]; onDone: () => void }) {
  const mode = getState().settings.summaryMode;
  const opts = useMemo(() => {
    const list = [seen, ...others.slice(0, 2)];
    const r = seeded(seen.id);
    return list.map((i) => ({ i, k: r() })).sort((a, b) => a.k - b.k).map((x) => x.i);
  }, [seen.id]);
  const [a, setA] = useState<string | null>(null);
  return (
    <>
      <p>Quale di queste clip hai appena visto?</p>
      {opts.map((o, k) => (
        <button
          key={o.id}
          class={`quiz-opt${a && o.id === seen.id ? ' right' : ''}${a === o.id && o.id !== seen.id ? ' wrong' : ''}${a && a !== o.id && o.id !== seen.id ? ' dim' : ''}`}
          onClick={() => {
            if (a) return;
            setA(o.id);
            vibrate(o.id === seen.id ? 12 : 8);
            setTimeout(onDone, 900);
          }}
        >
          <span class="quiz-letter">{'ABC'[k]}</span>
          {titles(o, mode).main}
        </button>
      ))}
    </>
  );
}

/** La tua preferita del giro: vale come un "mi piace". */
function FavoriteClip({ clips, onDone }: { clips: Item[]; onDone: () => void }) {
  const [pick, setPick] = useState<string | null>(null);
  return (
    <>
      <p>Qual è stata la tua preferita di questo giro?</p>
      <div class="fav-grid">
        {clips.slice(0, 9).map((c) => (
          <button
            key={c.id}
            class={`fav${pick === c.id ? ' on' : pick ? ' off' : ''}`}
            onClick={() => {
              if (pick) return;
              setPick(c.id);
              if (getState().reactions[c.id] !== 'like') react(c, 'like');
              toast('Segnata: ne vedrai di simili');
              setTimeout(onDone, 700);
            }}
            aria-label={c.title}
          >
            <ClipPoster item={c} />
            {pick === c.id && (
              <span class="tot-check">
                <IconCheck size={18} />
              </span>
            )}
          </button>
        ))}
      </div>
    </>
  );
}

const GATE_TEXT: Record<GateKind, string> = {
  respiro: 'Due respiri quadrati, poi si riparte.',
  sguardo: 'Gli occhi lavorano da vicino da un po’: diamogli venti secondi.',
  ricorda: 'Un piccolo test di memoria sulle clip che hai visto.',
  preferita: 'Scegli la clip che ti è piaciuta di più.',
  stretching: 'Tre movimenti lenti per collo e spalle.',
  alzati: 'Trenta secondi in piedi: il corpo ringrazia.',
  palming: 'Riposo per gli occhi, con il calore delle mani.',
};

/**
 * Pausa attiva tra un giro di clip e il successivo: si continua solo dopo l'esercizio.
 * L'esercizio cambia a ogni giro.
 */
export function ClipGate({ round, clips, pool, count, onDone }: { round: number; clips: Item[]; pool: Item[]; count: number; onDone: () => void }) {
  const kind = useMemo<GateKind>(() => {
    const kinds: GateKind[] = ['respiro', 'ricorda', 'sguardo', 'preferita', 'stretching', 'alzati', 'palming'];
    const ok = kinds.filter((k) => (k === 'ricorda' ? clips.length >= 1 && pool.length >= 2 : k === 'preferita' ? clips.length >= 3 : true));
    return ok[(hash(today()) + round) % ok.length];
  }, [round]);
  const [done, setDone] = useState(false);
  const finish = () => {
    setDone(true);
    exerciseDone(`pausa-clip-${round}`);
  };
  return (
    <section class="special gate">
      <div class="kicker">
        <Icon name="pause" size={15} /> Pausa attiva
      </div>
      <h2>Hai visto {count} clip.</h2>
      {done ? (
        <>
          <DoneNote title="Pronto.">Puoi continuare, oppure fermarti qui: è un ottimo momento per farlo.</DoneNote>
          <div class="row" style={{ marginTop: '6px' }}>
            <button class="btn" onClick={onDone}>
              Altre clip
            </button>
            <a class="btn ghost" href="#/oggi">
              Basta così
            </a>
          </div>
        </>
      ) : (
        <>
          <p class="gate-intro">{GATE_TEXT[kind]}</p>
          {kind === 'respiro' ? (
            <BoxBreath cycles={2} onDone={finish} />
          ) : kind === 'ricorda' ? (
            <RecallClips seen={clips[Math.floor(seeded(String(round))() * clips.length)]} others={pool} onDone={finish} />
          ) : kind === 'preferita' ? (
            <FavoriteClip clips={clips} onDone={finish} />
          ) : (
            <TimedSteps
              steps={kind === 'sguardo' ? EYES : kind === 'stretching' ? STRETCH : kind === 'alzati' ? STAND : PALMING}
              onDone={finish}
            />
          )}
        </>
      )}
    </section>
  );
}

/** Fine delle clip di oggi: il limite che hai scelto. */
export function ClipLimit({ total }: { total: number }) {
  const [eyes, setEyes] = useState(false);
  return (
    <section class="special gate">
      <div class="kicker">
        <Icon name="moon" size={15} /> Fine delle clip
      </div>
      <h2>Per oggi basta clip.</h2>
      <p>
        {total ? `Ne hai guardate ${total}. ` : ''}Domani ne arrivano di nuove, scelte dalle prossime edizioni. Intanto, un ultimo regalo agli occhi:
      </p>
      {eyes ? <TimedSteps steps={EYES} onDone={() => exerciseDone('sguardo')} /> : null}
      <div class="row" style={{ marginTop: '10px', flexWrap: 'wrap' }}>
        {!eyes && (
          <button class="btn" onClick={() => setEyes(true)}>
            <Icon name="eye" size={18} /> 20 secondi lontano
          </button>
        )}
        <a class="btn ghost" href="#/oggi">
          Torna al feed
        </a>
        <a class="btn ghost" href="#/pratica">
          Pratica
        </a>
      </div>
      <p class="muted small" style={{ marginTop: '14px' }}>
        Il limite si cambia in Profilo › Impostazioni › Clip.
      </p>
    </section>
  );
}
