import type { Step } from "@/lib/api";

const PROTOCOL_STYLE: Record<Step["protocol"], string> = {
  A2A: "bg-sky-100 text-sky-800",
  MCP: "bg-violet-100 text-violet-800",
  Jev: "bg-amber-100 text-amber-800",
  LLM: "bg-rose-100 text-rose-800",
  code: "bg-stone-200 text-stone-700",
  payment: "bg-emerald-100 text-emerald-800",
};

const PHASE_MN: Record<string, string> = {
  understand: "Ойлгох",
  remember: "Санах",
  discover: "Олох",
  compare: "Харьцуулах",
  decide: "Шийдэх",
  explain: "Тайлбарлах",
  checkout: "Захиалах",
  pay: "Төлөх",
  learn: "Суралцах",
};

function summary(step: Step): string | null {
  const d = step.detail as Record<string, unknown>;
  if (d.error) return String(d.error);
  if (step.protocol === "Jev" && d.intent) return `${d.intent} · итгэл ${Math.round(Number(d.confidence) * 100)}%`;
  if (Array.isArray(d.due)) return (d.due as { name: string; score: number }[]).map((x) => `${x.name} ${x.score}`).join(" · ");
  if (Array.isArray(d.matches))
    return (d.matches as { title: string; price: number; jev_confidence: number }[])
      .map((m) => `${m.title} ${m.price.toLocaleString()}₮ (Jev ${Math.round(m.jev_confidence * 100)}%)`)
      .join(" · ");
  if (d.found !== undefined) return `${d.found} бараа олдсон${(d.missing as string[])?.length ? ` · дутуу: ${(d.missing as string[]).join(", ")}` : ""}`;
  if (Array.isArray(d.agents)) return `${(d.agents as unknown[]).length} агент · agent-card.json`;
  if (d.total !== undefined) return `${Number(d.total).toLocaleString()}₮`;
  if (d.budget !== undefined) return `төсөв ${d.budget ? Number(d.budget).toLocaleString() + "₮" : "—"} · нэмэх: ${(d.add as string[])?.join(", ") || "—"}`;
  if (Array.isArray(d.due_now)) return `Одоо дуусах дөхсөн: ${(d.due_now as string[]).join(", ") || "байхгүй"}`;
  return null;
}

export function Timeline({ steps, running }: { steps: Step[]; running: boolean }) {
  return (
    <ol className="relative space-y-3 border-l border-line pl-5">
      {steps.map((s, i) => (
        <li key={i} className="step-in">
          <span className={`absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full ${s.ok ? "bg-accent" : "bg-warn"}`} />
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-medium text-muted">{PHASE_MN[s.phase] ?? s.phase}</span>
            <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${PROTOCOL_STYLE[s.protocol]}`}>{s.protocol}</span>
            <span className="font-mono text-[10px] text-muted">{s.actor}</span>
            <span className="ml-auto font-mono text-[10px] text-muted">{s.ms}ms</span>
          </div>
          <p className="mt-0.5 text-sm">{s.title}</p>
          {summary(s) && <p className="mt-0.5 line-clamp-2 text-xs text-muted">{summary(s)}</p>}
        </li>
      ))}
      {running && (
        <li className="text-sm text-muted">
          <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 animate-ping rounded-full bg-accent" />
          Агент ажиллаж байна…
        </li>
      )}
    </ol>
  );
}
