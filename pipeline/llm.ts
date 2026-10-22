import { CATEGORY_IDS } from '../shared/categories';
import { isHardLang, type CategoryId, type Quiz } from '../shared/types';
import type { RawItem } from './fetchers';
import { sleep } from './util';

export interface AiResult {
  titleIt?: string;
  summary: string;
  excerptIt?: string;
  tags: string[];
  interest: number;
  category?: CategoryId;
  quiz?: Quiz;
  word?: { word: string; definitionIt: string; example?: string; exampleIt?: string };
}

// Endpoint di GitHub Models: il primo è quello attuale, il secondo quello storico (nomi senza prefisso).
const ENDPOINTS = [
  { url: 'https://models.github.ai/inference/chat/completions', model: (m: string) => m },
  { url: 'https://models.inference.ai.azure.com/chat/completions', model: (m: string) => m.split('/').pop()! },
];
const DEFAULT_MODELS = ['openai/gpt-4.1-mini', 'openai/gpt-4o-mini', 'openai/gpt-4.1-nano'];
const BATCH = 8;

const SYSTEM = `Sei il redattore di Boomscroll, un feed personale di qualità in italiano.
Ricevi contenuti da fonti affidabili e per ciascuno restituisci dati in JSON.

Regole:
- summary: 2-3 frasi in italiano, massimo 55 parole. Spiega in modo chiaro e preciso cosa c'è di interessante o utile. Usa solo le informazioni fornite: non inventare dati, nomi o cifre. Niente toni promozionali o clickbait, niente "questo articolo".
- title_it: traduzione italiana fedele e naturale del titolo se lang non è "it", altrimenti null.
- excerpt_it: se lang NON è it, en, fr o es, traduci in italiano le prime 2-3 frasi del testo; altrimenti null.
- tags: da 2 a 4 parole chiave in italiano, minuscole e specifiche (es. "fisica quantistica", non "scienza").
- interest: intero da 1 a 5. 5 = idea, scoperta o storia sostanziosa e duratura; 3 = utile ma ordinaria; 1 = gossip, cronaca nera, promozione, contenuto vuoto o acchiappaclic.
- category: solo se è presente "allowed_categories" scegli la più adatta tra quelle, altrimenti null.
- quiz: una domanda di comprensione in italiano la cui risposta si trova nel tuo summary, con 3 opzioni brevi e plausibili e "answer" = indice (0-2) di quella corretta. Varia la posizione della risposta corretta. Per kind "chess" e "event" metti null.
- word (solo per kind "word", altrimenti null): {"word": la parola o espressione del giorno, "definition_it": definizione in italiano, "example": frase d'esempio nella lingua originale, "example_it": la sua traduzione}. In questo caso il summary spiega in breve significato e origine.
- kind "artwork": presenta l'opera (soggetto, autore, epoca, tecnica) usando i metadati; aggiungi contesto storico solo se certo e ben noto.
- kind "poem": descrivi tema e tono della poesia senza riscriverla.
- kind "event": riassumi cosa, dove e quando, se indicati.

Rispondi SOLO con un oggetto {"items": [...]} con un elemento per ogni contenuto ricevuto, con lo stesso "id".`;

class FatalAiError extends Error {}
class EndpointError extends Error {}

function pickString(x: unknown, max = 600): string | undefined {
  return typeof x === 'string' && x.trim() && x.trim().toLowerCase() !== 'null' ? x.trim().slice(0, max) : undefined;
}

export function validate(raw: any, item: RawItem): AiResult | null {
  const summary = pickString(raw?.summary, 700);
  if (!summary || summary.length < 20) return null;
  const tags = Array.isArray(raw.tags)
    ? raw.tags.filter((t: unknown) => typeof t === 'string' && t.length < 40).map((t: string) => t.toLowerCase().trim()).slice(0, 4)
    : [];
  const interest = Math.min(5, Math.max(1, Math.round(Number(raw.interest) || 3)));
  let quiz: Quiz | undefined;
  const q = raw.quiz;
  if (q && typeof q.q === 'string' && Array.isArray(q.options) && q.options.length === 3 && q.options.every((o: unknown) => typeof o === 'string')) {
    const answer = Number(q.answer);
    if (answer >= 0 && answer <= 2) quiz = { q: q.q, options: q.options, answer };
  }
  const category = item.source.mixed && CATEGORY_IDS.includes(raw.category) && raw.category !== 'vicino' ? (raw.category as CategoryId) : undefined;
  let word: AiResult['word'];
  if (item.kind === 'word' && raw.word && pickString(raw.word.word) && pickString(raw.word.definition_it)) {
    word = {
      word: pickString(raw.word.word, 80)!,
      definitionIt: pickString(raw.word.definition_it, 300)!,
      example: pickString(raw.word.example, 300),
      exampleIt: pickString(raw.word.example_it, 300),
    };
  }
  const titleIt = item.lang !== 'it' ? pickString(raw.title_it, 200) : undefined;
  return {
    summary,
    titleIt: titleIt && titleIt !== item.title ? titleIt : undefined,
    excerptIt: isHardLang(item.lang) ? pickString(raw.excerpt_it, 600) : undefined,
    tags,
    interest,
    category,
    quiz,
    word,
  };
}

/** POST che segue i reindirizzamenti senza trasformarsi in GET. */
async function post(url: string, headers: Record<string, string>, body: string): Promise<Response> {
  for (let hop = 0; hop < 4; hop++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 90_000);
    try {
      const res = await fetch(url, { method: 'POST', headers, body, redirect: 'manual', signal: ctrl.signal });
      const loc = res.headers.get('location');
      if (res.status >= 300 && res.status < 400 && loc) {
        url = new URL(loc, url).toString();
        console.log(`  ↪️  reindirizzato a ${url}`);
        continue;
      }
      return res;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new EndpointError('troppi reindirizzamenti');
}

async function call(endpoint: (typeof ENDPOINTS)[number], model: string, token: string, payload: unknown[]): Promise<any[]> {
  const body = JSON.stringify({
    model: endpoint.model(model),
    temperature: 0.3,
    max_tokens: 3800,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: JSON.stringify(payload) },
    ],
  });
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'boomscroll-pipeline',
  };
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await post(endpoint.url, headers, body);
    const text = await res.text();
    if (res.status === 401 || res.status === 403) throw new FatalAiError(`accesso negato (${res.status}): ${text.slice(0, 300)}`);
    if (res.status === 404 || res.status === 400 || res.status === 422) {
      if (/model/i.test(text)) throw new Error(`modello non disponibile: ${text.slice(0, 200)}`);
      throw new EndpointError(`richiesta rifiutata (${res.status}): ${text.slice(0, 200)}`);
    }
    if (res.status === 429) {
      const wait = Number(res.headers.get('retry-after') ?? '60');
      if (wait > 120) throw new FatalAiError(`limite giornaliero raggiunto (riprova tra ${wait}s)`);
      console.log(`  ⏳ limite di frequenza, attendo ${wait}s`);
      await sleep((wait + 1) * 1000);
      continue;
    }
    if (res.status >= 500) {
      await sleep(5000 * (attempt + 1));
      continue;
    }
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      throw new EndpointError(`risposta non JSON (HTTP ${res.status}, ${res.headers.get('content-type')}): ${text.slice(0, 120)}`);
    }
    const content: string = data.choices?.[0]?.message?.content ?? '';
    try {
      const parsed = JSON.parse(content.replace(/^```(?:json)?\s*|\s*```$/g, ''));
      if (Array.isArray(parsed.items)) return parsed.items;
    } catch {
      // risposta del modello non valida: riprova
    }
    await sleep(2000);
  }
  throw new Error('nessuna risposta valida dopo vari tentativi');
}

export interface AiRun {
  results: Map<RawItem, AiResult>;
  model: string | null;
  calls: number;
  failures: number;
}

export async function summarize(items: RawItem[]): Promise<AiRun> {
  const run: AiRun = { results: new Map(), model: null, calls: 0, failures: 0 };
  const token = process.env.GITHUB_TOKEN || process.env.GH_MODELS_TOKEN;
  if (!token || process.env.BOOMSCROLL_NO_AI) {
    console.log('ℹ️  IA disattivata: uso gli estratti delle fonti');
    return run;
  }
  const models = (process.env.BOOMSCROLL_MODELS?.split(',') ?? DEFAULT_MODELS).map((m) => m.trim()).filter(Boolean);
  let modelIdx = 0;
  let endpointIdx = 0;

  for (let i = 0; i < items.length; i += BATCH) {
    const batch = items.slice(i, i + BATCH);
    const payload = batch.map((it, k) => ({
      id: `i${k}`,
      kind: it.kind,
      lang: it.lang,
      source: it.source.name,
      title: it.title,
      text: it.text.slice(0, it.kind === 'poem' ? 1200 : 900),
      ...(it.source.mixed ? { allowed_categories: CATEGORY_IDS.filter((c) => c !== 'vicino') } : {}),
    }));
    while (modelIdx < models.length) {
      try {
        run.calls++;
        const out = await call(ENDPOINTS[endpointIdx], models[modelIdx], token, payload);
        run.model = models[modelIdx];
        for (const r of out) {
          const k = Number(String(r?.id ?? '').replace(/^i/, ''));
          const item = batch[k];
          if (!item) continue;
          const v = validate(r, item);
          if (v) run.results.set(item, v);
        }
        console.log(`  🤖 lotto ${i / BATCH + 1}/${Math.ceil(items.length / BATCH)}: ${out.length} risposte (${models[modelIdx]})`);
        break;
      } catch (e) {
        if (e instanceof FatalAiError) {
          console.log(`  ⚠️  IA interrotta: ${e.message}`);
          run.failures++;
          return run;
        }
        const msg = (e as Error).message;
        if (e instanceof EndpointError && endpointIdx < ENDPOINTS.length - 1) {
          console.log(`  ↪️  ${ENDPOINTS[endpointIdx].url}: ${msg}`);
          endpointIdx++;
          continue;
        }
        if (msg.startsWith('modello non disponibile')) {
          console.log(`  ↪️  ${models[modelIdx]}: ${msg}`);
          modelIdx++;
          continue;
        }
        console.log(`  ⚠️  lotto ${i / BATCH + 1} fallito: ${msg}`);
        run.failures++;
        break;
      }
    }
    if (modelIdx >= models.length) {
      console.log('  ⚠️  nessun modello disponibile');
      return run;
    }
    await sleep(1500);
  }
  return run;
}
