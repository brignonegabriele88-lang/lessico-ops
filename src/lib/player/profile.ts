export type Rank = {
  level: number;
  name: string;
  xp: number;
};

export const RANKS: Rank[] = [
  { level: 1, name: "RECLUTA", xp: 0 },
  { level: 2, name: "OPERATIVO", xp: 150 },
  { level: 3, name: "INFILTRATO", xp: 400 },
  { level: 4, name: "SPECIALISTA", xp: 900 },
  { level: 5, name: "COMANDANTE", xp: 1800 },
  { level: 6, name: "VETERANO", xp: 3200 },
  { level: 7, name: "FANTASMA", xp: 5500 },
  { level: 8, name: "LEGGENDA", xp: 9000 },
];

export const GRID5_LEVEL = 3;

export type AchievementId =
  | "first-op"
  | "long-6"
  | "long-7"
  | "long-8"
  | "long-9"
  | "words-20"
  | "words-40"
  | "lex-50"
  | "lex-200"
  | "lex-500"
  | "lex-1000"
  | "duel-win"
  | "duel-3"
  | "duel-10"
  | "score-80"
  | "score-160"
  | "combo-5"
  | "daily-1"
  | "ghost"
  | "polyglot"
  | "speed"
  | "common-10";

export type AchievementDef = {
  id: AchievementId;
  name: string;
  detail: string;
  xp: number;
};

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first-op", name: "PRIMA INFILTRAZIONE", detail: "Completa la prima missione", xp: 20 },
  { id: "long-6", name: "SEGNALE LUNGO", detail: "Trova una parola di 6 lettere", xp: 10 },
  { id: "long-7", name: "BANDA LARGA", detail: "Trova una parola di 7 lettere", xp: 15 },
  { id: "long-8", name: "OPERAZIONE FANTASMA", detail: "Trova una parola di 8 lettere", xp: 25 },
  { id: "long-9", name: "OMBRA PROFONDA", detail: "Trova una parola di 9+ lettere", xp: 40 },
  { id: "words-20", name: "INTERCETTATORE", detail: "20 parole in una missione", xp: 15 },
  { id: "words-40", name: "SATURAZIONE", detail: "40 parole in una missione", xp: 30 },
  { id: "lex-50", name: "ARCHIVIO 50", detail: "50 parole diverse in carriera", xp: 15 },
  { id: "lex-200", name: "ARCHIVIO 200", detail: "200 parole diverse in carriera", xp: 25 },
  { id: "lex-500", name: "ARCHIVIO 500", detail: "500 parole diverse in carriera", xp: 40 },
  { id: "lex-1000", name: "ARCHIVIO 1000", detail: "1000 parole diverse in carriera", xp: 60 },
  { id: "duel-win", name: "CONTATTO VISIVO", detail: "Vinci un duello 1 vs 1", xp: 20 },
  { id: "duel-3", name: "TRIPLA COPERTURA", detail: "Vinci 3 duelli", xp: 30 },
  { id: "duel-10", name: "COMANDO CAMPO", detail: "Vinci 10 duelli", xp: 50 },
  { id: "score-80", name: "RAPPORTO SOLIDO", detail: "Ottieni 80 punti in una missione", xp: 15 },
  { id: "score-160", name: "RAPPORTO CRITICO", detail: "Ottieni 160 punti in una missione", xp: 30 },
  { id: "combo-5", name: "RAFFICA", detail: "Combo da 5 parole valide", xp: 15 },
  { id: "daily-1", name: "ORDINE DEL GIORNO", detail: "Completa la missione odierna", xp: 15 },
  { id: "ghost", name: "PASSO FANTASMA", detail: "Trova la parola più lunga della griglia", xp: 25 },
  { id: "polyglot", name: "SPETTRO LESSICALE", detail: "Parole con 8 iniziali diverse", xp: 15 },
  { id: "speed", name: "RISPOSTA RAPIDA", detail: "10 parole nei primi 30 secondi", xp: 20 },
  { id: "common-10", name: "FREQUENZA CIVILE", detail: "10 parole comuni in una missione", xp: 10 },
];

export const ACHIEVEMENT_MAP = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a]),
) as Record<AchievementId, AchievementDef>;

export type Profile = {
  version: 2;
  callsign: string;
  xp: number;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  bestScore: number;
  longestWord: string;
  uniqueWords: string[];
  totalFound: number;
  achievements: AchievementId[];
  lastDaily: string | null;
  muted: boolean;
  missionsCompleted: string[];
};

const KEY = "lessico-ops-profile-v1";
const SAVE_VERSION = 2 as const;

export const DEFAULT_PROFILE: Profile = {
  version: SAVE_VERSION,
  callsign: "RECLUTA",
  xp: 0,
  games: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  bestScore: 0,
  longestWord: "",
  uniqueWords: [],
  totalFound: 0,
  achievements: [],
  lastDaily: null,
  muted: false,
  missionsCompleted: [],
};

export function migrate(raw: unknown): Profile {
  const base = { ...DEFAULT_PROFILE, uniqueWords: [], achievements: [], missionsCompleted: [] };
  if (!raw || typeof raw !== "object") return base;
  const s = raw as Partial<Profile> & { version?: number };
  return {
    version: SAVE_VERSION,
    callsign: typeof s.callsign === "string" && s.callsign.trim() ? s.callsign.slice(0, 16) : base.callsign,
    xp: typeof s.xp === "number" ? s.xp : 0,
    games: typeof s.games === "number" ? s.games : 0,
    wins: typeof s.wins === "number" ? s.wins : 0,
    losses: typeof s.losses === "number" ? s.losses : 0,
    draws: typeof s.draws === "number" ? s.draws : 0,
    bestScore: typeof s.bestScore === "number" ? s.bestScore : 0,
    longestWord: typeof s.longestWord === "string" ? s.longestWord : "",
    uniqueWords: Array.isArray(s.uniqueWords)
      ? s.uniqueWords.filter((w): w is string => typeof w === "string")
      : [],
    totalFound: typeof s.totalFound === "number" ? s.totalFound : 0,
    achievements: Array.isArray(s.achievements)
      ? s.achievements.filter((id): id is AchievementId => typeof id === "string" && id in ACHIEVEMENT_MAP)
      : [],
    lastDaily: typeof s.lastDaily === "string" && s.lastDaily ? s.lastDaily : null,
    muted: Boolean(s.muted),
    missionsCompleted: Array.isArray(s.missionsCompleted)
      ? s.missionsCompleted.filter((id): id is string => typeof id === "string")
      : [],
  };
}

export function loadProfile(): Profile {
  if (typeof window === "undefined") return { ...DEFAULT_PROFILE };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_PROFILE };
    return migrate(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export function saveProfile(profile: Profile): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(profile));
  } catch {
    /* quota / private mode */
  }
}

export function rankForXp(xp: number): Rank {
  let current = RANKS[0]!;
  for (const r of RANKS) {
    if (xp >= r.xp) current = r;
  }
  return current;
}

export function nextRank(xp: number): Rank | null {
  const current = rankForXp(xp);
  return RANKS.find((r) => r.level === current.level + 1) ?? null;
}

export function todayKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export type MatchSummary = {
  mode: "solo" | "duel" | "daily" | "mission";
  score: number;
  found: string[];
  longest: string;
  comboMax: number;
  commonCount: number;
  boardLongest: string;
  won: boolean | null;
  wordsInFirst30: number;
  distinctStarts: number;
  missionId?: string;
  missionSuccess?: boolean;
  missionXp?: number;
};

export function applyMatch(profile: Profile, match: MatchSummary): {
  profile: Profile;
  unlocked: AchievementDef[];
  xpGain: number;
  leveled: boolean;
} {
  const unique = new Set(profile.uniqueWords);
  let newUnique = 0;
  for (const w of match.found) {
    if (!unique.has(w)) {
      unique.add(w);
      newUnique += 1;
    }
  }

  let xpGain = match.score + newUnique * 2;
  if (match.mode === "daily") xpGain += 20;
  if (match.won === true) xpGain += 25;
  if (match.missionSuccess && match.missionXp) xpGain += match.missionXp;

  const missionsCompleted = [...profile.missionsCompleted];
  if (match.missionId && match.missionSuccess && !missionsCompleted.includes(match.missionId)) {
    missionsCompleted.push(match.missionId);
  }

  const next: Profile = {
    ...profile,
    version: SAVE_VERSION,
    xp: profile.xp,
    games: profile.games + 1,
    wins: profile.wins + (match.won === true ? 1 : 0),
    losses: profile.losses + (match.won === false ? 1 : 0),
    draws: profile.draws + (match.won === null && match.mode === "duel" ? 1 : 0),
    bestScore: Math.max(profile.bestScore, match.score),
    longestWord:
      match.longest.length > profile.longestWord.length ? match.longest : profile.longestWord,
    uniqueWords: unique.size > 4000 ? [...unique].slice(unique.size - 4000) : [...unique],
    totalFound: profile.totalFound + match.found.length,
    achievements: [...profile.achievements],
    lastDaily: match.mode === "daily" ? todayKey() : profile.lastDaily,
    missionsCompleted,
  };

  const unlocked: AchievementDef[] = [];
  const has = (id: AchievementId) => next.achievements.includes(id);
  const grant = (id: AchievementId) => {
    if (has(id)) return;
    next.achievements.push(id);
    const def = ACHIEVEMENT_MAP[id];
    unlocked.push(def);
    xpGain += def.xp;
  };

  if (next.games >= 1) grant("first-op");
  if (match.longest.length >= 6) grant("long-6");
  if (match.longest.length >= 7) grant("long-7");
  if (match.longest.length >= 8) grant("long-8");
  if (match.longest.length >= 9) grant("long-9");
  if (match.found.length >= 20) grant("words-20");
  if (match.found.length >= 40) grant("words-40");
  if (unique.size >= 50) grant("lex-50");
  if (unique.size >= 200) grant("lex-200");
  if (unique.size >= 500) grant("lex-500");
  if (unique.size >= 1000) grant("lex-1000");
  if (match.won === true) grant("duel-win");
  if (next.wins >= 3) grant("duel-3");
  if (next.wins >= 10) grant("duel-10");
  if (match.score >= 80) grant("score-80");
  if (match.score >= 160) grant("score-160");
  if (match.comboMax >= 5) grant("combo-5");
  if (match.mode === "daily") grant("daily-1");
  if (match.boardLongest && match.found.includes(match.boardLongest)) grant("ghost");
  if (match.distinctStarts >= 8) grant("polyglot");
  if (match.wordsInFirst30 >= 10) grant("speed");
  if (match.commonCount >= 10) grant("common-10");

  const before = rankForXp(profile.xp).level;
  next.xp = profile.xp + xpGain;
  const leveled = rankForXp(next.xp).level > before;
  return { profile: next, unlocked, xpGain, leveled };
}
