// Frontend-only mock of the Taobao flow (v0 design). Backend does not serve this yet;
// when it does, swap `mockApi` for real fetch calls with the same shapes.

export type Step = {
  phase: "understand" | "search" | "compare" | "cargo" | "decide" | "recheck" | "pay" | "order";
  protocol: "STT" | "LLM" | "MCP" | "A2A" | "cache" | "code" | "payment";
  actor: string;
  title: string;
  detail?: string;
  ms: number;
  ok: boolean;
};
export type Seller = { name: string; rating: number; years: number; positive_pct: number; badge: "trusted" | "ok" | "risky" };
export type Option = {
  id: string;
  rank: 1 | 2 | 3;
  title_mn: string;
  title_cn: string;
  image: string | null;
  price_cny: number;
  price_mnt: number;
  cargo_estimate_mnt: [number, number];
  weight_kg: number;
  service_fee_mnt: number;
  total_mnt: [number, number];
  sales_30d: number;
  seller: Seller;
  review_summary_mn: string;
  size_note_mn: string | null;
  warnings: string[];
  reason_mn: string;
};
export type Parsed = { item: string; size: string | null; color: string | null; budget_mnt: number | null };
export type OrderStatus = "created" | "bought_in_china" | "at_ereen" | "in_transit" | "arrived_ub" | "delivered";
export type Session = {
  id: string;
  message: string;
  status: "planning" | "proposed" | "rechecking" | "price_changed" | "awaiting_payment" | "ordered";
  parsed: Parsed;
  options: Option[];
  selected_id: string | null;
  price_change: { old_mnt: number; new_mnt: number; pct: number } | null;
  invoice: { invoice_id: string; amount: number; qr_text: string; banks: string[] } | null;
  order: { order_id: string; status: OrderStatus } | null;
  steps: Step[];
};

export const ORDER_FLOW: OrderStatus[] = ["created", "bought_in_china", "at_ereen", "in_transit", "arrived_ub", "delivered"];
export const mnt = (n: number) => `${Math.round(n).toLocaleString("en-US")}₮`;

const RATE = 480; // ₮ per ¥
const CARGO_PER_KG: [number, number] = [10000, 12500];
const FEE = 5000;

type Item = [title_mn: string, title_cn: string, cny: number, kg: number, sales: number, image: string | null];
type Scenario = { match: RegExp; parsed: Parsed; found: number; size_note: string | null; items: Item[] };

const img = (id: string) => `https://images.unsplash.com/${id}?w=700&q=80`;
const SCENARIOS: Scenario[] = [
  {
    match: /куртка|хүрэм|өвлийн/i,
    parsed: { item: "Хүүхдийн өвлийн куртка", size: "110", color: null, budget_mnt: 200000 },
    found: 36,
    size_note: "CN 110 нь 4–5 настай хүүхдэд таарна.",
    items: [
      ["Дулаан хүүхдийн куртка, малгайтай", "儿童加厚羽绒服", 239, 1.1, 2300, null],
      ["Хөнгөн хүүхдийн пуховик", "儿童轻薄羽绒服", 169, 0.8, 1450, null],
      ["Ус нэвтэрдэггүй өвлийн куртка", "防水儿童棉服", 199, 1.3, 610, null],
    ],
  },
  {
    match: /iphone|гэр|чехол/i,
    parsed: { item: "iPhone 15 гэр", size: null, color: null, budget_mnt: 20000 },
    found: 120,
    size_note: null,
    items: [
      ["Тунгалаг MagSafe гэр", "iPhone15 透明磁吸壳", 19, 0.1, 8800, null],
      ["Цохилтоос хамгаалах силикон гэр", "iPhone15 防摔硅胶壳", 12, 0.1, 5400, null],
      ["Арьсан хавтастай гэр", "iPhone15 皮革翻盖壳", 26, 0.2, 920, null],
    ],
  },
  {
    match: /./,
    parsed: { item: "Пүүз", size: "40", color: "Хар", budget_mnt: 150000 },
    found: 42,
    size_note: "CN 250 нь ихэвчлэн EU 40 хэмжээтэй таарна.",
    items: [
      ["Хар, хөнгөн өдөр тутмын пүүз", "黑色轻便休闲鞋", 129, 1.2, 1240, img("photo-1542291026-7eec264c27ff")],
      ["Минимал хар спорт пүүз", "简约黑色运动鞋", 88, 0.9, 890, img("photo-1552346154-21d32810aba3")],
      ["Зөөлөн ултай алхалтын пүүз", "软底跑步鞋", 108, 1.1, 560, img("photo-1600185365483-26d7a4cc7519")],
    ],
  },
];

const SELLERS: Seller[] = [
  { name: "百丽官方旗舰店", rating: 4.9, years: 6, positive_pct: 99, badge: "trusted" },
  { name: "运动优选店", rating: 4.7, years: 4, positive_pct: 97, badge: "ok" },
  { name: "舒适生活馆", rating: 4.5, years: 2, positive_pct: 94, badge: "risky" },
];

function buildOptions(sc: Scenario): Option[] {
  return sc.items.map(([title_mn, title_cn, cny, kg, sales, image], i) => {
    const price_mnt = cny * RATE;
    const cargo: [number, number] = [Math.round(kg * CARGO_PER_KG[0]), Math.round(kg * CARGO_PER_KG[1])];
    const rank = (i + 1) as 1 | 2 | 3;
    return {
      id: `opt-${rank}`,
      rank,
      title_mn,
      title_cn,
      image,
      price_cny: cny,
      price_mnt,
      cargo_estimate_mnt: cargo,
      weight_kg: kg,
      service_fee_mnt: FEE,
      total_mnt: [price_mnt + cargo[0] + FEE, price_mnt + cargo[1] + FEE],
      sales_30d: sales,
      seller: SELLERS[i],
      review_summary_mn: "Хэрэглэгчид чанартай, зурагтайгаа адилхан ирсэн гэж үнэлжээ.",
      size_note_mn: sc.size_note,
      warnings: rank === 3 ? ["Худалдагч шинэ, хэмжээг дахин шалгах шаардлагатай"] : [],
      reason_mn:
        rank === 1
          ? "Худалдагчийн үнэлгээ хамгийн өндөр, таны шаардлагад хамгийн ойр."
          : rank === 2
            ? "Хамгийн хямд нийт үнэтэй."
            : "Борлуулалт бага ч үнэ дунд зэрэг.",
    };
  });
}

function planSteps(sc: Scenario): Step[] {
  const p = sc.parsed;
  const parsed = [p.item, p.size, p.color, p.budget_mnt && `≤${mnt(p.budget_mnt)}`].filter(Boolean).join(", ");
  return [
    { phase: "understand", protocol: "LLM", actor: "OyuLLM", title: `Хүсэлтийг задаллаа: ${parsed}`, ms: 128, ok: true },
    { phase: "search", protocol: "cache", actor: "MongoDB", title: `Cache-ээс ${sc.found} бараа олдлоо`, ms: 84, ok: true },
    { phase: "compare", protocol: "MCP", actor: "taobao-mcp", title: "3 барааны дэлгэрэнгүй, худалдагчийн үнэлгээ авлаа", ms: 642, ok: true },
    { phase: "cargo", protocol: "A2A", actor: "cargo-agent", title: "Карго: жингээр тооцов, 7–10 хоног", ms: 311, ok: true },
    { phase: "decide", protocol: "code", actor: "rankOffers", title: "Үнэ + үнэлгээгээр эрэмбэлж 3 санал гаргалаа", ms: 3, ok: true },
  ];
}

const EXAMPLE_VOICE = "40 размерын хар пүүз, 150 мянгаас хэтрэхгүй";
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const clone = (s: Session): Session => structuredClone(s);
const STEP_MS = 450;

let store: Session | null = null;
let planned: Step[] = [];
let startedAt = 0;

function invoiceFor(amount: number): Session["invoice"] {
  return { invoice_id: "INV-2026-1042", amount, qr_text: "qpay://invoice/INV-2026-1042", banks: ["Хаан", "Голомт", "ТДБ", "Хас"] };
}

export const mockApi = {
  /** Oyu STT stand-in: real call uploads `audio` and returns Mongolian text. */
  async transcribe(audio: Blob): Promise<string> {
    await wait(900);
    return audio.size > 0 ? EXAMPLE_VOICE : "";
  },

  async plan(message: string, opts: { voiceMs?: number } = {}): Promise<Session> {
    const sc = SCENARIOS.find((s) => s.match.test(message))!;
    planned = planSteps(sc);
    if (opts.voiceMs)
      planned.unshift({ phase: "understand", protocol: "STT", actor: "Oyu STT", title: `Дуут хүсэлтийг текст болгов (${(opts.voiceMs / 1000).toFixed(1)}с)`, ms: 860, ok: true });
    startedAt = Date.now();
    store = {
      id: `sess-${startedAt}`,
      message,
      status: "planning",
      parsed: sc.parsed,
      options: buildOptions(sc),
      selected_id: null,
      price_change: null,
      invoice: null,
      order: null,
      steps: [],
    };
    return clone(store);
  },

  /** Reveals planning steps over time so the timeline fills in like a live agent. */
  async session(): Promise<Session> {
    const s = store!;
    if (s.status === "planning") {
      s.steps = planned.slice(0, Math.floor((Date.now() - startedAt) / STEP_MS));
      if (s.steps.length === planned.length) s.status = "proposed";
    }
    return clone(s);
  },

  async select(optionId: string): Promise<Session> {
    const s = store!;
    const o = s.options.find((x) => x.id === optionId)!;
    s.selected_id = optionId;
    await wait(900);
    // Demo: the top pick's price moved since cache, so the agent asks again before paying.
    if (o.rank === 1) {
      const next = Math.round((o.total_mnt[0] * 1.12) / 100) * 100;
      s.status = "price_changed";
      s.price_change = { old_mnt: o.total_mnt[0], new_mnt: next, pct: 12 };
      s.steps.push({ phase: "recheck", protocol: "MCP", actor: "taobao-mcp", title: "Үнэ 12% өссөн байна — дахин батлуулна", ms: 412, ok: false });
    } else {
      s.status = "awaiting_payment";
      s.invoice = invoiceFor(o.total_mnt[0]);
      s.steps.push(
        { phase: "recheck", protocol: "MCP", actor: "taobao-mcp", title: "Үнэ, үлдэгдэл өөрчлөгдөөгүй", ms: 398, ok: true },
        { phase: "pay", protocol: "payment", actor: "QPay", title: `Invoice үүсгэлээ: ${mnt(o.total_mnt[0])}`, ms: 220, ok: true },
      );
    }
    return clone(s);
  },

  async acceptPriceChange(): Promise<Session> {
    const s = store!;
    const amount = s.price_change!.new_mnt;
    s.status = "awaiting_payment";
    s.invoice = invoiceFor(amount);
    s.steps.push({ phase: "pay", protocol: "payment", actor: "QPay", title: `Шинэ үнээр invoice үүсгэлээ: ${mnt(amount)}`, ms: 230, ok: true });
    return clone(s);
  },

  backToOptions(): Session {
    const s = store!;
    Object.assign(s, { status: "proposed", selected_id: null, price_change: null, invoice: null });
    return clone(s);
  },

  async confirmPaid(): Promise<Session> {
    const s = store!;
    await wait(700);
    s.status = "ordered";
    s.order = { order_id: "ORD-MN-2026-1042", status: "created" };
    s.steps.push(
      { phase: "pay", protocol: "payment", actor: "QPay", title: "payment/check: төлөгдсөн", ms: 180, ok: true },
      { phase: "order", protocol: "MCP", actor: "taobao-mcp", title: "Taobao дээр захиалга үүслээ (mock)", ms: 540, ok: true },
    );
    return clone(s);
  },

  /** Demo "fast-forward" for the tracker; real status comes from the cargo agent. */
  advanceOrder(): Session {
    const o = store!.order!;
    o.status = ORDER_FLOW[Math.min(ORDER_FLOW.indexOf(o.status) + 1, ORDER_FLOW.length - 1)];
    return clone(store!);
  },
};
