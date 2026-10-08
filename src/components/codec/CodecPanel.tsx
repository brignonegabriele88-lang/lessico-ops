import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

function Corners() {
  return (
    <>
      <span className="pointer-events-none absolute left-0 top-0 h-2.5 w-2.5 border-l border-t border-primary" />
      <span className="pointer-events-none absolute right-0 top-0 h-2.5 w-2.5 border-r border-t border-primary" />
      <span className="pointer-events-none absolute bottom-0 left-0 h-2.5 w-2.5 border-b border-l border-primary" />
      <span className="pointer-events-none absolute bottom-0 right-0 h-2.5 w-2.5 border-b border-r border-primary" />
    </>
  );
}

export function CodecPanel({
  title,
  eyebrow,
  children,
  className,
  footer,
}: {
  title?: string;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
}) {
  return (
    <section className={cn("relative border border-border bg-surface p-5", className)}>
      <Corners />
      {(eyebrow || title) && (
        <header className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {eyebrow ? (
              <p className="font-mono text-xs tracking-[0.22em] text-primary">{eyebrow}</p>
            ) : null}
            {title ? (
              <h2 className="font-sans text-2xl font-semibold uppercase tracking-[0.12em] text-fg">
                {title}
              </h2>
            ) : null}
          </div>
          <span className="shrink-0 font-mono text-[10px] tracking-[0.28em] text-muted">REC</span>
        </header>
      )}
      {children}
      {footer}
    </section>
  );
}

export function CodecFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-dvh bg-bg text-fg">
      <div className="vignette" />
      <div className="scanlines" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
