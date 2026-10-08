import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, Radio, Unplug } from "lucide-react";
import { useP2PRoom } from "@/lib/multiplayer";
import { hasWord } from "@/lib/game/dictionary";
import type { Dictionary } from "@/lib/game/dictionary";
import { tallyWords } from "@/lib/game/scoring";
import type { DuelReport, GridSize, MatchConfig, MatchResult, WireMsg } from "@/lib/game/types";
import { Button } from "@/components/ui/button";
import { CodecPanel } from "@/components/codec/CodecPanel";
import { GameScreen } from "./GameScreen";

function parseMsg(data: unknown): WireMsg | null {
  if (!data || typeof data !== "object" || !("t" in data)) return null;
  const t = (data as { t: unknown }).t;
  if (typeof t !== "string") return null;
  return data as WireMsg;
}

export function DuelFlow({
  role,
  code,
  callsign,
  level,
  hostConfig,
  dict,
  muted,
  onToggleMute,
  onExit,
  onComplete,
}: {
  role: "host" | "guest";
  code: string;
  callsign: string;
  level: number;
  hostConfig: { seed: number; size: GridSize; duration: number; missionId?: string };
  dict: Dictionary;
  muted: boolean;
  onToggleMute: () => void;
  onExit: () => void;
  onComplete: (result: MatchResult, opponent: DuelReport) => void;
}) {
  const room = `lx${code}`;
  const p2p = useP2PRoom({ room, name: callsign });
  const [remoteName, setRemoteName] = useState("AVVERSARIO");
  const [remoteReady, setRemoteReady] = useState(false);
  const [selfReady, setSelfReady] = useState(false);
  const [config, setConfig] = useState<{
    seed: number;
    size: GridSize;
    duration: number;
    missionId?: string;
  } | null>(role === "host" ? hostConfig : null);
  const [playing, setPlaying] = useState(false);
  const [waitingReport, setWaitingReport] = useState(false);
  const [fail, setFail] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [acked, setAcked] = useState(role === "host");

  const localResult = useRef<MatchResult | null>(null);
  const remoteFound = useRef<string[] | null>(null);
  const started = useRef(false);
  const completed = useRef(false);
  const remoteNameRef = useRef(remoteName);
  remoteNameRef.current = remoteName;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const hostConfigRef = useRef(hostConfig);
  hostConfigRef.current = hostConfig;
  const configRef = useRef(config);
  configRef.current = config;

  const tryComplete = () => {
    if (completed.current) return;
    const mine = localResult.current;
    const theirs = remoteFound.current;
    if (!mine || !theirs) return;
    const valid = theirs.filter((w) => mine.boardWords.includes(w) && hasWord(dict, w));
    const t = tallyWords(valid, dict);
    completed.current = true;
    onCompleteRef.current(mine, {
      callsign: remoteNameRef.current,
      found: valid,
      score: t.score,
      comboMax: 0,
      longest: t.longest,
    });
  };

  const peer = p2p.peers.find((p) => p.connectionState === "connected") ?? p2p.peers[0];
  const linked = peer?.connectionState === "connected";
  const linking =
    p2p.joined && peer && peer.connectionState !== "connected" && peer.connectionState !== "failed";

  useEffect(() => {
    return p2p.onMessage((_from, data) => {
      const msg = parseMsg(data);
      if (!msg) return;
      if (msg.t === "hello") {
        setRemoteName(msg.callsign || "AVVERSARIO");
        if (role === "host") p2p.send({ t: "config", ...hostConfigRef.current });
      }
      if (msg.t === "need-config" && role === "host") {
        p2p.send({ t: "config", ...hostConfigRef.current });
      }
      if (msg.t === "config-ok" && role === "host") setAcked(true);
      if (msg.t === "config" && role === "guest") {
        if ((msg.size === 4 || msg.size === 5) && msg.duration >= 60) {
          setConfig({
            seed: msg.seed,
            size: msg.size,
            duration: msg.duration,
            missionId: msg.missionId ?? hostConfigRef.current.missionId,
          });
          p2p.send({ t: "config-ok" });
        }
      }
      if (msg.t === "ready") setRemoteReady(Boolean(msg.ready));
      if (msg.t === "start") {
        started.current = true;
        setPlaying(true);
      }
      if (msg.t === "submit") {
        remoteFound.current = Array.isArray(msg.found)
          ? msg.found.filter((w): w is string => typeof w === "string")
          : [];
        tryComplete();
      }
      if (msg.t === "forfeit") {
        setFail("L'avversario ha abbandonato la sessione.");
      }
    });
  }, [p2p, role, dict]);

  useEffect(() => {
    if (!linked) return;
    p2p.send({ t: "hello", callsign, level });
    const handshakeDone = role === "host" ? acked : Boolean(config);
    if (handshakeDone) return;
    const id = window.setInterval(() => {
      p2p.send({ t: "hello", callsign, level });
      if (role === "host") p2p.send({ t: "config", ...hostConfigRef.current });
      if (role === "guest") p2p.send({ t: "need-config" });
    }, 700);
    return () => window.clearInterval(id);
  }, [linked, p2p, callsign, level, role, acked, config]);

  useEffect(() => {
    if (peer?.connectionState === "failed") {
      setFail("Collegamento diretto non riuscito. Restate sulla stessa rete Wi-Fi e riprovate.");
    }
  }, [peer?.connectionState]);

  useEffect(() => {
    if (role !== "host" || !selfReady || !remoteReady) return;
    started.current = true;
    p2p.send({ t: "start" });
    setPlaying(true);
    const tick = window.setInterval(() => p2p.send({ t: "start" }), 400);
    const stop = window.setTimeout(() => window.clearInterval(tick), 4000);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(stop);
    };
  }, [role, selfReady, remoteReady, p2p]);

  useEffect(() => {
    if (!waitingReport) return;
    const id = window.setTimeout(() => {
      if (!remoteFound.current) remoteFound.current = [];
      tryComplete();
    }, 25000);
    return () => window.clearTimeout(id);
  }, [waitingReport]);

  const matchConfig: MatchConfig | null = useMemo(() => {
    if (!config) return null;
    return {
      ...config,
      mode: "duel",
      missionId: config.missionId ?? hostConfig.missionId,
    };
  }, [config, hostConfig.missionId]);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  const toggleReady = () => {
    const next = !selfReady;
    setSelfReady(next);
    p2p.send({ t: "ready", ready: next });
  };

  if (fail) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 px-4">
        <CodecPanel eyebrow="LINEA INTERROTTA" title="NESSUN COLLEGAMENTO">
          <p className="mb-4 font-mono text-sm text-muted">{fail}</p>
          <Button onClick={onExit}>Torna al quartier generale</Button>
        </CodecPanel>
      </div>
    );
  }

  if (playing && matchConfig) {
    if (waitingReport) {
      return (
        <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 px-4">
          <CodecPanel eyebrow="TRASMISSIONE" title="IN ATTESA DEL RAPPORTO">
            <p className="font-mono text-sm text-muted">
              Missione locale chiusa. In attesa dei dati di {remoteName}.
            </p>
          </CodecPanel>
        </div>
      );
    }
    return (
      <GameScreen
        config={matchConfig}
        dict={dict}
        muted={muted}
        onToggleMute={onToggleMute}
        onAbort={() => {
          p2p.send({ t: "forfeit" });
          onExit();
        }}
        onFinish={(res) => {
          localResult.current = res;
          p2p.send({ t: "submit", found: res.found });
          setWaitingReport(true);
          tryComplete();
        }}
      />
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-4 px-4 py-8">
      <CodecPanel eyebrow="CANALE CRITTOGRAFATO" title="SESSIONE 1 VS 1">
        <div className="mb-4 flex items-center justify-between border border-border bg-bg px-3 py-3">
          <div>
            <p className="font-mono text-[10px] tracking-[0.22em] text-muted">PASSWORD</p>
            <p className="font-sans text-3xl font-semibold tracking-[0.18em] text-primary">{code}</p>
          </div>
          <Button variant="outline" size="icon" onClick={() => void copyCode()} aria-label="Copia">
            <Copy className="size-4" />
          </Button>
        </div>
        {copied ? <p className="mb-3 font-mono text-xs text-primary">Password copiata.</p> : null}

        <ul className="mb-4 space-y-2 font-mono text-xs tracking-[0.12em] text-muted">
          <li className="flex items-center gap-2">
            <Radio className="size-3.5 text-primary" />
            {p2p.joined ? "Radio in ascolto" : "Sintonizzazione…"}
          </li>
          <li className="flex items-center gap-2">
            {linked ? (
              <Radio className="size-3.5 text-primary" />
            ) : (
              <Unplug className="size-3.5 text-muted" />
            )}
            {linked
              ? `Collegato a ${remoteName}${peer?.candidateType === "host" ? " · rete locale" : ""}`
              : linking
                ? "Handshake in corso…"
                : role === "host"
                  ? "In attesa dell'operatore 2"
                  : "Ricerca host…"}
          </li>
          {peer?.rttMs != null ? <li>Latenza {Math.round(peer.rttMs)} ms</li> : null}
          {config ? (
            <li>
              Griglia {config.size}×{config.size} · {config.duration}s
            </li>
          ) : (
            <li>In attesa dei parametri di missione…</li>
          )}
        </ul>

        <div className="mb-4 grid grid-cols-2 gap-4">
          <div className={`border p-3 ${selfReady ? "border-primary" : "border-border"}`}>
            <p className="font-mono text-[10px] text-muted">{callsign}</p>
            <p className="font-sans text-lg font-semibold">{selfReady ? "PRONTO" : "STANDBY"}</p>
          </div>
          <div className={`border p-3 ${remoteReady ? "border-primary" : "border-border"}`}>
            <p className="font-mono text-[10px] text-muted">{remoteName}</p>
            <p className="font-sans text-lg font-semibold">{remoteReady ? "PRONTO" : "STANDBY"}</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Button onClick={toggleReady} disabled={!linked || !config}>
            {selfReady ? "Annulla pronto" : "In posizione"}
          </Button>
          <Button variant="outline" onClick={onExit}>
            Annulla sessione
          </Button>
        </div>
      </CodecPanel>
    </div>
  );
}
