/** Italian-weighted tiles. Q is "Qu" so the letter is actually playable. */
export const ITALIAN_BAG: string[] = [
  ..."AAAAAAAAAAAA",
  ..."EEEEEEEEEEEE",
  ..."IIIIIIIIIII",
  ..."OOOOOOOOOO",
  ..."NNNNNNN",
  ..."RRRRRRR",
  ..."TTTTTTT",
  ..."LLLLLL",
  ..."SSSSSS",
  ..."CCCCC",
  ..."DDDD",
  ..."MMMM",
  ..."UUUU",
  ..."PPPP",
  ..."VVV",
  ..."GGG",
  ..."HH",
  ..."FF",
  ..."BB",
  ..."ZZ",
  "Qu",
];

const VOWELS = new Set(["A", "E", "I", "O", "U"]);

export function isVowelTile(tile: string): boolean {
  const ch = tile === "Qu" ? "U" : tile.charAt(0);
  return VOWELS.has(ch);
}

export function tileLetters(tile: string): string {
  return tile === "Qu" ? "qu" : tile.toLowerCase();
}

export function pickTiles(rng: () => number, count: number): string[] {
  const bag = ITALIAN_BAG.slice();
  for (let i = bag.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = bag[i]!;
    bag[i] = bag[j]!;
    bag[j] = tmp;
  }
  const tiles = bag.slice(0, count);
  const vowels = tiles.filter(isVowelTile).length;
  const minVowels = count === 16 ? 5 : 7;
  if (vowels < minVowels) {
    for (let i = 0; i < tiles.length && tiles.filter(isVowelTile).length < minVowels; i += 1) {
      if (!isVowelTile(tiles[i]!)) {
        tiles[i] = (["A", "E", "I", "O"] as const)[Math.floor(rng() * 4)]!;
      }
    }
  }
  return tiles;
}
