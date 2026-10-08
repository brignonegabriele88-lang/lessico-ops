import { useEffect, useRef } from "react";
import { neighbors } from "@/lib/game/board";
import type { GridSize } from "@/lib/game/types";
import { cn } from "@/lib/utils";

type Validity = "idle" | "prefix" | "valid" | "found" | "invalid";

const SECTOR: Record<number, readonly [number, number]> = {
  0: [0, 1],
  1: [1, 1],
  2: [1, 0],
  3: [1, -1],
  4: [0, -1],
  [-4]: [0, -1],
  [-1]: [-1, 1],
  [-2]: [-1, 0],
  [-3]: [-1, -1],
};

export function LetterGrid({
  cells,
  size,
  path,
  validity,
  disabled,
  onPathChange,
  onRelease,
}: {
  cells: string[];
  size: GridSize;
  path: number[];
  validity: Validity;
  disabled?: boolean;
  onPathChange: (path: number[]) => void;
  onRelease: () => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const moved = useRef(false);
  const tapLast = useRef(false);
  const pathRef = useRef(path);
  pathRef.current = path;
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;
  const onPathChangeRef = useRef(onPathChange);
  onPathChangeRef.current = onPathChange;
  const onReleaseRef = useRef(onRelease);
  onReleaseRef.current = onRelease;

  const hitIndex = (clientX: number, clientY: number): number | null => {
    const root = rootRef.current;
    if (!root) return null;
    const tiles = root.querySelectorAll("[data-tile]");
    if (tiles.length === 0) return null;
    const rects: DOMRect[] = [];
    tiles.forEach((node) => rects.push((node as HTMLElement).getBoundingClientRect()));
    const last = pathRef.current[pathRef.current.length - 1];
    const grid = sizeRef.current;

    const closestInside = (shrink: number, limit?: Set<number>): number | null => {
      let best: number | null = null;
      let bestDist = Infinity;
      rects.forEach((r, i) => {
        if (limit && !limit.has(i)) return;
        const padX = r.width * shrink;
        const padY = r.height * shrink;
        const inside =
          clientX >= r.left + padX &&
          clientX <= r.right - padX &&
          clientY >= r.top + padY &&
          clientY <= r.bottom - padY;
        if (!inside) return;
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dist = (clientX - cx) * (clientX - cx) + (clientY - cy) * (clientY - cy);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      });
      return best;
    };

    if (last === undefined) {
      return closestInside(-0.18);
    }

    const allowed = new Set<number>([last, ...neighbors(last, grid)]);
    const inner = closestInside(0.1, allowed);
    if (inner !== null) return inner;

    const lastRect = rects[last];
    if (!lastRect) return last;
    const lx = lastRect.left + lastRect.width / 2;
    const ly = lastRect.top + lastRect.height / 2;
    const dx = clientX - lx;
    const dy = clientY - ly;
    const dist = Math.hypot(dx, dy);
    if (dist < lastRect.width * 0.36) return last;

    const sector = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
    const dir = SECTOR[sector] ?? [0, 0];
    const nr = Math.floor(last / grid) + dir[0];
    const nc = (last % grid) + dir[1];
    if (nr >= 0 && nr < grid && nc >= 0 && nc < grid) {
      const idx = nr * grid + nc;
      if (allowed.has(idx)) return idx;
    }

    let best: number = last;
    let bestDist = Infinity;
    for (const i of allowed) {
      const r = rects[i];
      if (!r) continue;
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const d = (clientX - cx) * (clientX - cx) + (clientY - cy) * (clientY - cy);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    return best;
  };

  const extend = (index: number) => {
    const current = pathRef.current;
    if (current.includes(index)) {
      if (current.length >= 2 && current[current.length - 2] === index) {
        onPathChangeRef.current(current.slice(0, -1));
      }
      return;
    }
    const prev = current[current.length - 1];
    if (prev === undefined || neighbors(prev, sizeRef.current).includes(index)) {
      onPathChangeRef.current([...current, index]);
    }
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragging.current || disabledRef.current) return;
      const idx = hitIndex(e.clientX, e.clientY);
      if (idx === null) return;
      const last = pathRef.current[pathRef.current.length - 1];
      if (idx !== last) {
        moved.current = true;
        extend(idx);
      }
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      if (moved.current || (tapLast.current && pathRef.current.length >= 3)) {
        onReleaseRef.current();
      }
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, []);

  const onPointerDown = (index: number, e: React.PointerEvent) => {
    if (disabled) return;
    e.preventDefault();
    dragging.current = true;
    moved.current = false;
    const current = pathRef.current;
    tapLast.current = current.length > 0 && current[current.length - 1] === index;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* some browsers refuse capture on buttons */
    }
    if (!tapLast.current) extend(index);
  };

  const root = rootRef.current;
  const pts =
    root && path.length > 1
      ? [...root.querySelectorAll("[data-tile]")].map((node) => {
          const r = (node as HTMLElement).getBoundingClientRect();
          const box = root.getBoundingClientRect();
          return { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top };
        })
      : [];

  const stroke =
    validity === "valid"
      ? "var(--color-primary)"
      : validity === "found"
        ? "var(--color-muted)"
        : validity === "invalid"
          ? "var(--color-alert)"
          : "var(--color-fg)";

  return (
    <div
      ref={rootRef}
      className="relative mx-auto w-full max-w-2xl touch-none select-none"
      style={{ touchAction: "none" }}
    >
      <div
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
      >
        {cells.map((letter, i) => {
          const on = path.includes(i);
          const order = path.indexOf(i);
          return (
            <button
              key={`${letter}-${i}`}
              type="button"
              data-tile={i}
              disabled={disabled}
              onPointerDown={(e) => onPointerDown(i, e)}
              className={cn(
                "relative flex aspect-square items-center justify-center border font-sans font-bold uppercase leading-none",
                letter === "Qu" ? "text-3xl sm:text-4xl" : "text-5xl sm:text-6xl",
                "tracking-wide transition-colors duration-150",
                on
                  ? validity === "valid"
                    ? "border-primary bg-primary text-primary-fg"
                    : validity === "invalid"
                      ? "border-alert bg-alert text-fg"
                      : "border-muted bg-surface-2 text-fg"
                  : "border-border bg-surface-2 text-fg hover:border-primary",
              )}
            >
              {letter}
              {on && order >= 0 ? (
                <span className="absolute left-1 top-0.5 font-mono text-[10px] leading-none text-primary-fg/80">
                  {order + 1}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {path.length > 1 && pts.length === cells.length ? (
        <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
          <polyline
            fill="none"
            stroke={stroke}
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={path
              .map((i) => {
                const p = pts[i];
                return p ? `${p.x},${p.y}` : "";
              })
              .join(" ")}
          />
        </svg>
      ) : null}
    </div>
  );
}
