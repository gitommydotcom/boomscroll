import { hash } from './dates';

export const JOURNAL_PROMPTS = [
  'Qual è una cosa che oggi vorresti fare con più calma?',
  'Cosa ti ha sorpreso questa settimana?',
  'Quale decisione recente ti ha dato soddisfazione? Perché?',
  'Che cosa stai rimandando, e qual è il primo passo minuscolo per iniziare?',
  'Descrivi un momento di ieri in cui eri davvero presente.',
  'Quale idea hai letto di recente che vorresti ricordare tra un anno?',
  'Se oggi avessi un’ora libera in più, come la useresti?',
  'Che cosa ti dà energia, e cosa te la toglie?',
  'Quale consiglio daresti a te di cinque anni fa?',
  'Qual è una piccola abitudine che ti farebbe stare meglio tra un mese?',
  'Su cosa hai cambiato idea ultimamente?',
  'Chi ti ha aiutato di recente? Come potresti ringraziarlo?',
  'Che cosa vuoi imparare entro la fine dell’anno?',
  'Quale preoccupazione ti occupa la mente? Cosa è sotto il tuo controllo, e cosa no?',
  'Descrivi la tua giornata ideale, ma realistica.',
  'Qual è l’ultimo traguardo, anche piccolo, che ti ha dato soddisfazione?',
  'Che cosa ti piacerebbe fare di più e scorrere di meno?',
  'Quale libro, luogo o persona ti ha cambiato il modo di vedere le cose?',
  'Che cosa ti ha fatto ridere di recente?',
  'Quale “no” dovresti dire questa settimana?',
  'Se il tuo umore di oggi fosse un tempo atmosferico, quale sarebbe? Perché?',
  'Cosa stai imparando dagli errori di questo periodo?',
  'Quali sono le tre cose più importanti per te in questo momento della vita?',
  'Che cosa vorresti dire a qualcuno, ma non hai ancora detto?',
  'Qual è stato il momento più bello di questa settimana?',
  'Cosa faresti se non avessi paura di sbagliare?',
  'Quale parte della tua routine funziona bene? Quale no?',
  'Che cosa ti incuriosisce in questo periodo?',
  'Come vuoi sentirti stasera, prima di andare a dormire?',
  'Quale piccolo gesto gentile puoi fare oggi?',
];

export const CHALLENGES = [
  { title: 'Una cosa sola', text: 'Scegli un compito e lavoraci 25 minuti senza notifiche. Il telefono in un’altra stanza.', area: 'produttivita' },
  { title: 'La regola dei due minuti', text: 'Se una cosa richiede meno di due minuti, falla adesso. Trovane tre e falle.', area: 'produttivita' },
  { title: 'Scrivi le tre priorità', text: 'Su un foglio: le tre cose che renderebbero buona la giornata di oggi. Solo tre.', area: 'produttivita' },
  { title: 'Passeggiata senza cuffie', text: '10 minuti a piedi, senza audio. Guarda tre dettagli che non avevi mai notato.', area: 'abitudini' },
  { title: 'Un bicchiere d’acqua', text: 'Bevi un bicchiere d’acqua adesso. Poi legalo a un’abitudine che hai già: il caffè, il pranzo.', area: 'abitudini' },
  { title: 'Lettura di carta', text: '15 minuti di un libro di carta prima di dormire, al posto dello schermo.', area: 'abitudini' },
  { title: 'Svuota la mente', text: 'Scrivi tutto ciò che ti gira in testa per 5 minuti. Poi cerchia una sola cosa da fare oggi.', area: 'produttivita' },
  { title: 'Messaggio a qualcuno', text: 'Scrivi a una persona a cui pensi da tempo. Due righe bastano.', area: 'abitudini' },
  { title: 'Stretching di 3 minuti', text: 'Collo, spalle, schiena. Tre minuti, in piedi, adesso.', area: 'abitudini' },
  { title: 'Notifiche in silenzio', text: 'Disattiva le notifiche di un’app che ti interrompe spesso. Solo per oggi: vedi come va.', area: 'produttivita' },
  { title: 'Il prossimo passo', text: 'Pensa a un progetto bloccato. Qual è la prossima azione fisica e concreta? Scrivila.', area: 'produttivita' },
  { title: 'Ordina una superficie', text: 'Scrivania, comodino o borsa: riordinane una sola, in 5 minuti.', area: 'abitudini' },
  { title: 'Pranzo senza schermi', text: 'Mangia il prossimo pasto senza telefono né tv. Assapora.', area: 'abitudini' },
  { title: 'Impara 5 parole', text: 'Apri le flashcard o scegli 5 parole di una lingua che ti piace e ripetile ad alta voce.', area: 'lingue' },
  { title: 'Spiega a un bambino', text: 'Prendi l’ultima cosa interessante che hai letto e spiegala in tre frasi semplici.', area: 'produttivita' },
  { title: 'Luce del mattino', text: 'Domani esci alla luce del giorno entro un’ora dal risveglio, anche solo 5 minuti.', area: 'abitudini' },
  { title: 'Chiudi i cicli aperti', text: 'Elenca tre cose lasciate a metà. Per ognuna decidi: fare, delegare o lasciar andare.', area: 'produttivita' },
  { title: 'Un “no” gentile', text: 'C’è una richiesta a cui vorresti dire di no? Prepara una frase gentile e chiara.', area: 'abitudini' },
];

export const DISTORTIONS = [
  { id: 'tutto-niente', label: 'Tutto o niente', desc: 'Vedere le cose solo in bianco o nero: o perfetto o un fallimento.' },
  { id: 'catastrofe', label: 'Catastrofizzare', desc: 'Immaginare subito lo scenario peggiore come se fosse il più probabile.' },
  { id: 'lettura-pensiero', label: 'Leggere nel pensiero', desc: 'Dare per scontato cosa pensano gli altri, senza prove.' },
  { id: 'generalizzare', label: 'Ipergeneralizzare', desc: 'Da un singolo episodio trarre una regola: “Va sempre così”.' },
  { id: 'filtro', label: 'Filtro mentale', desc: 'Notare solo il negativo e ignorare ciò che è andato bene.' },
  { id: 'doverizzazioni', label: '“Dovrei”', desc: 'Regole rigide su come dovresti essere tu o gli altri.' },
  { id: 'etichette', label: 'Etichettare', desc: 'Definire te o altri con un giudizio globale: “Sono un disastro”.' },
  { id: 'personalizzare', label: 'Personalizzare', desc: 'Sentirti responsabile di cose che non dipendono da te.' },
  { id: 'ragionamento-emotivo', label: 'Ragionamento emotivo', desc: '“Lo sento, quindi è vero.”' },
];

export const GRATITUDE_PROMPT = 'Tre cose di oggi per cui dire grazie, anche piccolissime.';

export type FeedExercise =
  | { type: 'respiro'; key: string }
  | { type: 'diario'; key: string; prompt: string }
  | { type: 'gratitudine'; key: string }
  | { type: 'sfida'; key: string; title: string; text: string };

/** Due esercizi diversi per l'edizione del giorno, sempre gli stessi per tutta la giornata. */
export function exercisesFor(date: string): FeedExercise[] {
  const h = hash(date);
  const prompt = JOURNAL_PROMPTS[h % JOURNAL_PROMPTS.length];
  const ch = CHALLENGES[(h >>> 3) % CHALLENGES.length];
  const all: FeedExercise[] = [
    { type: 'respiro', key: 'respiro' },
    { type: 'diario', key: 'diario', prompt },
    { type: 'gratitudine', key: 'gratitudine' },
    { type: 'sfida', key: `sfida:${ch.title}`, title: ch.title, text: ch.text },
  ];
  const a = h % all.length;
  const b = (a + 1 + ((h >>> 5) % (all.length - 1))) % all.length;
  return [all[a], all[b]];
}

export function journalPromptFor(date: string) {
  return JOURNAL_PROMPTS[hash(date) % JOURNAL_PROMPTS.length];
}

export function challengeFor(date: string) {
  return CHALLENGES[(hash(date) >>> 3) % CHALLENGES.length];
}
