/* Render motion scenes: serve video/ dir, record player.html per scene
   per format with Playwright -> video/out/seg-NN-<fmt>.webm + .json
   (screen rects for ffmpeg footage compositing) + alpha masks. */
const { chromium } =
  require("D:/Gnani/shot/node_modules/playwright-core");
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.normalize("D:/Gnani/bolo-khata/video");
const OUT = ROOT + "\\out";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const DUR = { 1: 4.6, 2: 2.6, 3: 13.5, 4: 7.0, 5: 7.4, 6: 7.4, 7: 6.6,
  8: 6.4, 9: 8.8, 10: 6.0, 11: 7.2, 12: 7.6 };
const MIME = { ".html": "text/html", ".webm": "video/webm",
  ".wav": "audio/wav", ".mp4": "video/mp4", ".json": "application/json" };

const server = http.createServer((req, res) => {
  const p = decodeURIComponent(req.url.split("?")[0]);
  const f = path.normalize(ROOT + p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) ||
      fs.statSync(f).isDirectory()) {
    res.writeHead(404); res.end(); return;
  }
  res.writeHead(200, { "Content-Type": MIME[path.extname(f)] ||
    "application/octet-stream" });
  fs.createReadStream(f).pipe(res);
});

/* rounded-rect alpha mask PNG for a screen rect */
async function maskPng(b, w, h, r) {
  const c = await b.newContext({ viewport: { width: Math.ceil(w),
    height: Math.ceil(h) } });
  const p = await c.newPage();
  await p.setContent(`<body style="margin:0;background:transparent">
    <div style="width:${w}px;height:${h}px;border-radius:${r}px;
      background:#fff"></div></body>`,
    { waitUntil: "domcontentloaded", timeout: 15000 });
  const file = `${OUT}\\mask-${Math.round(w)}x${Math.round(h)}r${r}.png`;
  await p.screenshot({ path: file, omitBackground: true });
  await c.close();
  return file;
}

(async () => {
  await new Promise((r) => server.listen(0, r));
  const port = server.address().port;
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ executablePath: CHROME,
    headless: true });
  const only = process.argv[2] ? process.argv[2].split(",") : null;
  const masks = {};

  for (const n of Object.keys(DUR).map(Number)) {
    for (const fmt of ["16x9", "9x16"]) {
      const tag = `seg-${String(n).padStart(2, "0")}-${fmt}`;
      if (only && !only.includes(String(n)) && !only.includes(tag))
        continue;
      const dims = fmt === "9x16" ? { width: 1080, height: 1920 }
        : { width: 1920, height: 1080 };
      const c = await b.newContext({ viewport: dims,
        recordVideo: { dir: OUT, size: dims } });
      const p = await c.newPage();
      await p.goto(
        `http://localhost:${port}/motion/player.html?scene=${n}&fmt=${fmt}`);
      const deadline = (DUR[n] + 4) * 1000;
      try {
        await p.waitForFunction(() => window.__done === true, null,
          { timeout: deadline });
      } catch { /* timeout = still record what we have */ }
      const rects = await p.evaluate(() => window.__rects || []);
      await p.waitForTimeout(400);
      await p.close();
      await Promise.race([c.close(),
        new Promise((r) => setTimeout(r, 10000))]).catch(() => {});
      await new Promise((r) => setTimeout(r, 600));
      const vids = fs.readdirSync(OUT).filter((f) =>
        f.startsWith("page@") && f.endsWith(".webm"));
      const newest = vids.map((f) => OUT + "\\" + f)
        .sort((a, b2) => fs.statSync(b2).mtimeMs -
          fs.statSync(a).mtimeMs)[0];
      const dst = `${OUT}\\${tag}.webm`;
      if (newest) {
        for (let i = 0; i < 12; i++) {
          try {
            if (fs.existsSync(dst)) fs.unlinkSync(dst);
            fs.renameSync(newest, dst); break;
          } catch (e) {
            await new Promise((r) => setTimeout(r, 800));
          }
        }
      }
      // attach mask paths to rects
      for (const r of rects) {
        const key = `${Math.round(r.w)}x${Math.round(r.h)}r${r.r}`;
        if (!masks[key]) masks[key] = await maskPng(b, r.w, r.h, r.r);
        r.mask = masks[key];
      }
      fs.writeFileSync(`${OUT}\\${tag}.json`,
        JSON.stringify({ dur: DUR[n], rects }, null, 1));
      console.log("rendered", tag, rects.length, "screens");
    }
  }
  await b.close(); server.close();
})();
