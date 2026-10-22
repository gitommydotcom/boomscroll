import type { CategoryId, ItemKind } from '../shared/types';

export type SourceType =
  | 'rss'
  | 'youtube'
  | 'hn'
  | 'hfpapers'
  | 'apod'
  | 'cleveland'
  | 'aic'
  | 'wikipedia'
  | 'xkcd'
  | 'lichess';

export interface SourceDef {
  id: string;
  name: string;
  type: SourceType;
  url?: string;
  /** Indirizzi alternativi, provati in ordine se il primo non risponde. */
  alt?: string[];
  category: CategoryId;
  /** L'IA può spostare il contenuto in un'altra categoria (fonti generaliste). */
  mixed?: boolean;
  lang: string;
  kind?: ItemKind;
  /** Affidabilità/qualità percepita della fonte, 0..1. */
  quality: number;
  /** Massimo contenuti al giorno da questa fonte. */
  max: number;
  /** Età massima dei contenuti, in giorni. */
  maxAgeDays?: number;
  /** Solo per le fonti locali: id della città. */
  city?: string;
  /** Filtri sul titolo: devono passare tutti (es. solo eventi). */
  match?: RegExp[];
  /** Scarta i contenuti il cui titolo corrisponde (es. cronaca). */
  exclude?: RegExp;
}

const yt = (id: string, name: string, channelId: string, category: CategoryId, quality = 0.8): SourceDef => ({
  id,
  name,
  type: 'youtube',
  url: `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`,
  category,
  lang: 'en',
  kind: 'video',
  quality,
  max: 1,
  maxAgeDays: 5,
});

export const SOURCES: SourceDef[] = [
  // ── Notizie ─────────────────────────────────────────────────────────────
  { id: 'ilpost', name: 'Il Post', type: 'rss', url: 'https://www.ilpost.it/feed/', category: 'notizie', mixed: true, lang: 'it', quality: 0.85, max: 5, maxAgeDays: 1.5 },
  { id: 'ansa', name: 'ANSA', type: 'rss', url: 'https://www.ansa.it/sito/ansait_rss.xml', alt: ['https://www.ansa.it/sito/notizie/topnews/topnews_rss.xml'], category: 'notizie', mixed: true, lang: 'it', quality: 0.75, max: 3, maxAgeDays: 1.5 },
  { id: 'internazionale', name: 'Internazionale', type: 'rss', url: 'https://www.internazionale.it/sitemaps/rss.xml', category: 'notizie', mixed: true, lang: 'it', quality: 0.85, max: 3, maxAgeDays: 2 },
  { id: 'valigiablu', name: 'Valigia Blu', type: 'rss', url: 'https://www.valigiablu.it/feed/', category: 'notizie', mixed: true, lang: 'it', quality: 0.8, max: 2, maxAgeDays: 4 },
  { id: 'bbc', name: 'BBC World', type: 'rss', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', category: 'notizie', lang: 'en', quality: 0.8, max: 3, maxAgeDays: 1.5 },
  { id: 'guardian', name: 'The Guardian', type: 'rss', url: 'https://www.theguardian.com/world/rss', category: 'notizie', lang: 'en', quality: 0.8, max: 2, maxAgeDays: 1.5 },
  { id: 'lemonde', name: 'Le Monde', type: 'rss', url: 'https://www.lemonde.fr/international/rss_full.xml', category: 'notizie', lang: 'fr', quality: 0.8, max: 2, maxAgeDays: 1.5 },
  { id: 'elpais', name: 'El País', type: 'rss', url: 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada', category: 'notizie', lang: 'es', quality: 0.75, max: 1, maxAgeDays: 1.5 },
  { id: 'tagesschau', name: 'Tagesschau', type: 'rss', url: 'https://www.tagesschau.de/xml/rss2', category: 'notizie', lang: 'de', quality: 0.8, max: 1, maxAgeDays: 1.5 },
  { id: 'nhk', name: 'NHK ニュース', type: 'rss', url: 'https://www3.nhk.or.jp/rss/news/cat0.xml', alt: ['https://www3.nhk.or.jp/rss/news/cat1.xml'], category: 'notizie', lang: 'ja', quality: 0.75, max: 1, maxAgeDays: 1.5 },
  { id: 'bbc-zhongwen', name: 'BBC 中文', type: 'rss', url: 'https://feeds.bbci.co.uk/zhongwen/simp/rss.xml', category: 'notizie', lang: 'zh', quality: 0.75, max: 1, maxAgeDays: 2 },
  { id: 'restofworld', name: 'Rest of World', type: 'rss', url: 'https://restofworld.org/feed/latest', category: 'tech', mixed: true, lang: 'en', quality: 0.8, max: 1, maxAgeDays: 4 },

  // ── Scienza ─────────────────────────────────────────────────────────────
  { id: 'quanta', name: 'Quanta Magazine', type: 'rss', url: 'https://api.quantamagazine.org/feed/', category: 'scienza', lang: 'en', quality: 0.95, max: 2, maxAgeDays: 5 },
  { id: 'nature', name: 'Nature', type: 'rss', url: 'https://www.nature.com/nature.rss', category: 'scienza', lang: 'en', quality: 0.9, max: 2, maxAgeDays: 3 },
  { id: 'sciencenews', name: 'Science News', type: 'rss', url: 'https://www.sciencenews.org/feed', category: 'scienza', lang: 'en', quality: 0.85, max: 2, maxAgeDays: 3 },
  { id: 'newscientist', name: 'New Scientist', type: 'rss', url: 'https://www.newscientist.com/feed/home/', alt: ['https://www.newscientist.com/subject/space/feed/'], category: 'scienza', lang: 'en', quality: 0.75, max: 2, maxAgeDays: 2 },
  { id: 'nautilus', name: 'Nautilus', type: 'rss', url: 'https://nautil.us/feed/', category: 'scienza', mixed: true, lang: 'en', quality: 0.9, max: 1, maxAgeDays: 7 },
  { id: 'knowable', name: 'Knowable Magazine', type: 'rss', url: 'https://knowablemagazine.org/rss', category: 'scienza', mixed: true, lang: 'en', quality: 0.9, max: 1, maxAgeDays: 7 },
  { id: 'lescienze', name: 'Le Scienze', type: 'rss', url: 'https://www.lescienze.it/rss/all/rss2.0.xml', alt: ['https://www.lescienze.it/feed', 'https://www.lescienze.it/rss', 'https://www.lescienze.it/news/rss'], category: 'scienza', lang: 'it', quality: 0.85, max: 2, maxAgeDays: 3 },
  { id: 'apod', name: 'NASA APOD', type: 'apod', category: 'scienza', lang: 'en', kind: 'image', quality: 0.9, max: 1 },
  yt('yt-3b1b', '3Blue1Brown', 'UCYO_jab_esuFRV4b17AJtAw', 'scienza', 0.9),
  yt('yt-veritasium', 'Veritasium', 'UCHnyfMqiRRG1u-2MsSQLbXA', 'scienza'),
  yt('yt-kurzgesagt', 'Kurzgesagt', 'UCsXVk37bltHxD1rDPwtNM8Q', 'scienza'),
  yt('yt-numberphile', 'Numberphile', 'UCoxcjq-8xIDTYp3uz647V5A', 'scienza'),

  // ── Tech ────────────────────────────────────────────────────────────────
  { id: 'ars', name: 'Ars Technica', type: 'rss', url: 'https://feeds.arstechnica.com/arstechnica/index', category: 'tech', mixed: true, lang: 'en', quality: 0.8, max: 2, maxAgeDays: 2 },
  { id: 'techreview', name: 'MIT Technology Review', type: 'rss', url: 'https://www.technologyreview.com/feed/', category: 'tech', lang: 'en', quality: 0.85, max: 2, maxAgeDays: 3 },
  { id: 'ieee', name: 'IEEE Spectrum', type: 'rss', url: 'https://spectrum.ieee.org/feeds/feed.rss', category: 'tech', lang: 'en', quality: 0.85, max: 2, maxAgeDays: 3 },
  { id: 'hn', name: 'Hacker News', type: 'hn', category: 'tech', mixed: true, lang: 'en', quality: 0.65, max: 3 },
  { id: 'hfpapers', name: 'Hugging Face Papers', type: 'hfpapers', category: 'tech', lang: 'en', kind: 'paper', quality: 0.75, max: 2 },

  // ── Arte ────────────────────────────────────────────────────────────────
  { id: 'cleveland', name: 'Cleveland Museum of Art', type: 'cleveland', category: 'arte', lang: 'en', kind: 'artwork', quality: 0.95, max: 1 },
  { id: 'aic', name: 'Art Institute of Chicago', type: 'aic', category: 'arte', lang: 'en', kind: 'artwork', quality: 0.95, max: 1 },
  { id: 'pdr', name: 'The Public Domain Review', type: 'rss', url: 'https://publicdomainreview.org/rss.xml', category: 'arte', mixed: true, lang: 'en', quality: 0.9, max: 1, maxAgeDays: 14 },
  { id: 'colossal', name: 'Colossal', type: 'rss', url: 'https://www.thisiscolossal.com/feed/', category: 'arte', lang: 'en', quality: 0.8, max: 2, maxAgeDays: 3 },
  { id: 'hyperallergic', name: 'Hyperallergic', type: 'rss', url: 'https://hyperallergic.com/feed/', category: 'arte', lang: 'en', quality: 0.75, max: 1, maxAgeDays: 3 },
  { id: 'artribune', name: 'Artribune', type: 'rss', url: 'https://www.artribune.com/feed/', category: 'arte', mixed: true, lang: 'it', quality: 0.7, max: 2, maxAgeDays: 3 },

  // ── Design ──────────────────────────────────────────────────────────────
  { id: 'dezeen', name: 'Dezeen', type: 'rss', url: 'https://www.dezeen.com/feed/', category: 'design', lang: 'en', quality: 0.8, max: 2, maxAgeDays: 3 },
  { id: 'designboom', name: 'designboom', type: 'rss', url: 'https://www.designboom.com/feed/', category: 'design', lang: 'en', quality: 0.75, max: 1, maxAgeDays: 3 },
  { id: 'itsnicethat', name: "It's Nice That", type: 'rss', url: 'https://www.itsnicethat.com/rss', alt: ['https://www.itsnicethat.com/feed', 'https://www.itsnicethat.com/rss.xml', 'https://feeds.feedburner.com/itsnicethat/SlXC'], category: 'design', lang: 'en', quality: 0.8, max: 1, maxAgeDays: 4 },
  { id: 'smashing', name: 'Smashing Magazine', type: 'rss', url: 'https://www.smashingmagazine.com/feed/', category: 'design', lang: 'en', quality: 0.8, max: 1, maxAgeDays: 7 },

  // ── Università, lezioni e paper ────────────────────────────────────────
  { id: 'mitnews', name: 'MIT News', type: 'rss', url: 'https://news.mit.edu/rss/feed', category: 'universita', lang: 'en', quality: 0.9, max: 2, maxAgeDays: 3 },
  { id: 'harvard', name: 'Harvard Gazette', type: 'rss', url: 'https://news.harvard.edu/gazette/feed/', category: 'universita', lang: 'en', quality: 0.9, max: 2, maxAgeDays: 3 },
  { id: 'stanford', name: 'Stanford Report', type: 'rss', url: 'https://news.stanford.edu/feed/', alt: ['https://news.stanford.edu/rss', 'https://news.stanford.edu/stories/feed'], category: 'universita', lang: 'en', quality: 0.85, max: 1, maxAgeDays: 4 },
  { id: 'yale', name: 'Yale News', type: 'rss', url: 'https://news.yale.edu/news-rss', category: 'universita', lang: 'en', quality: 0.85, max: 1, maxAgeDays: 4 },
  { id: 'openculture', name: 'Open Culture', type: 'rss', url: 'https://www.openculture.com/feed', category: 'universita', mixed: true, lang: 'en', quality: 0.8, max: 1, maxAgeDays: 4 },
  yt('yt-mitocw', 'MIT OpenCourseWare', 'UCEBb1b_L6zDS3xTUrIALZOw', 'universita', 0.95),
  yt('yt-stanford', 'Stanford', 'UCBa5G_ESCn8Yd4vw5U-gIcg', 'universita', 0.85),
  yt('yt-yalecourses', 'Yale Courses', 'UC4EY_qnSeAP1xGsh61eOoJA', 'universita', 0.9),
  yt('yt-royalinstitution', 'The Royal Institution', 'UCYeF244yNGuFefuFKqxIAXw', 'universita', 0.9),

  // ── Poesia ──────────────────────────────────────────────────────────────
  { id: 'poetryfoundation', name: 'Poetry Foundation', type: 'rss', url: 'https://www.poetryfoundation.org/feeds/poem-of-the-day', category: 'poesia', lang: 'en', kind: 'poem', quality: 0.9, max: 1, maxAgeDays: 2 },
  { id: 'poetrydaily', name: 'Poetry Daily', type: 'rss', url: 'https://poems.com/feed/', category: 'poesia', lang: 'en', kind: 'poem', quality: 0.85, max: 1, maxAgeDays: 3 },
  { id: 'rattle', name: 'Rattle', type: 'rss', url: 'https://www.rattle.com/feed/', category: 'poesia', lang: 'en', kind: 'poem', quality: 0.8, max: 1, maxAgeDays: 4 },
  { id: 'marginalian', name: 'The Marginalian', type: 'rss', url: 'https://www.themarginalian.org/feed/', category: 'poesia', mixed: true, lang: 'en', quality: 0.85, max: 1, maxAgeDays: 7 },

  // ── Antropologia, psicologia, idee ─────────────────────────────────────
  { id: 'sapiens', name: 'SAPIENS', type: 'rss', url: 'https://www.sapiens.org/feed/', category: 'antropologia', lang: 'en', quality: 0.9, max: 2, maxAgeDays: 7 },
  { id: 'anthronews', name: 'Anthropology News', type: 'rss', url: 'https://www.anthropology-news.org/feed/', category: 'antropologia', lang: 'en', quality: 0.8, max: 1, maxAgeDays: 7 },
  { id: 'aeon', name: 'Aeon', type: 'rss', url: 'https://aeon.co/feed.rss', category: 'antropologia', mixed: true, lang: 'en', quality: 0.9, max: 2, maxAgeDays: 5 },
  { id: 'psyche', name: 'Psyche', type: 'rss', url: 'https://psyche.co/feed', category: 'psicologia', mixed: true, lang: 'en', quality: 0.9, max: 2, maxAgeDays: 5 },
  { id: 'greatergood', name: 'Greater Good (Berkeley)', type: 'rss', url: 'https://greatergood.berkeley.edu/site/rss/articles', category: 'psicologia', lang: 'en', quality: 0.85, max: 1, maxAgeDays: 7 },
  { id: 'conversation', name: 'The Conversation', type: 'rss', url: 'https://theconversation.com/global/articles.atom', category: 'psicologia', mixed: true, lang: 'en', quality: 0.8, max: 3, maxAgeDays: 2 },
  { id: 'iltascabile', name: 'Il Tascabile', type: 'rss', url: 'https://www.iltascabile.com/feed/', category: 'antropologia', mixed: true, lang: 'it', quality: 0.9, max: 1, maxAgeDays: 7 },

  // ── Produttività e abitudini ───────────────────────────────────────────
  { id: 'fs', name: 'Farnam Street', type: 'rss', url: 'https://fs.blog/feed/', category: 'produttivita', mixed: true, lang: 'en', quality: 0.85, max: 1, maxAgeDays: 10 },
  { id: 'newport', name: 'Cal Newport', type: 'rss', url: 'https://calnewport.com/feed/', category: 'produttivita', lang: 'en', quality: 0.85, max: 1, maxAgeDays: 10 },
  { id: 'nesslabs', name: 'Ness Labs', type: 'rss', url: 'https://nesslabs.com/feed', category: 'produttivita', mixed: true, lang: 'en', quality: 0.8, max: 1, maxAgeDays: 10 },
  { id: 'jamesclear', name: 'James Clear', type: 'rss', url: 'https://jamesclear.com/feed', category: 'abitudini', lang: 'en', quality: 0.8, max: 1, maxAgeDays: 10 },

  // ── Lingue ──────────────────────────────────────────────────────────────
  { id: 'mw-wotd', name: 'Merriam-Webster', type: 'rss', url: 'https://www.merriam-webster.com/wotd/feed/rss2', category: 'lingue', lang: 'en', kind: 'word', quality: 0.9, max: 1, maxAgeDays: 2 },
  { id: 'wiktionary-wotd', name: 'Wiktionary', type: 'rss', url: 'https://en.wiktionary.org/w/api.php?action=featuredfeed&feed=wotd&feedformat=atom', category: 'lingue', lang: 'en', kind: 'word', quality: 0.8, max: 1, maxAgeDays: 2 },

  // ── Curiosità e divertimento ───────────────────────────────────────────
  { id: 'wikipedia', name: 'Wikipedia', type: 'wikipedia', category: 'curiosita', lang: 'it', quality: 0.85, max: 3 },
  { id: 'atlasobscura', name: 'Atlas Obscura', type: 'rss', url: 'https://www.atlasobscura.com/feeds/latest', category: 'curiosita', lang: 'en', quality: 0.8, max: 2, maxAgeDays: 4 },
  { id: 'smithsonian', name: 'Smithsonian Magazine', type: 'rss', url: 'https://www.smithsonianmag.com/rss/latest_articles/', category: 'curiosita', mixed: true, lang: 'en', quality: 0.85, max: 2, maxAgeDays: 3 },
  { id: 'futility', name: 'Futility Closet', type: 'rss', url: 'https://www.futilitycloset.com/feed/', category: 'divertimento', lang: 'en', quality: 0.75, max: 1, maxAgeDays: 5 },
  yt('yt-teded', 'TED-Ed', 'UCsooa4yRKGN_zEE8iknghZA', 'curiosita', 0.8),
  { id: 'xkcd', name: 'xkcd', type: 'xkcd', category: 'divertimento', lang: 'en', kind: 'comic', quality: 0.8, max: 1 },
  { id: 'lichess', name: 'Lichess', type: 'lichess', category: 'divertimento', lang: 'it', kind: 'chess', quality: 0.85, max: 1 },
];

/** Città con fonti locali. Per aggiungerne una: nuova voce qui + fonti in LOCAL_SOURCES. */
export const CITIES = [{ id: 'laquila', name: "L'Aquila", lat: 42.3498, lon: 13.3995 }];

const EVENT_WORDS =
  /\b(mostr[ae]|concert[oi]|festival|spettacol[oi]|teatro|rassegn[ae]|inaugura|visit[ae] guidat[ae]|escursion[ei]|sagr[ae]|presentazione|convegno|laboratori|cinema|proiezion[ei]|danza|letture|passeggiat[ae]|degustazion[ei]|mercatin[oi]|fiera|workshop|event[oi]|serata|appuntament[oi]|in scena|calici|biglietti|esaurito|apre|riapre)\b/i;

const NOT_EVENTS =
  /\b(incident[ei]|incendi[oi]|arrest|morto|morta|mort[ei]|ferit[oi]|denunc|polizia|carabinieri|sequestr|indagat|processo|tribunale|sindacat|bilancio|assemblea|consiglio comunale|elezioni|truffa|furto|rapina|violenz|sciopero)/i;

export const LOCAL_SOURCES: SourceDef[] = [
  { id: 'ekuonews', name: 'Ekuo News', type: 'rss', url: 'https://www.ekuonews.it/feed/', category: 'vicino', lang: 'it', kind: 'event', quality: 0.65, max: 4, maxAgeDays: 4, city: 'laquila', match: [EVENT_WORDS], exclude: NOT_EVENTS },
  { id: 'abruzzolive', name: 'AbruzzoLive', type: 'rss', url: 'https://www.abruzzolive.it/feed/', category: 'vicino', lang: 'it', kind: 'event', quality: 0.6, max: 3, maxAgeDays: 4, city: 'laquila', match: [/\b(l'aquila|aquilan[oi]|gran sasso)\b/i, EVENT_WORDS], exclude: NOT_EVENTS },
  { id: 'laquilablog', name: 'AQ Blog', type: 'rss', url: 'https://www.laquilablog.it/feed/', category: 'vicino', lang: 'it', kind: 'event', quality: 0.65, max: 4, maxAgeDays: 4, city: 'laquila', match: [EVENT_WORDS], exclude: NOT_EVENTS },
  { id: 'newstown', name: 'NewsTown', type: 'rss', url: 'https://www.news-town.it/feed', category: 'vicino', lang: 'it', kind: 'event', quality: 0.65, max: 4, maxAgeDays: 4, city: 'laquila', match: [EVENT_WORDS], exclude: NOT_EVENTS },
];
