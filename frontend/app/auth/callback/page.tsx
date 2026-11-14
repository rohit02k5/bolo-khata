"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { setToken } from "../../lib/api";

const ERR: Record<string, string> = {
  denied: "Sign-in was cancelled.",
  bad_state: "Sign-in expired — try again.",
  config: "This sign-in method isn't set up on the server.",
  exchange: "Couldn't reach the provider — try again.",
  no_email: "That account has no email — use email/password sign-in.",
  create: "Couldn't create your account — try again.",
};

/* Landing point after Google/Discord OAuth: the backend 302s here with
   ?token&role&shop_id&needs_onboarding (or ?error=...). */
export default function AuthCallback() {
  const router = useRouter();
  const [err, setErr] = useState("");

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const error = q.get("error");
    const token = q.get("token");
    if (error || !token) {
      const msg = ERR[error || ""] || "Sign-in failed — try again.";
      const id = setTimeout(() => setErr(msg), 0);
      return () => clearTimeout(id);
    }
    const role = q.get("role") || "owner";
    const needsOnboard = q.get("needs_onboarding") === "1";
    const next = q.get("next") || "";
    setToken(token);
    localStorage.setItem("bk_token", token);
    localStorage.setItem("bk_role", role);
    // `next` is an internal path the login page asked for
    if (needsOnboard) router.replace("/onboarding");
    else if (next.startsWith("/") && !next.startsWith("//"))
      router.replace(next);
    else router.replace("/app");
  }, [router]);

  return (
    <main className="no-tabbar">
      <div className="flow-page" style={{ alignItems: "center" }}>
        {err ? (<>
          <div className="banner" style={{
            background: "var(--bad-soft)", maxWidth: 380 }}>{err}</div>
          <Link href="/login" className="primary big">Back to log in</Link>
        </>) : (
          <div className="caption">Signing you in…</div>
        )}
      </div>
    </main>
  );
}
