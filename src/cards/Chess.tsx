import { Chess, type Square } from 'chess.js';
import { useMemo, useState } from 'preact/hooks';
import type { ChessData } from '../../shared/types';
import { exerciseDone } from '../lib/actions';

// Usiamo sempre i glifi "pieni" e coloriamo via CSS; ︎ evita la resa a emoji.
const GLYPH: Record<string, string> = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
const FILES = 'abcdefgh';

const PIECE_NAMES: Record<string, string> = { k: 're', q: 'donna', r: 'torre', b: 'alfiere', n: 'cavallo', p: 'pedone' };

export function ChessBoard({
  fen,
  flip,
  selected,
  hints = [],
  last = [],
  onSquare,
}: {
  fen: string;
  flip?: boolean;
  selected?: string | null;
  hints?: string[];
  last?: string[];
  onSquare?: (sq: string) => void;
}) {
  const rows = fen.split(' ')[0].split('/');
  const board: (string | null)[][] = rows.map((r) => {
    const out: (string | null)[] = [];
    for (const ch of r) {
      if (/\d/.test(ch)) for (let i = 0; i < Number(ch); i++) out.push(null);
      else out.push(ch);
    }
    return out;
  });
  const flipped = flip ?? fen.split(' ')[1] === 'b';
  const squares = [];
  for (let ri = 0; ri < 8; ri++) {
    for (let fi = 0; fi < 8; fi++) {
      const r = flipped ? 7 - ri : ri;
      const f = flipped ? 7 - fi : fi;
      const sq = `${FILES[f]}${8 - r}`;
      const p = board[r][f];
      const light = (r + f) % 2 === 0;
      const cls = ['sq', light ? 'l' : 'd', selected === sq && 'sel', hints.includes(sq) && 'hint', last.includes(sq) && 'last']
        .filter(Boolean)
        .join(' ');
      const label = p ? `${sq}: ${PIECE_NAMES[p.toLowerCase()]} ${p === p.toUpperCase() ? 'bianco' : 'nero'}` : sq;
      squares.push(
        onSquare ? (
          <button key={sq} class={cls} onClick={() => onSquare(sq)} aria-label={label}>
            {p && <span class={`pc ${p === p.toUpperCase() ? 'w' : 'b'}`}>{GLYPH[p.toLowerCase()]}{'︎'}</span>}
          </button>
        ) : (
          <div key={sq} class={cls}>
            {p && <span class={`pc ${p === p.toUpperCase() ? 'w' : 'b'}`}>{GLYPH[p.toLowerCase()]}{'︎'}</span>}
          </div>
        ),
      );
    }
  }
  return (
    <div class="board" role={onSquare ? 'grid' : 'img'} aria-label="Scacchiera">
      {squares}
    </div>
  );
}

/** Puzzle giocabile. `compact` per le card del feed (scacchiera più piccola, testi ridotti). */
export function ChessPuzzle({ data, puzzleUrl, compact }: { data: ChessData; puzzleUrl: string; compact?: boolean }) {
  const userColor = data.fen.split(' ')[1];
  const [fen, setFen] = useState(data.fen);
  const [step, setStep] = useState(0);
  const [sel, setSel] = useState<string | null>(null);
  const [last, setLast] = useState<string[]>([]);
  const [status, setStatus] = useState<'play' | 'wrong' | 'solved' | 'shown'>('play');
  const [hint, setHint] = useState(false);
  const game = useMemo(() => new Chess(fen), [fen]);

  const targets = useMemo(() => (sel ? game.moves({ square: sel as Square, verbose: true }).map((m) => m.to) : []), [sel, game]);

  const play = (g: Chess, uci: string) => {
    const mv = g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    setLast([mv.from, mv.to]);
    return g.fen();
  };

  const finish = (s: 'solved' | 'shown') => {
    setStatus(s);
    if (s === 'solved') exerciseDone('scacchi');
  };

  const tryMove = (from: string, to: string) => {
    const g = new Chess(fen);
    const piece = g.get(from as Square);
    const promo = piece?.type === 'p' && (to[1] === '8' || to[1] === '1') ? 'q' : '';
    const expected = data.solution[step];
    let mv;
    try {
      mv = g.move({ from, to, promotion: promo || undefined });
    } catch {
      return;
    }
    const correct = expected.startsWith(from + to) || g.isCheckmate();
    if (!correct) {
      setStatus('wrong');
      setSel(null);
      return;
    }
    setStatus('play');
    setHint(false);
    setLast([mv.from, mv.to]);
    setFen(g.fen());
    setSel(null);
    const nextStep = step + 1;
    if (g.isCheckmate() || nextStep >= data.solution.length) {
      setStep(data.solution.length);
      finish('solved');
      return;
    }
    // Risposta dell'avversario.
    setTimeout(() => {
      const g2 = new Chess(g.fen());
      setFen(play(g2, data.solution[nextStep]));
      setStep(nextStep + 1);
      if (nextStep + 1 >= data.solution.length) finish('solved');
    }, 450);
  };

  const onSquare = (sq: string) => {
    if (status === 'solved' || status === 'shown') return;
    const piece = game.get(sq as Square);
    if (sel && targets.includes(sq as Square)) return tryMove(sel, sq);
    if (piece && piece.color === userColor) setSel(sq);
    else setSel(null);
  };

  const showSolution = () => {
    const g = new Chess(fen);
    let s = step;
    let f = fen;
    while (s < data.solution.length) {
      f = play(g, data.solution[s]);
      s++;
    }
    setFen(f);
    setStep(s);
    finish('shown');
  };

  const expected = data.solution[step];
  return (
    <div class={`chess-puzzle${compact ? ' compact' : ''}`}>
      <p style={{ margin: '0 0 4px' }} class={compact ? 'small' : undefined}>
        Giochi con <b>{userColor === 'w' ? 'il Bianco' : 'il Nero'}</b>. Tocca un pezzo, poi la casa di arrivo.
      </p>
      <ChessBoard
        fen={fen}
        flip={userColor === 'b'}
        selected={sel}
        hints={hint && expected ? [expected.slice(0, 2)] : targets}
        last={last}
        onSquare={onSquare}
      />
      <p role="status" style={{ minHeight: '1.5em', textAlign: 'center', fontWeight: 600 }}>
        {status === 'wrong' && 'Non è la mossa giusta. Riprova!'}
        {status === 'solved' && '🎉 Risolto! Ottimo lavoro.'}
        {status === 'shown' && 'Ecco la soluzione. Domani un altro puzzle.'}
      </p>
      <div class="row" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
        {status !== 'solved' && status !== 'shown' && (
          <>
            <button class="btn ghost small" onClick={() => setHint(true)}>
              {compact ? 'Aiuto' : 'Suggerimento'}
            </button>
            <button class="btn ghost small" onClick={showSolution}>
              {compact ? 'Soluzione' : 'Mostra la soluzione'}
            </button>
          </>
        )}
        <a class="btn ghost small" href={puzzleUrl} target="_blank" rel="noopener">
          {compact ? 'Lichess' : 'Apri su Lichess'}
        </a>
      </div>
      {data.themes.length > 0 && (status === 'solved' || status === 'shown') && (
        <p class="muted small" style={{ textAlign: 'center' }}>
          Temi: {data.themes.join(', ')} · difficoltà {data.rating}
        </p>
      )}
    </div>
  );
}
