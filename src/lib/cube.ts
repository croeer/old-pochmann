export type Face = 'U' | 'L' | 'F' | 'R' | 'B' | 'D';
export type PieceType = 'edge' | 'corner';
export type CubeState = Face[];

export const FACE_ORDER: Face[] = ['U', 'L', 'F', 'R', 'B', 'D'];

export const FACE_DEFS: Record<Face, {
  n: [number, number, number];
  right: [number, number, number];
  down: [number, number, number];
  off: number;
}> = {
  U: { n: [0, 1, 0], right: [1, 0, 0], down: [0, 0, 1], off: 0 },
  L: { n: [-1, 0, 0], right: [0, 0, 1], down: [0, -1, 0], off: 4 },
  F: { n: [0, 0, 1], right: [1, 0, 0], down: [0, -1, 0], off: 8 },
  R: { n: [1, 0, 0], right: [0, 0, -1], down: [0, -1, 0], off: 12 },
  B: { n: [0, 0, -1], right: [-1, 0, 0], down: [0, -1, 0], off: 16 },
  D: { n: [0, -1, 0], right: [1, 0, 0], down: [0, 0, -1], off: 20 },
};

type Facelet = {
  face: Face;
  r: number;
  c: number;
  pos: number[];
};

type Piece = { key: string; facelets: number[] };

const facelets: Facelet[] = [];
const CORNER_POS: Record<string, number> = { '0,0': 0, '0,2': 1, '2,2': 2, '2,0': 3 };
const EDGE_POS: Record<string, number> = { '0,1': 0, '1,2': 1, '2,1': 2, '1,0': 3 };

export const letterInfo: ({ type: PieceType; letter: string } | null)[] = Array(54).fill(null);
export const cornerL2F: Record<string, number> = {};
export const edgeL2F: Record<string, number> = {};

for (const f of FACE_ORDER) {
  const d = FACE_DEFS[f];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const pos = [0, 1, 2].map(i => 3 * d.n[i] + 2 * (c - 1) * d.right[i] + 2 * (r - 1) * d.down[i]);
      const index = facelets.length;
      facelets.push({ face: f, r, c, pos });
      const key = `${r},${c}`;
      if (key in CORNER_POS) {
        const letter = String.fromCharCode(65 + d.off + CORNER_POS[key]);
        letterInfo[index] = { type: 'corner', letter };
        cornerL2F[letter] = index;
      } else if (key in EDGE_POS) {
        const letter = String.fromCharCode(65 + d.off + EDGE_POS[key]);
        letterInfo[index] = { type: 'edge', letter };
        edgeL2F[letter] = index;
      }
    }
  }
}

function buildPieces(nStickers: 2 | 3): Piece[] {
  const map = new Map<string, Piece>();
  facelets.forEach((fl, i) => {
    const sig = fl.pos.map(Math.sign);
    if (sig.filter(v => v !== 0).length !== nStickers) return;
    const key = sig.join(',');
    if (!map.has(key)) map.set(key, { key, facelets: [] });
    map.get(key)!.facelets.push(i);
  });
  return [...map.values()];
}

const corners = buildPieces(3);
const edges = buildPieces(2);
const pieceOf = {
  corner: Array<Piece | null>(54).fill(null),
  edge: Array<Piece | null>(54).fill(null),
};
corners.forEach(p => p.facelets.forEach(f => { pieceOf.corner[f] = p; }));
edges.forEach(p => p.facelets.forEach(f => { pieceOf.edge[f] = p; }));

const solvedKeyOf = (p: Piece) => p.facelets.map(f => facelets[f].face).slice().sort().join('');
const solvedByKey = {
  corner: new Map<string, Piece>(),
  edge: new Map<string, Piece>(),
};
corners.forEach(p => solvedByKey.corner.set(solvedKeyOf(p), p));
edges.forEach(p => solvedByKey.edge.set(solvedKeyOf(p), p));

const NAME_ORDER: Face[] = ['U', 'D', 'F', 'B', 'R', 'L'];
const pieceName = (p: Piece) => p.facelets
  .map(f => facelets[f].face)
  .sort((a, b) => NAME_ORDER.indexOf(a) - NAME_ORDER.indexOf(b))
  .join('');

export function blankSolvedState(): CubeState {
  return facelets.map(f => f.face);
}

export function faceletIndex(face: Face, r: number, c: number): number {
  return FACE_ORDER.indexOf(face) * 9 + r * 3 + c;
}

export function stateToFaces(state: CubeState): Record<Face, Face[]> {
  return Object.fromEntries(FACE_ORDER.map(face => [face, state.slice(FACE_ORDER.indexOf(face) * 9, FACE_ORDER.indexOf(face) * 9 + 9)])) as Record<Face, Face[]>;
}

export type TraceResult = {
  cycles: { letters: string[]; isBreak: boolean }[];
  letters: string[];
  bufferMisoriented: boolean;
  misoriented: string[];
  solvedCount: number;
  total: number;
};

export function trace(state: CubeState, type: PieceType, bufferLetter: string): TraceResult {
  const l2f = type === 'corner' ? cornerL2F : edgeL2F;
  const bufF = l2f[bufferLetter];
  const bufPiece = pieceOf[type][bufF]!;
  const all = type === 'corner' ? corners : edges;
  const solvedMap = solvedByKey[type];

  const isSolved = (p: Piece) => p.facelets.every(f => state[f] === facelets[f].face);
  const colorKey = (p: Piece) => p.facelets.map(f => state[f]).slice().sort().join('');
  const targetOf = (ref: number) => {
    const p = pieceOf[type][ref]!;
    const tp = solvedMap.get(colorKey(p));
    if (!tp) throw new Error(`Invalid ${type} color combination at ${pieceName(p)}.`);
    const tf = tp.facelets.find(f => facelets[f].face === state[ref]);
    if (tf == null) throw new Error(`Could not orient ${type} at ${pieceName(p)}.`);
    return { tp, tf };
  };

  const visited = new Set<string>([bufPiece.key]);
  const cycles: { letters: string[]; isBreak: boolean }[] = [];
  let cycle: string[] = [];
  let ref = bufF;

  for (;;) {
    const { tp, tf } = targetOf(ref);
    if (tp.key === bufPiece.key) break;
    cycle.push(letterInfo[tf]!.letter);
    visited.add(tp.key);
    ref = tf;
  }
  if (cycle.length) cycles.push({ letters: cycle, isBreak: false });

  const bufferMisoriented = solvedMap.get(colorKey(bufPiece)) === bufPiece && !isSolved(bufPiece);
  const misoriented = all
    .filter(p => p !== bufPiece && solvedMap.get(colorKey(p)) === p && !isSolved(p))
    .map(pieceName);

  for (let li = 0; li < 24; li++) {
    const letter = String.fromCharCode(65 + li);
    const p = pieceOf[type][l2f[letter]]!;
    if (visited.has(p.key) || isSolved(p)) continue;
    const breakCycle = [letter];
    visited.add(p.key);
    let r2 = l2f[letter];
    for (;;) {
      const { tp, tf } = targetOf(r2);
      breakCycle.push(letterInfo[tf]!.letter);
      if (tp.key === p.key) break;
      visited.add(tp.key);
      r2 = tf;
    }
    cycles.push({ letters: breakCycle, isBreak: true });
  }

  return {
    cycles,
    letters: cycles.flatMap(c => c.letters),
    bufferMisoriented,
    misoriented,
    solvedCount: all.filter(isSolved).length,
    total: all.length,
  };
}

export function validateState(state: CubeState): string[] {
  const errors: string[] = [];
  for (const face of FACE_ORDER) {
    const count = state.filter(v => v === face).length;
    if (count !== 9) errors.push(`${face}: expected 9 stickers, found ${count}.`);
  }

  for (const [type, all] of [['edge', edges], ['corner', corners]] as const) {
    const seen = new Set<string>();
    for (const p of all) {
      const key = p.facelets.map(f => state[f]).slice().sort().join('');
      if (!solvedByKey[type].has(key)) {
        errors.push(`Impossible ${type} color set at ${pieceName(p)}: ${key}.`);
      } else if (seen.has(key)) {
        errors.push(`Duplicate ${type} piece: ${key}.`);
      }
      seen.add(key);
    }
  }
  return errors;
}

export function memoFromState(state: CubeState, edgeBuffer = 'B', cornerBuffer = 'A') {
  const errors = validateState(state);
  if (errors.length) return { errors, edges: null, corners: null, parity: false };
  try {
    const edgeResult = trace(state, 'edge', edgeBuffer);
    const cornerResult = trace(state, 'corner', cornerBuffer);
    return {
      errors: [],
      edges: edgeResult,
      corners: cornerResult,
      parity: edgeResult.letters.length % 2 === 1,
    };
  } catch (error) {
    return { errors: [error instanceof Error ? error.message : String(error)], edges: null, corners: null, parity: false };
  }
}

export function faceOfLetter(letter: string): Face {
  return FACE_ORDER[Math.floor((letter.charCodeAt(0) - 65) / 4)];
}
