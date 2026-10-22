import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { SLOT_LABEL, editionId, editionSlot, type Edition, type EditionIndex, type Item } from '../../shared/types';
import { account } from '../lib/accounts';
import { addNote, react, removeNote } from '../lib/actions';
import { fetchEdition, fetchIndex } from '../lib/data';
import { ago, isoWeek, longDate, today } from '../lib/dates';
import { challengeFor } from '../lib/exercises';
import { buildStories } from '../lib/stories';
import { getState, setState, useAppState } from '../lib/store';
import { closeNotes, closeStories, openDetail, openStories, setActivityOpen, useUi, type StoryGroup } from '../lib/ui';
import { Avatar } from '../ui/Avatar';
import { Icon, IconBell, IconClose, IconHeart, IconTrash, IconUp } from '../ui/icons';
import { Sheet } from '../ui/Sheet';
import { bodyText, titles } from './common';

/* ── Storie ─────────────────────────────────────────────────────────────── */

function GroupAvatar({ g, size, ring }: { g: StoryGroup; size: number; ring?: 'new' | 'seen' }) {
  if (g.key.startsWith('s:')) return <Avatar id={g.key.slice(2)} item={g.items[0]} size={size} ring={ring} />;
  return (
    <span class={`av${ring ? ` ring ${ring}` : ''}`} style={{ width: `${size}px`, height: `${size}px` }} aria-hidden="true">
      <span>
        <Icon name={g.icon} size={Math.round(size * 0.46)} />
      </span>
    </span>
  );
}

/** La fila di storie in cima al feed. */
export function StoriesBar({ edition, compact }: { edition: Edition; compact?: boolean }) {
  const s = useAppState();
  const key = editionId(edition);
  const groups = useMemo(() => buildStories(edition.items, s), [edition, s.follows]);
  if (!groups.length) return null;
  const seen = (g: StoryGroup) => s.storiesSeen[g.key] === key;
  // Le storie non ancora viste vengono prima.
  const order = [...groups].sort((a, b) => Number(seen(a)) - Number(seen(b)));
  if (compact) {
    const first = order.slice(0, 3);
    return (
      <button class="stories-mini" onClick={() => openStories(order, 0)} aria-label="Apri le storie">
        {first.map((g) => (
          <GroupAvatar key={g.key} g={g} size={30} ring={seen(g) ? 'seen' : 'new'} />
        ))}
      </button>
    );
  }
  return (
    <div class="stories" aria-label="Storie">
      {order.map((g, i) => (
        <button key={g.key} class="story" onClick={() => openStories(order, i)}>
          <GroupAvatar g={g} size={62} ring={seen(g) ? 'seen' : 'new'} />
          <span>{g.label}</span>
        </button>
      ))}
    </div>
  );
}

const FRAME_MS = 6500;

function StoryViewer({ groups, start }: { groups: StoryGroup[]; start: number }) {
  const s = useAppState();
  const { detail } = useUi();
  const [g, setG] = useState(start);
  const [f, setF] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [held, setHeld] = useState(false);
  const touch = useRef<{ y: number; t: number } | null>(null);
  const group = groups[g];
  const item = group?.items[f];
  const paused = held || !!detail;

  // Segna la storia come vista per questa edizione.
  useEffect(() => {
    if (!group) return;
    setState((st) => ({ storiesSeen: { ...st.storiesSeen, [group.key]: currentEdition ?? today() } }));
  }, [g]);

  const next = () => {
    setElapsed(0);
    if (f + 1 < group.items.length) setF(f + 1);
    else if (g + 1 < groups.length) {
      setG(g + 1);
      setF(0);
    } else closeStories();
  };
  const prev = () => {
    setElapsed(0);
    if (f > 0) setF(f - 1);
    else if (g > 0) {
      setG(g - 1);
      setF(0);
    }
  };

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setElapsed((e) => e + 100), 100);
    return () => clearInterval(t);
  }, [paused, g, f]);
  useEffect(() => {
    if (elapsed >= FRAME_MS) next();
  }, [elapsed]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeStories();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!group || !item) return null;
  const mode = s.settings.summaryMode;
  const t = titles(item, mode);
  const liked = s.reactions[item.id] === 'like';

  return (
    <div
      class="story-viewer"
      role="dialog"
      aria-label={`Storia: ${group.label}`}
      onPointerDown={() => setHeld(true)}
      onPointerUp={() => setHeld(false)}
      onPointerCancel={() => setHeld(false)}
      onTouchStart={(e) => (touch.current = { y: e.touches[0].clientY, t: Date.now() })}
      onTouchEnd={(e) => {
        const st = touch.current;
        if (st && e.changedTouches[0].clientY - st.y > 90) closeStories();
      }}
    >
      {item.image && item.kind !== 'word' ? (
        <>
          <div class="slide-blur" style={{ backgroundImage: `url("${item.image}")` }} />
          <img class={`story-img${['artwork', 'image', 'comic'].includes(item.kind) ? ' contain' : ''}`} src={item.image} alt={item.imageAlt ?? ''} referrerpolicy="no-referrer" />
          <div class="slide-shade" />
        </>
      ) : null}
      <div class="story-bars" aria-hidden="true">
        {group.items.map((_, i) => (
          <i key={i}>
            <b style={{ width: i < f ? '100%' : i === f ? `${Math.min(100, (elapsed / FRAME_MS) * 100)}%` : '0%' }} />
          </i>
        ))}
      </div>
      <div class="story-top">
        <GroupAvatar g={group} size={32} />
        <b>{group.label}</b>
        <span class="muted-on">{ago(item.publishedAt)}</span>
        <span style={{ flex: 1 }} />
        <button class="icon-btn" onClick={() => closeStories()} aria-label="Chiudi le storie">
          <IconClose size={24} />
        </button>
      </div>
      <button class="story-nav prev" onClick={prev} aria-label="Indietro" />
      <button class="story-nav next" onClick={next} aria-label="Avanti" />
      <div class={`story-body${!item.image || item.kind === 'word' ? ' typo' : ''}`}>
        <div class="story-src">
          <Avatar id={item.sourceId} item={item} size={24} /> {item.sourceName}
        </div>
        {item.kind === 'word' && item.word ? (
          <>
            <h2 class="slide-title huge">{item.word.word}</h2>
            <p class="slide-summary">{item.word.definitionIt}</p>
          </>
        ) : item.kind === 'poem' && item.excerpt ? (
          <>
            <h2 class="slide-title">{t.main}</h2>
            <div class="poem-lines">{item.excerpt.split('\n').slice(0, 8).join('\n')}</div>
          </>
        ) : (
          <>
            <h2 class="slide-title">{t.main}</h2>
            {!item.image && <p class="slide-summary">{bodyText(item, mode)}</p>}
          </>
        )}
        <div class="row" style={{ marginTop: '6px' }}>
          <button class="btn small light" onClick={() => openDetail(item)}>
            <IconUp size={16} /> Leggi
          </button>
          <button class={`icon-btn${liked ? ' liked' : ''}`} onClick={() => react(item, 'like')} aria-label="Mi piace" aria-pressed={liked}>
            <IconHeart size={26} fill={liked} />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Id dell'edizione aperta in Oggi, per ricordare le storie viste. */
let currentEdition: string | null = null;
export const setCurrentEdition = (id: string) => (currentEdition = id);

/* ── Note (i "commenti", privati) ───────────────────────────────────────── */

function NotesSheet({ item }: { item: Item }) {
  const s = useAppState();
  const [text, setText] = useState('');
  const notes = s.notes[item.id] ?? [];
  const a = account(item.sourceId, item);
  const quote = item.excerptIt ?? (item.kind !== 'poem' ? item.excerpt : undefined);
  const send = () => {
    addNote(item, text);
    setText('');
  };
  return (
    <Sheet title="Note" onClose={closeNotes}>
      <p class="muted small" style={{ marginTop: 0 }}>
        Le note le vedi solo tu: pensieri, domande, cose da ricordare. Il contenuto finisce nei tuoi salvati.
      </p>
      {quote && (
        <div class="comment">
          <Avatar id={item.sourceId} item={item} size={32} />
          <div>
            <b>{a.name}</b> <span class="muted small">· dal testo originale</span>
            <p>{quote}</p>
          </div>
        </div>
      )}
      {notes.map((n) => (
        <div class="comment" key={n.at}>
          <span class="av" style={{ width: '32px', height: '32px', fontSize: '12px' }}>
            <span>{(s.settings.name || 'Tu').charAt(0).toUpperCase()}</span>
          </span>
          <div style={{ flex: 1 }}>
            <b>{s.settings.name || 'Tu'}</b> <span class="muted small">· {ago(n.at) || 'adesso'}</span>
            <p style={{ whiteSpace: 'pre-line' }}>{n.text}</p>
          </div>
          <button class="icon-btn" onClick={() => removeNote(item.id, n.at)} aria-label="Elimina la nota">
            <IconTrash size={17} />
          </button>
        </div>
      ))}
      {!notes.length && !quote && <p class="muted">Ancora nessuna nota.</p>}
      <div class="comment-input">
        <textarea
          value={text}
          rows={1}
          onInput={(e) => setText(e.currentTarget.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
          placeholder="Aggiungi una nota…"
          aria-label="Nuova nota"
        />
        <button class="btn small" disabled={!text.trim()} onClick={send}>
          Pubblica
        </button>
      </div>
    </Sheet>
  );
}

/* ── Attività ───────────────────────────────────────────────────────────── */

interface Notif {
  key: string;
  icon?: string;
  item?: Item;
  text: string;
  sub?: string;
  href?: string;
}

/** Gli avvisi dell'app: tutti calcolati sul telefono, nessuna notifica push. */
export function useActivity(): { list: Notif[]; unseen: number } {
  const s = useAppState();
  const [data, setData] = useState<{ index: EditionIndex; edition: Edition } | null>(null);
  useEffect(() => {
    const load = () =>
      fetchIndex().then(async (index) => {
        if (!index?.latest) return;
        const edition = await fetchEdition(index.latest);
        if (edition) setData({ index, edition });
      });
    load();
    const on = () => document.visibilityState === 'visible' && load();
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);

  const list = useMemo(() => {
    const out: Notif[] = [];
    const t = today();
    if (data) {
      const { edition } = data;
      const id = editionId(edition);
      out.push({
        key: `ed:${id}`,
        icon: 'news',
        text: `È uscita l’edizione ${SLOT_LABEL[editionSlot(edition)]}: ${edition.items.length} contenuti nuovi.`,
        sub: longDate(edition.date),
        href: '#/oggi',
      });
      for (const item of edition.items.filter((i) => s.follows[`s:${i.sourceId}`]).slice(0, 8)) {
        out.push({ key: `f:${item.id}`, item, text: `${item.sourceName} ha pubblicato: ${titles(item, s.settings.summaryMode).main}`, sub: ago(item.publishedAt) });
      }
      const tagged = edition.items.filter((i) => i.tags.some((tg) => s.follows[`t:${tg}`]) && !s.follows[`s:${i.sourceId}`]).slice(0, 5);
      for (const item of tagged) {
        const tg = item.tags.find((x) => s.follows[`t:${x}`])!;
        out.push({ key: `t:${item.id}`, item, text: `Nuovo in #${tg.replace(/\s+/g, '')}: ${titles(item, s.settings.summaryMode).main}` });
      }
      const word = edition.items.find((i) => i.kind === 'word' && i.word);
      if (word) out.push({ key: `w:${word.id}`, icon: 'type', item: word, text: `Parola del giorno: ${word.word!.word}`, sub: word.word!.definitionIt });
      if (edition.items.some((i) => i.quiz) && !s.quizDone[id]) out.push({ key: `qz:${id}`, icon: 'question', text: 'Il quiz di questa edizione ti aspetta alla fine del feed.', href: '#/oggi' });
    }
    const due = Object.values(s.cards).filter((c) => c.due <= t).length;
    if (due) out.push({ key: `fc:${t}`, icon: 'cards', text: `${due} ${due === 1 ? 'parola' : 'parole'} da ripassare: bastano due minuti.`, href: '#/pratica/flashcard' });
    const recall = Object.values(s.saved).find((e) => e.review && e.review.next <= t);
    if (recall) out.push({ key: `rc:${recall.item.id}:${t}`, icon: 'cycle', item: recall.item, text: `Ti ricordi? “${titles(recall.item, s.settings.summaryMode).main}”` });
    const ch = challengeFor(t);
    if (!(s.exercisesDone[t] ?? []).includes(`sfida:${ch.title}`)) out.push({ key: `sf:${t}`, icon: 'bolt', text: `Sfida di oggi: ${ch.title}`, sub: ch.text, href: '#/pratica' });
    const dow = new Date().getDay();
    if (dow === 0 || dow === 1) out.push({ key: `wk:${isoWeek(t)}`, icon: 'calendar', text: 'Il riepilogo della tua settimana è pronto.', href: '#/tu' });
    return out;
  }, [data, s.follows, s.cards, s.saved, s.quizDone, s.exercisesDone, s.settings.summaryMode]);

  const seen = new Set(s.activitySeen);
  return { list, unseen: list.filter((n) => !seen.has(n.key)).length };
}

function ActivitySheet() {
  const s = useAppState();
  const { list } = useActivity();
  const [seenBefore] = useState(() => new Set(getState().activitySeen));
  useEffect(() => {
    if (!list.length) return;
    setState((st) => ({ activitySeen: [...new Set([...st.activitySeen, ...list.map((n) => n.key)])].slice(-300) }));
  }, [list.length]);
  const close = () => setActivityOpen(false);
  const go = (n: Notif) => {
    close();
    if (n.item) openDetail(n.item);
    else if (n.href) {
      if (n.href === '#/oggi') window.dispatchEvent(new Event('bs:latest'));
      location.hash = n.href;
    }
  };
  const fresh = list.filter((n) => !seenBefore.has(n.key));
  const old = list.filter((n) => seenBefore.has(n.key));
  const row = (n: Notif) => (
    <button key={n.key} class={`notif${seenBefore.has(n.key) ? '' : ' new'}`} onClick={() => go(n)}>
      {n.item && !n.icon ? (
        <Avatar id={n.item.sourceId} item={n.item} size={40} />
      ) : (
        <span class="notif-ico">
          <Icon name={n.icon ?? 'star'} size={20} />
        </span>
      )}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span class="notif-text">{n.text}</span>
        {n.sub && <span class="notif-sub">{n.sub}</span>}
      </span>
      {n.item?.image && <img src={n.item.image} alt="" loading="lazy" referrerpolicy="no-referrer" />}
    </button>
  );
  return (
    <Sheet title="Attività" onClose={close}>
      {!Object.keys(s.follows).length && (
        <p class="muted small" style={{ marginTop: 0 }}>
          Segui qualche account (il + sulla foto profilo) per sapere qui quando pubblica qualcosa di nuovo.
        </p>
      )}
      {fresh.length > 0 && <h3 class="section-title" style={{ marginTop: '4px' }}>Nuove</h3>}
      {fresh.map(row)}
      {old.length > 0 && <h3 class="section-title">Già viste</h3>}
      {old.map(row)}
      {!list.length && <p class="muted">Niente di nuovo. Goditi la giornata.</p>}
    </Sheet>
  );
}

/** Pulsante con la campanella e il numero di avvisi nuovi. */
export function BellButton() {
  const { unseen } = useActivity();
  return (
    <button class="icon-btn bell" onClick={() => setActivityOpen(true)} aria-label={unseen ? `Attività: ${unseen} nuove` : 'Attività'}>
      <IconBell size={22} />
      {unseen > 0 && <span class="badge">{unseen > 9 ? '9+' : unseen}</span>}
    </button>
  );
}

/** Fogli e schermi "social" apribili da ovunque. */
export function SocialLayers() {
  const { notes, stories, activity } = useUi();
  return (
    <>
      {stories && <StoryViewer groups={stories.groups} start={stories.start} key={stories.start + stories.groups.length} />}
      {notes && <NotesSheet item={notes} key={notes.id} />}
      {activity && <ActivitySheet />}
    </>
  );
}

