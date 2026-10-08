export type Dictionary = {
  words: string[];
  common: Set<string>;
  size: number;
};

function lowerBound(arr: string[], key: string): number {
  let lo = 0;
  let hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (arr[mid]! < key) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export function hasWord(dict: Dictionary, word: string): boolean {
  const i = lowerBound(dict.words, word);
  return dict.words[i] === word;
}

export function hasPrefix(dict: Dictionary, prefix: string): boolean {
  if (!prefix) return true;
  const i = lowerBound(dict.words, prefix);
  const hit = dict.words[i];
  return Boolean(hit && hit.startsWith(prefix));
}

export function isCommon(dict: Dictionary, word: string): boolean {
  return dict.common.has(word);
}

async function gunzipText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Impossibile caricare il dizionario (${res.status})`);
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.byteLength >= 2 && buf[0] === 0x1f && buf[1] === 0x8b) {
    if (typeof DecompressionStream === "undefined") {
      throw new Error("Questo browser non supporta il dizionario compresso");
    }
    const stream = new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"));
    return new Response(stream).text();
  }
  return new TextDecoder().decode(buf);
}

let pending: Promise<Dictionary> | null = null;

export function loadDictionary(): Promise<Dictionary> {
  if (!pending) {
    pending = (async () => {
      const [fullText, commonText] = await Promise.all([
        gunzipText("/dict/it.txt.gz"),
        gunzipText("/dict/common.txt.gz"),
      ]);
      const words = fullText.trim().split("\n");
      const common = new Set(commonText.trim().split("\n"));
      return { words, common, size: words.length };
    })().catch((err) => {
      pending = null;
      throw err;
    });
  }
  return pending;
}
