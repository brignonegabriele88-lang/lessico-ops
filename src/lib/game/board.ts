import type { Dictionary } from "./dictionary";
import { hasPrefix, hasWord } from "./dictionary";
import { pickTiles, tileLetters } from "./letters";
import { mulberry32 } from "./rng";
import type { GridSize } from "./types";

const DELTAS = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
] as const;

export function neighbors(index: number, size: GridSize): number[] {
  const r = Math.floor(index / size);
  const c = index % size;
  const out: number[] = [];
  for (const [dr, dc] of DELTAS) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr >= 0 && nr < size && nc >= 0 && nc < size) out.push(nr * size + nc);
  }
  return out;
}

export function pathToWord(cells: string[], path: number[]): string {
  let word = "";
  for (const i of path) word += tileLetters(cells[i] ?? "");
  return word;
}

export function isAdjacentPath(path: number[], size: GridSize): boolean {
  const seen = new Set<number>();
  for (let i = 0; i < path.length; i += 1) {
    const idx = path[i]!;
    if (idx < 0 || idx >= size * size || seen.has(idx)) return false;
    seen.add(idx);
    if (i > 0) {
      const prev = path[i - 1]!;
      if (!neighbors(prev, size).includes(idx)) return false;
    }
  }
  return path.length > 0;
}

export function solveBoard(cells: string[], size: GridSize, dict: Dictionary): string[] {
  const found = new Set<string>();
  const adj: number[][] = [];
  for (let i = 0; i < cells.length; i += 1) adj.push(neighbors(i, size));
  const letters = cells.map(tileLetters);

  const dfs = (idx: number, visited: number, acc: string) => {
    const next = acc + letters[idx];
    if (!hasPrefix(dict, next)) return;
    if (next.length >= 3 && hasWord(dict, next)) found.add(next);
    const vis = visited | (1 << idx);
    for (const n of adj[idx]!) {
      if ((vis & (1 << n)) === 0) dfs(n, vis, next);
    }
  };

  for (let i = 0; i < cells.length; i += 1) dfs(i, 0, "");
  return [...found].sort((a, b) => b.length - a.length || a.localeCompare(b));
}

export type GeneratedBoard = {
  cells: string[];
  words: string[];
  size: GridSize;
};

export function generateBoard(seed: number, size: GridSize, dict: Dictionary): GeneratedBoard {
  const rng = mulberry32(seed);
  const target = size === 4 ? 40 : 80;
  const attempts = size === 4 ? 10 : 5;
  let bestCells: string[] = [];
  let bestWords: string[] = [];

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const cells = pickTiles(rng, size * size);
    const words = solveBoard(cells, size, dict);
    if (words.length > bestWords.length) {
      bestCells = cells;
      bestWords = words;
    }
    if (bestWords.length >= target) break;
  }

  return { cells: bestCells, words: bestWords, size };
}
