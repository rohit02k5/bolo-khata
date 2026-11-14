"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { API } from "./api";
import { DiscordIcon, GoogleIcon } from "./icons";

// Social sign-in for owners. Providers are only clickable when the
// backend reports them configured (GOOGLE_*/DISCORD_* env vars); the
// buttons still render so the option is discoverable in dev.
export function OAuthButtons({ next = "/login" }: { next?: string }) {
  const [cfg, setCfg] = useState<Record<string, boolean> | null>(null);
  const [hint, setHint] = useState("");

  useEffect(() => {
    fetch(API + "/api/auth/providers")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setCfg(j || {}))
      .catch(() => setCfg({}));
  }, []);

  function go(e: MouseEvent<HTMLAnchorElement>, provider: string) {
    if (cfg && cfg[provider] === false) {
      e.preventDefault();
      setHint(provider === "google"
        ? "Google sign-in needs GOOGLE_CLIENT_ID/SECRET in backend/.env"
        : "Discord sign-in needs DISCORD_CLIENT_ID/SECRET in backend/.env");
    }
  }

  return (
    <div className="oauth-row">
      <div className="oauth-or">or</div>
      <a className={"oauth-btn" + (cfg?.google === false ? " off" : "")}
        href={API + "/api/auth/google?next=" + encodeURIComponent(next)}
        onClick={(e) => go(e, "google")}>
        <GoogleIcon size={18} /> Continue with Google</a>
      <a className={"oauth-btn" + (cfg?.discord === false ? " off" : "")}
        href={API + "/api/auth/discord?next=" + encodeURIComponent(next)}
        onClick={(e) => go(e, "discord")}>
        <DiscordIcon size={18} /> Continue with Discord</a>
      {hint && <div className="oauth-note">{hint}</div>}
    </div>
  );
}
