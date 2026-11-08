"use client";
// Shared language state for public + onboarding pages.
// Choice persists in localStorage bk_lang and is read by /app too.

import { useEffect, useState } from "react";

export type Lang = "hinglish" | "te" | "en";

export function getLang(): Lang {
  if (typeof window === "undefined") return "hinglish";
  return (localStorage.getItem("bk_lang") as Lang) || "hinglish";
}

export function setLangStored(l: Lang) {
  try { localStorage.setItem("bk_lang", l); } catch {}
}

export function useLang(): [Lang, (l: Lang) => void] {
  const [lang, setLang] = useState<Lang>("hinglish");
  useEffect(() => { setLang(getLang()); }, []);
  const set = (l: Lang) => { setLang(l); setLangStored(l); };
  return [lang, set];
}

export const LANG_OPTIONS: { k: Lang; label: string; sub: string }[] = [
  { k: "hinglish", label: "हिंग्लिश", sub: "Hinglish" },
  { k: "te", label: "తెలుగు", sub: "Telugu" },
  { k: "en", label: "English", sub: "English" },
];

export const pick = <T,>(lang: Lang, m: { hi: T; te: T; en: T }): T =>
  lang === "te" ? m.te : lang === "en" ? m.en : m.hi;
