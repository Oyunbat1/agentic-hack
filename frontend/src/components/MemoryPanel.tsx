import type { Memory } from "@/lib/api";

export function MemoryPanel({ memory }: { memory: Memory | null }) {
  if (!memory) return <p className="text-sm text-muted">Ачаалж байна…</p>;
  const top = memory.due.slice(0, 9);
  return (
    <div className="space-y-2">
      {top.map((d) => {
        const pct = Math.min(100, (d.due_score / 1.2) * 100);
        const due = d.due_score >= 0.8;
        return (
          <div key={d.product_id} className="text-sm">
            <div className="flex items-baseline justify-between">
              <span className={due ? "font-medium" : "text-muted"}>
                {d.name_mn}
                {d.weight < 1 && <span className="ml-1 text-[10px] text-warn">жин {d.weight}</span>}
              </span>
              <span className="font-mono text-[11px] text-muted">
                {d.days_since.toFixed(0)}/{d.avg_interval_days.toFixed(0)} хоног · {d.due_score.toFixed(2)}
              </span>
            </div>
            <div className="mt-1 h-1.5 rounded bg-line">
              <div className={`h-1.5 rounded ${due ? "bg-accent" : "bg-stone-400"}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
      <p className="pt-1 text-xs text-muted">
        MongoDB-д {memory.history.length}+ худалдан авалт · оноо ≥ 0.80 бол сагсанд санал болгоно
      </p>
    </div>
  );
}
