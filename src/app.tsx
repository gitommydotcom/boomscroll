import { useEffect, useState } from 'preact/hooks';
import { ItemSheets } from './cards/ItemDetail';
import { dailyDecay, onToast } from './lib/actions';
import { isAfter } from './lib/dates';
import { bumpStats, flush, useAppState } from './lib/store';
import { IconBookmark, IconFeed, IconLeaf, IconPin, IconUser } from './ui/icons';
import { Library } from './views/Library';
import { Nearby } from './views/Nearby';
import { Onboarding } from './views/Onboarding';
import { Practice } from './views/Practice';
import { Profile } from './views/Profile';
import { Today } from './views/Today';

const ROUTES = [
  { path: 'oggi', label: 'Oggi', Icon: IconFeed },
  { path: 'vicino', label: 'Vicino', Icon: IconPin },
  { path: 'pratica', label: 'Pratica', Icon: IconLeaf },
  { path: 'libreria', label: 'Libreria', Icon: IconBookmark },
  { path: 'tu', label: 'Tu', Icon: IconUser },
] as const;

function useRoute(): string[] {
  const parse = () => (location.hash.replace(/^#\/?/, '') || 'oggi').split('/');
  const [route, setRoute] = useState(parse);
  useEffect(() => {
    const on = () => setRoute(parse());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

/** Tema, modalità sera (ricontrollata ogni minuto) e tempo d'uso. */
function useEnvironment() {
  const s = useAppState();
  const [, setMinute] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setMinute((m) => m + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  const { theme, evening, eveningFrom } = s.settings;
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
  }, [theme]);
  const eveningNow = evening && isAfter(eveningFrom);
  useEffect(() => {
    document.documentElement.classList.toggle('evening', eveningNow);
  }, [eveningNow]);

  // Tempo passato nell'app oggi: serve solo al limite giornaliero che scegli tu.
  useEffect(() => {
    dailyDecay();
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') bumpStats((d) => ({ seconds: d.seconds + 15 }));
    }, 15_000);
    const onHide = () => document.visibilityState === 'hidden' && flush();
    document.addEventListener('visibilitychange', onHide);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, []);
}

export function App() {
  const s = useAppState();
  const route = useRoute();
  const [toast, setToast] = useState<string | null>(null);
  useEnvironment();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    onToast((msg) => {
      setToast(msg);
      clearTimeout(timer);
      timer = setTimeout(() => setToast(null), 2600);
    });
  }, []);

  if (!s.settings.onboarded) return <Onboarding />;

  const page = route[0];
  const immersive = page === 'oggi' && s.settings.view === 'immersive';
  let content;
  switch (page) {
    case 'vicino':
      content = <Nearby />;
      break;
    case 'pratica':
      content = <Practice tool={route[1]} />;
      break;
    case 'libreria':
      content = <Library tab={route[1]} date={route[2]} />;
      break;
    case 'tu':
      content = <Profile />;
      break;
    default:
      content = <Today />;
  }

  return (
    <div class="shell">
      <main style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>{content}</main>
      <nav class={`nav${immersive ? ' on-dark' : ''}`} aria-label="Sezioni">
        {ROUTES.map(({ path, label, Icon }) => (
          <a key={path} href={`#/${path}`} aria-current={page === path || (path === 'oggi' && !ROUTES.some((r) => r.path === page)) ? 'page' : undefined}>
            <Icon size={22} />
            {label}
          </a>
        ))}
      </nav>
      <ItemSheets />
      {toast && (
        <div class="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
