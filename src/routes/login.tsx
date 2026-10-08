import { useState } from "react";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { GROK_PROVIDERS, authClient, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { CodecFrame, CodecPanel } from "@/components/codec/CodecPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  const { user, isPending } = useCurrentUserState();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"in" | "up">("in");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submitEmail = async () => {
    setError(null);
    setBusy(true);
    try {
      if (mode === "up") {
        const { error: err } = await authClient.signUp.email({
          email,
          password,
          name: email.split("@")[0] ?? "operatore",
          callbackURL: "/",
        });
        if (err) throw new Error(err.message);
      } else {
        const { error: err } = await authClient.signIn.email({
          email,
          password,
          callbackURL: "/",
        });
        if (err) throw new Error(err.message);
      }
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Accesso non riuscito");
    } finally {
      setBusy(false);
    }
  };

  if (isPending) {
    return (
      <CodecFrame>
        <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
          <div className="h-48 animate-pulse border border-border bg-surface" />
        </div>
      </CodecFrame>
    );
  }

  if (user) {
    return <Navigate to="/" />;
  }

  return (
    <CodecFrame>
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
        <CodecPanel eyebrow="IDENTIFICAZIONE" title="ACCESSO OPERATORE">
          <p className="mb-4 font-mono text-xs leading-relaxed text-muted">
            Accedi per salvare dossier, missioni e gradi sul tuo nominativo. In anteprima Grok
            l'identità può attivarsi da sola.
          </p>
          {authEnabled ? (
            <div className="flex flex-col gap-4">
              {GROK_PROVIDERS.map((p) => (
                <Button
                  key={p.providerId}
                  variant="outline"
                  onClick={() => void signIn(p.providerId, { callbackURL: "/" })}
                >
                  Continua con {p.label}
                </Button>
              ))}
              <div className="my-1 h-px bg-border" />
              <p className="font-mono text-[10px] tracking-[0.2em] text-muted">
                {mode === "in" ? "E-MAIL / PASSWORD" : "NUOVO DOSSIER"}
              </p>
              <Input
                type="email"
                autoComplete="email"
                placeholder="e-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                type="password"
                autoComplete={mode === "up" ? "new-password" : "current-password"}
                placeholder="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {error ? <p className="font-mono text-xs text-alert">{error}</p> : null}
              <Button disabled={busy || !email || password.length < 8} onClick={() => void submitEmail()}>
                {busy ? "Trasmissione…" : mode === "in" ? "Entra" : "Crea dossier"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setMode(mode === "in" ? "up" : "in");
                  setError(null);
                }}
              >
                {mode === "in" ? "Crea un dossier" : "Ho già un accesso"}
              </Button>
            </div>
          ) : (
            <p className="font-mono text-sm text-muted">Accesso disattivato.</p>
          )}
          <Link
            to="/"
            className="mt-6 inline-block font-mono text-xs tracking-[0.16em] text-muted hover:text-primary"
          >
            TORNA AL QUARTIER GENERALE
          </Link>
        </CodecPanel>
      </div>
    </CodecFrame>
  );
}
