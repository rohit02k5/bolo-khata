/* Brand-film footage recorder — real app, real flows, on the tunnel.
 * Each scene = fresh context + own webm into video/footage/.
 * Voice turns use real human clips via Chrome fake audio with the
 * caption added in post ("voice recorded earlier, played into the app").
 * Viewport 450x960 (phone-density) — upscaled by the motion layer.
 */
const { chromium } =
  require("D:/Gnani/shot/node_modules/playwright-core");
const fs = require("fs");

const BASE = "https://departed-asparagus-catalog.ngrok-free.dev";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = "D:/Gnani/bolo-khata/video/footage";
const VOICE = "D:/Gnani/shot/voice";
const STATE = "D:/Gnani/shot/film-state.json";

const env = {};
fs.readFileSync("D:/Gnani/bolo-khata/backend/.env", "utf8")
  .split("\n").forEach((l) => {
    const i = l.indexOf("=");
    if (i > 0) env[l.slice(0, i).trim()] = l.slice(i + 1).trim();
  });

const HEADERS = { "ngrok-skip-browser-warning": "1" };
const APIH = { ...HEADERS, "Content-Type": "application/json" };
const VP = { width: 450, height: 960 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let scene = "";

async function login() {
  return fetch(BASE + "/api/login", {
    method: "POST", headers: APIH,
    body: JSON.stringify({ email: env.OWNER_EMAIL,
      password: env.OWNER_PASSWORD }),
  }).then((r) => r.json());
}
async function api(tok, method, path, body) {
  const hdrs = { ...APIH };
  if (tok) hdrs.Authorization = "Bearer " + tok;
  const r = await fetch(BASE + path, {
    method, headers: hdrs,
    body: body ? JSON.stringify(body) : undefined });
  return r.json();
}

async function ctx(browser, extra = {}) {
  return browser.newContext(Object.assign({
    viewport: VP, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    permissions: ["microphone"], extraHTTPHeaders: HEADERS,
    recordVideo: { dir: OUT, size: VP },
  }, extra));
}

async function launch(wav) {
  const args = ["--use-fake-ui-for-media-stream",
    "--use-fake-device-for-media-stream"];
  if (wav) args.push(`--use-file-for-fake-audio-capture=${wav}`);
  return chromium.launch({ executablePath: CHROME, headless: true,
    args });
}

async function settle(c) {
  for (const pg of c.pages()) await pg.close().catch(() => {});
  await Promise.race([c.close(), sleep(10000)]).catch(() => {});
  await sleep(500);
  const vids = fs.readdirSync(OUT).filter((f) =>
    f.startsWith("page@") && f.endsWith(".webm"));
  const newest = vids.map((f) => OUT + "/" + f)
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
  if (newest) {
    const dst = `${OUT}/${scene}.webm`;
    if (fs.existsSync(dst)) fs.unlinkSync(dst);
    for (let i = 0; i < 15; i++) {
      try { fs.renameSync(newest, dst); break; }
      catch (e) {
        if (i === 14) console.log("rename busy:", e.code);
        await sleep(1000);
      }
    }
  }
  console.log("scene done:", scene);
}

async function click(page, sel, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try { await page.locator(sel).first().click({ timeout: 9000 });
      return; }
    catch (e) { if (i === tries - 1) throw e; await sleep(800); }
  }
}
async function appReady(page) {
  await page.waitForSelector(".signboard", { timeout: 40000 });
  await sleep(1600);
}

/* ---------- hero voice turn -> bill -> khata -> stamp ----------- */
async function f_hero() {
  scene = "hero";
  const b = await launch(`${VOICE}/hero_lead.wav`);
  const c = await ctx(b, { storageState: STATE });
  const p = await c.newPage();
  await p.goto(BASE + "/app", { waitUntil: "domcontentloaded" });
  await appReady(p);
  await click(p, 'button[aria-label="start listening"]');
  await p.waitForSelector('[role="dialog"][aria-label="bill"]',
    { timeout: 50000 });
  await sleep(2500);
  await click(p, 'text=Khata me likho');
  await sleep(3000);
  await sleep(2000);
  await settle(c); await b.close();
}

/* ---------- customer confirm page ----------------------------- */
async function f_trust() {
  scene = "trust";
  const { token } = await login();
  const led = await api(token, "GET", "/api/ledger");
  const pend = (led.pending || []).find((x) =>
    /ramesh/i.test(x.customer_name || "") && x.confirm_token);
  if (!pend) { console.log("trust: no pending"); return; }
  const b = await launch(null);
  const c = await ctx(b); // fresh customer profile
  const p = await c.newPage();
  await p.goto(`${BASE}/c/${pend.confirm_token}`,
    { waitUntil: "domcontentloaded" });
  await p.waitForFunction(() => !!window.next, null,
    { timeout: 30000 }).catch(() => {});
  await sleep(2500);
  await click(p, 'button:has-text("Confirm"), button.primary');
  await sleep(2500);
  await sleep(1500);
  await settle(c); await b.close();
}

/* ---------- ask-back: transcript edit -> face cream ------------- */
async function f_askback() {
  scene = "askback";
  const b = await launch(`${VOICE}/hero_lead.wav`);
  const c = await ctx(b, { storageState: STATE });
  const p = await c.newPage();
  await p.goto(BASE + "/app", { waitUntil: "domcontentloaded" });
  await appReady(p);
  await click(p, 'button[aria-label="start listening"]');
  await p.waitForSelector('[role="dialog"][aria-label="bill"]',
    { timeout: 50000 });
  await sleep(1200);
  // edit the transcript -> "face cream" (unknown item)
  const tx = p.locator('.sheet input[aria-label="transcript, editable"]');
  await tx.fill("ek face cream, Suresh ke naam");
  await sleep(700);
  await click(p, '.sheet button:has-text("Dobara samjho")');
  await p.waitForSelector(".ask-card", { timeout: 30000 });
  await sleep(2000);
  await click(p, 'text=Naya item banayein');
  await p.locator('input[aria-label="new item price"]').first().fill("40");
  await sleep(400);
  await click(p, '.ask-card button.primary');
  await sleep(1800);
  await click(p, 'text=Khata me likho');
  await sleep(3000);
  await settle(c); await b.close();
}

/* ---------- money: cash, then UPI QR --------------------------- */
async function f_money() {
  scene = "money";
  const b = await launch(`${VOICE}/hero_lead.wav`);
  const c = await ctx(b, { storageState: STATE });
  const p = await c.newPage();
  await p.goto(BASE + "/app", { waitUntil: "domcontentloaded" });
  await appReady(p);
  // turn 1 -> cash
  await click(p, 'button[aria-label="start listening"]');
  await p.waitForSelector('[role="dialog"][aria-label="bill"]',
    { timeout: 50000 });
  await sleep(1500);
  await click(p, 'text=Abhi paid');
  await sleep(1400);
  await click(p, 'button:has-text("Cash")');
  await sleep(2600);
  await click(p, 'text=Done').catch(() => {});
  await sleep(1400);
  // turn 2 -> UPI QR
  await click(p, 'button[aria-label="start listening"]');
  await p.waitForSelector('[role="dialog"][aria-label="bill"]',
    { timeout: 50000 });
  await sleep(1500);
  await click(p, 'text=Abhi paid');
  await sleep(1400);
  await click(p, 'button:has-text("UPI")');
  await sleep(2600); // QR + self-reported caption visible
  await sleep(1200);
  await settle(c); await b.close();
}

/* ---------- customer: join -> /m khata -------------------------- */
async function f_customer() {
  scene = "customer";
  // join the kirana shop AND the milk shop so /m shows multi-shop khata
  const uname = "Film Cust " + Math.floor(Math.random() * 90000);
  for (const code of ["c411a88a6467", "b6d1f1cc9f07"]) {
    const r = await fetch(`${BASE}/api/join/${code}`, {
      method: "POST", headers: APIH,
      body: JSON.stringify({ name: uname, pin: "2211" }),
    });
    var joinResp = await r.json(); // eslint-disable-line
    console.log("join", code, "->", r.status,
      joinResp.token ? "token" : JSON.stringify(joinResp).slice(0, 100));
  }
  const b = await launch(null);
  const c = await ctx(b);
  const p = await c.newPage();
  await p.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await p.evaluate((tk) => localStorage.setItem("bk_cust", tk),
    joinResp.token);
  console.log("stored bk_cust:", await p.evaluate(
    () => localStorage.getItem("bk_cust")));
  await p.goto(BASE + "/m", { waitUntil: "domcontentloaded" });
  await sleep(3500);
  await p.mouse.wheel(0, 350); await sleep(1800);
  await p.mouse.wheel(0, 350); await sleep(1800);
  await settle(c); await b.close();
}

/* ---------- voice-note /r/ page -------------------------------- */
async function f_voicenote() {
  scene = "voicenote";
  const { token } = await login();
  const cmd = await api(token, "POST", "/api/command",
    { transcript: "Ramesh ko yaad dilao", lang: "hi" });
  if (cmd.proposal_id) {
    await api(token, "POST", "/api/confirm",
      { proposal_id: cmd.proposal_id, accept: true });
  }
  const rem = await api(token, "GET", "/api/reminders");
  const note = (rem.reminders || rem || []).find
    ? (rem.reminders || rem).find((r) => r.token || r.audio_token)
    : null;
  const tok = note && (note.token || note.audio_token);
  if (!tok) { console.log("voicenote: no token"); return; }
  const b = await launch(null);
  const c = await ctx(b);
  const p = await c.newPage();
  await p.goto(`${BASE}/r/${tok}`, { waitUntil: "domcontentloaded" });
  await sleep(3000);
  await click(p, 'button').catch(() => {}); // tap play
  await sleep(4000);
  await settle(c); await b.close();
}

/* ---------- milk: skip-day + month bill ------------------------- */
async function f_milk() {
  scene = "milk";
  const b = await launch(`${VOICE}/hero_lead.wav`);
  const c = await ctx(b, { storageState: STATE });
  const p = await c.newPage();
  await p.goto(BASE + "/app", { waitUntil: "domcontentloaded" });
  await appReady(p);
  await click(p, 'button[aria-label="start listening"]');
  await p.waitForSelector('[role="dialog"][aria-label="bill"]',
    { timeout: 50000 });
  await sleep(1000);
  const tx = p.locator('.sheet input[aria-label="transcript, editable"]');
  await tx.fill("Ramesh ka doodh kal se 2 din nahi chahiye");
  await sleep(600);
  await click(p, '.sheet button:has-text("Dobara samjho")');
  await sleep(4000);
  const ok = p.locator('button.primary.big');
  if (await ok.count()) { await ok.first().click(); await sleep(2600); }
  await click(p, 'text=Done').catch(() => {});
  await sleep(1000);
  // month bill
  await click(p, 'button[aria-label="start listening"]');
  await p.waitForSelector('[role="dialog"][aria-label="bill"]',
    { timeout: 50000 });
  await sleep(1000);
  await tx.fill("Lakshmi ka dudh ka bill batao");
  await sleep(600);
  await click(p, '.sheet button:has-text("Dobara samjho")');
  await sleep(4000);
  await sleep(2000);
  await settle(c); await b.close();
}

/* ---------- staff: leave accept + owner undo -------------------- */
async function f_staff() {
  scene = "staff";
  const { token } = await login();
  // create a fresh staff + leave request via API
  const sname = "Chotu" + Math.floor(Math.random() * 90000);
  const inv = await api(token, "POST", "/api/staff/invite",
    { name: sname });
  const reg = await api(null, "POST", "/api/staff/register",
    { invite_code: inv.invite_code, pin: "4488" });
  const cmd = await api(token, "POST", "/api/command",
    { transcript: sname + " kal chutti pe hai", lang: "hi" });
  if (cmd.proposal_id) {
    await api(token, "POST", "/api/confirm",
      { proposal_id: cmd.proposal_id, accept: true });
  }
  // staff side: /app with staff token shows the leave banner
  const b = await launch(null);
  const c = await ctx(b);
  const p = await c.newPage();
  await p.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await p.evaluate(([tk, ro]) => {
    localStorage.setItem("bk_token", tk);
    localStorage.setItem("bk_role", ro);
  }, [reg.token, "staff"]);
  await p.goto(BASE + "/app", { waitUntil: "domcontentloaded" });
  await appReady(p).catch(() => {});
  // dismiss coach marks if shown, then find the leave banner
  const coach = p.locator('text=Samajh gaya');
  if (await coach.count()) { await coach.first().click();
    await sleep(1200); }
  await sleep(3000);
  // staff taps accept on the leave banner (dual approval completes)
  const acc = p.locator('button[aria-label="accept leave"]');
  if (await acc.count()) { await sleep(1500); await acc.first().click();
    await sleep(2500); }
  await p.mouse.wheel(0, 300); await sleep(2000);
  await settle(c); await b.close();
}

/* ---------- weekly summary -------------------------------------- */
async function f_weekly() {
  scene = "weekly";
  const b = await launch(`${VOICE}/hero_lead.wav`);
  const c = await ctx(b, { storageState: STATE });
  const p = await c.newPage();
  await p.goto(BASE + "/app", { waitUntil: "domcontentloaded" });
  await appReady(p);
  await click(p, 'button[aria-label="start listening"]');
  await p.waitForSelector('[role="dialog"][aria-label="bill"]',
    { timeout: 50000 });
  await sleep(1000);
  const tx = p.locator('.sheet input[aria-label="transcript, editable"]');
  await tx.fill("is hafte ka hisaab batao");
  await sleep(600);
  await click(p, '.sheet button:has-text("Dobara samjho")');
  await sleep(4000);
  await sleep(2000);
  await settle(c); await b.close();
}

/* ---------- onboarding business-type cards ---------------------- */
async function f_onboarding() {
  scene = "onboarding";
  const b = await launch(null);
  const c = await ctx(b);
  const p = await c.newPage();
  const em = `film${Math.floor(Math.random() * 1e5)}@t.in`;
  await p.goto(BASE + "/signup", { waitUntil: "domcontentloaded" });
  await p.waitForFunction(() => !!window.next, null,
    { timeout: 30000 }).catch(() => {});
  await sleep(1500);
  await p.locator('input[aria-label="name"], input[name="name"]').first()
    .fill("Film Malik");
  await p.locator('input[type="email"]').first().fill(em);
  await p.locator('input[type="password"]').first().fill("film12345");
  await click(p, 'button[type="submit"], button.primary');
  await p.waitForURL(/onboarding/, { timeout: 40000 }).catch(() => {});
  await sleep(2500);
  // step 1 (dukaan info) -> fill -> Aage -> business-type cards
  const ins = p.locator(".surface input, main input");
  if (await ins.count() >= 3) {
    await ins.nth(0).fill("Film Kirana Bhandar");
    await ins.nth(1).fill("Film Malik");
    await ins.nth(2).fill("Bhilai");
    await sleep(600);
    await click(p, 'button:has-text("Aage"), button.primary');
    await sleep(2500);
  }
  // business-type cards should be on screen now
  await sleep(2500);
  await p.mouse.wheel(0, 250); await sleep(1800);
  await settle(c); await b.close();
}

/* ---------- telugu voice turn ----------------------------------- */
async function f_telugu() {
  scene = "telugu";
  const b = await launch(`${VOICE}/telugu_lead.wav`);
  const c = await ctx(b, { storageState: STATE });
  const p = await c.newPage();
  await p.goto(BASE + "/app", { waitUntil: "domcontentloaded" });
  await appReady(p);
  await click(p, 'button[aria-label="language te"]');
  await sleep(1200);
  await click(p, 'button[aria-label="start listening"]');
  await p.waitForSelector('[role="dialog"][aria-label="bill"]',
    { timeout: 50000 });
  await sleep(2500);
  await settle(c); await b.close();
}

/* ---------- benchmark scroll (1920x1080) ------------------------ */
async function f_benchmark() {
  scene = "benchmark";
  const b = await launch(null);
  const c = await b.newContext({
    viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1,
    extraHTTPHeaders: HEADERS,
    recordVideo: { dir: OUT, size: { width: 1920, height: 1080 } },
  });
  const p = await c.newPage();
  await p.goto(BASE + "/benchmark", { waitUntil: "domcontentloaded" });
  await sleep(3000);
  for (let i = 0; i < 5; i++) { await p.mouse.wheel(0, 300);
    await sleep(1400); }
  await p.mouse.wheel(0, -1400); await sleep(1500);
  await settle(c); await b.close();
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const only = process.argv[2];
  const scenes = { f_hero, f_trust, f_askback, f_money, f_customer,
    f_voicenote, f_milk, f_staff, f_weekly, f_onboarding, f_telugu,
    f_benchmark };
  for (const [k, fn] of Object.entries(scenes)) {
    if (only && k !== only && only !== "all") continue;
    try { await fn(); }
    catch (e) { console.log(scene || k, "FAIL:",
      e.message.slice(0, 160)); }
  }
})();
