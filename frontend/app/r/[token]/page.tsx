"use client";

import { use, useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";

export const dynamic = "force-dynamic";

export default function VoiceNotePage({
  params,
}: PageProps<"/r/[token]">) {
  const { token } = use(params);
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    api.reminderView(token)
      .then(setData)
      .catch(() => setErr("Link invalid ya expired hai."));
  }, [token]);

  return (
    <main>
      <h1>Bolo Khata <small>voice reminder</small></h1>
      <div className="card list" style={{ textAlign: "center" }}>
        {err && <div>{err}</div>}
        {data && (
          <>
            <div className="dim">{data.shop_name}</div>
            <div style={{ fontSize: 40 }}>🔊</div>
            <div style={{ fontSize: 18 }}>{data.note_text}</div>
            {data.audio_url ? (
              <>
                <audio ref={audio} src={data.audio_url} controls
                  style={{ width: "100%" }} />
                <button className="primary"
                  onClick={() => audio.current?.play()}>▶ Play</button>
              </>
            ) : (
              <div className="dim">audio render nahi hua — text upar hai</div>
            )}
            <div className="audio-note">
              {data.customer_name}, ye voice note aapke liye hai.
            </div>
          </>
        )}
      </div>
    </main>
  );
}
