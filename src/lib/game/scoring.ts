import { isCommon, type Dictionary } from "./dictionary";

export function wordPoints(word: string): number {
  const n = word.length;
  if (n < 3) return 0;
  if (n === 3) return 1;
  if (n === 4) return 2;
  if (n === 5) return 4;
  if (n === 6) return 7;
  if (n === 7) return 12;
  if (n === 8) return 18;
  return 18 + (n - 8) * 8;
}

export function lengthPrize(word: string): number {
  if (word.length >= 10) return 16;
  if (word.length >= 9) return 10;
  if (word.length >= 8) return 6;
  if (word.length >= 7) return 3;
  return 0;
}

export function comboBonus(combo: number): number {
  if (combo < 3) return 0;
  return Math.min(combo - 2, 8);
}

export function scoreWord(word: string, dict: Dictionary, combo: number): number {
  const base = wordPoints(word);
  const prize = lengthPrize(word);
  const common = isCommon(dict, word) ? 1 : 0;
  return base + prize + common + comboBonus(combo);
}

export function tallyWords(words: string[], dict: Dictionary): {
  score: number;
  longest: string;
  commonCount: number;
} {
  let score = 0;
  let longest = "";
  let commonCount = 0;
  for (const w of words) {
    score += wordPoints(w) + lengthPrize(w);
    if (isCommon(dict, w)) {
      score += 1;
      commonCount += 1;
    }
    if (w.length > longest.length || (w.length === longest.length && w < longest)) {
      longest = w;
    }
  }
  return { score, longest, commonCount };
}

export function duelScores(
  you: string[],
  them: string[],
  dict: Dictionary,
): {
  youBase: number;
  themBase: number;
  youUnique: string[];
  themUnique: string[];
  shared: string[];
  youTotal: number;
  themTotal: number;
} {
  const youSet = new Set(you);
  const themSet = new Set(them);
  const youUnique = you.filter((w) => !themSet.has(w));
  const themUnique = them.filter((w) => !youSet.has(w));
  const shared = you.filter((w) => themSet.has(w));

  const youT = tallyWords(you, dict);
  const themT = tallyWords(them, dict);
  const youUniqueBonus = youUnique.reduce((s, w) => s + Math.ceil(wordPoints(w) * 0.5), 0);
  const themUniqueBonus = themUnique.reduce((s, w) => s + Math.ceil(wordPoints(w) * 0.5), 0);

  const youLongest = youT.longest.length >= 7 && youT.longest.length > themT.longest.length ? 8 : 0;
  const themLongest = themT.longest.length >= 7 && themT.longest.length > youT.longest.length ? 8 : 0;
  const youMost = you.length > them.length ? 6 : 0;
  const themMost = them.length > you.length ? 6 : 0;

  return {
    youBase: youT.score,
    themBase: themT.score,
    youUnique,
    themUnique,
    shared,
    youTotal: youT.score + youUniqueBonus + youLongest + youMost,
    themTotal: themT.score + themUniqueBonus + themLongest + themMost,
  };
}
