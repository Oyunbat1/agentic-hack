// Mirrors backend/sags/contracts.py — keep in sync with the Python models.

export const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type Offer = {
  store_id: string;
  sku: string;
  product_id: string | null;
  title: string;
  brand: string | null;
  price: number;
  unit: string;
  stock: number;
  image: string | null;
  match_confidence: number | null;
};

export type BasketLine = {
  product_id: string;
  name_mn: string;
  qty: number;
  reason: "due" | "requested";
  due_score: number | null;
  offer: Offer | null;
  line_total: number;
  note: string | null;
};

export type StorePlan = {
  store_ids: string[];
  lines: BasketLine[];
  subtotal: number;
  delivery: number;
  total: number;
  missing: string[];
  warnings: string[];
};

export type Proposal = {
  chosen: StorePlan;
  alternatives: StorePlan[];
  reference: Record<string, number>;
  dropped: BasketLine[];
  budget: number | null;
  explanation: string;
};

export type Step = {
  phase: string;
  protocol: "A2A" | "MCP" | "Jev" | "LLM" | "code" | "payment";
  actor: string;
  title: string;
  detail: Record<string, unknown>;
  ms: number;
  ok: boolean;
  at: string;
};

export type StoreQuote = {
  store: { store_id: string; name: string; delivery_fee: number; min_order: number; delivery_eta: string; checkout: boolean };
  offers: Record<string, Offer[]>;
  missing: string[];
};

export type Session = {
  id: string;
  message: string;
  status: "planning" | "proposed" | "awaiting_payment" | "completed" | "failed";
  steps: Step[];
  quotes: StoreQuote[];
  proposal: Proposal | null;
  invoice: { invoice_id: string; amount: number; qr_text: string; status: string } | null;
  orders: { order_id: string; store_id: string; total: number }[];
  error: string | null;
};

export type DueItem = {
  product_id: string;
  name_mn: string;
  typical_qty: number;
  days_since: number;
  avg_interval_days: number;
  weight: number;
  due_score: number;
};

export type Memory = { due: DueItem[]; history: { store_id: string; total: number; created_at: string; items: unknown[] }[] };

export type AgentCard = { id: string; online: boolean; name?: string; skills?: { id: string }[]; metadata?: { mcp_url?: string; checkout?: boolean } };

async function call<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(API + path, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.detail ?? res.statusText);
  return res.json();
}

export const api = {
  plan: (message: string) => call<{ session_id: string }>("/api/plan", { message }),
  session: (id: string) => call<Session>(`/api/session/${id}`),
  approve: (session_id: string, removed: string[]) => call<Session>("/api/approve", { session_id, removed }),
  confirm: (session_id: string) => call<Session>("/api/confirm", { session_id }),
  memory: (userId = "demo") => call<Memory>(`/api/memory/${userId}`),
  agents: () => call<AgentCard[]>("/api/agents"),
};

export const mnt = (n: number) => `${Math.round(n).toLocaleString("en-US")}₮`;
