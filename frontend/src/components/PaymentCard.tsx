import { QRCodeSVG } from "qrcode.react";
import { mnt, type Session } from "@/lib/mock";

export function PaymentCard({ session, busy, onPaid, onBack }: { session: Session; busy: boolean; onPaid: () => void; onBack: () => void }) {
  const inv = session.invoice!;
  return (
    <section className="mx-auto my-16 max-w-sm text-center">
      <div className="inline-block rounded-xl bg-tile p-4">
        <QRCodeSVG value={inv.qr_text} size={168} bgColor="#f4f4f5" />
      </div>
      <div className="mt-5 font-display text-3xl font-bold tabular-nums">{mnt(inv.amount)}</div>
      <p className="text-xs text-muted">QPay · sandbox</p>
      <code className="mt-1 block font-mono text-xs text-muted">{inv.invoice_id}</code>
      <p className="mt-3 text-[13px]">15 минутын дотор төлнө үү</p>
      <div className="mt-5 grid grid-cols-4 gap-1.5">
        {inv.banks.map((b) => (
          <a key={b} href="#" className="rounded-lg border border-line py-2.5 text-xs hover:bg-tile">
            {b}
          </a>
        ))}
      </div>
      <button onClick={onPaid} disabled={busy} className="mt-6 text-sm underline disabled:opacity-40">
        {busy ? "payment/check шалгаж байна…" : "Төлсөн (симуляц)"}
      </button>
      <button onClick={onBack} disabled={busy} className="mt-2 block w-full text-xs text-muted hover:text-ink">
        Сонголт руу буцах
      </button>
      <p className="mt-6 text-[11px] text-muted">Үнэ түгжигдсэн. Таны зөвшөөрөлгүйгээр төлбөр хийгдэхгүй.</p>
    </section>
  );
}
