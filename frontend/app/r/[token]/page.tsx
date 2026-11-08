"use client";

import { use, useEffect, useRef, useState } from "react";
import { api, inr } from "../../lib/api";
import { PlayIcon, PauseIcon } from "../../lib/icons";

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
  const [elapsed, setElapsed] = useState("0:00");
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

  const fmt = (s: number) =>
    `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  return (
    <main className="no-tabbar">
      <header className="topbar">
        <div className="wordmark">Bolo Khata
          <span className="sub">voice reminder</span></div>
      </header>

      {!data && !err && (
        <div className="surface list" aria-busy="true">
          <div className="skeleton" style={{ height: 22, width: "40%" }} />
          <div className="skeleton" style={{ height: 70 }} />
        </div>)}
      {err && (
        <div className="surface centre-col" style={{ gap: 8 }}>
          <div style={{ fontWeight: 700 }}>{err}</div>
        </div>)}

      {data && (
        <div className="surface centre-col" style={{ gap: 14 }}>
          <div className="caption">{data.shop_name}</div>
          {data.amount_paise != null && data.amount_paise > 0 && (
            <div className="display">{inr(data.amount_paise)}</div>)}
          <div className="lead" style={{ fontWeight: 600,
            textAlign: "center" }}>
            {data.note_text}</div>
          {data.audio_url ? (
            <div className="player" style={{ width: "100%" }}>
              <audio ref={audio} src={data.audio_url} preload="auto"
                onTimeUpdate={(e) => {
                  setProg(e.currentTarget.currentTime /
                    (e.currentTarget.duration || 1));
                  setElapsed(fmt(e.currentTarget.currentTime));
                }}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => { setPlaying(false); setProg(0); setElapsed("0:00"); }} />
              <button className="play" onClick={toggle}
                aria-label={playing ? "pause" : "play voice note"}>
                {playing ? <PauseIcon size={22} /> : <PlayIcon size={22} />}
              </button>
              <div className="waveform" aria-hidden="true">
                {BARS.map((h, i) => (
                  <i key={i}
                    className={i / BARS.length <= prog ? "played" : ""}
                    style={{ height: h }} />))}
              </div>
              <div className="time">{elapsed}</div>
            </div>
          ) : (
            <div className="empty-state">
              audio render nahi hua — text upar hai</div>)}
          <div className="caption" style={{ textAlign: "center",
            lineHeight: 1.6 }}>
            {data.customer_name}, ye voice note aapke liye hai — dukaan se
            baaki udhaar ki yaad.</div>
        </div>)}
      <div className="powered">Built with <b>Gnani AI</b> · Prisma + Timbre</div>
    </main>
  );
}
