import { Lock, Target } from "lucide-react";
import { CodecPanel } from "@/components/codec/CodecPanel";
import { Button } from "@/components/ui/button";
import { isMissionUnlocked, MISSIONS } from "@/lib/game/missions";

export function MissionsScreen({
  completed,
  onPlay,
  onDuel,
  onBack,
}: {
  completed: string[];
  onPlay: (id: string) => void;
  onDuel: () => void;
  onBack: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 py-8">
      <CodecPanel eyebrow="ORDINI OPERATIVI" title="MISSIONI">
        <p className="mb-4 font-mono text-xs leading-relaxed text-muted">
          Completa le operazioni in sequenza. Ogni obiettivo sblocca il successivo e rende EXP extra.
        </p>
        <ul className="space-y-4">
          {MISSIONS.map((m) => {
            const done = completed.includes(m.id);
            const open = isMissionUnlocked(m.id, completed);
            return (
              <li
                key={m.id}
                className={`border px-3 py-3 ${done ? "border-primary/70 bg-surface-2" : "border-border"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-sans text-base font-semibold uppercase tracking-[0.12em] text-fg">
                      {m.name}
                    </p>
                    <p className="mt-1 font-mono text-xs text-muted">{m.brief}</p>
                    <p className="mt-1 font-mono text-[10px] tracking-[0.16em] text-primary">
                      +{m.rewardXp} EXP · {m.duration}s · {m.size}×{m.size}
                    </p>
                  </div>
                  {done ? (
                    <span className="shrink-0 font-mono text-[10px] tracking-[0.18em] text-primary">CHIUSA</span>
                  ) : open ? (
                    <Button
                      size="sm"
                      onClick={() => (m.kind === "duel-win" ? onDuel() : onPlay(m.id))}
                    >
                      <Target className="size-3.5" />
                      {m.kind === "duel-win" ? "Duello" : "Avvia"}
                    </Button>
                  ) : (
                    <Lock className="size-4 shrink-0 text-muted" />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <Button className="mt-6 w-full" variant="outline" onClick={onBack}>
          Indietro
        </Button>
      </CodecPanel>
    </div>
  );
}
