// Resolution order: explicit NEXT_PUBLIC_API_URL (prod: the API host),
// then same-origin (ngrok single-tunnel dev), then localhost:8000.
const ENV_API = process.env.NEXT_PUBLIC_API_URL || "";
export const API =
  ENV_API ||
  (typeof window !== "undefined"
    ? (window.location.port === "3000" ? "http://localhost:8000" : "")
    : "");
export const WS_URL = (ENV_API
  ? ENV_API.replace(/^http/, "ws")
  : (typeof window !== "undefined"
    ? `${window.location.protocol === "https:" ? "wss" : "ws"}://` +
      `${window.location.port === "3000" ? "localhost:8000" : window.location.host}`
    : "ws://localhost:8000")) + "/ws/stt";

export interface Proposal {
  proposal_id: string;
  kind: "bill" | "action";
  intent: string;
  description: string;
  spoken: string;
  confidence: number;
  needs_confirm: boolean;
  error?: string;
  unresolved: string[];
  items?: {
    product_name?: string; name: string; qty: number; unit: string;
    unit_price_paise: number; line_total_paise: number; score: number;
  }[];
  customer_id?: number | null;
  customer_name?: string | null;
  total_paise?: number;
  lang: string;
  noise_hint?: boolean;
}

export interface WriteResult {
  ok: boolean; written: boolean; txn_id?: number;
  confirm_token?: string; confirm_path?: string;
  spoken?: string; balance_paise?: number; error?: string;
}

let token = "";
export function setToken(t: string) { token = t; }

async function req(path: string, init?: RequestInit) {
  const r = await fetch(API + path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  return r.json();
}

export const api = {
  login: (email: string, password: string) =>
    req("/api/login", {
      method: "POST", body: JSON.stringify({ email, password }),
    }) as Promise<{ token: string; role: string }>,
  command: (transcript: string, lang: string) =>
    req("/api/command", {
      method: "POST", body: JSON.stringify({ transcript, lang }),
    }) as Promise<Proposal>,
  confirm: (proposal_id: string, accept: boolean, payment_method = "") =>
    req("/api/confirm", {
      method: "POST",
      body: JSON.stringify({ proposal_id, accept, payment_method }),
    }) as Promise<WriteResult>,
  ledger: () => req("/api/ledger"),
  catalog: () => req("/api/catalog"),
  summary: () => req("/api/summary"),
  undo: () => req("/api/undo", { method: "POST" }),
  upi: (amount_paise: number) =>
    req(`/api/upi?amount_paise=${amount_paise}`),
  reminders: () => req("/api/reminders"),
  reminderDone: (id: number) =>
    req(`/api/reminders/${id}/done`, { method: "POST" }),
  reorder: () => req("/api/reorder"),
  deliveries: () => req("/api/deliveries"),
  weekly: () => req("/api/weekly"),
  shop: () => req("/api/shop") as Promise<{
    name: string; business_type: string; vpa: string; join_code: string;
  }>,
  joinInfo: (code: string) => req(`/api/join/${code}`),
  joinShop: (code: string, name: string, phone: string, lang: string) =>
    req(`/api/join/${code}`, {
      method: "POST",
      body: JSON.stringify({ name, phone, lang_pref: lang }),
    }),
  tts: async (text: string, lang: string): Promise<Blob> => {
    const r = await fetch(API + "/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, lang }),
    });
    return r.blob();
  },
  reminderView: (tok: string) => req(`/api/r/${tok}`),
  confirmView: (tok: string) => req(`/api/confirm/${tok}`),
  confirmRespond: (tok: string, action: "confirm" | "dispute") =>
    req(`/api/confirm/${tok}/respond`, {
      method: "POST", body: JSON.stringify({ action }),
    }),
};

export function speak(text: string, lang: string) {
  return api.tts(text, lang).then((blob) => {
    const url = URL.createObjectURL(blob);
    const a = new Audio(url);
    a.play().catch(() => {});
    setTimeout(() => URL.revokeObjectURL(url), 15000);
  });
}

export const inr = (paise?: number | null) =>
  "₹" + ((paise ?? 0) / 100).toLocaleString("en-IN");
