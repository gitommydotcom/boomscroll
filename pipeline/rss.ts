import { XMLParser } from 'fast-xml-parser';
import { decodeEntities, firstImageInHtml, htmlToText } from './util';

export interface FeedEntry {
  url: string;
  title: string;
  html: string;
  text: string;
  image?: string;
  publishedAt?: Date;
  author?: string;
  youtubeId?: string;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  processEntities: false,
  htmlEntities: false,
  trimValues: true,
  parseTagValue: false,
});

const arr = <T>(x: T | T[] | undefined | null): T[] => (x == null ? [] : Array.isArray(x) ? x : [x]);

function str(x: unknown): string {
  if (x == null) return '';
  if (typeof x === 'string' || typeof x === 'number') return String(x);
  if (Array.isArray(x)) return str(x[0]);
  if (typeof x === 'object') {
    const o = x as Record<string, unknown>;
    if ('#text' in o) return str(o['#text']);
    if ('@_href' in o) return str(o['@_href']);
  }
  return '';
}

function unwrapCdata(s: string): string {
  return s.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '');
}

const clean = (x: unknown) => decodeEntities(unwrapCdata(str(x))).trim();

function date(x: unknown): Date | undefined {
  const s = str(x);
  if (!s) return undefined;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function mediaImage(node: Record<string, any>): string | undefined {
  const candidates: unknown[] = [
    ...arr(node['media:content']),
    ...arr(node['media:group']?.['media:content']),
    ...arr(node['media:thumbnail']),
    ...arr(node['media:group']?.['media:thumbnail']),
    ...arr(node.enclosure),
    ...arr(node['itunes:image']),
  ];
  for (const c of candidates) {
    if (!c || typeof c !== 'object') continue;
    const o = c as Record<string, string>;
    const url = o['@_url'] ?? o['@_href'];
    const type = o['@_type'] ?? o['@_medium'] ?? '';
    if (url && (!type || /image/.test(type)) && !/\.(mp3|mp4|m4a)(\?|$)/i.test(url)) return decodeEntities(url);
  }
  if (node.image && typeof node.image === 'object' && node.image.url) return str(node.image.url);
  return undefined;
}

function atomLink(node: Record<string, any>): string {
  const links = arr(node.link);
  const alt =
    links.find((l: any) => typeof l === 'object' && (l['@_rel'] ?? 'alternate') === 'alternate' && !/xml|json/.test(l['@_type'] ?? '')) ??
    links[0];
  return typeof alt === 'string' ? alt : str(alt?.['@_href'] ?? alt);
}

export function parseFeed(xml: string): FeedEntry[] {
  const doc = parser.parse(xml);
  const out: FeedEntry[] = [];

  const rssItems = arr(doc?.rss?.channel?.item);
  const rdfItems = arr(doc?.['rdf:RDF']?.item);
  for (const it of [...rssItems, ...rdfItems]) {
    const html = unwrapCdata(str(it['content:encoded']) || str(it.description) || '');
    const url = clean(it.link) || clean(it.guid);
    if (!url.startsWith('http')) continue;
    out.push({
      url,
      title: htmlToText(clean(it.title)),
      html,
      text: htmlToText(decodeEntities(html)),
      image: mediaImage(it) ?? firstImageInHtml(decodeEntities(html)),
      publishedAt: date(it.pubDate) ?? date(it['dc:date']) ?? date(it.published),
      author: clean(it['dc:creator']) || clean(it.author) || undefined,
    });
  }

  for (const it of arr(doc?.feed?.entry)) {
    const html = unwrapCdata(
      str(it.content) || str(it.summary) || str(it['media:group']?.['media:description']) || '',
    );
    const url = atomLink(it);
    if (!url.startsWith('http')) continue;
    out.push({
      url,
      title: htmlToText(clean(it.title)),
      html,
      text: htmlToText(decodeEntities(html)),
      image: mediaImage(it) ?? firstImageInHtml(decodeEntities(html)),
      publishedAt: date(it.published) ?? date(it.updated),
      author: clean(it.author?.name) || undefined,
      youtubeId: str(it['yt:videoId']) || undefined,
    });
  }
  return out;
}
