"use client";

import { use, useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";

export const dynamic = "force-dynamic";

/* fixed bar heights — the fill tracks real audio progress */
const BARS = [8, 16, 24, 14, 30, 20, 36, 18, 28, 12, 26, 34, 16, 22, 10, 28, 18, 32];

export default function VoiceNotePage({
  params,
}: PageProps<"/r/[token]">) {
  const { token } = use(params);
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");
  const [playing, setPlaying] = useState(false);
  const [prog, setProg] = useState(0);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    api.reminderView(token)
      .then(setData)
      .catch(() => setErr("Link invalid ya expired hai."));
  }, [token]);

  function toggle() {
    const a = audio.current;
    if (!a) return;
    if (a.paused) { a.play(); } else { a.pause(); }
  }

  return (
    <main className="no-tabbar">
      <header className="topbar">
        <div className="brand">
          <h1 style={{ fontSize: 20 }}>Bolo Khata</h1>
          <span className="tag">voice reminder</span>
        </div>
      </header>

      {!data && !err && (
        <div className="card list" aria-busy="true">
          <div className="skeleton" style={{ height: 22, width: "40%" }} />
          <div className="skeleton" style={{ height: 70 }} />
        </div>)}
      {err && (
        <div className="card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 36 }}>🔗</div>
          <div style={{ fontWeight: 700, marginTop: 8 }}>{err}</div>
        </div>)}

      {data && (
        <div className="card list" style={{ textAlign: "center" }}>
          <div className="section-head" style={{ justifyContent: "center" }}>
            {data.shop_name}</div>
          <div className="lead" style={{ fontWeight: 700 }}>
            {data.note_text}</div>
          {data.audio_url ? (
            <div className="player">
              <audio ref={audio} src={data.audio_url} preload="auto"
                onTimeUpdate={(e) =>
                  setProg(e.currentTarget.currentTime /
                    (e.currentTarget.duration || 1))}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => { setPlaying(false); setProg(0); }} />
              <button className="play" onClick={toggle}
                aria-label={playing ? "pause" : "play voice note"}>
                {playing ? "⏸" : "▶"}</button>
              <div className="waveform" aria-hidden="true">
                {BARS.map((h, i) => (
                  <i key={i}
                    className={i / BARS.length <= prog ? "played" : ""}
                    style={{ height: h }} />))}
              </div>
            </div>
          ) : (
            <div className="empty-state"><span className="em">📭</span>
              audio render nahi hua — text upar hai</div>)}
          <div className="audio-note">
            {data.customer_name}, ye voice note aapke liye hai — dukaan se
            baaki udhaar ki yaad.</div>
        </div>)}
      <div className="powered">Powered by <b>Gnani AI</b> · Prisma + Timbre</div>
    </main>
  );
}
