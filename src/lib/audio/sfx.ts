let ctx: AudioContext | null = null;
let muted = false;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    ctx ??= new AudioContext();
    return ctx;
  } catch {
    return null;
  }
}

export function setMuted(value: boolean) {
  muted = value;
}

export function unlockAudio() {
  const ac = getCtx();
  if (ac && ac.state === "suspended") void ac.resume();
}

function tone(
  freq: number,
  duration: number,
  type: OscillatorType,
  gain: number,
  delay = 0,
) {
  const ac = getCtx();
  if (!ac || muted) return;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

export const sfx = {
  codec() {
    tone(420, 0.09, "square", 0.04, 0);
    tone(640, 0.14, "square", 0.045, 0.1);
  },
  tick() {
    tone(196, 0.04, "square", 0.03);
  },
  valid() {
    tone(520, 0.07, "square", 0.045);
    tone(780, 0.09, "square", 0.04, 0.06);
  },
  invalid() {
    tone(140, 0.16, "sawtooth", 0.035);
  },
  alert() {
    tone(880, 0.08, "square", 0.05);
    tone(880, 0.08, "square", 0.05, 0.12);
  },
  combo() {
    tone(660, 0.05, "square", 0.04);
    tone(880, 0.08, "square", 0.04, 0.05);
    tone(1170, 0.1, "square", 0.035, 0.1);
  },
  countdown() {
    tone(300, 0.12, "square", 0.05);
  },
  go() {
    tone(520, 0.2, "square", 0.05);
  },
  over() {
    tone(240, 0.18, "square", 0.04);
    tone(160, 0.28, "square", 0.04, 0.16);
  },
};
