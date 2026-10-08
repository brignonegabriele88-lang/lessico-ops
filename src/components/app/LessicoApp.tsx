import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Crosshair,
  Flag,
  Radio,
  Swords,
  User,
  Volume2,
  VolumeX,
} from "lucide-react";
import { SignInGate, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { setMuted, sfx, unlockAudio } from "@/lib/audio/sfx";
import { CodecFrame, CodecPanel } from "@/components/codec/CodecPanel";
import { DuelFlow } from "@/components/game/DuelFlow";
import { GameScreen } from "@/components/game/GameScreen";
import { MissionsScreen } from "@/components/game/MissionsScreen";
import { ResultsScreen } from "@/components/game/ResultsScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { loadDictionary, type Dictionary } from "@/lib/game/dictionary";
import { evaluateMission, missionById } from "@/lib/game/missions";
import { dailySeed, randomSeed } from "@/lib/game/rng";
import { duelScores } from "@/lib/game/scoring";
import type { DuelReport, GridSize, MatchConfig, MatchResult, Screen } from "@/lib/game/types";
import { loadCloudProfile, saveCloudProfile } from "@/lib/player/cloud";
import {
  ACHIEVEMENTS,
  GRID5_LEVEL,
  applyMatch,
  loadProfile,
  migrate,
  nextRank,
  rankForXp,
  saveProfile,
  type AchievementDef,
  type Profile,
} from "@/lib/player/profile";

function makeCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

function clampDuration(n: number): number {
  const stepped = Math.round(n / 60) * 60;
  return Math.min(600, Math.max(60, stepped));
}

export function LessicoApp() {
  const { user, isPending } = useCurrentUserState();
  const [screen, setScreen] = useState<Screen>("boot");
  const [bootPct, setBootPct] = useState(8);
  const [dict, setDict] = useState<Dictionary | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile>(() => loadProfile());
  const [callsign, setCallsign] = useState(profile.callsign);
  const [duration, setDuration] = useState(120);
  const [size, setSize] = useState<GridSize>(4);
  const [config, setConfig] = useState<MatchConfig | null>(null);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [opponent, setOpponent] = useState<DuelReport | null>(null);
  const [duel, setDuel] = useState<{ role: "host" | "guest"; code: string } | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [activeMissionId, setActiveMissionId] = useState<string | undefined>();
  const [xpGain, setXpGain] = useState(0);
  const [unlocked, setUnlocked] = useState<AchievementDef[]>([]);
  const [leveled, setLeveled] = useState(false);
  const syncedUser = useRef<string | null>(null);

  const rank = rankForXp(profile.xp);
  const upcoming = nextRank(profile.xp);
  const canGrid5 = rank.level >= GRID5_LEVEL;
  const profileRef = useRef(profile);
  profileRef.current = profile;

  useEffect(() => {
    setMuted(profile.muted);
  }, [profile.muted]);

  useEffect(() => {
    let alive = true;
    const origin = performance.now();
    let raf = 0;
    const pulse = (now: number) => {
      const t = Math.min(1, (now - origin) / 1400);
      if (alive) setBootPct(Math.round(8 + t * 62));
      if (t < 1) raf = requestAnimationFrame(pulse);
    };
    raf = requestAnimationFrame(pulse);
    loadDictionary()
      .then((d) => {
        if (!alive) return;
        setDict(d);
        setBootPct(100);
        window.setTimeout(() => {
          if (alive) setScreen("menu");
        }, 380);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setBootError(err instanceof Error ? err.message : "Errore dizionario");
      });
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    if (isPending) return;
    if (!user) {
      syncedUser.current = null;
      return;
    }
    if (syncedUser.current === user.id) return;
    syncedUser.current = user.id;
    void loadCloudProfile()
      .then((payload) => {
        if (payload) {
          const cloud = migrate(payload);
          setProfile(cloud);
          saveProfile(cloud);
          setCallsign(cloud.callsign);
        } else {
          void saveCloudProfile({ data: profileRef.current }).catch(() => undefined);
        }
      })
      .catch(() => undefined);
  }, [user, isPending]);

  const persist = (next: Profile) => {
    setProfile(next);
    saveProfile(next);
    if (user) void saveCloudProfile({ data: next }).catch(() => undefined);
  };

  const commitResult = (match: MatchResult, foe: DuelReport | null) => {
    const duelTally = foe ? duelScores(match.found, foe.found, dict!) : null;
    const score = duelTally?.youTotal ?? match.score;
    const won =
      match.config.mode === "duel" && duelTally
        ? duelTally.youTotal === duelTally.themTotal
          ? null
          : duelTally.youTotal > duelTally.themTotal
        : null;
    const distinctStarts = new Set(match.found.map((w) => w[0])).size;
    const mission = match.config.missionId ? missionById(match.config.missionId) : undefined;
    const scored: MatchResult = { ...match, score };
    const missionSuccess = mission
      ? evaluateMission(mission, scored, { won, distinctStarts })
      : false;
    const scoredMatch: MatchResult = { ...scored, missionSuccess };
    const applied = applyMatch(profile, {
      mode: match.config.mode,
      score,
      found: match.found,
      longest: match.longest,
      comboMax: match.comboMax,
      commonCount: match.commonCount,
      boardLongest: match.boardWords[0] ?? "",
      won,
      wordsInFirst30: match.wordsInFirst30,
      distinctStarts,
      missionId: match.config.missionId,
      missionSuccess,
      missionXp: missionSuccess ? mission?.rewardXp : 0,
    });
    persist(applied.profile);
    setXpGain(applied.xpGain);
    setUnlocked(applied.unlocked);
    setLeveled(applied.leveled);
    setResult(scoredMatch);
    setOpponent(foe);
    setScreen("results");
  };

  const startSolo = (mode: "solo" | "daily") => {
    unlockAudio();
    sfx.codec();
    const nextSize: GridSize = mode === "daily" ? 4 : size;
    setConfig({
      seed: mode === "daily" ? dailySeed() : randomSeed(),
      size: nextSize,
      duration,
      mode,
    });
    setOpponent(null);
    setScreen("play");
  };

  const startMission = (id: string) => {
    const mission = missionById(id);
    if (!mission) return;
    unlockAudio();
    sfx.codec();
    setConfig({
      seed: randomSeed(),
      size: mission.size,
      duration: mission.duration,
      mode: "mission",
      missionId: mission.id,
    });
    setOpponent(null);
    setScreen("play");
  };

  const saveCallsign = () => {
    const name = callsign.trim().slice(0, 16) || "RECLUTA";
    setCallsign(name);
    persist({ ...profile, callsign: name });
  };

  const xpPct = useMemo(() => {
    if (!upcoming) return 100;
    const span = upcoming.xp - rank.xp;
    return Math.min(100, Math.round(((profile.xp - rank.xp) / span) * 100));
  }, [profile.xp, rank.xp, upcoming]);

  const inner = (() => {
    if (screen === "boot") {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center px-6">
          <p className="font-mono text-xs tracking-[0.28em] text-primary">FREQ 32.82 · STABILIMENTO LINEA</p>
          <h1 className="mt-3 font-sans text-5xl font-semibold tracking-[0.16em] text-fg sm:text-6xl">
            LESSICO OPS
          </h1>
          <p className="mt-2 font-mono text-xs tracking-[0.18em] text-muted">OPERAZIONE TATTICA DI PAROLE</p>
          <div className="mt-8 h-1.5 w-full max-w-xs bg-surface-2">
            <div className="h-full bg-primary" style={{ width: `${bootPct}%` }} />
          </div>
          <p className="mt-3 font-mono text-xs tracking-[0.16em] text-muted">
            {bootError ?? `DECODIFICA LESSICO ${bootPct}%`}
          </p>
          {bootError ? (
            <Button className="mt-4" onClick={() => window.location.reload()}>
              Riprova
            </Button>
          ) : null}
        </div>
      );
    }

    if (!dict) return null;

    if (screen === "play" && config) {
      return (
        <GameScreen
          config={config}
          dict={dict}
          muted={profile.muted}
          onToggleMute={() => persist({ ...profile, muted: !profile.muted })}
          onAbort={() => setScreen(config.mode === "mission" ? "missions" : "menu")}
          onFinish={(match) => commitResult(match, null)}
        />
      );
    }

    if (screen === "lobby" && duel) {
      return (
        <DuelFlow
          key={duel.code}
          role={duel.role}
          code={duel.code}
          callsign={profile.callsign}
          level={rank.level}
          hostConfig={{
            seed: config?.seed ?? 0,
            size: config?.size ?? size,
            duration: config?.duration ?? duration,
            missionId: config?.missionId,
          }}
          dict={dict}
          muted={profile.muted}
          onToggleMute={() => persist({ ...profile, muted: !profile.muted })}
          onExit={() => {
            setDuel(null);
            setScreen("menu");
          }}
          onComplete={(match, foe) => commitResult(match, foe)}
        />
      );
    }

    if (screen === "results" && result) {
      return (
        <ResultsScreen
          result={result}
          dict={dict}
          opponent={opponent}
          youName={profile.callsign}
          xpGain={xpGain}
          unlocked={unlocked}
          leveled={leveled}
          rankName={rankForXp(profile.xp).name}
          onAgain={() => {
            if (result.config.mode === "duel") setScreen("setup-duel");
            else if (result.config.mode === "daily") startSolo("daily");
            else if (result.config.mode === "mission") setScreen("missions");
            else startSolo("solo");
          }}
          onMenu={() => {
            setActiveMissionId(undefined);
            setScreen("menu");
          }}
        />
      );
    }

    if (screen === "missions") {
      return (
        <MissionsScreen
          completed={profile.missionsCompleted}
          onPlay={startMission}
          onDuel={() => {
            setActiveMissionId("m8");
            setScreen("setup-duel");
          }}
          onBack={() => setScreen("menu")}
        />
      );
    }

    if (screen === "briefing") {
      return (
        <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-8">
          <CodecPanel eyebrow="MANUALE OPERATIVO" title="BRIEFING">
            <div className="space-y-4 font-mono text-sm leading-relaxed text-fg">
              <p>
                Traccia percorsi tra lettere adiacenti, anche in diagonale. Ogni cella una sola volta.
                Minimo tre lettere. Il dizionario italiano conta oltre {dict.size.toLocaleString("it-IT")} voci,
                incluse le forme flesse.
              </p>
              <p>
                Punteggio: 3 lettere = 1 · 4 = 2 · 5 = 4 · 6 = 7 · 7 = 12 · 8+ = 18 e oltre. Premi extra per
                parole lunghe, combo, termini comuni e — in duello — parole che l'avversario non ha visto.
              </p>
              <p>
                Duello 1 vs 1: crea una password di sessione, l'altro operatore la inserisce. Su Wi-Fi
                locale il canale è diretto. A fine tempo si apre il confronto per la vittoria.
              </p>
              <p>
                Le missioni operative sbloccano obiettivi e EXP extra. Accedi per salvare il dossier sul tuo
                nominativo.
              </p>
            </div>
            <Button className="mt-6 w-full" onClick={() => setScreen("menu")}>
              Ricevuto
            </Button>
          </CodecPanel>
        </div>
      );
    }

    if (screen === "dossier") {
      return (
        <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 py-8">
          <CodecPanel eyebrow="DOSSIER OPERATORE" title={profile.callsign}>
            <p className="font-mono text-xs tracking-[0.2em] text-primary">
              GRADO {rank.level} · {rank.name}
            </p>
            <div className="mt-2 h-1.5 bg-surface-2">
              <div className="h-full bg-primary" style={{ width: `${xpPct}%` }} />
            </div>
            <p className="mt-1 font-mono text-xs text-muted">
              EXP {profile.xp}
              {upcoming ? ` · prossimo ${upcoming.name} a ${upcoming.xp}` : " · grado massimo"}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 font-mono text-xs">
              <Stat label="Missioni" value={profile.games} />
              <Stat label="Ordini chiusi" value={profile.missionsCompleted.length} />
              <Stat label="Parole uniche" value={profile.uniqueWords.length} />
              <Stat label="Miglior punteggio" value={profile.bestScore} />
              <Stat label="Parola record" value={profile.longestWord ? profile.longestWord.toUpperCase() : "—"} />
              <Stat label="Vittorie" value={profile.wins} />
            </div>
            <ul className="mt-5 space-y-2">
              {ACHIEVEMENTS.map((a) => {
                const on = profile.achievements.includes(a.id);
                return (
                  <li
                    key={a.id}
                    className={`border px-3 py-2 ${on ? "border-primary/60 bg-surface-2" : "border-border opacity-50"}`}
                  >
                    <p className="font-sans text-sm font-semibold uppercase tracking-[0.12em]">{a.name}</p>
                    <p className="font-mono text-xs text-muted">{a.detail}</p>
                  </li>
                );
              })}
            </ul>
            <Button className="mt-6 w-full" variant="outline" onClick={() => setScreen("menu")}>
              Chiudi dossier
            </Button>
          </CodecPanel>
        </div>
      );
    }

    if (screen === "setup-solo") {
      return (
        <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-8">
          <CodecPanel eyebrow="MISSIONE SINGOLA" title="PARAMETRI">
            <TimerSize
              duration={duration}
              size={size}
              canGrid5={canGrid5}
              onDuration={setDuration}
              onSize={setSize}
            />
            <div className="mt-6 flex flex-col gap-4">
              <Button onClick={() => startSolo("solo")}>Avvia infiltrazione</Button>
              <Button variant="outline" onClick={() => startSolo("daily")}>
                Ordine del giorno
              </Button>
              <Button variant="ghost" onClick={() => setScreen("menu")}>
                Indietro
              </Button>
            </div>
          </CodecPanel>
        </div>
      );
    }

    if (screen === "setup-duel") {
      return (
        <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-8">
          <CodecPanel eyebrow="DUELLO 1 VS 1" title="SESSIONE CONDIVISA">
            <TimerSize
              duration={duration}
              size={size}
              canGrid5={canGrid5}
              onDuration={setDuration}
              onSize={setSize}
            />
            <p className="mt-4 font-mono text-xs leading-relaxed text-muted">
              Crea una password e comunicala all'altro operatore, oppure unisciti a una sessione già
              aperta. Il confronto si apre a fine tempo.
            </p>
            <div className="mt-5 flex flex-col gap-4">
              <Button
                onClick={() => {
                  unlockAudio();
                  sfx.codec();
                  const code = makeCode();
                  setConfig({
                    seed: randomSeed(),
                    size,
                    duration,
                    mode: "duel",
                    missionId: activeMissionId,
                  });
                  setDuel({ role: "host", code });
                  setScreen("lobby");
                }}
              >
                Crea sessione
              </Button>
              <div className="flex gap-4">
                <Input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
                  placeholder="PASSWORD"
                  className="tracking-[0.2em]"
                  aria-label="Password sessione"
                />
                <Button
                  variant="outline"
                  disabled={joinCode.length < 4}
                  onClick={() => {
                    unlockAudio();
                    sfx.codec();
                    setConfig({
                      seed: 0,
                      size,
                      duration,
                      mode: "duel",
                      missionId: activeMissionId,
                    });
                    setDuel({ role: "guest", code: joinCode });
                    setScreen("lobby");
                  }}
                >
                  Entra
                </Button>
              </div>
              <Button variant="ghost" onClick={() => setScreen("menu")}>
                Indietro
              </Button>
            </div>
          </CodecPanel>
        </div>
      );
    }

    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-8">
        <AuthSlot isPending={isPending} />
        <p className="mt-5 font-mono text-xs tracking-[0.28em] text-primary">FREQ 32.82 · IN ASCOLTO</p>
        <h1 className="mt-2 font-sans text-5xl font-semibold tracking-[0.14em] text-fg">LESSICO OPS</h1>
        <p className="mt-1 font-mono text-xs tracking-[0.16em] text-muted">
          {rank.name} · EXP {profile.xp} · {dict.size.toLocaleString("it-IT")} VOCI
        </p>

        <label className="mt-6 block font-mono text-[10px] tracking-[0.22em] text-muted" htmlFor="callsign">
          NOMINATIVO
        </label>
        <div className="mt-1 flex gap-4">
          <Input
            id="callsign"
            value={callsign}
            onChange={(e) => setCallsign(e.target.value.toUpperCase().slice(0, 16))}
            onBlur={saveCallsign}
            maxLength={16}
          />
          <Button variant="outline" onClick={saveCallsign}>
            OK
          </Button>
        </div>

        <div className="mt-7 flex flex-col gap-4">
          <Button className="justify-start" onClick={() => setScreen("missions")}>
            <Flag className="size-4" /> Missioni
          </Button>
          <Button className="justify-start" variant="outline" onClick={() => setScreen("setup-solo")}>
            <Crosshair className="size-4" /> Infiltrazione libera
          </Button>
          <Button
            className="justify-start"
            variant="outline"
            onClick={() => {
              setActiveMissionId(undefined);
              setScreen("setup-duel");
            }}
          >
            <Swords className="size-4" /> Duello 1 vs 1
          </Button>
          <Button variant="outline" className="justify-start" onClick={() => setScreen("dossier")}>
            <User className="size-4" /> Dossier
          </Button>
          <Button variant="outline" className="justify-start" onClick={() => setScreen("briefing")}>
            <BookOpen className="size-4" /> Briefing
          </Button>
        </div>

        <div className="mt-6 flex items-center justify-between">
          <p className="flex items-center gap-2 font-mono text-[10px] tracking-[0.18em] text-muted">
            <Radio className="size-3.5 text-primary" /> RADIO TATTICA
          </p>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Audio"
            onClick={() => {
              unlockAudio();
              persist({ ...profile, muted: !profile.muted });
            }}
          >
            {profile.muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </Button>
        </div>
      </div>
    );
  })();

  return <CodecFrame>{inner}</CodecFrame>;
}

function AuthSlot({ isPending }: { isPending: boolean }) {
  if (isPending) {
    return <div className="h-10 w-full animate-pulse border border-border bg-surface-2" />;
  }
  return (
    <div className="border border-border bg-surface px-3 py-3">
      <SignInGate
        fallback={
          <Link
            to="/login"
            className="font-mono text-xs tracking-[0.16em] text-primary hover:text-paper"
          >
            ACCEDI PER SALVARE IL DOSSIER
          </Link>
        }
      >
        <div className="[&_button]:font-mono [&_button]:text-xs [&_span]:font-mono [&_span]:text-xs">
          <UserButton />
        </div>
      </SignInGate>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-border bg-surface-2 p-3">
      <p className="text-muted">{label}</p>
      <p className="truncate text-lg text-fg">{value}</p>
    </div>
  );
}

function TimerSize({
  duration,
  size,
  canGrid5,
  onDuration,
  onSize,
}: {
  duration: number;
  size: GridSize;
  canGrid5: boolean;
  onDuration: (n: number) => void;
  onSize: (s: GridSize) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="font-mono text-[10px] tracking-[0.22em] text-muted">TEMPO · SCAGLIONI 60s</p>
        <div className="mt-2 flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            aria-label="Riduci tempo"
            onClick={() => onDuration(clampDuration(duration - 60))}
          >
            <ChevronDown className="size-4" />
          </Button>
          <p className="flex-1 text-center font-sans text-3xl font-semibold tabular-nums tracking-[0.12em]">
            {duration}s
          </p>
          <Button
            variant="outline"
            size="icon"
            aria-label="Aumenta tempo"
            onClick={() => onDuration(clampDuration(duration + 60))}
          >
            <ChevronUp className="size-4" />
          </Button>
        </div>
      </div>
      <div>
        <p className="font-mono text-[10px] tracking-[0.22em] text-muted">GRIGLIA</p>
        <div className="mt-2 grid grid-cols-2 gap-4">
          <Button variant={size === 4 ? "default" : "outline"} onClick={() => onSize(4)}>
            4 × 4
          </Button>
          <Button
            variant={size === 5 ? "default" : "outline"}
            disabled={!canGrid5}
            onClick={() => canGrid5 && onSize(5)}
          >
            5 × 5{canGrid5 ? "" : " · LV3"}
          </Button>
        </div>
      </div>
    </div>
  );
}
