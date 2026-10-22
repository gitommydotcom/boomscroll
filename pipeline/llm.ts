import { CATEGORY_IDS } from '../shared/categories';
import { isHardLang, type CategoryId, type Quiz } from '../shared/types';
import type { RawItem } from './fetchers';
import { http, sleep } from './util';

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
  if (q && pickString(q.q) && Array.isArray(q.options) && q.options.length === 3 && q.options.every((o: unknown) => !!pickString(o, 200))) {
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

/** Errore che rende inutilizzabile un provider (chiave mancante, quota finita, servizio giù). */
class ProviderDown extends Error {}

interface Provider {
  name: string;
  /** Contenuti per richiesta. */
  batch: number;
  /** Pausa tra una richiesta e l'altra. */
  pauseMs: number;
  complete(payload: unknown[]): Promise<any[]>;
}

const messages = (payload: unknown[]) => [
  { role: 'system', content: SYSTEM },
  { role: 'user', content: JSON.stringify(payload) },
];

function parseItems(content: string): any[] | null {
  try {
    const parsed = JSON.parse(content.replace(/^```(?:json)?\s*|\s*```$/g, ''));
    if (Array.isArray(parsed.items)) return parsed.items;
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // risposta non valida
  }
  return null;
}

/** Provider con API compatibile OpenAI (Gemini, Groq, GitHub Models…), con modelli di riserva. */
function openAiCompatible(name: string, url: string, key: string, models: string[], batch: number, pauseMs: number): Provider {
  let idx = 0;
  return {
    name,
    batch,
    pauseMs,
    async complete(payload) {
      for (let attempt = 0; attempt < 5; attempt++) {
        if (idx >= models.length) throw new ProviderDown('nessun modello disponibile');
        const res = await http(url, {
          method: 'POST',
          timeoutMs: 120_000,
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            model: models[idx],
            temperature: 0.3,
            max_tokens: 4000,
            response_format: { type: 'json_object' },
            messages: messages(payload),
          }),
        });
        const text = await res.text();
        if (res.status === 401 || res.status === 403) throw new ProviderDown(`accesso negato (${res.status}): ${text.slice(0, 200)}`);
        if (res.status === 404 || (res.status === 400 && /model/i.test(text))) {
          console.log(`  ↪️  ${name}: modello ${models[idx]} non disponibile`);
          idx++;
          continue;
        }
        if (res.status === 429) {
          const wait = Number(res.headers.get('retry-after') ?? '30');
          if (wait > 120 || attempt >= 3) throw new ProviderDown(`limite raggiunto (${text.slice(0, 160)})`);
          console.log(`  ⏳ ${name}: limite di frequenza, attendo ${wait}s`);
          await sleep((wait + 1) * 1000);
          continue;
        }
        if (res.status >= 500) {
          await sleep(4000 * (attempt + 1));
          continue;
        }
        let data: any;
        try {
          data = JSON.parse(text);
        } catch {
          throw new ProviderDown(`risposta non JSON (HTTP ${res.status}): ${text.slice(0, 80)}`);
        }
        const items = parseItems(data.choices?.[0]?.message?.content ?? '');
        if (items) return items;
        await sleep(1500);
      }
      throw new Error('nessuna risposta valida dopo vari tentativi');
    },
  };
}

/**
 * Schema JSON imposto al modello locale (i modelli piccoli altrimenti saltano dei campi).
 * Solo tipi semplici: una stringa vuota vale "nessun valore".
 */
const str = { type: 'string' };
const ITEMS_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: str,
          title_it: str,
          summary: str,
          excerpt_it: str,
          tags: { type: 'array', items: str },
          interest: { type: 'integer' },
          category: str,
          quiz: {
            type: 'object',
            properties: { q: str, options: { type: 'array', items: str }, answer: { type: 'integer' } },
            required: ['q', 'options', 'answer'],
          },
          word: {
            type: 'object',
            properties: { word: str, definition_it: str, example: str, example_it: str },
            required: ['word', 'definition_it', 'example', 'example_it'],
          },
        },
        required: ['id', 'title_it', 'summary', 'excerpt_it', 'tags', 'interest', 'category', 'quiz', 'word'],
      },
    },
  },
  required: ['items'],
};

/** Modello open source che gira sul runner di GitHub Actions tramite Ollama. */
function ollama(host: string, model: string): Provider {
  let consecutiveErrors = 0;
  let useSchema = true;
  return {
    name: `ollama/${model}`,
    batch: 3,
    pauseMs: 0,
    async complete(payload) {
      let res: Response;
      try {
        res = await http(`${host}/api/chat`, {
          method: 'POST',
          timeoutMs: 600_000,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            stream: false,
            format: useSchema ? ITEMS_SCHEMA : 'json',
            keep_alive: '30m',
            options: { temperature: 0.3, repeat_penalty: 1.15, num_ctx: 6144, num_predict: 1600 },
            messages: messages(payload),
          }),
        });
      } catch (e) {
        throw new ProviderDown(`server non raggiungibile: ${(e as Error).message}`);
      }
      if (!res.ok) {
        // Un errore del modello su un lotto (es. ripetizioni) non deve fermare tutta l'edizione.
        const text = (await res.text()).slice(0, 160);
        if (useSchema && /schema|format|grammar/i.test(text)) {
          console.log(`  ↪️  schema non supportato, passo al JSON semplice: ${text}`);
          useSchema = false;
          return this.complete(payload);
        }
        if (++consecutiveErrors >= 3) throw new ProviderDown(`HTTP ${res.status}: ${text}`);
        throw new Error(`HTTP ${res.status}: ${text}`);
      }
      consecutiveErrors = 0;
      const data = (await res.json()) as any;
      const items = parseItems(data.message?.content ?? '');
      if (!items) throw new Error('risposta non valida');
      return items;
    },
  };
}

function providers(): Provider[] {
  const list: Provider[] = [];
  const env = process.env;
  if (env.GEMINI_API_KEY) {
    const models = env.GEMINI_MODEL?.split(',') ?? ['gemini-flash-lite-latest', 'gemini-2.5-flash-lite', 'gemini-flash-latest', 'gemini-2.5-flash'];
    // Il piano gratuito di Gemini ha limiti al minuto: lotti grandi e una pausa tra le richieste.
    list.push(openAiCompatible('Gemini', 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', env.GEMINI_API_KEY, models, 10, 5000));
  }
  if (env.GROQ_API_KEY) {
    const models = env.GROQ_MODEL?.split(',') ?? ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];
    list.push(openAiCompatible('Groq', 'https://api.groq.com/openai/v1/chat/completions', env.GROQ_API_KEY, models, 6, 3000));
  }
  if (env.GITHUB_TOKEN && !env.BOOMSCROLL_SKIP_GITHUB_MODELS) {
    list.push(openAiCompatible('GitHub Models', 'https://models.github.ai/inference/chat/completions', env.GITHUB_TOKEN, ['openai/gpt-4.1-mini', 'openai/gpt-4o-mini'], 8, 1500));
  }
  if (env.OLLAMA_HOST || env.OLLAMA_MODEL) {
    const host = env.OLLAMA_HOST?.startsWith('http') ? env.OLLAMA_HOST : `http://${env.OLLAMA_HOST ?? '127.0.0.1:11434'}`;
    list.push(ollama(host, env.OLLAMA_MODEL ?? 'gemma3:4b'));
  }
  return list;
}

export interface AiRun {
  results: Map<RawItem, AiResult>;
  model: string | null;
  calls: number;
  failures: number;
}

/**
 * Riassume i contenuti con il primo provider disponibile; se uno smette di funzionare
 * passa al successivo. Entro il tempo massimo (BOOMSCROLL_AI_MINUTES, default 45):
 * quello che resta fuori usa l'estratto della fonte.
 */
export async function summarize(items: RawItem[]): Promise<AiRun> {
  const run: AiRun = { results: new Map(), model: null, calls: 0, failures: 0 };
  if (process.env.BOOMSCROLL_NO_AI) return run;
  const queue = [...providers()];
  if (!queue.length) {
    console.log('ℹ️  Nessuna IA configurata: uso gli estratti delle fonti');
    return run;
  }
  const deadline = Date.now() + Number(process.env.BOOMSCROLL_AI_MINUTES ?? 45) * 60_000;
  // Prima le lingue difficili (serve la traduzione), poi il resto in ordine di qualità.
  const todo = [...items].sort((a, b) => Number(isHardLang(b.lang)) - Number(isHardLang(a.lang)) || b.source.quality - a.source.quality);
  const used = new Set<string>();

  let i = 0;
  while (i < todo.length && queue.length) {
    if (Date.now() > deadline) {
      console.log(`  ⏱️  tempo scaduto: ${todo.length - i} contenuti senza riassunto automatico`);
      break;
    }
    const p = queue[0];
    const batch = todo.slice(i, i + p.batch);
    const payload = batch.map((it, k) => ({
      id: `i${k}`,
      kind: it.kind,
      lang: it.lang,
      source: it.source.name,
      title: it.title,
      text: it.text.slice(0, it.kind === 'poem' ? 1200 : 900),
      ...(it.source.mixed ? { allowed_categories: CATEGORY_IDS.filter((c) => c !== 'vicino') } : {}),
    }));
    const started = Date.now();
    try {
      run.calls++;
      const out = await p.complete(payload);
      let ok = 0;
      for (const r of out) {
        const k = Number(String(r?.id ?? '').replace(/^i/, ''));
        const item = batch[k];
        if (!item) continue;
        const v = validate(r, item);
        if (v) {
          run.results.set(item, v);
          ok++;
        }
      }
      used.add(p.name);
      console.log(`  🤖 ${p.name}: ${ok}/${batch.length} in ${((Date.now() - started) / 1000).toFixed(1)}s (${i + batch.length}/${todo.length})`);
      i += batch.length;
      if (p.pauseMs) await sleep(p.pauseMs);
    } catch (e) {
      run.failures++;
      if (e instanceof ProviderDown) {
        console.log(`  ⚠️  ${p.name} non disponibile: ${(e as Error).message}`);
        queue.shift();
        continue;
      }
      console.log(`  ⚠️  ${p.name}: lotto saltato (${(e as Error).message})`);
      i += batch.length;
    }
  }
  run.model = [...used].join(' + ') || null;
  return run;
}
