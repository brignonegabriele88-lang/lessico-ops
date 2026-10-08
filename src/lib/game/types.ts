export type GridSize = 4 | 5;

export type GameMode = "solo" | "duel" | "daily" | "mission";

export type Screen =
  | "boot"
  | "menu"
  | "briefing"
  | "dossier"
  | "missions"
  | "setup-solo"
  | "setup-duel"
  | "lobby"
  | "play"
  | "results";

export type MatchConfig = {
  seed: number;
  size: GridSize;
  duration: number;
  mode: GameMode;
  missionId?: string;
};

export type MatchResult = {
  config: MatchConfig;
  cells: string[];
  boardWords: string[];
  found: string[];
  score: number;
  comboMax: number;
  longest: string;
  newUnique: number;
  commonCount: number;
  wordsInFirst30: number;
  missionSuccess?: boolean;
};

export type DuelReport = {
  callsign: string;
  found: string[];
  score: number;
  comboMax: number;
  longest: string;
};

export type WireMsg =
  | { t: "hello"; callsign: string; level: number }
  | { t: "need-config" }
  | { t: "config-ok" }
  | { t: "config"; seed: number; size: GridSize; duration: number; missionId?: string }
  | { t: "ready"; ready: boolean }
  | { t: "start" }
  | { t: "submit"; found: string[] }
  | { t: "forfeit" };
