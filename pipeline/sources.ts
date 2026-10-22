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
  | 'lichess'
  | 'poetrydb'
  | 'transparent'
  | 'smk';

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
  /** Bio dell'account nell'app: una riga su chi è la fonte. */
  about?: string;
  /** Sito della fonte (se diverso da quello del feed). */
  home?: string;
}

interface YtOptions {
  quality?: number;
  lang?: string;
  /** Nome utente storico: indirizzo alternativo del feed. */
  user?: string;
  mixed?: boolean;
  maxAgeDays?: number;
  about?: string;
}

const yt = (id: string, name: string, channelId: string, category: CategoryId, o: YtOptions = {}): SourceDef => ({
  id: `yt-${id}`,
  name,
  type: 'youtube',
  url: `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`,
  alt: o.user ? [`https://www.youtube.com/feeds/videos.xml?user=${o.user}`] : undefined,
  category,
  mixed: o.mixed,
  lang: o.lang ?? 'en',
  kind: 'video',
  quality: o.quality ?? 0.8,
  max: 1,
  maxAgeDays: o.maxAgeDays ?? 7,
  about: o.about,
  home: `https://www.youtube.com/channel/${channelId}`,
});

/** Canali YouTube: lezioni, divulgazione e saggi video. Un video al giorno al massimo per canale. */
export const YOUTUBE: SourceDef[] = [
  // Scienza
  yt('3b1b', '3Blue1Brown', 'UCYO_jab_esuFRV4b17AJtAw', 'scienza', { quality: 0.95, maxAgeDays: 14, about: 'La matematica spiegata con animazioni bellissime' }),
  yt('veritasium', 'Veritasium', 'UCHnyfMqiRRG1u-2MsSQLbXA', 'scienza', { quality: 0.85, about: 'Scienza e ingegneria, con esperimenti veri' }),
  yt('kurzgesagt', 'Kurzgesagt', 'UCsXVk37bltHxD1rDPwtNM8Q', 'scienza', { quality: 0.85, maxAgeDays: 14, about: 'Grandi domande della scienza in animazione' }),
  yt('numberphile', 'Numberphile', 'UCoxcjq-8xIDTYp3uz647V5A', 'scienza', { user: 'numberphile', about: 'Numeri e matematici, con carta marrone' }),
  yt('minutephysics', 'MinutePhysics', 'UCUHW94eEFW7hkUMVaZz4eDg', 'scienza', { user: 'minutephysics', maxAgeDays: 14, about: 'La fisica in pochi minuti, disegnata a mano' }),
  yt('pbsspacetime', 'PBS Space Time', 'UC7_gcs09iThXybpVgjHZ_7g', 'scienza', { quality: 0.85, about: 'Astrofisica e fisica teorica, senza semplificare troppo' }),
  yt('scishow', 'SciShow', 'UCZYTClx2T1of7BRZ86-8fow', 'scienza', { user: 'scishow', quality: 0.75, maxAgeDays: 3, about: 'Notizie e curiosità scientifiche' }),
  yt('smartereveryday', 'Smarter Every Day', 'UC6107grRI4m0o2-emgoDnAA', 'scienza', { user: 'destinws2', maxAgeDays: 14, about: 'Un ingegnere curioso esplora come funzionano le cose' }),
  yt('stevemould', 'Steve Mould', 'UCEIwxahdLz7bap-VDs9h35A', 'scienza', { maxAgeDays: 14, about: 'Fenomeni fisici sorprendenti spiegati bene' }),
  yt('sixtysymbols', 'Sixty Symbols', 'UCvBqzzvUBLCs8Y7Axb-jZew', 'scienza', { user: 'sixtysymbols', maxAgeDays: 14, about: 'Fisici dell’Università di Nottingham' }),
  yt('primer', 'Primer', 'UCKzJFdi57J53Vr_BkTfN3uQ', 'scienza', { quality: 0.9, maxAgeDays: 30, about: 'Simulazioni di evoluzione ed economia' }),
  yt('mathologer', 'Mathologer', 'UC1_uAIS3r8Vu6JjXWvastJg', 'scienza', { quality: 0.85, maxAgeDays: 30, about: 'Dimostrazioni matematiche eleganti' }),
  yt('standupmaths', 'Stand-up Maths', 'UCSju5G2aFaWMqn-_0YBtq5A', 'scienza', { maxAgeDays: 21, about: 'Matt Parker e la matematica divertente' }),
  yt('physicsgirl', 'Physics Girl', 'UC7DdEm33SyaTDtWYGO2CwdA', 'scienza', { maxAgeDays: 30, about: 'Fisica sperimentale e meraviglia' }),
  yt('pbseons', 'PBS Eons', 'UCzR-rom72PHN9Zg7RML9EbA', 'natura', { quality: 0.85, maxAgeDays: 14, about: 'La storia della vita sulla Terra' }),
  yt('sabine', 'Sabine Hossenfelder', 'UC1yNl2E66ZzKApQdRuTQ4tw', 'scienza', { quality: 0.75, maxAgeDays: 4, about: 'Notizie di fisica, con spirito critico' }),
  yt('nilered', 'NileRed', 'UCFhXFikryT4aFcLkLw2LBLA', 'scienza', { maxAgeDays: 30, about: 'Chimica sperimentale, passo dopo passo' }),
  yt('scottmanley', 'Scott Manley', 'UCxzC4EngIsMrPmbm6Nxvb-A', 'scienza', { maxAgeDays: 7, about: 'Razzi, missioni spaziali e astronomia' }),
  yt('domainofscience', 'Domain of Science', 'UCxqAWLTk1CmBvZFPzeZMd9A', 'scienza', { maxAgeDays: 60, about: 'Mappe di intere discipline scientifiche' }),
  // Natura
  yt('bbcearth', 'BBC Earth', 'UCwmZiChSryoWQCZMIQezgTg', 'natura', { quality: 0.8, maxAgeDays: 4, about: 'Il pianeta e i suoi animali, dai documentari BBC' }),
  yt('natgeo', 'National Geographic', 'UCpVm7bg6pXKo1Pr6k5kxG9A', 'natura', { quality: 0.75, maxAgeDays: 4, about: 'Natura, esplorazione e fotografia' }),
  yt('primitivetech', 'Primitive Technology', 'UCAL3JXZSzSm8AlZyD3nQdBA', 'natura', { maxAgeDays: 60, about: 'Costruire dal nulla, solo con la natura' }),
  // Tech
  yt('computerphile', 'Computerphile', 'UC9-y-6csu5WGm29I7JiwpnA', 'tech', { user: 'Computerphile', about: 'Informatica spiegata da chi la fa' }),
  yt('twominutepapers', 'Two Minute Papers', 'UCbfYPyITQ-7l4upoX8nvctg', 'tech', { quality: 0.75, about: 'Le ricerche di IA e grafica più belle' }),
  yt('realengineering', 'Real Engineering', 'UCR1IuLEqb6UEA_zQ81kwXfg', 'tech', { maxAgeDays: 14, about: 'Ingegneria dietro aerei, energia e città' }),
  yt('practicaleng', 'Practical Engineering', 'UCMOqf8ab-42UUQIdVoKwjlQ', 'tech', { quality: 0.85, maxAgeDays: 21, about: 'Le infrastrutture che non vediamo' }),
  yt('branch', 'Branch Education', 'UCdp4_l1vPmpN-gDbUwhaRUQ', 'tech', { quality: 0.85, maxAgeDays: 60, about: 'Come funziona la tecnologia, in 3D' }),
  yt('fireship', 'Fireship', 'UCsBjURrPoezykLs9EqgamOA', 'tech', { quality: 0.7, maxAgeDays: 4, about: 'Programmazione e tecnologia, velocissimo' }),
  yt('b1m', 'The B1M', 'UC6n8I1UDTKP1IWjQMg6_TwA', 'design', { maxAgeDays: 14, about: 'Le grandi costruzioni del mondo' }),
  // Arte, design, cultura
  yt('artassignment', 'The Art Assignment', 'UCmQThz1OLYt8mb2PU540LOA', 'arte', { user: 'theartassignment', quality: 0.85, maxAgeDays: 21, about: 'Storia dell’arte e arte contemporanea' }),
  yt('nerdwriter', 'Nerdwriter1', 'UCJkMlOu7faDgqh4PfzbpLdg', 'arte', { quality: 0.85, maxAgeDays: 30, about: 'Saggi video su arte, film e idee' }),
  yt('thefutur', 'The Futur', 'UC-b3c7kxa5vU-bnmaROgvog', 'design', { quality: 0.7, maxAgeDays: 7, about: 'Design, branding e mestiere creativo' }),
  yt('ad', 'Architectural Digest', 'UC0k238zFx-Z8xFH0sxCrPJg', 'design', { quality: 0.65, maxAgeDays: 4, about: 'Case e interni, raccontati da chi li abita' }),
  yt('polyphonic', 'Polyphonic', 'UCXkNod_JcH7PleOjwK_8rYQ', 'cultura', { quality: 0.85, maxAgeDays: 60, about: 'Saggi video sulla musica' }),
  yt('adamneely', 'Adam Neely', 'UCnkp4xDOwqqJD7sSM3xdUiQ', 'cultura', { maxAgeDays: 30, about: 'Teoria musicale per curiosi' }),
  yt('12tone', '12tone', 'UCTUtqcDkzw7bisadh6AOx5w', 'cultura', { maxAgeDays: 30, about: 'Analisi musicale illustrata' }),
  yt('screenplay', 'Lessons from the Screenplay', 'UCErSSa3CaP_GJxmFpdjG9Jw', 'cultura', { quality: 0.85, maxAgeDays: 60, about: 'Come funzionano le grandi sceneggiature' }),
  yt('nprmusic', 'NPR Music', 'UC4eYXhJI4-7wSWc8UNRwD4A', 'cultura', { quality: 0.75, maxAgeDays: 3, about: 'Tiny Desk e musica dal vivo' }),
  yt('colors', 'COLORS', 'UC2Qw1dzXDBAZPwS7zm37g8g', 'cultura', { quality: 0.7, maxAgeDays: 4, about: 'Voci nuove da tutto il mondo, su un colore' }),
  yt('kexp', 'KEXP', 'UC3I2GFN_F8WudD_2jUZbojA', 'cultura', { quality: 0.7, maxAgeDays: 3, about: 'Concerti in studio da Seattle' }),
  // Lingue
  yt('langfocus', 'Langfocus', 'UCNhX3WQEkraW3VHPyup8jkQ', 'lingue', { quality: 0.85, maxAgeDays: 21, about: 'Le lingue del mondo, una alla volta' }),
  yt('easygerman', 'Easy German', 'UCbxb2fqe9oNgglAoYqsYOtQ', 'lingue', { lang: 'de', maxAgeDays: 5, about: 'Tedesco vero, per strada' }),
  // Storia
  yt('historiacivilis', 'Historia Civilis', 'UCv_vLHiWVBh_FR9vbeuiY-A', 'storia', { quality: 0.85, maxAgeDays: 60, about: 'La Roma antica, raccontata con precisione' }),
  yt('kingsgenerals', 'Kings and Generals', 'UCMmaBzfCCwZ2KqaBJjkj0fw', 'storia', { quality: 0.75, maxAgeDays: 7, about: 'Storia militare e degli imperi' }),
  yt('oversimplified', 'OverSimplified', 'UCNIuvl7V8zACPpTmmNIqP2A', 'storia', { quality: 0.8, maxAgeDays: 90, about: 'Grandi eventi storici, con umorismo' }),
  yt('extrahistory', 'Extra History', 'UCCODtTcd5M1JavPCOr_Uydg', 'storia', { maxAgeDays: 14, about: 'Storie dalla storia, illustrate' }),
  yt('fallofciv', 'Fall of Civilizations', 'UCT6Y5JJPKe_JDMivpKgVXew', 'storia', { quality: 0.9, maxAgeDays: 90, about: 'Come finiscono le civiltà' }),
  yt('tastinghistory', 'Tasting History', 'UCsaGKqPZnGp_7N80hcHySGQ', 'storia', { maxAgeDays: 14, about: 'Ricette del passato e la loro storia' }),
  yt('townsends', 'Townsends', 'UCxr2d4As312LulcajAkKJYw', 'storia', { quality: 0.75, maxAgeDays: 14, about: 'La vita quotidiana nel Settecento' }),
  // Persone, mente, abitudini
  yt('schooloflife', 'The School of Life', 'UC7IcJI8PUf5Z3zKxnZvTBog', 'psicologia', { user: 'schooloflifechannel', maxAgeDays: 7, about: 'Intelligenza emotiva e vita interiore' }),
  yt('bigthink', 'Big Think', 'UCvQECJukTDE2i6aCoMnS-Vg', 'filosofia', { mixed: true, quality: 0.75, maxAgeDays: 3, about: 'Grandi idee da grandi pensatori' }),
  yt('aliabdaal', 'Ali Abdaal', 'UCoOae5nYA7VqaXzerajD0lg', 'produttivita', { quality: 0.65, maxAgeDays: 7, about: 'Produttività senza ansia' }),
  yt('thomasfrank', 'Thomas Frank', 'UCG-KntY7aVnIGXYEBQvmBAQ', 'abitudini', { quality: 0.7, maxAgeDays: 14, about: 'Studio, abitudini e organizzazione' }),
  // Università e lezioni
  yt('mitocw', 'MIT OpenCourseWare', 'UCEBb1b_L6zDS3xTUrIALZOw', 'universita', { quality: 0.95, user: 'MIT', about: 'Le lezioni del MIT, gratis per tutti' }),
  yt('stanford', 'Stanford', 'UCBa5G_ESCn8Yd4vw5U-gIcg', 'universita', { quality: 0.85, user: 'stanforduniversity', about: 'Lezioni e incontri dall’Università di Stanford' }),
  yt('harvard', 'Harvard University', 'UCWwgaK7x0_FR1goeSRazfsQ', 'universita', { quality: 0.85, user: 'Harvard', about: 'Ricerca e lezioni da Harvard' }),
  yt('yalecourses', 'Yale Courses', 'UC4EY_qnSeAP1xGsh61eOoJA', 'universita', { quality: 0.9, user: 'YaleCourses', maxAgeDays: 14, about: 'Corsi completi di Yale' }),
  yt('royalinstitution', 'The Royal Institution', 'UCYeF244yNGuFefuFKqxIAXw', 'universita', { quality: 0.9, user: 'TheRoyalInstitution', about: 'Conferenze di scienza dal 1799' }),
  yt('oxfordmaths', 'Oxford Mathematics', 'UCLnGGRG__uGSPLBLzyhg8dQ', 'universita', { quality: 0.9, maxAgeDays: 30, about: 'Lezioni di matematica da Oxford' }),
  yt('khan', 'Khan Academy', 'UC4a-Gbdw7vOaccHmFo40b9g', 'universita', { quality: 0.8, maxAgeDays: 14, about: 'Lezioni gratuite su tutto' }),
  yt('crashcourse', 'Crash Course', 'UCX6b17PVsYBQ0ip5gyeme-Q', 'universita', { user: 'crashcourse', mixed: true, about: 'Corsi brevi su ogni materia' }),
  yt('ted', 'TED', 'UCAuUUnT6oDeKwE6v1NGQxug', 'universita', { user: 'TEDtalksDirector', mixed: true, quality: 0.75, maxAgeDays: 3, about: 'Idee che vale la pena diffondere' }),
  // Curiosità e divertimento
  yt('teded', 'TED-Ed', 'UCsooa4yRKGN_zEE8iknghZA', 'curiosita', { user: 'TEDEducation', about: 'Lezioni animate da insegnanti di tutto il mondo' }),
  yt('vsauce', 'Vsauce', 'UC6nSFpj9HTCZ5t-N3Rm3-HA', 'curiosita', { user: 'vsauce', maxAgeDays: 60, about: 'Domande strane, risposte serie' }),
  yt('cgpgrey', 'CGP Grey', 'UC2C_jShtL725hvbm1arSV9w', 'curiosita', { user: 'CGPGrey', quality: 0.85, maxAgeDays: 60, about: 'Spiegazioni chiare di cose complicate' }),
  yt('wendover', 'Wendover Productions', 'UC9RM-iSvTu1uPJb8X5yp3EQ', 'curiosita', { maxAgeDays: 14, about: 'Logistica, viaggi e come gira il mondo' }),
  yt('halfasinteresting', 'Half as Interesting', 'UCuCkxoKLYO_EQ2GeFtbM_bw', 'curiosita', { quality: 0.7, maxAgeDays: 7, about: 'Curiosità brevi e intelligenti' }),
  yt('reallifelore', 'RealLifeLore', 'UCP5tjEmvPItGyLhmjdwP7Ww', 'curiosita', { quality: 0.7, maxAgeDays: 14, about: 'Geografia e geopolitica in mappe' }),
  yt('tomscott', 'Tom Scott', 'UCBa659QWEk1AI4Tg--mrJ2A', 'curiosita', { quality: 0.85, maxAgeDays: 60, about: 'Luoghi e storie sorprendenti' }),
  yt('johnnyharris', 'Johnny Harris', 'UCmGSJVG3mCRXVOP4yZrU1Dw', 'notizie', { mixed: true, quality: 0.75, maxAgeDays: 7, about: 'Giornalismo video, mappe e reportage' }),
  yt('vox', 'Vox', 'UCLXo7UDZvByw2ixzpQCufnA', 'notizie', { user: 'voxdotcom', mixed: true, quality: 0.7, maxAgeDays: 3, about: 'Spiegare le notizie' }),
  yt('markrober', 'Mark Rober', 'UCY1kMZp36IQSyNx_9h4mpCg', 'divertimento', { maxAgeDays: 30, about: 'Ex ingegnere NASA, invenzioni folli' }),
];

/** Abbreviazioni per le righe sotto. */
const rss = (
  id: string,
  name: string,
  url: string,
  category: CategoryId,
  lang: string,
  quality: number,
  max: number,
  maxAgeDays: number,
  about: string,
  more: Partial<SourceDef> = {},
): SourceDef => ({ id, name, type: 'rss', url, category, lang, quality, max, maxAgeDays, about, ...more });

export const SOURCES: SourceDef[] = [
  // ── Notizie ─────────────────────────────────────────────────────────────
  rss('ansa', 'ANSA', 'https://www.ansa.it/sito/ansait_rss.xml', 'notizie', 'it', 0.75, 3, 1.5, 'La principale agenzia di stampa italiana', { alt: ['https://www.ansa.it/sito/notizie/topnews/topnews_rss.xml'], mixed: true }),
  rss('internazionale', 'Internazionale', 'https://www.internazionale.it/sitemaps/rss.xml', 'notizie', 'it', 0.85, 3, 2, 'Il meglio dei giornali di tutto il mondo', { mixed: true }),
  rss('valigiablu', 'Valigia Blu', 'https://www.valigiablu.it/feed/', 'notizie', 'it', 0.8, 2, 4, 'Giornalismo indipendente e approfondito', { mixed: true }),
  rss('euronews-it', 'Euronews', 'https://it.euronews.com/rss?format=mrss&level=theme&name=news', 'notizie', 'it', 0.7, 2, 1.5, 'Notizie europee in italiano', { alt: ['https://it.euronews.com/rss'] }),
  rss('bbc', 'BBC World', 'https://feeds.bbci.co.uk/news/world/rss.xml', 'notizie', 'en', 0.8, 3, 1.5, 'Il servizio pubblico britannico, dal mondo'),
  rss('guardian', 'The Guardian', 'https://www.theguardian.com/world/rss', 'notizie', 'en', 0.8, 2, 1.5, 'Quotidiano britannico indipendente'),
  rss('npr', 'NPR', 'https://feeds.npr.org/1001/rss.xml', 'notizie', 'en', 0.8, 2, 1.5, 'La radio pubblica statunitense'),
  rss('aljazeera', 'Al Jazeera', 'https://www.aljazeera.com/xml/rss/all.xml', 'notizie', 'en', 0.75, 2, 1.5, 'Notizie dal Sud del mondo e dal Medio Oriente'),
  rss('dw', 'DW', 'https://rss.dw.com/rdf/rss-en-all', 'notizie', 'en', 0.75, 1, 1.5, 'Il servizio pubblico internazionale tedesco'),
  rss('lemonde', 'Le Monde', 'https://www.lemonde.fr/international/rss_full.xml', 'notizie', 'fr', 0.8, 2, 1.5, 'Il quotidiano francese di riferimento'),
  rss('elpais', 'El País', 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada', 'notizie', 'es', 0.75, 1, 1.5, 'Il quotidiano spagnolo più letto'),
  rss('tagesschau', 'Tagesschau', 'https://www.tagesschau.de/xml/rss2', 'notizie', 'de', 0.8, 1, 1.5, 'Il telegiornale pubblico tedesco'),
  rss('nhk', 'NHK ニュース', 'https://www3.nhk.or.jp/rss/news/cat0.xml', 'notizie', 'ja', 0.75, 1, 1.5, 'La televisione pubblica giapponese', { alt: ['https://www3.nhk.or.jp/rss/news/cat1.xml'] }),
  rss('bbc-zhongwen', 'BBC 中文', 'https://feeds.bbci.co.uk/zhongwen/simp/rss.xml', 'notizie', 'zh', 0.75, 1, 2, 'La BBC in cinese'),
  rss('bbc-arabic', 'BBC عربي', 'https://feeds.bbci.co.uk/arabic/rss.xml', 'notizie', 'ar', 0.75, 1, 2, 'La BBC in arabo'),
  rss('bbc-brasil', 'BBC Brasil', 'https://feeds.bbci.co.uk/portuguese/rss.xml', 'notizie', 'pt', 0.75, 1, 2, 'La BBC in portoghese'),
  rss('restofworld', 'Rest of World', 'https://restofworld.org/feed/latest', 'tech', 'en', 0.8, 1, 4, 'La tecnologia fuori dall’Occidente', { mixed: true }),

  // ── Scienza ─────────────────────────────────────────────────────────────
  rss('quanta', 'Quanta Magazine', 'https://api.quantamagazine.org/feed/', 'scienza', 'en', 0.95, 2, 5, 'Matematica, fisica e biologia, raccontate con rigore'),
  rss('nature', 'Nature', 'https://www.nature.com/nature.rss', 'scienza', 'en', 0.9, 2, 3, 'La rivista scientifica più autorevole'),
  rss('sciencenews', 'Science News', 'https://www.sciencenews.org/feed', 'scienza', 'en', 0.85, 2, 3, 'Notizie di scienza dal 1921'),
  rss('sciam', 'Scientific American', 'https://www.scientificamerican.com/platform/syndication/rss/', 'scienza', 'en', 0.85, 2, 3, 'Divulgazione scientifica dal 1845', { alt: ['http://rss.sciam.com/ScientificAmerican-Global'] }),
  rss('nautilus', 'Nautilus', 'https://nautil.us/feed/', 'scienza', 'en', 0.9, 1, 7, 'Scienza, cultura e filosofia insieme', { mixed: true }),
  rss('knowable', 'Knowable Magazine', 'https://knowablemagazine.org/rss', 'scienza', 'en', 0.9, 1, 7, 'La ricerca spiegata dagli Annual Reviews', { mixed: true }),
  rss('lescienze', 'Le Scienze', 'https://www.lescienze.it/rss/all/rss2.0.xml', 'scienza', 'it', 0.85, 2, 3, 'L’edizione italiana di Scientific American', { alt: ['https://www.lescienze.it/feed', 'https://www.lescienze.it/rss', 'https://www.lescienze.it/news/rss'] }),
  rss('mediainaf', 'Media INAF', 'https://www.media.inaf.it/feed/', 'scienza', 'it', 0.85, 2, 4, 'L’Istituto Nazionale di Astrofisica racconta l’universo'),
  rss('scienzainrete', 'Scienza in rete', 'https://www.scienzainrete.it/rss.xml', 'scienza', 'it', 0.8, 1, 5, 'Scienza e salute, dal Gruppo 2003', { mixed: true }),
  rss('transmitter', 'The Transmitter', 'https://www.thetransmitter.org/feed/', 'scienza', 'en', 0.85, 1, 5, 'Neuroscienze, con giornalismo scientifico'),
  rss('nasa-iotd', 'NASA · Immagine del giorno', 'https://www.nasa.gov/feeds/iotd-feed/', 'scienza', 'en', 0.9, 1, 3, 'Le immagini più belle dalla NASA', { kind: 'image', alt: ['https://www.nasa.gov/rss/dyn/lg_image_of_the_day.rss'] }),
  { id: 'apod', name: 'NASA APOD', type: 'apod', category: 'scienza', lang: 'en', kind: 'image', quality: 0.9, max: 1, about: 'Una foto astronomica al giorno, dal 1995', home: 'https://apod.nasa.gov' },

  // ── Natura e ambiente ──────────────────────────────────────────────────
  rss('earthobservatory', 'NASA Earth Observatory', 'https://earthobservatory.nasa.gov/feeds/image-of-the-day.rss', 'natura', 'en', 0.9, 1, 4, 'La Terra vista dai satelliti', { kind: 'image' }),
  rss('mongabay', 'Mongabay', 'https://news.mongabay.com/feed/', 'natura', 'en', 0.8, 2, 3, 'Foreste, oceani e biodiversità'),
  rss('e360', 'Yale Environment 360', 'https://e360.yale.edu/feed.xml', 'natura', 'en', 0.9, 1, 5, 'Ambiente e clima, da Yale'),
  rss('hakai', 'Hakai Magazine', 'https://hakaimagazine.com/feed/', 'natura', 'en', 0.85, 1, 7, 'Storie dalle coste e dal mare'),
  rss('carbonbrief', 'Carbon Brief', 'https://www.carbonbrief.org/feed/', 'natura', 'en', 0.85, 1, 4, 'Scienza e politica del clima'),
  rss('bbc-science', 'BBC Scienza e ambiente', 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml', 'natura', 'en', 0.8, 2, 2, 'Scienza e ambiente dalla BBC', { mixed: true }),

  // ── Tech ────────────────────────────────────────────────────────────────
  rss('ars', 'Ars Technica', 'https://feeds.arstechnica.com/arstechnica/index', 'tech', 'en', 0.8, 2, 2, 'Tecnologia e scienza, in profondità', { mixed: true }),
  rss('techreview', 'MIT Technology Review', 'https://www.technologyreview.com/feed/', 'tech', 'en', 0.85, 2, 3, 'Le tecnologie che cambiano il mondo'),
  rss('ieee', 'IEEE Spectrum', 'https://spectrum.ieee.org/feeds/feed.rss', 'tech', 'en', 0.85, 2, 3, 'La rivista degli ingegneri'),
  rss('verge', 'The Verge', 'https://www.theverge.com/rss/index.xml', 'tech', 'en', 0.7, 2, 1.5, 'Tecnologia, scienza e cultura digitale'),
  rss('wired', 'WIRED', 'https://www.wired.com/feed/rss', 'tech', 'en', 0.75, 2, 2, 'Come la tecnologia cambia la vita', { mixed: true }),
  rss('wired-it', 'Wired Italia', 'https://www.wired.it/feed/rss', 'tech', 'it', 0.7, 2, 2, 'Tecnologia e innovazione in italiano', { mixed: true }),
  rss('simonw', 'Simon Willison', 'https://simonwillison.net/atom/everything/', 'tech', 'en', 0.85, 1, 3, 'Intelligenza artificiale, con occhio critico'),
  rss('lobsters', 'Lobsters', 'https://lobste.rs/hottest.rss', 'tech', 'en', 0.65, 1, 2, 'Una comunità di programmatori'),
  { id: 'hn', name: 'Hacker News', type: 'hn', category: 'tech', mixed: true, lang: 'en', quality: 0.65, max: 3, about: 'I link più votati dalla comunità di Y Combinator', home: 'https://news.ycombinator.com' },
  { id: 'hfpapers', name: 'Hugging Face Papers', type: 'hfpapers', category: 'tech', lang: 'en', kind: 'paper', quality: 0.75, max: 2, about: 'I paper di IA più discussi del giorno', home: 'https://huggingface.co/papers' },

  // ── Arte ────────────────────────────────────────────────────────────────
  { id: 'cleveland', name: 'Cleveland Museum of Art', type: 'cleveland', category: 'arte', lang: 'en', kind: 'artwork', quality: 0.95, max: 1, about: 'Opere in pubblico dominio da Cleveland', home: 'https://www.clevelandart.org' },
  { id: 'aic', name: 'Art Institute of Chicago', type: 'aic', category: 'arte', lang: 'en', kind: 'artwork', quality: 0.95, max: 1, about: 'Capolavori in pubblico dominio da Chicago', home: 'https://www.artic.edu' },
  { id: 'smk', name: 'SMK · Galleria Nazionale di Danimarca', type: 'smk', category: 'arte', lang: 'en', kind: 'artwork', quality: 0.9, max: 1, about: 'Arte europea in pubblico dominio da Copenaghen', home: 'https://open.smk.dk' },
  rss('pdr', 'The Public Domain Review', 'https://publicdomainreview.org/rss.xml', 'arte', 'en', 0.9, 1, 14, 'Immagini e testi dimenticati, riscoperti', { mixed: true }),
  rss('colossal', 'Colossal', 'https://www.thisiscolossal.com/feed/', 'arte', 'en', 0.8, 2, 3, 'Arte, artigianato e cultura visiva'),
  rss('hyperallergic', 'Hyperallergic', 'https://hyperallergic.com/feed/', 'arte', 'en', 0.75, 1, 3, 'Arte contemporanea, con spirito critico'),
  rss('juxtapoz', 'Juxtapoz', 'https://www.juxtapoz.com/news/?format=feed&type=rss', 'arte', 'en', 0.7, 1, 5, 'Arte urbana, illustrazione e pop surrealism'),
  rss('smarthistory', 'Smarthistory', 'https://smarthistory.org/feed/', 'arte', 'en', 0.85, 1, 14, 'Storia dell’arte, scritta da storici dell’arte'),
  rss('artribune', 'Artribune', 'https://www.artribune.com/feed/', 'arte', 'it', 0.7, 2, 3, 'Arte e cultura contemporanea in Italia', { mixed: true }),
  rss('finestre', 'Finestre sull’Arte', 'https://www.finestresullarte.info/rss', 'arte', 'it', 0.75, 2, 3, 'Arte antica e moderna, mostre e musei', { alt: ['https://www.finestresullarte.info/feed', 'https://www.finestresullarte.info/rss.xml'] }),

  // ── Design ──────────────────────────────────────────────────────────────
  rss('dezeen', 'Dezeen', 'https://www.dezeen.com/feed/', 'design', 'en', 0.8, 2, 3, 'Architettura e design'),
  rss('designboom', 'designboom', 'https://www.designboom.com/feed/', 'design', 'en', 0.75, 1, 3, 'Design, architettura e arte'),
  rss('itsnicethat', "It's Nice That", 'https://www.itsnicethat.com/rss', 'design', 'en', 0.8, 1, 4, 'Grafica, illustrazione e creatività', { alt: ['https://www.itsnicethat.com/feed', 'https://www.itsnicethat.com/rss.xml', 'https://feeds.feedburner.com/itsnicethat/SlXC'] }),
  rss('smashing', 'Smashing Magazine', 'https://www.smashingmagazine.com/feed/', 'design', 'en', 0.8, 1, 7, 'Design per il web e interfacce'),
  rss('designmilk', 'Design Milk', 'https://design-milk.com/feed/', 'design', 'en', 0.7, 1, 3, 'Design moderno, oggetti e interni'),
  rss('creativeboom', 'Creative Boom', 'https://www.creativeboom.com/feed/', 'design', 'en', 0.7, 1, 4, 'Grafica e progetti creativi'),
  rss('archdaily', 'ArchDaily', 'https://www.archdaily.com/feed', 'design', 'en', 0.75, 1, 3, 'L’architettura più letta al mondo', { alt: ['https://feeds.feedburner.com/Archdaily'] }),
  rss('nngroup', 'Nielsen Norman Group', 'https://www.nngroup.com/feed/rss/', 'design', 'en', 0.85, 1, 14, 'Ricerca sull’esperienza utente'),
  rss('abitare', 'Abitare', 'https://www.abitare.it/it/feed/', 'design', 'it', 0.75, 1, 5, 'Rivista italiana di architettura e design', { alt: ['https://www.abitare.it/feed/'] }),

  // ── Storia ──────────────────────────────────────────────────────────────
  rss('jstordaily', 'JSTOR Daily', 'https://daily.jstor.org/feed/', 'storia', 'en', 0.9, 2, 7, 'Le notizie viste con la ricerca accademica', { mixed: true }),
  rss('historyextra', 'HistoryExtra', 'https://www.historyextra.com/feed/', 'storia', 'en', 0.75, 1, 5, 'La rivista di storia della BBC'),
  rss('medievalists', 'Medievalists.net', 'https://www.medievalists.net/feed/', 'storia', 'en', 0.75, 1, 7, 'Il Medioevo, tra ricerca e curiosità'),

  // ── Libri, film e musica ───────────────────────────────────────────────
  rss('parisreview', 'The Paris Review', 'https://www.theparisreview.org/blog/feed/', 'cultura', 'en', 0.9, 1, 7, 'Letteratura e scrittori dal 1953'),
  rss('lithub', 'Literary Hub', 'https://lithub.com/feed/', 'cultura', 'en', 0.8, 2, 3, 'Il meglio della letteratura, ogni giorno'),
  rss('npr-books', 'NPR Libri', 'https://feeds.npr.org/1032/rss.xml', 'cultura', 'en', 0.8, 1, 4, 'Libri e autori dalla radio pubblica americana'),
  rss('quietus', 'The Quietus', 'https://thequietus.com/feed', 'cultura', 'en', 0.75, 1, 5, 'Musica, recensioni e interviste'),
  rss('pitchfork', 'Pitchfork · Best New Music', 'https://pitchfork.com/rss/reviews/best/albums/', 'cultura', 'en', 0.75, 1, 7, 'I dischi migliori, scelti dai critici'),
  rss('doppiozero', 'Doppiozero', 'https://www.doppiozero.com/rss.xml', 'cultura', 'it', 0.85, 2, 5, 'Rivista di cultura: libri, arte, cinema, idee', { mixed: true }),
  rss('rivistastudio', 'Rivista Studio', 'https://www.rivistastudio.com/feed/', 'cultura', 'it', 0.75, 1, 4, 'Cultura, società e costume', { mixed: true }),
  rss('illibraio', 'Il Libraio', 'https://www.illibraio.it/feed/', 'cultura', 'it', 0.7, 1, 4, 'Libri, autori e consigli di lettura'),

  // ── Filosofia ───────────────────────────────────────────────────────────
  rss('sep', 'Stanford Encyclopedia of Philosophy', 'https://plato.stanford.edu/rss/sep.xml', 'filosofia', 'en', 0.95, 1, 21, 'L’enciclopedia di filosofia più autorevole'),
  rss('1000word', '1000-Word Philosophy', 'https://1000wordphilosophy.com/feed/', 'filosofia', 'en', 0.85, 1, 30, 'Grandi problemi filosofici in mille parole'),
  rss('noema', 'Noema', 'https://www.noemamag.com/feed/', 'filosofia', 'en', 0.85, 1, 7, 'Idee per il futuro, dal Berggruen Institute', { mixed: true }),

  // ── Università, lezioni e paper ────────────────────────────────────────
  rss('mitnews', 'MIT News', 'https://news.mit.edu/rss/feed', 'universita', 'en', 0.9, 2, 3, 'La ricerca del Massachusetts Institute of Technology'),
  rss('harvard', 'Harvard Gazette', 'https://news.harvard.edu/gazette/feed/', 'universita', 'en', 0.9, 2, 3, 'Le notizie dell’Università di Harvard'),
  rss('yale', 'Yale News', 'https://news.yale.edu/news-rss', 'universita', 'en', 0.85, 1, 4, 'La ricerca dell’Università di Yale'),
  rss('berkeley', 'Berkeley News', 'https://news.berkeley.edu/feed/', 'universita', 'en', 0.85, 1, 4, 'La ricerca dell’Università della California, Berkeley'),
  rss('cambridge', 'University of Cambridge', 'https://www.cam.ac.uk/news/feed', 'universita', 'en', 0.85, 1, 5, 'Ricerca e idee da Cambridge', { alt: ['https://www.cam.ac.uk/rss/news.xml'] }),
  rss('openculture', 'Open Culture', 'https://www.openculture.com/feed', 'universita', 'en', 0.8, 1, 4, 'Corsi, libri e film gratuiti', { mixed: true }),

  // ── Poesia ──────────────────────────────────────────────────────────────
  { id: 'poetrydb', name: 'PoetryDB · classici', type: 'poetrydb', category: 'poesia', lang: 'en', kind: 'poem', quality: 0.85, max: 2, about: 'Poesie classiche in lingua inglese', home: 'https://poetrydb.org' },
  rss('marginalian', 'The Marginalian', 'https://www.themarginalian.org/feed/', 'poesia', 'en', 0.85, 1, 7, 'Letture lente su poesia, arte e senso della vita', { mixed: true }),
  rss('internopoesia', 'Interno Poesia', 'https://www.internopoesia.com/feed/', 'poesia', 'it', 0.8, 1, 5, 'Una poesia al giorno, in italiano'),
  rss('poetarumsilva', 'Poetarum Silva', 'https://poetarumsilva.com/feed/', 'poesia', 'it', 0.75, 1, 7, 'Poesia e letteratura, italiana e tradotta'),

  // ── Antropologia, psicologia, idee ─────────────────────────────────────
  rss('sapiens', 'SAPIENS', 'https://www.sapiens.org/feed/', 'antropologia', 'en', 0.9, 2, 7, 'L’antropologia per tutti'),
  rss('anthronews', 'Anthropology News', 'https://www.anthropology-news.org/feed/', 'antropologia', 'en', 0.8, 1, 7, 'La rivista dell’American Anthropological Association'),
  rss('allegra', 'Allegra Lab', 'https://allegralaboratory.net/feed/', 'antropologia', 'en', 0.75, 1, 10, 'Antropologia contemporanea, aperta'),
  rss('aeon', 'Aeon', 'https://aeon.co/feed.rss', 'filosofia', 'en', 0.9, 2, 5, 'Saggi di filosofia, scienza e cultura', { mixed: true }),
  rss('psyche', 'Psyche', 'https://psyche.co/feed', 'psicologia', 'en', 0.9, 2, 5, 'Psicologia e filosofia per vivere meglio', { mixed: true }),
  rss('greatergood', 'Greater Good (Berkeley)', 'https://greatergood.berkeley.edu/site/rss/articles', 'psicologia', 'en', 0.85, 1, 7, 'La scienza del benessere, da Berkeley'),
  rss('behavioral', 'Behavioral Scientist', 'https://behavioralscientist.org/feed/', 'psicologia', 'en', 0.85, 1, 7, 'Scienze comportamentali, spiegate bene'),
  rss('psypost', 'PsyPost', 'https://www.psypost.org/feed/', 'psicologia', 'en', 0.65, 1, 3, 'Gli studi di psicologia appena usciti'),
  rss('stateofmind', 'State of Mind', 'https://www.stateofmind.it/feed/', 'psicologia', 'it', 0.7, 1, 5, 'Il giornale delle scienze psicologiche'),
  rss('conversation', 'The Conversation', 'https://theconversation.com/global/articles.atom', 'psicologia', 'en', 0.8, 3, 2, 'Ricercatori che scrivono per tutti', { mixed: true }),
  rss('iltascabile', 'Il Tascabile', 'https://www.iltascabile.com/feed/', 'antropologia', 'it', 0.9, 1, 7, 'Saggi di scienza e cultura della Treccani', { mixed: true }),

  // ── Produttività e abitudini ───────────────────────────────────────────
  rss('newport', 'Cal Newport', 'https://calnewport.com/feed/', 'produttivita', 'en', 0.85, 1, 10, 'Lavoro profondo e minimalismo digitale'),
  rss('nesslabs', 'Ness Labs', 'https://nesslabs.com/feed', 'produttivita', 'en', 0.8, 1, 10, 'Produttività consapevole e creatività', { mixed: true }),
  rss('seth', 'Seth Godin', 'https://seths.blog/feed/', 'produttivita', 'en', 0.7, 1, 2, 'Un pensiero breve ogni giorno'),
  rss('austinkleon', 'Austin Kleon', 'https://austinkleon.com/feed/', 'produttivita', 'en', 0.75, 1, 5, 'Creatività, quaderni e lavoro artistico'),
  rss('jamesclear', 'James Clear', 'https://jamesclear.com/feed', 'abitudini', 'en', 0.8, 1, 10, 'L’autore di Atomic Habits'),
  rss('zenhabits', 'Zen Habits', 'https://zenhabits.net/feed/', 'abitudini', 'en', 0.75, 1, 10, 'Semplicità e abitudini consapevoli'),
  rss('raptitude', 'Raptitude', 'https://www.raptitude.com/feed/', 'abitudini', 'en', 0.75, 1, 10, 'Essere umani, con un po’ più di attenzione'),

  // ── Lingue ──────────────────────────────────────────────────────────────
  rss('mw-wotd', 'Merriam-Webster', 'https://www.merriam-webster.com/wotd/feed/rss2', 'lingue', 'en', 0.9, 1, 2, 'La parola inglese del giorno', { kind: 'word' }),
  rss('wiktionary-wotd', 'Wiktionary', 'https://en.wiktionary.org/w/api.php?action=featuredfeed&feed=wotd&feedformat=atom', 'lingue', 'en', 0.8, 1, 2, 'Il dizionario libero', { kind: 'word' }),
  { id: 'wotd-fr', name: 'Le mot du jour', type: 'transparent', url: 'french', category: 'lingue', lang: 'fr', kind: 'word', quality: 0.8, max: 1, about: 'Una parola francese al giorno', home: 'https://www.transparent.com/word-of-the-day/' },
  { id: 'wotd-es', name: 'La palabra del día', type: 'transparent', url: 'spanish', category: 'lingue', lang: 'es', kind: 'word', quality: 0.8, max: 1, about: 'Una parola spagnola al giorno', home: 'https://www.transparent.com/word-of-the-day/' },
  { id: 'wotd-de', name: 'Das Wort des Tages', type: 'transparent', url: 'german', category: 'lingue', lang: 'de', kind: 'word', quality: 0.8, max: 1, about: 'Una parola tedesca al giorno', home: 'https://www.transparent.com/word-of-the-day/' },
  { id: 'wotd-ja', name: '今日の言葉', type: 'transparent', url: 'japanese', category: 'lingue', lang: 'ja', kind: 'word', quality: 0.8, max: 1, about: 'Una parola giapponese al giorno', home: 'https://www.transparent.com/word-of-the-day/' },

  // ── Curiosità e divertimento ───────────────────────────────────────────
  { id: 'wikipedia', name: 'Wikipedia', type: 'wikipedia', category: 'curiosita', lang: 'it', quality: 0.85, max: 3, about: 'Voce in vetrina, accadde oggi e foto del giorno', home: 'https://it.wikipedia.org' },
  rss('atlasobscura', 'Atlas Obscura', 'https://www.atlasobscura.com/feeds/latest', 'curiosita', 'en', 0.8, 2, 4, 'I luoghi più strani e meravigliosi del mondo'),
  rss('smithsonian', 'Smithsonian Magazine', 'https://www.smithsonianmag.com/rss/latest_articles/', 'curiosita', 'en', 0.85, 2, 3, 'Storia, scienza e cultura dallo Smithsonian', { mixed: true }),
  rss('kottke', 'kottke.org', 'https://feeds.kottke.org/main', 'curiosita', 'en', 0.8, 2, 3, 'Le cose più interessanti del web, dal 1998', { mixed: true }),
  rss('kidshouldsee', 'The Kid Should See This', 'https://thekidshouldseethis.com/feed', 'curiosita', 'en', 0.8, 1, 5, 'Video curiosi e belli, per tutte le età'),
  rss('messynessy', 'Messy Nessy Chic', 'https://www.messynessychic.com/feed/', 'curiosita', 'en', 0.7, 1, 7, 'Storie e luoghi dimenticati'),
  rss('amusingplanet', 'Amusing Planet', 'https://www.amusingplanet.com/feeds/posts/default', 'curiosita', 'en', 0.7, 1, 7, 'Luoghi e storie insoliti'),
  rss('futility', 'Futility Closet', 'https://www.futilitycloset.com/feed/', 'divertimento', 'en', 0.75, 1, 5, 'Enigmi, paradossi e curiosità'),
  { id: 'xkcd', name: 'xkcd', type: 'xkcd', category: 'divertimento', lang: 'en', kind: 'comic', quality: 0.8, max: 1, about: 'Fumetti su romanticismo, sarcasmo, matematica e lingua', home: 'https://xkcd.com' },
  rss('smbc', 'SMBC', 'https://www.smbc-comics.com/comic/rss', 'divertimento', 'en', 0.7, 1, 3, 'Fumetti di scienza e filosofia', { kind: 'comic' }),
  rss('oatmeal', 'The Oatmeal', 'https://theoatmeal.com/feed/rss', 'divertimento', 'en', 0.7, 1, 14, 'Fumetti e storie illustrate', { kind: 'comic' }),
  { id: 'lichess', name: 'Lichess', type: 'lichess', category: 'divertimento', lang: 'it', kind: 'chess', quality: 0.85, max: 1, about: 'Il puzzle di scacchi, libero e senza pubblicità', home: 'https://lichess.org' },
];

/** Città con fonti locali. Per aggiungerne una: nuova voce qui + fonti in LOCAL_SOURCES. */
export const CITIES = [{ id: 'laquila', name: "L'Aquila", lat: 42.3498, lon: 13.3995 }];

const EVENT_WORDS =
  /\b(mostr[ae]|concert[oi]|festival|spettacol[oi]|teatro|rassegn[ae]|inaugura|visit[ae] guidat[ae]|escursion[ei]|sagr[ae]|presentazione|convegno|laboratori|cinema|proiezion[ei]|danza|letture|passeggiat[ae]|degustazion[ei]|mercatin[oi]|fiera|workshop|event[oi]|serata|appuntament[oi]|in scena|calici|biglietti|esaurito|apre|riapre)\b/i;

const NOT_EVENTS =
  /\b(incident[ei]|incendi[oi]|arrest|morto|morta|mort[ei]|ferit[oi]|denunc|polizia|carabinieri|sequestr|indagat|processo|tribunale|sindacat|bilancio|assemblea|consiglio comunale|elezioni|truffa|furto|rapina|violenz|sciopero)/i;

export const LOCAL_SOURCES: SourceDef[] = [
  { id: 'ekuonews', name: 'Ekuo News', type: 'rss', url: 'https://www.ekuonews.it/feed/', category: 'vicino', lang: 'it', kind: 'event', quality: 0.65, max: 4, maxAgeDays: 4, city: 'laquila', match: [EVENT_WORDS], exclude: NOT_EVENTS, about: 'Notizie dall’Aquila e dal territorio' },
  { id: 'abruzzolive', name: 'AbruzzoLive', type: 'rss', url: 'https://www.abruzzolive.it/feed/', category: 'vicino', lang: 'it', kind: 'event', quality: 0.6, max: 3, maxAgeDays: 4, city: 'laquila', match: [/\b(l'aquila|aquilan[oi]|gran sasso)\b/i, EVENT_WORDS], exclude: NOT_EVENTS, about: 'Notizie dall’Abruzzo' },
  { id: 'newstown', name: 'NewsTown', type: 'rss', url: 'https://www.news-town.it/feed', category: 'vicino', lang: 'it', kind: 'event', quality: 0.65, max: 4, maxAgeDays: 4, city: 'laquila', match: [EVENT_WORDS], exclude: NOT_EVENTS, about: 'Il giornale online dell’Aquila' },
];
