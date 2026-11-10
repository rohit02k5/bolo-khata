#!/usr/bin/env python
"""Compose brand film: overlay real footage into screen rects, concat
scenes, mix music/VO/SFX, loudnorm to -14 LUFS, export all cuts."""
import json, math, os, subprocess, sys

ROOT = r"D:\Gnani\bolo-khata\video"
OUT = ROOT + r"\out"
FOOT = ROOT + r"\footage"
AUD = ROOT + r"\audio"
VOICE = r"D:\Gnani\shot\voice"
FF = (r"D:\Gnani\bolo-khata\backend\.venv\Lib\site-packages"
      r"\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v9.0.2.exe")

DUR = {1:4.6, 2:2.6, 3:13.5, 4:7.0, 5:7.4, 6:7.4, 7:6.6,
       8:6.4, 9:8.8, 10:6.0, 11:7.2, 12:7.6}
DUR_TE = {1:7.8, 3:14.4, 4:7.6, 6:7.0, 12:10.6}  # TE narration is longer
LANG = "hi"

def vo(n):
    return AUD + (r"\vo%02d.wav" % n if LANG == "hi"
                  else r"\vo-%s-%02d.wav" % (LANG, n))

# cut -> [(scene, in_offset, length)]  (built in main after LANG/DUR set)
def make_cuts():
    return {
        "brand-90s": [(n, 0, DUR[n]) for n in range(1, 13)],
        "brand-45s": [(n, 0, DUR[n]) for n in (1, 2, 3, 4, 6, 12)],
        "brand-15s": [(1, 0, min(4.6, DUR[1])), (3, 8.5, 4.5),
                      (12, 2.0, 8.6 if LANG == "te" else 5.6)],
    }
# audio events: (scene, offset_in_scene, file, gain_db)
def make_audio():
    return [
        (1, 0.10, vo(1), 0),
        (2, 0.15, vo(2), 0),
        (2, 0.90, AUD + r"\pop.wav", -6),
        (3, 0.15, vo(3), 0),
        (3, 0.60, VOICE + r"\hero_lead.wav", -2),
        (3, 11.8, AUD + r"\thud.wav", -4),
        (4, 0.15, vo(4), 0),
        (4, 5.60, AUD + r"\thud.wav", -4),
        (5, 0.15, vo(5), 0),
        (5, 0.50, AUD + r"\pop.wav", -8),
        (6, 0.15, vo(6), 0),
        (6, 4.80, AUD + r"\ting.wav", -3),
        (6, 5.80, AUD + r"\ting.wav", -6),
        (7, 0.15, vo(7), 0),
        (8, 0.15, vo(8), 0),
        (8, 1.60, AUD + r"\reminder.wav", -3),
        (8, 4.40, AUD + r"\reminder-te.wav", -3),
        (9, 0.15, vo(9), 0),
        (10, 0.15, vo(10), 0),
        (10, 2.20, VOICE + r"\telugu_lead.wav", -2),
        (10, 3.20, AUD + r"\te-readback.wav", -2),
        (11, 0.15, vo(11), 0),
        (12, 0.15, vo(12), 0),
        (12, 2.40, AUD + r"\thud.wav", -4),
    ]
# absolute-time overrides for trimmed cuts: (abs_t, file, gain_db)
def make_audio_abs():
    # TE vo01 is ~7.5s — push the shopkeeper clip + stamp past its tail
    sh = 2.6 if LANG == "te" else 0.0
    return {
        "brand-15s": [
            (0.1, vo(1), 0),
            (5.0 + sh, VOICE + r"\hero_lead.wav", -2),
            (7.8 + sh, AUD + r"\thud.wav", -4),
            (9.3 + sh, vo(12), 0),
            (11.5 + sh, AUD + r"\thud.wav", -4),
        ],
    }

def sh(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True,
                       encoding="utf-8", errors="replace")
    if r.returncode != 0:
        print("FFMPEG FAIL:", " ".join(cmd[:8]), "...\n",
              r.stderr[-1500:])
        sys.exit(1)
    return r

def overlay_footage(base, meta, tmp_out):
    rects = meta["rects"]
    if not rects:
        sh([FF, "-y", "-i", base, "-c:v", "libx264", "-preset", "fast",
            "-crf", "19", "-pix_fmt", "yuv420p", "-an", tmp_out])
        return
    inputs = [base]
    fc, cur = [], "[0:v]"
    for i, r in enumerate(rects):
        wins = r["wins"] or [[r.get("start", 0), meta["dur"]]]
        parts = []
        for wi, (s, e) in enumerate(wins):
            inputs.append(os.path.join(FOOT, r["src"]))
            idx = len(inputs) - 1
            fc.append(f"[{idx}:v]trim=start={s}:end={e},"
                      f"setpts=PTS-STARTPTS[w{i}_{wi}]")
            parts.append(f"[w{i}_{wi}]")
        if len(parts) > 1:
            fc.append("".join(parts) +
                      f"concat=n={len(parts)}:v=1:a=0[cat{i}]")
            cat = f"[cat{i}]"
        else:
            cat = parts[0]
        mask_idx = len(inputs); inputs.append(r["mask"])
        rad = math.radians(r["rot"]) if r["rot"] else 0
        fc.append(f"{cat}tpad=stop_mode=clone:stop=1,"
                  f"scale={int(r['w'])}:{int(r['h'])},"
                  f"format=rgba[s{i}]")
        fc.append(f"[s{i}][{mask_idx}:v]alphamerge[m{i}]")
        if rad:
            # rotate in-place (rotw/roth buggy in this build); the
            # rotated corners clip at the canvas edge under the bezel
            fc.append(f"[m{i}]rotate={rad}:c=none[v{i}]")
            x = int(r["x"]); y = int(r["y"])
        else:
            fc.append(f"[m{i}]copy[v{i}]")
            x = int(r["x"]); y = int(r["y"])
        fc.append(f"{cur}[v{i}]overlay={x}:{y}:shortest=0[o{i}]")
        cur = f"[o{i}]"
    fc.append(f"{cur}format=yuv420p[outv]")
    sh([FF, "-y"] + sum([["-i", f] for f in inputs], []) +
        ["-filter_complex", ";".join(fc), "-map", "[outv]",
         "-c:v", "libx264", "-preset", "fast", "-crf", "19",
         "-t", str(meta["dur"]), tmp_out])

def build_audio(cut, parts, total, out):
    offs, t = {}, 0.0
    for n, st, ln in parts:
        offs[n] = (t, st); t += ln
    ain, afc = [AUD + r"\music-loop.wav"], []
    afc.append("[1:a]aloop=loop=-1:size=2e9,volume=0.30[mus]")
    mix = ["[mus]"]
    if cut in AUDIO_ABS:
        for i, (at, f, g) in enumerate(AUDIO_ABS[cut]):
            ain.append(f)
            ms = int(at * 1000)
            afc.append(f"[{i+2}:a]adelay={ms}|{ms},volume="
                       f"{10**(g/20):.3f}[a{i}]")
            mix.append(f"[a{i}]")
    else:
        i = 0
        for sn, off, f, g in AUDIO:
            if sn not in offs:
                continue
            at = offs[sn][0] + off
            if at >= total:
                continue
            ain.append(f); i += 1
            ms = int(at * 1000)
            afc.append(f"[{i+1}:a]adelay={ms}|{ms},volume="
                       f"{10**(g/20):.3f}[a{i}]")
            mix.append(f"[a{i}]")
    afc.append("".join(mix) +
               f"amix=inputs={len(mix)}:normalize=0,"
               f"atrim=0:{total},"
               "aformat=sample_rates=48000:channel_layouts=stereo[a]")
    return ain, afc

def two_pass_loudnorm(silent, ain, afc, total, final):
    """Mix -> ebur128 measure -> volume gain to -14 LUFS + limiter."""
    import re
    mix_wav = OUT + "\\work\\" + os.path.basename(
        final).replace(".mp4", "-mix.wav")
    sh([FF, "-y", "-i", silent] +
        sum([["-i", f] for f in ain], []) +
        ["-filter_complex", ";".join(afc), "-map", "[a]",
         "-t", str(total), mix_wav])
    m = sh([FF, "-i", mix_wav, "-af", "ebur128",
            "-f", "null", "-"]).stderr
    vals = re.findall(r"I:\s+(-?\d+\.?\d*)\s+LUFS", m)
    i_lufs = float(vals[-1])  # last match = final summary
    gain = -14.0 - i_lufs
    print(f"  mix {i_lufs:.1f} LUFS -> gain {gain:+.1f} dB")
    sh([FF, "-y", "-i", silent, "-i", mix_wav,
        "-af", f"volume={gain}dB,"
        "alimiter=limit=0.891:level=false,"
        "aformat=sample_rates=48000:channel_layouts=stereo",
        "-map", "0:v", "-map", "1:a",
        "-c:v", "copy", "-c:a", "aac", "-b:a", "160k",
        "-shortest", final])

def main():
    fmt = sys.argv[1] if len(sys.argv) > 1 else "16x9"
    global LANG, CUTS, AUDIO, AUDIO_ABS
    LANG = "hi"
    if "--lang" in sys.argv:
        LANG = sys.argv[sys.argv.index("--lang") + 1]
    if LANG == "te":
        DUR.update(DUR_TE)
    CUTS = make_cuts()
    AUDIO = make_audio()
    AUDIO_ABS = make_audio_abs()
    ltag = "" if LANG == "hi" else f"-{LANG}"
    os.makedirs(OUT + "\\work", exist_ok=True)
    comp = {}
    for n in DUR:
        tag = f"seg-{n:02d}{ltag}-{fmt}"
        meta = json.load(open(OUT + f"\\{tag}.json"))
        dst = OUT + f"\\work\\{tag}-comp.mp4"
        if not os.path.exists(dst) or "--recomp" in sys.argv:
            overlay_footage(OUT + f"\\{tag}.webm", meta, dst)
        comp[n] = dst
        print("composited", tag)

    for cut, parts in CUTS.items():
        name = f"{cut}{ltag}-{fmt}"
        total = sum(ln for _, _, ln in parts)
        lst = OUT + f"\\work\\{name}.txt"
        with open(lst, "w") as f:
            for n, st, ln in parts:
                f.write(f"file '{comp[n]}'\n"
                        f"inpoint {st}\noutpoint {st+ln}\n")
        silent = OUT + f"\\work\\{name}-v.mp4"
        sh([FF, "-y", "-f", "concat", "-safe", "0", "-i", lst,
            "-c:v", "libx264", "-preset", "fast", "-crf", "19",
            "-pix_fmt", "yuv420p", "-an", silent])
        ain, afc = build_audio(cut, parts, total, silent)
        final = OUT + f"\\{name}.mp4"
        two_pass_loudnorm(silent, ain, afc, total, final)
        print("cut", name, round(total, 1), "s")

if __name__ == "__main__":
    main()
