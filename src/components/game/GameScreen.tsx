import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Lightbulb, Volume2, VolumeX } from "lucide-react";
import { sfx } from "@/lib/audio/sfx";
import { generateBoard, isAdjacentPath, pathToWord } from "@/lib/game/board";
import { hasPrefix, hasWord, isCommon, type Dictionary } from "@/lib/game/dictionary";
import { scoreWord } from "@/lib/game/scoring";
import { missionById } from "@/lib/game/missions";
import type { MatchConfig, MatchResult } from "@/lib/game/types";
import { Button } from "@/components/ui/button";
import { LetterGrid } from "./LetterGrid";

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

type Validity = "idle" | "prefix" | "valid" | "found" | "invalid";

export function GameScreen({
  config,
  dict,
  muted,
  onToggleMute,
  onAbort,
  onFinish,
}: {
  config: MatchConfig;
  dict: Dictionary;
  muted: boolean;
  onToggleMute: () => void;
  onAbort: () => void;
  onFinish: (result: MatchResult) => void;
}) {
  const [board, setBoard] = useState<{ cells: string[]; words: string[] } | null>(null);
  const [phase, setPhase] = useState<"prep" | "count" | "play" | "done">("prep");
  const [count, setCount] = useState(3);
  const [remaining, setRemaining] = useState(config.duration);
  const [path, setPath] = useState<number[]>([]);
  const [found, setFound] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [comboMax, setComboMax] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);
  const [hints, setHints] = useState(3);
  const [hintCell, setHintCell] = useState<number | null>(null);
  const [earlyCount, setEarlyCount] = useState(0);
  const [lastToast, setLastToast] = useState<string | null>(null);

  const foundRef = useRef<string[]>([]);
  const scoreRef = useRef(0);
  const comboMaxRef = useRef(0);
  const earlyRef = useRef(0);
  const finished = useRef(false);
  const lastValidAt = useRef(0);
  const playStarted = useRef(0);
  const boardRef = useRef(board);
  boardRef.current = board;
  foundRef.current = found;
  scoreRef.current = score;
  comboMaxRef.current = comboMax;
  earlyRef.current = earlyCount;

  useEffect(() => {
    const generated = generateBoard(config.seed, config.size, dict);
    setBoard({ cells: generated.cells, words: generated.words });
    setPhase("count");
  }, [config.seed, config.size, dict]);

  useEffect(() => {
    if (phase !== "count") return;
    setCount(3);
    sfx.countdown();
    const started = performance.now();
    let lastWhole = 3;
    let raf = 0;
    const loop = (now: number) => {
      const elapsed = (now - started) / 1000;
      const left = Math.max(0, 3 - elapsed);
      const n = Math.max(1, Math.ceil(left));
      if (n !== lastWhole && elapsed < 3) {
        lastWhole = n;
        sfx.countdown();
      }
      setCount(n);
      if (elapsed >= 3) {
        sfx.go();
        setPhase("play");
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const finish = useRef(() => {});
  finish.current = () => {
    if (finished.current || !boardRef.current) return;
    finished.current = true;
    setPhase("done");
    sfx.over();
    const list = foundRef.current;
    let longest = "";
    for (const w of list) {
      if (w.length > longest.length) longest = w;
    }
    onFinish({
      config,
      cells: boardRef.current.cells,
      boardWords: boardRef.current.words,
      found: list,
      score: scoreRef.current,
      comboMax: comboMaxRef.current,
      longest,
      newUnique: 0,
      commonCount: list.filter((w) => isCommon(dict, w)).length,
      wordsInFirst30: earlyRef.current,
    });
  };

  useEffect(() => {
    if (phase !== "play") return;
    playStarted.current = performance.now();
    let raf = 0;
    const origin = playStarted.current;
    const loop = (now: number) => {
      const elapsed = (now - origin) / 1000;
      const left = Math.max(0, config.duration - elapsed);
      setRemaining(left);
      if (left <= 0) {
        finish.current();
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase, config.duration]);

  const word = board ? pathToWord(board.cells, path) : "";
  const validity: Validity = useMemo(() => {
    if (!board || path.length === 0) return "idle";
    if (!isAdjacentPath(path, config.size)) return "invalid";
    if (word.length < 3) return hasPrefix(dict, word) ? "prefix" : "invalid";
    if (found.includes(word)) return "found";
    if (hasWord(dict, word)) return "valid";
    return hasPrefix(dict, word) ? "prefix" : "invalid";
  }, [board, path, word, dict, found, config.size]);

  const submitPath = () => {
    if (phase !== "play" || !board) {
      setPath([]);
      return;
    }
    if (validity === "valid") {
      const pts = scoreWord(word, dict, combo + 1);
      const now = performance.now();
      const nextCombo = now - lastValidAt.current < 2800 ? combo + 1 : 1;
      lastValidAt.current = now;
      setCombo(nextCombo);
      setComboMax((m) => Math.max(m, nextCombo));
      comboMaxRef.current = Math.max(comboMaxRef.current, nextCombo);
      setFound((list) => {
        const next = [...list, word];
        foundRef.current = next;
        return next;
      });
      setScore((s) => {
        const n = s + pts;
        scoreRef.current = n;
        return n;
      });
      if (performance.now() - playStarted.current < 30000) {
        setEarlyCount((c) => {
          const n = c + 1;
          earlyRef.current = n;
          return n;
        });
      }
      if (word.length >= 8) {
        sfx.alert();
        setFlash("!");
        window.setTimeout(() => setFlash(null), 700);
      } else if (nextCombo >= 3) {
        sfx.combo();
      } else {
        sfx.valid();
      }
      const extra = [];
      extra.push(`+${pts}`);
      if (word.length >= 7) extra.push("LUNGA");
      if (nextCombo >= 3) extra.push(`COMBO x${nextCombo}`);
      if (isCommon(dict, word)) extra.push("COMUNE");
      setLastToast(`${word.toUpperCase()}  ${extra.join(" · ")}`);
      window.setTimeout(() => setLastToast(null), 1200);
    } else if (path.length >= 3) {
      sfx.invalid();
      setCombo(0);
    }
    setPath([]);
  };

  const useHint = () => {
    if (!board || hints <= 0 || phase !== "play") return;
    const missing = board.words.find((w) => !found.includes(w) && w.length >= 5);
    if (!missing) return;
    const letters = board.cells.map((t) => (t === "Qu" ? "qu" : t.toLowerCase()));
    let acc = "";
    let idx = 0;
    for (let i = 0; i < letters.length; i += 1) {
      if (missing.startsWith(letters[i]!)) {
        acc = letters[i]!;
        idx = i;
        break;
      }
    }
    void acc;
    setHintCell(idx);
    setHints((h) => h - 1);
    sfx.tick();
  };

  if (!board || phase === "prep") {
    return (
      <div className="flex min-h-dvh items-center justify-center font-mono text-sm tracking-[0.2em] text-primary">
        CALCOLO GRIGLIA TATTICA…
      </div>
    );
  }

  const danger = remaining <= 10 && phase === "play";
  const mission = config.missionId ? missionById(config.missionId) : undefined;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 pb-6 pt-3">
      <header className="mb-3 flex items-center justify-between gap-3">
        <Button variant="ghost" size="icon" onClick={onAbort} aria-label="Abbandona">
          <ArrowLeft className="size-5" />
        </Button>
        <div className="text-center">
          <p
            className={`font-mono text-2xl tabular-nums tracking-[0.18em] ${danger ? "text-alert" : "text-primary"}`}
          >
            {phase === "play" ? formatTime(remaining) : formatTime(config.duration)}
          </p>
          <p className="font-mono text-[10px] tracking-[0.24em] text-muted">TEMPO RESIDUO</p>
        </div>
        <div className="flex items-center gap-1">
          {config.mode === "duel" ? null : (
            <Button variant="ghost" size="icon" onClick={useHint} aria-label="Hint" disabled={hints <= 0}>
              <Lightbulb className="size-5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onToggleMute} aria-label="Audio">
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </Button>
        </div>
      </header>

      {mission ? (
        <p className="mb-3 border border-primary/40 bg-surface px-3 py-2 font-mono text-[10px] leading-relaxed tracking-[0.12em] text-primary">
          {mission.name} · {mission.brief}
        </p>
      ) : null}

      <div className="mb-3 grid grid-cols-3 gap-3 font-mono text-xs tracking-[0.16em]">
        <div className="border border-border bg-surface px-3 py-2">
          <p className="text-muted">PUNTI</p>
          <p className="text-lg tabular-nums text-fg">{score}</p>
        </div>
        <div className="border border-border bg-surface px-3 py-2">
          <p className="text-muted">PAROLE</p>
          <p className="text-lg tabular-nums text-fg">{found.length}</p>
        </div>
        <div className="border border-border bg-surface px-3 py-2">
          <p className="text-muted">COMBO</p>
          <p className="text-lg tabular-nums text-fg">x{Math.max(combo, 1)}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          if (validity === "valid") submitPath();
        }}
        className="mb-4 flex min-h-11 w-full items-center justify-center border border-border bg-surface-2 px-3"
      >
        <p
          className={`font-sans text-xl font-semibold uppercase tracking-[0.18em] ${
            validity === "valid"
              ? "text-primary"
              : validity === "invalid" || validity === "found"
                ? "text-alert"
                : "text-fg"
          }`}
        >
          {word
            ? validity === "valid"
              ? `${word.toUpperCase()} · CONFERMA`
              : word.toUpperCase()
            : phase === "play"
              ? "TRACCIA O TOCCA LE LETTERE"
              : "IN POSIZIONE"}
        </p>
      </button>

      <div className="relative">
        <LetterGrid
          cells={board.cells}
          size={config.size}
          path={path}
          validity={validity}
          disabled={phase !== "play"}
          onPathChange={setPath}
          onRelease={submitPath}
        />
        {hintCell !== null && phase === "play" ? (
          <p className="mt-2 text-center font-mono text-[10px] tracking-[0.2em] text-primary">
            SEGNALE: CELLA {hintCell + 1} · HINT RESTANTI {hints}
          </p>
        ) : null}

        {phase === "count" ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-bg/70">
            <p className="font-sans text-7xl font-semibold text-primary">{count}</p>
          </div>
        ) : null}

        {flash ? (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
            <span className="alert-mark">!</span>
          </div>
        ) : null}
      </div>

      {lastToast ? (
        <p className="mt-3 text-center font-mono text-xs tracking-[0.18em] text-primary">{lastToast}</p>
      ) : (
        <p className="mt-3 text-center font-mono text-xs tracking-[0.18em] text-muted">
          {config.mode === "duel"
            ? "DUELLO · PAROLE OCCULTE FINO AL DEBRIEF"
            : `POSSIBILI ${board.words.length} PAROLE`}
        </p>
      )}

      <div className="mt-3 flex max-h-28 flex-wrap gap-1.5 overflow-auto">
        {found
          .slice()
          .reverse()
          .map((w) => (
            <span
              key={w}
              className="border border-border bg-surface px-2 py-1 font-mono text-xs uppercase tracking-[0.14em] text-fg"
            >
              {w}
            </span>
          ))}
      </div>
    </div>
  );
}
