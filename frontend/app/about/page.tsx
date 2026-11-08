export default function AboutPage() {
  const steps: [string, string][] = [
    ["🎙️", "Shopkeeper speaks — Hinglish or Telugu, noisy shop"],
    ["🧾", "Itemized bill appears — item, qty, price, total"],
    ["🔊", "Spoken read-back — the shopkeeper hears it too"],
    ["💵", "Cash / UPI QR / Add to khata — one tap"],
    ["📦", "Stock deducts itself, ledger updates"],
    ["📲", "Customer gets a link — Confirm or Dispute"],
  ];
  return (
    <main className="no-tabbar">
      <header className="topbar">
        <div className="brand">
          <h1 style={{ fontSize: 20 }}>Bolo Khata</h1>
          <span className="tag">voice-first kirana ledger</span>
        </div>
      </header>

      <div className="card">
        <h2>📓 The problem</h2>
        <div className="lead" style={{ marginTop: 8, fontSize: 16 }}>
          India's neighbourhood shops still run on a paper udhaar notebook:
          illegible, unbilled, unrecoverable. The shopkeeper's hands are
          busy; the phone sits on the counter. So we made the ledger
          voice-first — bolo, aur sab likh jata hai.
        </div>
      </div>

      <div className="card">
        <h2>⚡ The hero flow — all live</h2>
        <div className="dim" style={{ margin: "8px 0 4px",
          fontStyle: "italic" }}>
          “2 kilo cheeni, 1 Maggi, 500 gram dal, Ramesh ke naam” → ₹174
        </div>
        <div className="flow-diagram">
          {steps.map(([ic, s], i) => (
            <div key={i}>
              <div className="flow-step">
                <span style={{ fontSize: 22 }}>{ic}</span>{s}</div>
              {i < steps.length - 1 &&
                <div className="flow-arrow">↓</div>}
            </div>))}
        </div>
        <div className="audio-note">Telugu works the same way end-to-end.</div>
      </div>

      <div className="card">
        <h2>🧠 Which Gnani model does what</h2>
        <div style={{ marginTop: 10, display: "flex",
          flexDirection: "column", gap: 10 }}>
          <div className="entry" style={{ alignItems: "flex-start" }}>
            <span><span className="pill info">Prisma v3.0</span>{" "}
              <b>ears</b><br />
              <span className="dim">streaming speech-to-text over
              telephonic-noise audio; <code>indic-auto</code> detects
              Hindi/Telugu/English mid-sentence; catalog keyterms bias
              recognition.</span></span>
          </div>
          <div className="entry" style={{ alignItems: "flex-start" }}>
            <span><span className="pill info">Timbre v2.5</span>{" "}
              <b>voice</b><br />
              <span className="dim">read-backs and voice-note reminders in
              Hinglish (<code>hi-en</code>) and Telugu (Suhana).</span></span>
          </div>
          <div className="entry" style={{ alignItems: "flex-start" }}>
            <span><span className="pill">rules parser</span>{" "}
              <b> judgement</b><br />
              <span className="dim">extraction is rules-based, not an LLM:
              the grammar is small and catalog-bounded, prices are never
              invented, and every write passes a human confirm card.
              Faster, cheaper, safer. (Evon v3.3 has no public API —
              verified and deliberately unused.)</span></span>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>🧩 One voice core, many dukaans</h2>
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column",
          gap: 8, fontSize: 15 }}>
          <span>🛒 <b>Kirana</b> — all modules</span>
          <span>🥛 <b>Milk</b> · 📰 <b>Newspaper</b> — delivery billing:
            month bill = delivered days − skips</span>
          <span>🍅 <b>Fruit/veg</b> — ledger + stock, no subscriptions</span>
          <span>🧩 <b>Other</b> — owner picks from a fixed module list and
            renames labels; schema-validated, no free-form edits</span>
        </div>
        <div className="audio-note" style={{ marginTop: 10 }}>
          <b>Deliberate contrast:</b> subscription businesses that bill for
          <i> access</i> — gyms, memberships — do NOT get absence-adjusted
          billing; a missed gym day still bills. Delivery businesses bill
          for goods actually delivered, so skips reduce the bill.
        </div>
      </div>

      <div className="card">
        <h2>🏡 Made in Durg–Bhilai</h2>
        <div style={{ marginTop: 8, fontSize: 15 }}>
          Two students at IIT Bhilai. Numbers, not adjectives:{" "}
          <a href="/benchmark" style={{ color: "var(--info)",
            fontWeight: 700 }}>/benchmark</a>{" "}·{" "}
          <a href="/try" style={{ color: "var(--info)", fontWeight: 700 }}>
            /try</a>
        </div>
        <div className="dim" style={{ marginTop: 8 }}>
          Roadmap: phone-call/telephony mode, UPI gateway verification,
          full offline mode, voice-cloned shop voice.
        </div>
      </div>
      <div className="powered">Powered by <b>Gnani AI</b> · Prisma + Timbre</div>
    </main>
  );
}
