import { mnt, type Session } from "@/lib/api";

type Props = {
  session: Session;
  removed: Set<string>;
  onToggle: (productId: string) => void;
  onApprove: () => void;
  busy: boolean;
};

export function ProposalCard({ session, removed, onToggle, onApprove, busy }: Props) {
  const p = session.proposal!;
  const names = Object.fromEntries(session.quotes.map((q) => [q.store.store_id, q.store.name]));
  const editable = session.status === "proposed";
  const kept = p.chosen.lines.filter((l) => !removed.has(l.product_id));
  const subtotal = kept.reduce((s, l) => s + l.line_total, 0);
  const total = subtotal + p.chosen.delivery;
  const max = Math.max(...p.alternatives.map((a) => a.total), total, 1);

  return (
    <div className="space-y-5">
      <p className="rounded-xl bg-accent-soft px-4 py-3 text-[15px] leading-relaxed">{p.explanation}</p>

      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="font-semibold">Сагс · {p.chosen.store_ids.map((s) => names[s]).join(" + ")}</h3>
          {editable && <span className="text-xs text-muted">Хэрэггүйг нь хасаад батлаарай</span>}
        </div>
        <ul className="divide-y divide-line rounded-xl border border-line bg-card">
          {p.chosen.lines.map((l) => {
            const off = removed.has(l.product_id);
            const web = p.reference[l.product_id];
            return (
              <li key={l.product_id} className={`flex items-center gap-3 px-4 py-2.5 ${off ? "opacity-40" : ""}`}>
                {editable && (
                  <input type="checkbox" checked={!off} onChange={() => onToggle(l.product_id)} className="h-4 w-4 accent-[var(--accent)]" />
                )}
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${off ? "line-through" : ""}`}>
                    {l.offer?.title} <span className="font-normal text-muted">× {l.qty}</span>
                  </p>
                  <p className="text-xs text-muted">
                    {l.reason === "due" ? `дуусах дөхсөн (${l.due_score})` : "та нэмсэн"} · {l.note}
                    {p.chosen.store_ids.length > 1 && ` · ${names[l.offer!.store_id]}`}
                    {web !== undefined && <span className="ml-1 text-sky-700">· Emart {mnt(web)}</span>}
                  </p>
                </div>
                <span className="font-mono text-sm">{mnt(l.line_total)}</span>
              </li>
            );
          })}
        </ul>
        {p.dropped.length > 0 && (
          <p className="mt-2 text-xs text-warn">Төсөвт багтаахын тулд хассан: {p.dropped.map((d) => d.name_mn).join(", ")}</p>
        )}
        {p.chosen.missing.length > 0 && <p className="mt-1 text-xs text-warn">Олдоогүй: {p.chosen.missing.join(", ")}</p>}
      </div>

      <div className="grid grid-cols-3 gap-3 text-sm">
        <Stat label="Бараа" value={mnt(subtotal)} />
        <Stat label="Хүргэлт" value={mnt(p.chosen.delivery)} />
        <Stat label={p.budget ? `Нийт / төсөв ${mnt(p.budget)}` : "Нийт"} value={mnt(total)} strong />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Дэлгүүр бүрийн нийт үнэ (хүргэлттэй)</h3>
        <div className="space-y-1.5">
          {p.alternatives.map((a) => {
            const chosen = a.store_ids.join() === p.chosen.store_ids.join();
            const bad = a.missing.length > 0 || a.warnings.length > 0;
            return (
              <div key={a.store_ids.join()} className="flex items-center gap-3 text-sm">
                <span className="w-32 shrink-0 truncate">{a.store_ids.map((s) => names[s]).join(" + ")}</span>
                <div className="h-5 flex-1 rounded bg-line">
                  <div className={`h-5 rounded ${chosen ? "bg-accent" : bad ? "bg-stone-300" : "bg-stone-400"}`} style={{ width: `${(a.total / max) * 100}%` }} />
                </div>
                <span className="w-24 text-right font-mono text-xs">{mnt(a.total)}</span>
                <span className="w-28 truncate text-[11px] text-warn">{a.missing.length ? `${a.missing.length} бараа дутуу` : a.warnings[0] ?? ""}</span>
              </div>
            );
          })}
        </div>
      </div>

      {editable && (
        <button
          onClick={onApprove}
          disabled={busy || kept.length === 0}
          className="w-full rounded-xl bg-accent py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Checkout үүсгэж байна…" : `Батлах · ${mnt(total)}`}
        </button>
      )}
    </div>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-card px-3 py-2">
      <p className="text-[11px] text-muted">{label}</p>
      <p className={`font-mono ${strong ? "text-lg font-semibold" : ""}`}>{value}</p>
    </div>
  );
}
