export default function AboutPage() {
  return (
    <main>
      <h1>Bolo Khata <small>voice-first kirana ledger</small></h1>

      <div className="card">
        <b>The problem</b>
        <div className="dim" style={{ marginTop: 6 }}>
          India's neighbourhood shops still run on a paper udhaar notebook:
          illegible, unbilled, unrecoverable. The shopkeeper's hands are
          busy; the phone sits on the counter. So we made the ledger
          voice-first: bolo, aur sab likh jata hai.
        </div>
      </div>

      <div className="card">
        <b>The hero flow (all live)</b>
        <div className="dim" style={{ marginTop: 6 }}>
          “2 kilo cheeni, 1 Maggi, 500 gram dal, Ramesh ke naam”<br/>
          → live transcript → itemized bill ₹174 → spoken read-back →
          Cash / UPI / Khata → stock deducts → Ramesh gets a WhatsApp
          link → Confirm or Dispute → ledger state updates.<br/>
          Telugu works the same way end-to-end.
        </div>
      </div>

      <div className="card">
        <b>Which Gnani model does what</b>
        <div className="dim" style={{ marginTop: 6 }}>
          <b>Prisma v3.0</b> — streaming speech-to-text over telephonic-noise
          audio; `indic-auto` detects Hindi/Telugu/English mid-sentence;
          catalog keyterms bias recognition.<br/><br/>
          <b>Timbre v2.5</b> — read-backs and voice-note reminders in
          Hinglish (`hi-en`) and Telugu.<br/><br/>
          <b>Extraction is rules-based</b>, not an LLM: the grammar is
          small and catalog-bounded, prices must never be invented, and
          every write passes a human confirm card. Faster, cheaper, safer.
          (Evon v3.3 has no public API — verified and deliberately unused.)
        </div>
      </div>

      <div className="card">
        <b>Business types</b>
        <div className="dim" style={{ marginTop: 6 }}>
          The same voice core runs as module presets: <b>Kirana</b> (all
          modules), <b>Milk</b> and <b>Newspaper delivery</b>
          (delivery-billing: month bill = delivered days − skips),
          <b>Fruit/veg</b> (ledger + stock, no subscriptions), and
          <b>Other</b> — the owner picks from a fixed module list and can
          rename labels/units; output is schema-validated, no free-form
          schema edits.
          <br /><br />
          <b>Deliberate contrast:</b> subscription businesses that bill
          for <i>access</i>, not deliveries — gyms, memberships — do NOT
          get absence-adjusted billing. A missed gym day still bills.
          Delivery businesses bill for goods actually delivered, so
          skips reduce the bill. Different economics, different modules —
          same parser.
        </div>
      </div>

      <div className="card">
        <b>Made in Durg–Bhilai</b>
        <div className="dim" style={{ marginTop: 6 }}>
          Two students at IIT Bhilai. Benchmarks: <a href="/benchmark"
          style={{ color: "var(--info)" }}>/benchmark</a>.
          Roadmap: phone-call/telephony mode, UPI gateway verification,
          full offline mode, voice-cloned shop voice.
        </div>
      </div>
    </main>
  );
}
