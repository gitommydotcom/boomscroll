/**
 * Diagramma degli scacchi per la stampa, come nei quotidiani: case scure tratteggiate,
 * pezzi bianchi a contorno e neri pieni, coordinate ai bordi, dal lato di chi muove.
 */
import { Chess } from 'chess.js';
import type { ChessData } from '../shared/types';

const GLYPH: Record<string, string> = {
  K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
};
/** Sagoma piena di ogni pezzo, usata come fondo bianco sotto i pezzi bianchi. */
const FILLED: Record<string, string> = { K: '♚', Q: '♛', R: '♜', B: '♝', N: '♞', P: '♟' };

const SQ = 30;
const PAD = 14;

export function sideToMove(fen: string): 'w' | 'b' {
  return fen.split(' ')[1] === 'b' ? 'b' : 'w';
}

export function diagram(fen: string): string {
  const rows = fen.split(' ')[0].split('/');
  const flip = sideToMove(fen) === 'b';
  const size = SQ * 8;
  const out: string[] = [];
  out.push(
    `<svg class="board" viewBox="0 0 ${size + PAD} ${size + PAD}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Diagramma: ${fen}">`,
    `<defs><pattern id="hatch" width="3.2" height="3.2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="3.2" stroke="#000" stroke-width="0.9"/></pattern></defs>`,
    `<g transform="translate(${PAD} 0)">`,
  );
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const x = (flip ? 7 - f : f) * SQ;
      const y = (flip ? 7 - r : r) * SQ;
      if ((r + f) % 2 === 1) out.push(`<rect x="${x}" y="${y}" width="${SQ}" height="${SQ}" fill="url(#hatch)"/>`);
    }
  }
  rows.forEach((row, r) => {
    let f = 0;
    for (const c of row) {
      if (/\d/.test(c)) {
        f += Number(c);
        continue;
      }
      const cx = (flip ? 7 - f : f) * SQ + SQ / 2;
      const cy = (flip ? 7 - r : r) * SQ + SQ / 2 + 1;
      const t = `x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central"`;
      if (c === c.toUpperCase()) {
        // Pezzo bianco: sagoma piena bianca (copre il tratteggio), poi il contorno nero.
        out.push(`<text ${t} class="pc" fill="#fff">${FILLED[c]}</text>`, `<text ${t} class="pc" fill="#000">${GLYPH[c]}</text>`);
      } else {
        // Pezzo nero: una sagoma bianca appena più grande sotto, per staccarlo dal tratteggio.
        out.push(`<text ${t} class="pc halo" fill="#fff">${GLYPH[c]}</text>`, `<text ${t} class="pc" fill="#000">${GLYPH[c]}</text>`);
      }
      f++;
    }
  });
  out.push(`<rect x="0" y="0" width="${size}" height="${size}" fill="none" stroke="#000" stroke-width="1.6"/>`);
  out.push(`<rect x="-2.6" y="-2.6" width="${size + 5.2}" height="${size + 5.2}" fill="none" stroke="#000" stroke-width="0.5"/>`, '</g>');
  const files = 'abcdefgh';
  for (let i = 0; i < 8; i++) {
    const file = flip ? files[7 - i] : files[i];
    const rank = flip ? i + 1 : 8 - i;
    out.push(`<text x="${PAD + i * SQ + SQ / 2}" y="${size + PAD - 2}" text-anchor="middle" class="co">${file}</text>`);
    out.push(`<text x="${PAD / 2 - 1}" y="${i * SQ + SQ / 2}" text-anchor="middle" dominant-baseline="central" class="co">${rank}</text>`);
  }
  out.push('</svg>');
  return out.join('');
}

/** La soluzione in notazione algebrica italiana (R, D, T, A, C), numerata. */
export function solution(data: ChessData): string {
  const game = new Chess(data.fen);
  const black = sideToMove(data.fen) === 'b';
  let n = Number(data.fen.split(' ')[5]) || 1;
  const parts: string[] = [];
  data.solution.forEach((uci, i) => {
    let san: string;
    try {
      san = game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san;
    } catch {
      return;
    }
    san = san.replace(/[KQRBN]/g, (p) => ({ K: 'R', Q: 'D', R: 'T', B: 'A', N: 'C' })[p]!);
    const whiteMove = black ? i % 2 === 1 : i % 2 === 0;
    if (whiteMove) parts.push(`${n}. ${san}`);
    else {
      parts.push(i === 0 ? `${n}… ${san}` : san);
      n++;
    }
  });
  return parts.join(' ');
}

/** "Il bianco muove e dà matto in due." dai temi del puzzle. */
export function task(data: ChessData): string {
  const who = sideToMove(data.fen) === 'w' ? 'Il bianco' : 'Il nero';
  const mate = data.themes.find((t) => /^mateIn\d$/.test(t));
  const words = ['', 'una mossa', 'due mosse', 'tre mosse', 'quattro mosse', 'cinque mosse'];
  if (mate) return `${who} muove e dà matto in ${words[Number(mate.slice(-1))] ?? `${mate.slice(-1)} mosse`}.`;
  if (data.themes.includes('equality')) return `${who} muove e pareggia.`;
  return `${who} muove e vince.`;
}
