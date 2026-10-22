import { useEffect, useMemo, useState } from 'preact/hooks';
import { CATEGORIES, categoryMeta, isCategory } from '../../shared/categories';
import type { CategoryId, Item } from '../../shared/types';
import { GridTile, MiniRow } from '../cards/ItemCards';
import { account, accountLine, allAccounts, handle, type Account } from '../lib/accounts';
import { lessOf, toggleFollow } from '../lib/actions';
import { loadRecent, type RecentItem } from '../lib/data';
import { seeded } from '../lib/dates';
import { scoreItem } from '../lib/ranking';
import { getState, useAppState } from '../lib/store';
import { Avatar } from '../ui/Avatar';
import { Icon, IconBack, IconExternal, IconGrid, IconSearch, IconVerified } from '../ui/icons';

function useRecent(): RecentItem[] | null {
  const [list, setList] = useState<RecentItem[] | null>(null);
  useEffect(() => {
    loadRecent().then(setList);
  }, []);
  return list;
}

export function FollowButton({ k, label, small }: { k: string; label: string; small?: boolean }) {
  const s = useAppState();
  const on = !!s.follows[k];
  return (
    <button class={`btn ${on ? 'ghost' : ''} ${small ? 'small' : ''}`} onClick={() => toggleFollow(k, label)} aria-pressed={on}>
      {on ? 'Segui già' : 'Segui'}
    </button>
  );
}

/** Griglia stile "Esplora": ogni 7 riquadri uno grande. */
function Grid({ items }: { items: Item[] }) {
  if (!items.length) return <p class="muted">Niente da mostrare qui, per ora.</p>;
  return (
    <div class="grid3">
      {items.map((i, k) => (
        <GridTile key={i.id} item={i} big={k % 10 === 2 && !!i.image} />
      ))}
    </div>
  );
}

/** Account da seguire, scelti tra le fonti presenti nelle ultime edizioni. */
function Suggestions({ recent, category }: { recent: RecentItem[]; category?: CategoryId }) {
  const s = useAppState();
  const accounts = useMemo(() => {
    const count = new Map<string, number>();
    for (const r of recent) count.set(r.item.sourceId, (count.get(r.item.sourceId) ?? 0) + 1);
    return [...count.keys()]
      .map((id) => account(id, recent.find((r) => r.item.sourceId === id)?.item))
      .filter((a) => !s.follows[`s:${a.id}`] && (!category || a.category === category))
      .sort((a, b) => b.quality + (s.weights[`s:${b.id}`] ?? 0) + (s.weights[`c:${b.category}`] ?? 0) * 0.2 - (a.quality + (s.weights[`s:${a.id}`] ?? 0) + (s.weights[`c:${a.category}`] ?? 0) * 0.2))
      .slice(0, 12);
  }, [recent, category]);
  if (!accounts.length) return null;
  return (
    <>
      <h2 class="section-title">Account da seguire</h2>
      <div class="suggest">
        {accounts.map((a) => (
          <div class="suggest-card" key={a.id}>
            <a href={`#/fonte/${a.id}`}>
              <Avatar id={a.id} size={56} />
            </a>
            <a href={`#/fonte/${a.id}`} class="suggest-name">
              {a.name} {a.verified && <IconVerified />}
            </a>
            <span class="muted small suggest-about">{a.about}</span>
            <FollowButton k={`s:${a.id}`} label={a.name} small />
          </div>
        ))}
      </div>
    </>
  );
}

function matches(i: Item, q: string) {
  return [i.title, i.titleIt, i.summary, i.sourceName, i.author, ...i.tags].some((x) => x?.toLowerCase().includes(q));
}

export function Explore({ cat }: { cat?: string }) {
  const recent = useRecent();
  const [q, setQ] = useState('');
  const category = cat && isCategory(cat) ? cat : undefined;
  const needle = q.trim().toLowerCase();

  // Prima quello che non hai ancora visto, mescolato secondo i tuoi gusti (stabile durante la giornata).
  const items = useMemo(() => {
    if (!recent) return [];
    const st = getState();
    const rnd = seeded(`explore-${recent[0]?.edition}`);
    return recent
      .map((r) => r.item)
      .filter((i) => (!category || i.category === category) && i.kind !== 'chess')
      .map((i) => ({ i, k: scoreItem(i, st.weights).total + rnd() * 0.8 - (st.seen[i.id] ? 1 : 0) + (i.image ? 0.3 : 0) }))
      .sort((a, b) => b.k - a.k)
      .map((x) => x.i);
  }, [recent, category]);

  const foundAccounts: Account[] = needle.length >= 2 ? allAccounts().filter((a) => `${a.name} ${a.about} ${a.id}`.toLowerCase().includes(needle)).slice(0, 6) : [];
  const foundTags = needle.length >= 2 ? [...new Set(items.flatMap((i) => i.tags).filter((t) => t.includes(needle)))].slice(0, 8) : [];
  const foundItems = needle.length >= 2 ? items.filter((i) => matches(i, needle)).slice(0, 40) : [];

  return (
    <div class="screen">
      <div class="page">
        <label class="search" style={{ marginBottom: '12px' }}>
          <IconSearch size={18} />
          <span class="sr-only">Cerca</span>
          <input type="search" value={q} onInput={(e) => setQ(e.currentTarget.value)} placeholder="Cerca contenuti, account, #argomenti" />
        </label>
        <div class="chips scroll">
          <a class="chip" href="#/esplora" aria-pressed={!category}>
            <IconGrid size={15} /> Per te
          </a>
          {CATEGORIES.filter((c) => c.id !== 'vicino').map((c) => (
            <a key={c.id} class="chip" href={`#/esplora/${c.id}`} aria-pressed={category === c.id}>
              <Icon name={c.icon} size={15} /> {c.label}
            </a>
          ))}
        </div>

        {needle.length >= 2 ? (
          <>
            {foundAccounts.length > 0 && (
              <>
                <h2 class="section-title">Account</h2>
                {foundAccounts.map((a) => (
                  <a class="acc-row" key={a.id} href={`#/fonte/${a.id}`}>
                    <Avatar id={a.id} size={44} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <b>
                        {a.name} {a.verified && <IconVerified />}
                      </b>
                      <span class="muted small">{a.about}</span>
                    </span>
                  </a>
                ))}
              </>
            )}
            {foundTags.length > 0 && (
              <>
                <h2 class="section-title">Argomenti</h2>
                <div class="chips">
                  {foundTags.map((t) => (
                    <a key={t} class="chip" href={`#/tag/${encodeURIComponent(t)}`}>
                      #{t.replace(/\s+/g, '')}
                    </a>
                  ))}
                </div>
              </>
            )}
            <h2 class="section-title">Contenuti</h2>
            {foundItems.map((i) => (
              <MiniRow key={i.id} item={i} />
            ))}
            {!foundItems.length && <p class="muted">Nessun contenuto nelle ultime edizioni.</p>}
          </>
        ) : (
          <>
            {recent && <Suggestions recent={recent} category={category} />}
            <h2 class="section-title">{category ? categoryMeta(category).label : 'Da scoprire'}</h2>
            {recent === null ? <p class="muted">Carico…</p> : <Grid items={items.slice(0, 120)} />}
            <p class="muted small" style={{ marginTop: '18px' }}>
              Dalle edizioni degli ultimi tre giorni. Quelle precedenti sono nell’
              <a href="#/libreria/archivio">archivio</a>.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/** Profilo di una fonte, come quello di un account. */
export function SourceProfile({ id }: { id: string }) {
  const s = useAppState();
  const recent = useRecent();
  const posts = (recent ?? []).map((r) => r.item).filter((i) => i.sourceId === id);
  const a = account(id, posts[0]);
  const liked = posts.filter((i) => s.reactions[i.id] === 'like').length;
  const savedN = Object.values(s.saved).filter((e) => e.item.sourceId === id).length;
  return (
    <div class="screen">
      <div class="page">
        <button class="row muted back" onClick={() => history.back()}>
          <IconBack size={18} /> Indietro
        </button>
        <div class="profile-head">
          <Avatar id={id} item={posts[0]} size={84} />
          <div class="profile-stats">
            <span>
              <b>{posts.length}</b>post
            </span>
            <span>
              <b>{liked}</b>ti piacciono
            </span>
            <span>
              <b>{savedN}</b>salvati
            </span>
          </div>
        </div>
        <h1 class="profile-name">
          {a.name} {a.verified && <IconVerified size={18} />}
        </h1>
        <p class="muted small" style={{ margin: '0 0 2px' }}>
          @{handle(a)} · {accountLine(a)}
        </p>
        <p style={{ margin: '6px 0 12px' }}>{a.about}</p>
        {a.verified && <p class="muted small" style={{ marginTop: '-6px' }}>Fonte verificata: tra le più affidabili di Boomscroll.</p>}
        <div class="row" style={{ gap: '8px' }}>
          <FollowButton k={`s:${id}`} label={a.name} />
          {a.home && (
            <a class="btn ghost" href={a.home} target="_blank" rel="noopener">
              Sito <IconExternal size={16} />
            </a>
          )}
          {posts[0] && (
            <button class="btn ghost" onClick={() => lessOf(posts[0], 'source')}>
              Meno
            </button>
          )}
        </div>
        <h2 class="section-title">Post recenti</h2>
        {recent === null ? <p class="muted">Carico…</p> : <Grid items={posts} />}
        {recent && !posts.length && <p class="muted small">Nessun contenuto nelle ultime edizioni: quando pubblica qualcosa di valido, lo vedrai qui.</p>}
      </div>
    </div>
  );
}

/** Pagina di un argomento (#hashtag). */
export function TagPage({ tag }: { tag: string }) {
  const recent = useRecent();
  const t = decodeURIComponent(tag);
  const posts = (recent ?? []).map((r) => r.item).filter((i) => i.tags.includes(t));
  const related = [...new Set(posts.flatMap((i) => i.tags).filter((x) => x !== t))].slice(0, 8);
  return (
    <div class="screen">
      <div class="page">
        <button class="row muted back" onClick={() => history.back()}>
          <IconBack size={18} /> Indietro
        </button>
        <div class="profile-head">
          <span class="av" style={{ width: '84px', height: '84px', fontSize: '2rem' }}>
            <span>#</span>
          </span>
          <div class="profile-stats">
            <span>
              <b>{posts.length}</b>post
            </span>
          </div>
        </div>
        <h1 class="profile-name">#{t.replace(/\s+/g, '')}</h1>
        <p class="muted small" style={{ margin: '0 0 12px' }}>{t}</p>
        <FollowButton k={`t:${t}`} label={`#${t.replace(/\s+/g, '')}`} />
        {related.length > 0 && (
          <div class="chips" style={{ marginTop: '14px' }}>
            {related.map((r) => (
              <a key={r} class="chip" href={`#/tag/${encodeURIComponent(r)}`}>
                #{r.replace(/\s+/g, '')}
              </a>
            ))}
          </div>
        )}
        <h2 class="section-title">Post</h2>
        {recent === null ? <p class="muted">Carico…</p> : <Grid items={posts} />}
      </div>
    </div>
  );
}
