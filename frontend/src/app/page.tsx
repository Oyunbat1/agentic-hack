"use client";

import { useCallback, useEffect, useState } from "react";
import { MemoryPanel } from "@/components/MemoryPanel";
import { PaymentCard } from "@/components/PaymentCard";
import { ProposalCard } from "@/components/ProposalCard";
import { Timeline } from "@/components/Timeline";
import { api, type AgentCard, type Memory, type Session } from "@/lib/api";

const EXAMPLES = [
  "Энэ долоо хоногийн сагсаа 150к-д бэлд, өндөг нэм",
  "Сагсаа 50к-д багтаа, сүү хэрэггүй",
  "Зөвхөн талх, өндөг ав",
];

export default function Home() {
  const [message, setMessage] = useState(EXAMPLES[0]);
  const [session, setSession] = useState<Session | null>(null);
  const [memory, setMemory] = useState<Memory | null>(null);
  const [agents, setAgents] = useState<AgentCard[]>([]);
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshMemory = useCallback(() => api.memory().then(setMemory).catch(() => {}), []);

  useEffect(() => {
    refreshMemory();
    api.agents().then(setAgents).catch(() => setError("Backend ажиллахгүй байна — `python -m sags.dev`"));
  }, [refreshMemory]);

  // Poll while the agent is planning so the timeline fills in live.
  useEffect(() => {
    if (session?.status !== "planning") return;
    const t = setInterval(() => api.session(session.id).then(setSession).catch(() => {}), 400);
    return () => clearInterval(t);
  }, [session?.id, session?.status]);

  async function run<T>(fn: () => Promise<T>) {
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const plan = () =>
    run(async () => {
      setRemoved(new Set());
      const { session_id } = await api.plan(message);
      setSession(await api.session(session_id));
    });

  const approve = () => run(async () => setSession(await api.approve(session!.id, [...removed])));
  const pay = () =>
    run(async () => {
      setSession(await api.confirm(session!.id));
      refreshMemory();
    });

  const toggle = (pid: string) =>
    setRemoved((prev) => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 md:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Сагс</h1>
          <p className="text-sm text-muted">Таны талд ажилладаг, худалдан авалтаа санадаг агент</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {agents.map((a) => (
            <span key={a.id} className="flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1 text-xs" title={a.metadata?.mcp_url}>
              <span className={`h-2 w-2 rounded-full ${a.online ? "bg-accent" : "bg-warn"}`} />
              {a.name ?? a.id}
              <span className="font-mono text-[10px] text-muted">A2A{a.metadata?.checkout === false ? " · web" : ""}</span>
            </span>
          ))}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="space-y-5">
          <div className="rounded-2xl border border-line bg-card p-4">
            <div className="flex gap-2">
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !busy && plan()}
                className="flex-1 rounded-xl border border-line bg-bg px-4 py-3 outline-none focus:border-accent"
                placeholder="Юу авах вэ?"
              />
              <button onClick={plan} disabled={busy || !message.trim()} className="rounded-xl bg-accent px-5 font-semibold text-white disabled:opacity-50">
                Бэлдэх
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <button key={ex} onClick={() => setMessage(ex)} className="rounded-full bg-bg px-3 py-1 text-xs text-muted hover:text-ink">
                  {ex}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="rounded-xl bg-orange-50 px-4 py-3 text-sm text-warn">{error}</p>}
          {session?.error && <p className="rounded-xl bg-orange-50 px-4 py-3 text-sm text-warn">{session.error}</p>}

          {session?.proposal && (
            <div className="rounded-2xl border border-line bg-card p-5">
              <ProposalCard session={session} removed={removed} onToggle={toggle} onApprove={approve} busy={busy} />
            </div>
          )}
          {session?.invoice && <PaymentCard session={session} onPay={pay} busy={busy} />}

          {!session && (
            <div className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-muted">
              Хүсэлтээ бичээд «Бэлдэх» дар. Агент таны түүхээс дуусах дөхсөн барааг санаж, 4 дэлгүүрийн агентаас (A2A) үнэ
              авч, хамгийн хямд сагсыг санал болгоно. Төлбөр зөвхөн таны баталгаажуулалтаар хийгдэнэ.
            </div>
          )}
        </section>

        <aside className="space-y-5">
          <div className="rounded-2xl border border-line bg-card p-5">
            <h2 className="mb-3 font-semibold">Агент юу хийв</h2>
            {session ? (
              <Timeline steps={session.steps} running={session.status === "planning"} />
            ) : (
              <p className="text-sm text-muted">Алхам бүр энд харагдана: Jev · MCP · A2A · LLM</p>
            )}
          </div>
          <div className="rounded-2xl border border-line bg-card p-5">
            <h2 className="mb-3 font-semibold">Ой санамж · дуусах оноо</h2>
            <MemoryPanel memory={memory} />
          </div>
        </aside>
      </div>
    </main>
  );
}
