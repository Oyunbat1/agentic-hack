"use client";

import { useEffect, useState } from "react";
import { OptionCard } from "@/components/OptionCard";
import { OptionSheet } from "@/components/OptionSheet";
import { OrderTracker } from "@/components/OrderTracker";
import { PaymentCard } from "@/components/PaymentCard";
import { Timeline } from "@/components/Timeline";
import { mnt, mockApi as api, type Option, type Session } from "@/lib/mock";

const EXAMPLES = ["40 размерын хар пүүз, 150к хүртэл", "Хүүхдийн өвлийн куртка 110, 200к", "iPhone 15 гэр, 20к"];
const SERVICES = [
  ["OyuLLM", "LLM"],
  ["Taobao", "MCP"],
  ["Карго агент", "A2A"],
  ["QPay", "sandbox"],
];

export default function Home() {
  const [message, setMessage] = useState("");
  const [s, setS] = useState<Session | null>(null);
  const [detail, setDetail] = useState<Option | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // Poll while the agent is planning so the timeline fills in live.
  useEffect(() => {
    if (s?.status !== "planning") return;
    const t = setInterval(() => api.session().then(setS), 250);
    return () => clearInterval(t);
  }, [s?.status]);

  async function run(fn: () => Promise<Session> | Session) {
    setBusy(true);
    try {
      setS(await fn());
    } finally {
      setBusy(false);
    }
  }

  const plan = (text = message) => {
    if (!text.trim() || busy) return;
    setMessage(text);
    setDetail(null);
    run(() => api.plan(text));
  };

  const choose = (o: Option) =>
    run(async () => {
      const next = await api.select(o.id);
      if (next.status !== "price_changed") setDetail(null);
      return next;
    });

  const acceptPrice = () =>
    run(async () => {
      setDetail(null);
      return api.acceptPriceChange();
    });

  const p = s?.parsed;

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line bg-white/75 backdrop-blur-xl">
        <div className="relative mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 md:px-6">
          <b className="font-display text-xl font-bold tracking-tight">Сагс</b>
          <small className="text-[11px] text-muted">Taobao агент</small>
          <button
            onClick={() => setStatusOpen((v) => !v)}
            className="ml-auto flex h-10 items-center gap-1.5 rounded-lg px-3 text-xs hover:bg-tile"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-ok" />
            Онлайн
          </button>
          {statusOpen && (
            <div className="absolute top-14 right-4 w-56 rounded-xl border border-line bg-card p-4 text-xs leading-7 md:right-6">
              {SERVICES.map(([name, proto]) => (
                <p key={name} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-ok" />
                  {name}
                  <span className="ml-auto font-mono text-[10px] text-muted">{proto}</span>
                </p>
              ))}
              <p className="mt-1 border-t border-line pt-1 text-[10px] text-muted">mock өгөгдөл</p>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-12">
        <div className="grid gap-12 lg:grid-cols-[1fr_300px] lg:gap-16">
          <section className="min-w-0">
            {!s && (
              <div className="mt-4 mb-10 md:mt-8">
                <h1 className="mb-3.5 text-3xl leading-tight font-bold tracking-tight md:text-4xl">
                  Монголоор хэл.
                  <br />
                  Бид Taobao-оос олж ирье.
                </h1>
                <p className="max-w-xl text-muted">
                  Хайж, харьцуулж, карготой нийт үнийг тооцоод, зөвхөн таны зөвшөөрлөөр захиална.
                </p>
              </div>
            )}

            {p && s.status !== "planning" && (
              <div className="mb-5 inline-flex max-w-full flex-wrap items-center gap-x-3.5 gap-y-1 rounded-full border border-line px-3 py-1.5 text-xs text-muted">
                <span>{[p.item, p.size && `${p.size} размер`, p.color, p.budget_mnt && `≤${mnt(p.budget_mnt)}`].filter(Boolean).join(" · ")}</span>
                <button onClick={() => setS(null)} className="text-ink underline">
                  Засах
                </button>
              </div>
            )}

            {(!s || s.status === "planning" || s.status === "proposed" || s.status === "price_changed") && (
              <>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    plan();
                  }}
                  className="flex h-13 items-center gap-2.5 rounded-xl border border-line py-1.5 pr-1.5 pl-4 focus-within:border-ink"
                >
                  <input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="min-w-0 flex-1 bg-transparent outline-none"
                    placeholder="40 размерын хар пүүз, 150 мянгаас хэтрэхгүй"
                    aria-label="Хайх хүсэлт"
                  />
                  <button
                    disabled={busy || !message.trim() || s?.status === "planning"}
                    className="h-10 rounded-lg bg-ink px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
                  >
                    Хайх
                  </button>
                </form>
                <div className="mt-3 flex flex-wrap gap-2">
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex}
                      onClick={() => plan(ex)}
                      className="rounded-full border border-line px-3 py-1.5 text-xs text-muted hover:text-ink"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </>
            )}

            {(s?.status === "proposed" || s?.status === "price_changed") && (
              <>
                <div className="mt-12 mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div>
                    <h2 className="text-[28px] font-semibold tracking-tight">3 сонголт</h2>
                    <span className="text-xs text-muted">{s.steps.find((x) => x.phase === "search")?.title}</span>
                  </div>
                  <p className="max-w-sm text-[13px] leading-relaxed text-muted">{s.options[0].reason_mn}</p>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-7 md:grid-cols-3 md:gap-x-4 md:gap-y-9">
                  {s.options.map((o) => (
                    <OptionCard key={o.id} option={o} budget={s.parsed.budget_mnt} onClick={() => setDetail(o)} />
                  ))}
                </div>
              </>
            )}

            {s?.status === "awaiting_payment" && (
              <PaymentCard session={s} busy={busy} onPaid={() => run(api.confirmPaid)} onBack={() => run(api.backToOptions)} />
            )}
            {s?.status === "ordered" && s.order && <OrderTracker order={s.order} onAdvance={() => run(api.advanceOrder)} />}
          </section>

          <aside className="border-t border-line pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
            <p className="mb-3 text-[11px] tracking-widest text-muted">АГЕНТ ЮУ ХИЙВ</p>
            {s ? (
              <Timeline steps={s.steps} running={s.status === "planning"} />
            ) : (
              <p className="text-sm text-muted">Алхам бүр энд харагдана: LLM · MCP · A2A · QPay</p>
            )}
          </aside>
        </div>
      </main>

      {detail && s && (
        <OptionSheet
          option={detail}
          session={s}
          busy={busy}
          onChoose={() => choose(detail)}
          onAcceptPrice={acceptPrice}
          onClose={() => setDetail(null)}
        />
      )}
    </>
  );
}
