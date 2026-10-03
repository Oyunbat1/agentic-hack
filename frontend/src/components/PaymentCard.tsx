import { QRCodeSVG } from "qrcode.react";
import { mnt, type Session } from "@/lib/api";

export function PaymentCard({ session, onPay, busy }: { session: Session; onPay: () => void; busy: boolean }) {
  const inv = session.invoice!;
  if (session.status === "completed") {
    return (
      <div className="rounded-xl border border-accent bg-accent-soft p-5">
        <p className="text-lg font-semibold">Захиалга баталгаажлаа ✓</p>
        {session.orders.map((o) => (
          <p key={o.order_id} className="mt-1 font-mono text-sm">
            {o.order_id} · {o.store_id} · {mnt(o.total)}
          </p>
        ))}
        <p className="mt-2 text-sm text-muted">Худалдан авалт ой санамжид бичигдэж, дадал шинэчлэгдлээ →</p>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-5 rounded-xl border border-line bg-card p-5">
      <QRCodeSVG value={inv.qr_text} size={120} />
      <div className="flex-1">
        <p className="text-xs text-muted">QPay нэхэмжлэх (sandbox)</p>
        <p className="font-mono text-2xl font-semibold">{mnt(inv.amount)}</p>
        <p className="mt-1 font-mono text-[11px] text-muted">{inv.invoice_id}</p>
        <button onClick={onPay} disabled={busy} className="mt-3 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? "Шалгаж байна…" : "Төлсөн (симуляц)"}
        </button>
      </div>
    </div>
  );
}
