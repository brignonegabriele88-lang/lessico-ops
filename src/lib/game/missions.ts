import type { GridSize, MatchResult } from "./types";

export type MissionKind =
  | "words"
  | "length"
  | "score"
  | "common"
  | "combo"
  | "starts"
  | "ghost"
  | "duel-win";

export type Mission = {
  id: string;
  name: string;
  brief: string;
  kind: MissionKind;
  target: number;
  duration: number;
  size: GridSize;
  rewardXp: number;
  requires: string[];
};

export const MISSIONS: Mission[] = [
  {
    id: "m1",
    name: "OP. RECLUTAMENTO",
    brief: "Intercetta almeno 10 parole in 120 secondi.",
    kind: "words",
    target: 10,
    duration: 120,
    size: 4,
    rewardXp: 40,
    requires: [],
  },
  {
    id: "m2",
    name: "OP. SEGNALE LUNGO",
    brief: "Trova una parola di almeno 6 lettere.",
    kind: "length",
    target: 6,
    duration: 120,
    size: 4,
    rewardXp: 50,
    requires: ["m1"],
  },
  {
    id: "m3",
    name: "OP. FREQUENZA",
    brief: "Trova 8 parole comuni del lessico civile.",
    kind: "common",
    target: 8,
    duration: 120,
    size: 4,
    rewardXp: 45,
    requires: ["m1"],
  },
  {
    id: "m4",
    name: "OP. SATURAZIONE",
    brief: "Raggiungi 60 punti in una sola sortita.",
    kind: "score",
    target: 60,
    duration: 180,
    size: 4,
    rewardXp: 55,
    requires: ["m2"],
  },
  {
    id: "m5",
    name: "OP. RAFFICA",
    brief: "Metti a segno una combo da 4 parole.",
    kind: "combo",
    target: 4,
    duration: 180,
    size: 4,
    rewardXp: 50,
    requires: ["m3"],
  },
  {
    id: "m6",
    name: "OP. SPETTRO",
    brief: "Parole con 6 iniziali diverse nella stessa missione.",
    kind: "starts",
    target: 6,
    duration: 180,
    size: 4,
    rewardXp: 55,
    requires: ["m4"],
  },
  {
    id: "m7",
    name: "OP. OMBRA",
    brief: "Trova la parola più lunga presente sulla griglia.",
    kind: "ghost",
    target: 1,
    duration: 180,
    size: 4,
    rewardXp: 70,
    requires: ["m5", "m6"],
  },
  {
    id: "m8",
    name: "OP. CONTATTO",
    brief: "Vinci un duello 1 vs 1.",
    kind: "duel-win",
    target: 1,
    duration: 120,
    size: 4,
    rewardXp: 80,
    requires: ["m4"],
  },
];

export function missionById(id: string): Mission | undefined {
  return MISSIONS.find((m) => m.id === id);
}

export function isMissionUnlocked(id: string, completed: string[]): boolean {
  const mission = missionById(id);
  if (!mission) return false;
  return mission.requires.every((req) => completed.includes(req));
}

export function evaluateMission(
  mission: Mission,
  match: MatchResult,
  extra: { won: boolean | null; distinctStarts: number },
): boolean {
  switch (mission.kind) {
    case "words":
      return match.found.length >= mission.target;
    case "length":
      return match.longest.length >= mission.target;
    case "score":
      return match.score >= mission.target;
    case "common":
      return match.commonCount >= mission.target;
    case "combo":
      return match.comboMax >= mission.target;
    case "starts":
      return extra.distinctStarts >= mission.target;
    case "ghost":
      return Boolean(match.boardWords[0] && match.found.includes(match.boardWords[0]));
    case "duel-win":
      return extra.won === true;
    default:
      return false;
  }
}
