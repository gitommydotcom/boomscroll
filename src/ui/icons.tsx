import type { ComponentChildren, SVGAttributes } from 'preact';

type P = { size?: number; fill?: boolean } & Omit<SVGAttributes<SVGSVGElement>, 'fill' | 'size'>;

const Svg = ({ size = 24, fill, children, ...rest }: P & { children: ComponentChildren }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill ? 'currentColor' : 'none'}
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    {...rest}
  >
    {children}
  </svg>
);

export const IconFeed = (p: P) => (
  <Svg {...p}>
    <path d="M5 6h14M5 12h14M5 18h8" />
    <circle cx="18" cy="18" r="1.4" fill="currentColor" />
  </Svg>
);
export const IconPin = (p: P) => (
  <Svg {...p}>
    <path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21Z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </Svg>
);
export const IconLeaf = (p: P) => (
  <Svg {...p}>
    <path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14Z" />
    <path d="M5 19 13 11" />
  </Svg>
);
export const IconBookmark = (p: P) => (
  <Svg {...p}>
    <path d="M6 4h12v17l-6-4-6 4V4Z" />
  </Svg>
);
export const IconUser = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
  </Svg>
);
export const IconHeart = (p: P) => (
  <Svg {...p}>
    <path d="M12 20s-7.5-4.6-9.2-9.4C1.7 7.3 3.9 4 7.3 4c2 0 3.5 1.1 4.7 2.7C13.2 5.1 14.7 4 16.7 4c3.4 0 5.6 3.3 4.5 6.6C19.5 15.4 12 20 12 20Z" />
  </Svg>
);
export const IconThumbDown = (p: P) => (
  <Svg {...p}>
    <path d="M17 14V3M17 14h2.5a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 19.5 3H17M17 14l-4 7a2.5 2.5 0 0 1-2.5-2.5V15H5.2a2 2 0 0 1-2-2.3l1.2-7A2 2 0 0 1 6.4 4H17" />
  </Svg>
);
export const IconShare = (p: P) => (
  <Svg {...p}>
    <path d="M12 3v12M7 8l5-5 5 5" />
    <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
  </Svg>
);
export const IconMore = (p: P) => (
  <Svg {...p}>
    <circle cx="5" cy="12" r="1.3" fill="currentColor" />
    <circle cx="12" cy="12" r="1.3" fill="currentColor" />
    <circle cx="19" cy="12" r="1.3" fill="currentColor" />
  </Svg>
);
export const IconExternal = (p: P) => (
  <Svg {...p}>
    <path d="M14 4h6v6M20 4l-9 9" />
    <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </Svg>
);
export const IconClose = (p: P) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);
export const IconList = (p: P) => (
  <Svg {...p}>
    <rect x="4" y="4" width="16" height="6" rx="1.5" />
    <rect x="4" y="14" width="16" height="6" rx="1.5" />
  </Svg>
);
export const IconStack = (p: P) => (
  <Svg {...p}>
    <rect x="6" y="3" width="12" height="18" rx="2.5" />
  </Svg>
);
export const IconBack = (p: P) => (
  <Svg {...p}>
    <path d="M15 5l-7 7 7 7" />
  </Svg>
);
export const IconSearch = (p: P) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </Svg>
);
export const IconCheck = (p: P) => (
  <Svg {...p}>
    <path d="M5 12.5 10 17l9-10" />
  </Svg>
);
export const IconPlay = (p: P) => (
  <Svg {...p}>
    <path d="M8 5v14l11-7L8 5Z" fill="currentColor" />
  </Svg>
);
export const IconInfo = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v6M12 7.5v.5" />
  </Svg>
);
export const IconLocate = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="7" />
    <circle cx="12" cy="12" r="2.5" fill="currentColor" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
  </Svg>
);
export const IconPlus = (p: P) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
export const IconTrash = (p: P) => (
  <Svg {...p}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </Svg>
);
export const IconTranslate = (p: P) => (
  <Svg {...p}>
    <path d="M4 5h9M8.5 3v2M6 5c.5 3 2.5 5.5 5 7M11 5c-.5 3.5-3 6.5-6.5 8" />
    <path d="m13 21 4-9 4 9M14.5 18h5" />
  </Svg>
);
export const IconMute = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M5.6 5.6l12.8 12.8" />
  </Svg>
);
export const IconMinus = (p: P) => (
  <Svg {...p}>
    <path d="M5 12h14" />
  </Svg>
);
export const IconUp = (p: P) => (
  <Svg {...p}>
    <path d="M6 15l6-6 6 6" />
  </Svg>
);
export const IconRefresh = (p: P) => (
  <Svg {...p}>
    <path d="M20 11a8 8 0 0 0-14.3-4.9L4 8" />
    <path d="M4 3v5h5" />
    <path d="M4 13a8 8 0 0 0 14.3 4.9L20 16" />
    <path d="M20 21v-5h-5" />
  </Svg>
);

/* ── Icone per nome (categorie, tipi di contenuto, pratica, meteo, luoghi) ── */

const dot = (cx: number, cy: number, r = 1.2) => <circle cx={cx} cy={cy} r={r} fill="currentColor" stroke="none" />;
const cloud = (dy = 0) => <path d={`M7 ${17 + dy}h10a4 4 0 0 0 .4-8A6 6 0 0 0 6 ${10 + dy}a3.5 3.5 0 0 0 1 7Z`} />;

const GLYPHS: Record<string, ComponentChildren> = {
  // Categorie
  news: (
    <>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h10A1.5 1.5 0 0 1 17 5.5V19a2 2 0 0 0 2 2H6a2 2 0 0 1-2-2V5.5Z" />
      <path d="M17 9h2.5a1 1 0 0 1 1 1v9a2 2 0 0 1-2 2M7.5 8.5h6M7.5 12h6M7.5 15.5h4" />
    </>
  ),
  atom: (
    <>
      {dot(12, 12, 1.6)}
      <ellipse cx="12" cy="12" rx="9" ry="3.6" />
      <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(120 12 12)" />
    </>
  ),
  chip: (
    <>
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="0.8" />
      <path d="M9.5 2.5V6M14.5 2.5V6M9.5 18v3.5M14.5 18v3.5M2.5 9.5H6M2.5 14.5H6M18 9.5h3.5M18 14.5h3.5" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3a9 9 0 1 0 0 18c1.3 0 1.9-1 1.4-2l-.4-.8c-.6-1.2.3-2.6 1.6-2.6H17a4 4 0 0 0 4-4c0-4.8-4-8.6-9-8.6Z" />
      {dot(7.5, 11.5)}
      {dot(10, 7.2)}
      {dot(15, 7.2)}
    </>
  ),
  ruler: (
    <>
      <path d="M3.5 16.5 16.5 3.5l4 4-13 13-4-4Z" />
      <path d="m7.5 12.5 2 2M10.5 9.5l2 2M13.5 6.5l2 2" />
    </>
  ),
  columns: <path d="M3 21h18M4.5 18h15M5 9.5h14M12 3 4 7.5h16L12 3ZM7 9.5V18M12 9.5V18M17 9.5V18" />,
  tree: (
    <>
      <path d="M12 21.5V15" />
      <path d="M12 2.5c-3.6 0-6.2 2.8-6.2 6.3 0 3.4 2.8 6.2 6.2 6.2s6.2-2.8 6.2-6.2c0-3.5-2.6-6.3-6.2-6.3Z" />
      <path d="m12 12-2.5-2.5M12 10.5 14 8.5" />
    </>
  ),
  book: (
    <>
      <path d="M4.5 5A2 2 0 0 1 6.5 3H19.5v15H6.5a2 2 0 0 0-2 2V5Z" />
      <path d="M4.5 20a2 2 0 0 0 2 2h13M9 7.5h6" />
    </>
  ),
  quote: (
    <>
      <path d="M10 11.5H6.5a1.5 1.5 0 0 1-1.5-1.5V8a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 10 8v5c0 2.5-1.4 4.2-4.2 4.8" />
      <path d="M19 11.5h-3.5A1.5 1.5 0 0 1 14 10V8a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 19 8v5c0 2.5-1.4 4.2-4.2 4.8" />
    </>
  ),
  translate: (
    <>
      <path d="M4 5h9M8.5 3v2M6 5c.5 3 2.5 5.5 5 7M11 5c-.5 3.5-3 6.5-6.5 8" />
      <path d="m13 21 4-9 4 9M14.5 18h5" />
    </>
  ),
  feather: (
    <>
      <path d="M20 4c-8.5 0-14 5-14 14l-2 2.5" />
      <path d="M20 4c0 7.5-4.5 12.5-12 13" />
      <path d="M10.5 13.5h5M13 9.5h5" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z" />
    </>
  ),
  brain: (
    <>
      <path d="M11.5 5a3 3 0 0 0-5.6-.6A3 3 0 0 0 4 9.5a3 3 0 0 0 .4 5.4 3 3 0 0 0 3.1 4.5 2.6 2.6 0 0 0 4-.4V5Z" />
      <path d="M12.5 5a3 3 0 0 1 5.6-.6 3 3 0 0 1 1.9 5.1 3 3 0 0 1-.4 5.4 3 3 0 0 1-3.1 4.5 2.6 2.6 0 0 1-4-.4" />
    </>
  ),
  timer: (
    <>
      <circle cx="12" cy="13.5" r="7.5" />
      <path d="M12 10v3.5l2.5 2M9.5 2.5h5M12 2.5V6M19 6.5l-1.5 1.5" />
    </>
  ),
  sprout: (
    <>
      <path d="M12 21v-9" />
      <path d="M12 12c0-4-2.8-6.5-7.5-6.5 0 4 2.8 6.5 7.5 6.5Z" />
      <path d="M12 10c0-3.6 2.5-6 7.5-6 0 3.6-2.5 6-7.5 6Z" />
    </>
  ),
  cap: (
    <>
      <path d="M2.5 9 12 4.5 21.5 9 12 13.5 2.5 9Z" />
      <path d="M6.5 11v5c0 1.4 2.5 3 5.5 3s5.5-1.6 5.5-3v-5M21.5 9v5.5" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
    </>
  ),
  dice: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3.5" />
      {dot(8.7, 8.7)}
      {dot(12, 12)}
      {dot(15.3, 15.3)}
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  // Tipi di contenuto
  play: <path d="M8 5v14l11-7L8 5Z" fill="currentColor" />,
  doc: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </>
  ),
  type: (
    <>
      <path d="m3.5 18 4.5-12 4.5 12M5 14h6" />
      <path d="M20.5 18v-4.8a2.7 2.7 0 0 0-4.8-1.7M20.5 15.2c-3.4-.4-5.3.4-5.3 1.6 0 .8.6 1.4 1.6 1.4 1.9 0 3.7-1.2 3.7-3Z" />
    </>
  ),
  frame: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="1" />
      <rect x="7.5" y="6.5" width="9" height="11" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="15.5" cy="9" r="1.6" />
      <path d="m3 16 5-5 4 4 2.5-2.5L21 19" />
    </>
  ),
  bubble: <path d="M20 11.5a8 8 0 0 1-11.7 7.1L4 20l1.3-4A8 8 0 1 1 20 11.5Z" />,
  chess: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M4 12h16M12 4v16" />
      <rect x="4.9" y="4.9" width="7.1" height="7.1" fill="currentColor" stroke="none" />
      <rect x="12" y="12" width="7.1" height="7.1" fill="currentColor" stroke="none" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  // Pratica e card speciali
  wind: <path d="M3 8.5h10.5a3 3 0 1 0-3-3M3 12.5h15a3 3 0 1 1-3 3M3 16.5h6" />,
  notebook: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M9 3v18M12.5 8h3.5M12.5 12h3.5" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
    </>
  ),
  cycle: (
    <>
      <path d="M20 11a8 8 0 0 0-14.3-4.9L4 8" />
      <path d="M4 3v5h5" />
      <path d="M4 13a8 8 0 0 0 14.3 4.9L20 16" />
      <path d="M20 21v-5h-5" />
    </>
  ),
  cards: (
    <>
      <rect x="3" y="7" width="13" height="14" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
    </>
  ),
  bolt: <path d="M13 2.5 4.5 14H11l-1 7.5L18.5 10H12l1-7.5Z" />,
  pause: <path d="M9 5v14M15 5v14" />,
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z" />,
  question: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.3a2.5 2.5 0 1 1 3.5 2.4c-.7.3-1.1.9-1.1 1.6v.5" />
      {dot(12, 16.8, 0.9)}
    </>
  ),
  hourglass: <path d="M6.5 3h11M6.5 21h11M7.5 3c0 4.5 9 4.5 9 9s-9 4.5-9 9M16.5 3c0 4.5-9 4.5-9 9s9 4.5 9 9" />,
  leaf: (
    <>
      <path d="M5 19c0-8 5-13 14-14-1 9-6 14-14 14Z" />
      <path d="M5 19 13 11" />
    </>
  ),
  pen: (
    <>
      <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
      <path d="m13.5 6.5 4 4" />
    </>
  ),
  drop: <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z" />,
  walk: (
    <>
      <circle cx="13" cy="4.5" r="1.8" />
      <path d="M10 21l2.2-6.5L15 17v4M8 12.5 10 8.5h3.5l2.5 4M12.2 14.5 11.5 8.5" />
    </>
  ),
  heart: <path d="M12 20s-7.5-4.6-9.2-9.4C1.7 7.3 3.9 4 7.3 4c2 0 3.5 1.1 4.7 2.7C13.2 5.1 14.7 4 16.7 4c3.4 0 5.6 3.3 4.5 6.6C19.5 15.4 12 20 12 20Z" />,
  // Meteo
  cloud: cloud(),
  'cloud-sun': (
    <>
      <path d="M8.5 7.5A4 4 0 0 1 15.8 6M12 2v1.5M5.6 4.6l1 1M18.4 4.6l-1 1" />
      {cloud(2)}
    </>
  ),
  fog: <path d="M4 8h16M3 12h18M5 16h14M8 20h8" />,
  rain: (
    <>
      {cloud(-2)}
      <path d="m8 18.5-1 2.5M12 18.5l-1 2.5M16 18.5l-1 2.5" />
    </>
  ),
  snow: (
    <>
      {cloud(-2)}
      {dot(8, 19.5, 0.9)}
      {dot(12, 21, 0.9)}
      {dot(16, 19.5, 0.9)}
    </>
  ),
  storm: (
    <>
      {cloud(-2)}
      <path d="m12.5 15-2 3.5h3L11.5 22" />
    </>
  ),
  // Luoghi
  mask: (
    <>
      <path d="M4 4h16v7a8 8 0 0 1-16 0V4Z" />
      <path d="M8 9h2M14 9h2M9 14c1.6 1.4 4.4 1.4 6 0" />
    </>
  ),
  film: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" />
    </>
  ),
  mountain: <path d="m2.5 20 6.5-12 4 6.5 2.5-3.5 6 9H2.5Z" />,
  house: <path d="M4 11 12 4l8 7M6 9.5V20h12V9.5M10 20v-5h4v5" />,
  tower: (
    <>
      <path d="M5 21V5h3v3h3V5h2v3h3V5h3v16H5Z" />
      <path d="M10 21v-5h4v5" />
    </>
  ),
  star: <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z" />,
};

export const ICON_NAMES = Object.keys(GLYPHS);

/** Icona minimal per nome; se il nome non esiste mostra un punto. */
export const Icon = ({ name, ...p }: P & { name: string }) => <Svg {...p}>{GLYPHS[name] ?? dot(12, 12, 2)}</Svg>;

/* ── Icone dell'interfaccia social ──────────────────────────────────────── */

export const IconHome = (p: P) => (
  <Svg {...p}>
    <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1v-9.5Z" />
  </Svg>
);
export const IconBell = (p: P) => (
  <Svg {...p}>
    <path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15L6 16Z" />
    <path d="M10 20.5a2 2 0 0 0 4 0" />
  </Svg>
);
export const IconComment = (p: P) => (
  <Svg {...p}>
    <path d="M20 11.5a8 8 0 0 1-11.7 7.1L4 20l1.3-4A8 8 0 1 1 20 11.5Z" />
  </Svg>
);
export const IconGrid = (p: P) => (
  <Svg {...p}>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <path d="M4 9.5h16M4 14.5h16M9.5 4v16M14.5 4v16" />
  </Svg>
);
export const IconGear = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
  </Svg>
);
/** Badge "fonte verificata": le fonti più affidabili, come gli account verificati. */
export const IconVerified = ({ size = 14, ...p }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" class="verified" {...(p as object)}>
    <path
      d="M12 1.8l2.5 1.9 3.1-.2 1 3 2.6 1.8-1 3 1 2.9-2.6 1.8-1 3-3.1-.2L12 22.2l-2.5-1.9-3.1.2-1-3-2.6-1.8 1-2.9-1-3 2.6-1.8 1-3 3.1.2L12 1.8Z"
      fill="currentColor"
    />
    <path d="m8.3 12.2 2.5 2.5 4.9-5" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style={{ stroke: 'var(--verified-check)' }} />
  </svg>
);
export const IconEye = (p: P) => (
  <Svg {...p}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
);
export const IconTriangle = (p: P) => (
  <Svg {...p}>
    <path d="M12 5.5 19 18H5l7-12.5Z" />
  </Svg>
);
export const IconUserPlus = (p: P) => (
  <Svg {...p}>
    <circle cx="9.5" cy="8" r="4" />
    <path d="M2.5 21c1-4 4-6 7-6s6 2 7 6M19 8v6M16 11h6" />
  </Svg>
);
export const IconSoundOff = (p: P) => (
  <Svg {...p}>
    <path d="M4 9h3.5L12 5v14l-4.5-4H4V9Z" />
    <path d="m16 9.5 5 5M21 9.5l-5 5" />
  </Svg>
);
