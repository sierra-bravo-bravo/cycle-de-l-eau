"use client";

import { FormEvent, useEffect, useState } from "react";
import { GlowButton } from "./GlowButton";
import { asset } from "@/lib/asset";

const KEY = "sogea-cycle-gate";
const HASH =
  "4ce088d87c456852e28d7eedd721e9e5b05721c977faa7cfacd7328061508481";

async function digest(value: string) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export default function Gate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(KEY) === HASH) setOpen(true);
    setReady(true);
  }, []);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const guess = String(form.get("password") ?? "").trim();
    const hex = await digest(guess);
    if (hex !== HASH) {
      setError(true);
      return;
    }
    sessionStorage.setItem(KEY, HASH);
    setError(false);
    setOpen(true);
  };

  if (!ready) return <div className="gate" aria-hidden="true" />;
  if (open) return children;

  return (
    <div className="gate">
      <form className="gate-card" onSubmit={onSubmit}>
        <img
          src={asset("/logo-adveris-letters.png")}
          alt="Adveris"
          className="gate-logo"
          width={152}
          height={27}
        />
        <label className="gate-label" htmlFor="gate-password">
          Mot de passe
        </label>
        <input
          id="gate-password"
          name="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          className="gate-input"
          aria-invalid={error}
          onChange={() => error && setError(false)}
        />
        {error ? (
          <p className="gate-error" role="alert">
            Mot de passe incorrect.
          </p>
        ) : null}
        <GlowButton type="submit" className="gate-submit">
          Entrer
        </GlowButton>
      </form>
    </div>
  );
}
