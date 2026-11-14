// Resolution order: explicit NEXT_PUBLIC_API_URL (prod: the API host),
// then local dev (any localhost port incl. preview proxies), then
// same-origin (ngrok single-tunnel / deployed).
const ENV_API = process.env.NEXT_PUBLIC_API_URL || "";
const IS_LOCAL = typeof window !== "undefined" &&
  /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);
export const API =
  ENV_API || (IS_LOCAL ? "http://localhost:8000" : "");
export const WS_URL = (ENV_API
  ? ENV_API.replace(/^http/, "ws")
  : (IS_LOCAL
    ? "ws://localhost:8000"
    : (typeof window !== "undefined"
      ? `${window.location.protocol === "https:" ? "wss" : "ws"}://` +
        window.location.host
      : "ws://localhost:8000"))) + "/ws/stt";

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
    product_id?: number | null; product_name?: string; name: string;
    qty: number; unit: string;
    unit_price_paise: number; line_total_paise: number; score: number;
    options?: string[];
  }[];
  customer_id?: number | null;
  customer_name?: string | null;
  total_paise?: number;
  lang: string;
  noise_hint?: boolean;
  edited?: boolean;
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
    signal: AbortSignal.timeout(20000),
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
  signup: (email: string, password: string, name: string) =>
    req("/api/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    }) as Promise<{ token: string; role: string; shop_id: number;
      needs_onboarding: boolean }>,
  sessionLogin: (email: string, password: string) =>
    req("/api/session/login", {
      method: "POST", body: JSON.stringify({ email, password }),
    }) as Promise<{ token: string; role: string; shop_id: number;
      needs_onboarding: boolean }>,
  session: () =>
    req("/api/session") as Promise<{ actor: string; role: string;
      shop_id: number; shop_name?: string; needs_onboarding: boolean }>,
  shopSetup: (body: { name: string; business_type: string; vpa?: string;
    city?: string; modules?: Record<string, boolean>;
    labels?: Record<string, string>; starter?: boolean;
    catalog?: any[] }) =>
    req("/api/shop/setup", {
      method: "POST", body: JSON.stringify(body),
    }) as Promise<{ ok: boolean; shop_id: number; name: string;
      join_code: string; business_type: string; token: string }>,
  billEdit: (items: any[], opts: { customer_id?: number | null;
    customer_name?: string; lang?: string; transcript?: string }) =>
    req("/api/bill/edit", {
      method: "POST",
      body: JSON.stringify({ items, ...opts }),
    }) as Promise<Proposal>,
  addProduct: (p: { name_en: string; name_hi?: string; name_te?: string;
    aliases?: string; unit?: string; price_paise?: number;
    stock?: number }) =>
    req("/api/products", {
      method: "POST", body: JSON.stringify(p),
    }) as Promise<{ ok: boolean; product: any }>,
  editProduct: (id: number, p: { name_en: string; unit?: string;
    price_paise?: number; stock?: number }) =>
    req(`/api/products/${id}`, {
      method: "PATCH", body: JSON.stringify(p),
    }),
  deleteProduct: (id: number) =>
    req(`/api/products/${id}`, { method: "DELETE" }),
  addCustomer: (name: string, phone = "", lang_pref = "hinglish") =>
    req("/api/customers", {
      method: "POST",
      body: JSON.stringify({ name, phone, lang_pref }),
    }) as Promise<{ ok: boolean; customer: any; existed?: boolean }>,
  staffInvite: (name: string) =>
    req("/api/staff/invite", {
      method: "POST", body: JSON.stringify({ name }),
    }) as Promise<{ ok: boolean; name: string; invite_code: string }>,
  staffRegister: (invite_code: string, pin: string) =>
    req("/api/staff/register", {
      method: "POST", body: JSON.stringify({ invite_code, pin }),
    }) as Promise<{ token: string; staff_id: number; role: string;
      shop_id: number; name: string }>,
  custSignup: (name: string, pin: string, contact = "",
               join_code = "") =>
    req("/api/me/signup", {
      method: "POST",
      body: JSON.stringify({ name, pin, contact, join_code }),
    }) as Promise<{ token: string; account_id: number;
      customer_id?: number; shop_name?: string }>,
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
  staffLogin: (name: string, pin: string) =>
    req("/api/staff/login", {
      method: "POST", body: JSON.stringify({ name, pin }),
    }) as Promise<{ token: string; staff_id: number; role: string }>,
  staffLeave: () => req("/api/staff/leave"),
  staffLeaveRespond: (id: number, action: "accept" | "dispute") =>
    req(`/api/staff/leave/${id}/respond`, {
      method: "POST", body: JSON.stringify({ action }),
    }),
  leave: () => req("/api/leave"),
  shop: () => req("/api/shop") as Promise<{
    name: string; business_type: string; vpa: string; join_code: string;
    config?: any; modules?: Record<string, boolean>;
  }>,
  setShopConfig: (business_type: string,
                  modules: Record<string, boolean>,
                  labels: Record<string, string>) =>
    req("/api/shop/config", {
      method: "POST",
      body: JSON.stringify({ business_type, modules, labels }),
    }),
  joinInfo: (code: string) => req(`/api/join/${code}`),
  joinShop: (code: string, name: string, phone: string, lang: string,
             pin = "") =>
    req(`/api/join/${code}`, {
      method: "POST",
      body: JSON.stringify({ name, phone, lang_pref: lang, pin }),
    }),
  custLogin: (name: string, pin: string) =>
    req("/api/me/login", {
      method: "POST", body: JSON.stringify({ name, pin }),
    }) as Promise<{ token: string }>,
  me: () => req("/api/me"),
  meLedger: () => req("/api/me/ledger"),
  mePending: () => req("/api/me/pending"),
  meExpenses: () => req("/api/me/expenses"),
  meReminders: () => req("/api/me/reminders"),
  tts: async (text: string, lang: string): Promise<Blob> => {
    const r = await fetch(API + "/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, lang }),
    });
    return r.blob();
  },
  tryCommand: (transcript: string, lang: string) =>
    req("/api/try/command", {
      method: "POST", body: JSON.stringify({ transcript, lang }),
    }) as Promise<Proposal>,
  tryConfirm: (proposal_id: string, accept: boolean,
               payment_method = "") =>
    req("/api/try/confirm", {
      method: "POST",
      body: JSON.stringify({ proposal_id, accept, payment_method }),
    }) as Promise<WriteResult>,
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
