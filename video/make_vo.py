#!/usr/bin/env python
"""Generate brand-film narration (vo01..vo12) per language via the LIVE
deployed /api/tts -> Gnani Timbre. Usage: python make_vo.py [en|te|hi]
Writes audio/vo-<lang>-NN.wav (hi writes to voNN.wav for back-compat)."""
import json, os, sys, urllib.request

BASE = "https://bolo-khata.onrender.com"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "audio")

LINES = {
    "hi": [
        "सुबह आठ बजे। तीन कस्टमर एक साथ। और खाता? वही फटा हुआ रजिस्टर।",
        "अब बस… बोलो।",
        "2 किलो चीनी, 1 Maggi, 500 ग्राम दाल, रमेश के नाम। बिल खुद लिख गया — असली आवाज़, असली speech-to-text। 174 रुपये। रमेश। हो गया।",
        "कस्टमर को वही बिल मिलता है — confirm या dispute, दोनों तरफ से। सही है या गलत — दोनों के सामने।",
        "नया आइटम? ऐप पूछता है — अंदाज़ा नहीं लगाता।",
        "कैश, UPI QR — self-reported — या उधार। स्टॉक भी घटता है।",
        "कस्टमर QR स्कैन करे — अपना खाता खुल जाता है।",
        "पैसे माँगना awkward है? ऐप इज़्ज़त से आवाज़ में याद दिलाता है।",
        "दूध वाला हो या किराना — deliveries, छुट्टी, हिसाब। Assistant चलाए।",
        "Hinglish, తెలుగు, English। अपनी दुकान जैसी।",
        "शोर में test किया। नतीजे public। गलतियाँ भी।",
        "बोलो। खाता लिख गया। Bolo Khata — India's voice-first ledger.",
    ],
    "en": [
        "8 AM. Three customers at once. And the ledger? That same torn register.",
        "Now just… speak.",
        "Two kilos sugar, one Maggi, five hundred grams dal, in Ramesh's name. The bill wrote itself — real voice, real speech-to-text. 174 rupees. Ramesh. Done.",
        "The customer gets the same bill — confirm or dispute, from both sides. Right or wrong — out in the open.",
        "New item? The app asks — it doesn't guess.",
        "Cash, UPI QR — self-reported — or credit. Stock drops too.",
        "Customer scans the QR — their own khata opens.",
        "Asking for money is awkward? The app reminds them politely — in voice.",
        "Milk shop or kirana — deliveries, leave, accounts. The assistant runs it.",
        "Hinglish, Telugu, English. Just like your shop.",
        "Tested in noise. Results are public. So are the mistakes.",
        "Speak. The khata is written. Bolo Khata — India's voice-first ledger.",
    ],
    "te": [
        "ఉదయం ఎనిమిది గంటలకు. ముగ్గురు కస్టమర్లు ఒకేసారి. మరి ఖాతా? అదే చిరిగిపోయిన రిజిస్టరు.",
        "ఇప్పుడు కేవలం… చెప్పండి.",
        "రెండు కిలో చక్కెర, ఒక Maggi, ఐదొందల గ్రాముల పప్పు, రమేష్ పేరు మీద. బిల్లు తనంతట తానే రాసింది — నిజమైన వాయిస్, నిజమైన speech-to-text. నూట డెబ్బై నాలుగు రూపాయలు. రమేష్. అయిపోయింది.",
        "కస్టమర్‌కు అదే బిల్లు వస్తుంది — confirm లేదా dispute, రెండు వైపులా. సరియైనదా తప్పా — అందరి ముందు.",
        "కొత్త ఐటమా? యాప్ అడుగుతుంది — అంచనా వేయదు.",
        "క్యాష్, UPI QR — self-reported — లేదా ఉధార్. స్టాక్ కూడా తగ్గుతుంది.",
        "కస్టమర్ QR స్కాన్ చేస్తే — వారి స్వంత ఖాతా తెరుస్తుంది.",
        "డబ్బు అడగడం ఇబ్బందిగా ఉందా? యాప్ గౌరవంగా గుర్తు చేస్తుంది — వాయిస్‌లోనే.",
        "పాల షాపా లేదా కిరాణా — డెలివరీలు, సెలవులు, లెక్కలు. అసిస్టెంట్ నడుపుతాడు.",
        "Hinglish, తెలుగు, English. మీ దుకాణం లాగానే.",
        "శబ్దంలో పరీక్షించాం. ఫలితాలు బహిరంగం. తప్పులు కూడా.",
        "చెప్పండి. ఖాతా రాసేసింది. Bolo Khata — India's voice-first ledger.",
    ],
}
# /api/tts lang keys from backend config.LANGS
TTS_LANG = {"hi": "hinglish", "en": "en", "te": "te"}


def main():
    lang = sys.argv[1] if len(sys.argv) > 1 else "en"
    os.makedirs(OUT, exist_ok=True)
    for i, text in enumerate(LINES[lang], 1):
        name = f"vo{i:02d}.wav" if lang == "hi" else f"vo-{lang}-{i:02d}.wav"
        dst = os.path.join(OUT, name)
        req = urllib.request.Request(
            BASE + "/api/tts",
            data=json.dumps({"text": text, "lang": TTS_LANG[lang]}).encode(),
            headers={"Content-Type": "application/json"})
        try:
            data = urllib.request.urlopen(req, timeout=60).read()
        except Exception as e:
            print(name, "FAIL", e)
            continue
        if data[:4] != b"RIFF":
            print(name, "FAIL non-wav:", data[:80])
            continue
        open(dst, "wb").write(data)
        print(name, len(data), "bytes")


if __name__ == "__main__":
    main()
