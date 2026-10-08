import { Trophy } from "lucide-react";
import type { Dictionary } from "@/lib/game/dictionary";
import { missionById } from "@/lib/game/missions";
import { duelScores } from "@/lib/game/scoring";
import type { DuelReport, MatchResult } from "@/lib/game/types";
import type { AchievementDef } from "@/lib/player/profile";
import { Button } from "@/components/ui/button";
import { CodecPanel } from "@/components/codec/CodecPanel";

function WordCol({ title, words, accent }: { title: string; words: string[]; accent?: boolean }) {
  return (
    <div>
      <p className={`mb-2 font-mono text-[10px] tracking-[0.22em] ${accent ? "text-primary" : "text-muted"}`}>
        {title} · {words.length}
      </p>
      <ul className="flex max-h-40 flex-col gap-1 overflow-auto">
        {words.length === 0 ? (
          <li className="font-mono text-xs text-muted">—</li>
        ) : (
          words.map((w) => (
            <li key={w} className="font-mono text-xs uppercase tracking-[0.12em] text-fg">
              {w}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

export function ResultsScreen({
  result,
  dict,
  opponent,
  youName,
  xpGain,
  unlocked,
  leveled,
  rankName,
  onAgain,
  onMenu,
}: {
  result: MatchResult;
  dict: Dictionary;
  opponent: DuelReport | null;
  youName: string;
  xpGain: number;
  unlocked: AchievementDef[];
  leveled: boolean;
  rankName: string;
  onAgain: () => void;
  onMenu: () => void;
}) {
  const duel = opponent
    ? duelScores(result.found, opponent.found, dict)
    : null;
  const youTotal = duel?.youTotal ?? result.score;
  const themTotal = duel?.themTotal ?? 0;
  const verdict =
    !duel ? null : youTotal > themTotal ? "VITTORIA" : youTotal < themTotal ? "SCONFITTA" : "PAREGGIO";
  const coverage =
    result.boardWords.length === 0
      ? 0
      : Math.round((result.found.length / result.boardWords.length) * 100);
  const mission = result.config.missionId ? missionById(result.config.missionId) : undefined;
  const reportTitle =
    verdict ??
    (result.config.mode === "daily"
      ? "ORDINE DEL GIORNO"
      : result.config.mode === "mission"
        ? "RAPPORTO ORDINE"
        : "RAPPORTO SOLO");

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-4 px-4 py-6">
      <CodecPanel eyebrow="DEBRIEFING MISSIONE" title={reportTitle}>
        {verdict ? (
          <p
            className={`mb-4 font-sans text-4xl font-semibold tracking-[0.12em] ${
              verdict === "VITTORIA" ? "text-primary" : verdict === "SCONFITTA" ? "text-alert" : "text-fg"
            }`}
          >
            {verdict}
          </p>
        ) : null}

        {mission ? (
          <p
            className={`mb-4 border px-3 py-2 font-mono text-xs tracking-[0.14em] ${
              result.missionSuccess
                ? "border-primary bg-surface-2 text-primary"
                : "border-border text-muted"
            }`}
          >
            {mission.name} · {result.missionSuccess ? "ORDINE COMPLETATO" : "ORDINE NON COMPLETATO"}
          </p>
        ) : null}

        {duel ? (
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="border border-primary bg-surface-2 p-3">
              <p className="font-mono text-[10px] tracking-[0.2em] text-primary">{youName}</p>
              <p className="font-sans text-3xl font-semibold tabular-nums text-fg">{youTotal}</p>
              <p className="font-mono text-xs text-muted">
                {result.found.length} parole · max {result.longest || "—"}
              </p>
            </div>
            <div className="border border-border bg-surface-2 p-3">
              <p className="font-mono text-[10px] tracking-[0.2em] text-muted">{opponent!.callsign}</p>
              <p className="font-sans text-3xl font-semibold tabular-nums text-fg">{themTotal}</p>
              <p className="font-mono text-xs text-muted">
                {opponent!.found.length} parole · max {opponent!.longest || "—"}
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-4 grid grid-cols-3 gap-2 font-mono text-xs">
            <div className="border border-border bg-surface-2 p-3">
              <p className="text-muted">PUNTI</p>
              <p className="text-2xl tabular-nums text-fg">{result.score}</p>
            </div>
            <div className="border border-border bg-surface-2 p-3">
              <p className="text-muted">PAROLE</p>
              <p className="text-2xl tabular-nums text-fg">{result.found.length}</p>
            </div>
            <div className="border border-border bg-surface-2 p-3">
              <p className="text-muted">COPERTURA</p>
              <p className="text-2xl tabular-nums text-fg">{coverage}%</p>
            </div>
          </div>
        )}

        <div className="mb-4 flex flex-wrap gap-3 font-mono text-xs tracking-[0.14em] text-muted">
          <span>Lunga: {result.longest ? result.longest.toUpperCase() : "—"}</span>
          <span>Combo max: x{result.comboMax || 1}</span>
          <span>Comuni: {result.commonCount}</span>
          <span>Griglia: {result.boardWords.length} voci</span>
        </div>

        <div className="mb-4 border border-border bg-bg p-3">
          <p className="mb-1 flex items-center gap-2 font-mono text-xs tracking-[0.2em] text-primary">
            <Trophy className="size-3.5" /> EXP +{xpGain} · GRADO {rankName}
          </p>
          {leveled ? <p className="font-sans text-lg font-semibold text-primary">PROMOZIONE DI GRADO</p> : null}
          {unlocked.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {unlocked.map((a) => (
                <li key={a.id} className="font-mono text-xs text-fg">
                  PREMIO · {a.name}
                </li>
              ))}
            </ul>
          ) : (
            <p className="font-mono text-xs text-muted">Nessun nuovo sigillo in questa missione.</p>
          )}
        </div>

        {duel ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <WordCol title="SOLO TUE" words={duel.youUnique} accent />
            <WordCol title="CONDIVISE" words={duel.shared} />
            <WordCol title="SOLO AVVERSARIO" words={duel.themUnique} />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <WordCol title="TROVATE" words={result.found} accent />
            <WordCol
              title="MANCATE (TOP)"
              words={result.boardWords.filter((w) => !result.found.includes(w)).slice(0, 24)}
            />
          </div>
        )}
      </CodecPanel>

      <div className="flex flex-col gap-4 sm:flex-row">
        <Button className="flex-1" onClick={onAgain}>
          {result.config.mode === "duel" ? "Nuova sessione" : "Ancora"}
        </Button>
        <Button className="flex-1" variant="outline" onClick={onMenu}>
          Quartier generale
        </Button>
      </div>
    </div>
  );
}
