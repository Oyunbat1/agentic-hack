"use client";

import { motion } from "motion/react";
import { ProductImage } from "@/components/OptionCard";
import { mnt, type Option, type Session } from "@/lib/mock";

type Props = {
  option: Option;
  session: Session;
  busy: boolean;
  onChoose: () => void;
  onAcceptPrice: () => void;
  onClose: () => void;
};

/** Side drawer (bottom sheet on mobile): cost breakdown and the human approval step. */
export function OptionSheet({ option: o, session, busy, onChoose, onAcceptPrice, onClose }: Props) {
  const change = session.status === "price_changed" && session.selected_id === o.id ? session.price_change : null;
  const rows: [string, string][] = [
    [`Барааны үнэ (¥${o.price_cny})`, mnt(o.price_mnt)],
    ["Хятад доторх хүргэлт", "Үнэгүй"],
    [`Карго ≈${o.weight_kg} кг`, `${mnt(o.cargo_estimate_mnt[0])}–${mnt(o.cargo_estimate_mnt[1])}`],
    ["Үйлчилгээний хөлс", mnt(o.service_fee_mnt)],
  ];

  return (
    <motion.div
      className="fixed inset-0 z-40 bg-black/15"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
    >
      <motion.section
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 40 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="absolute inset-x-0 bottom-0 h-[92%] overflow-auto rounded-t-2xl border-t border-line bg-card p-6 md:inset-y-0 md:right-0 md:left-auto md:h-full md:w-[440px] md:rounded-none md:border-t-0 md:border-l md:p-8"
      >
        <button
          onClick={onClose}
          aria-label="Хаах"
          className="absolute top-5 right-5 z-10 grid h-9 w-9 place-items-center rounded-full bg-white text-lg hover:bg-tile"
        >
          ×
        </button>
        <ProductImage option={o} className="aspect-square" />
        <h2 className="mt-4 mb-1 text-[22px] font-semibold tracking-tight">{o.title_mn}</h2>
        <p className="text-xs text-muted">{o.title_cn}</p>

        <p className="mt-4 text-[13px]">
          ★ {o.seller.rating} · {o.seller.name} · {o.seller.positive_pct}% эерэг
          <span className={`ml-2 ${o.seller.badge === "trusted" ? "text-ok" : o.seller.badge === "risky" ? "text-warn" : "text-muted"}`}>
            {o.seller.badge === "trusted" ? "Найдвартай худалдагч" : o.seller.badge === "risky" ? "Шинэ худалдагч" : "Дунд"}
          </span>
        </p>
        <p className="mt-4 border-l-2 border-line pl-3 text-[13px] leading-relaxed">{o.review_summary_mn}</p>
        {o.size_note_mn && <p className="mt-3 text-xs text-muted">Размер: {o.size_note_mn}</p>}
        {o.warnings.map((w) => (
          <p key={w} className="mt-2 text-xs text-warn">
            {w}
          </p>
        ))}

        <div className="mt-6 text-[13px] tabular-nums">
          {rows.map(([k, v]) => (
            <p key={k} className="flex justify-between border-t border-line py-3">
              {k} <b className="font-semibold">{v}</b>
            </p>
          ))}
          <p className="flex justify-between border-t border-line py-3">
            <strong>Нийт</strong>
            <b className="font-semibold">
              {mnt(o.total_mnt[0])}–{mnt(o.total_mnt[1])}
            </b>
          </p>
        </div>
        <p className="text-xs text-muted">Каргоны төлбөрийг бараа Монголд ирэхэд төлнө.</p>

        {change ? (
          <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="mt-5 rounded-xl border border-warn p-4">
            <b className="text-sm font-semibold">Үнэ {change.pct}% өссөн байна</b>
            <p className="mt-1 text-xl tabular-nums">
              <s className="text-muted">{mnt(change.old_mnt)}</s> → <strong>{mnt(change.new_mnt)}</strong>
            </p>
            <small className="text-xs text-muted">Төлбөр хийхээс өмнө таны зөвшөөрлийг авч байна.</small>
            <button
              onClick={onAcceptPrice}
              disabled={busy}
              className="mt-3 h-11 w-full rounded-lg bg-ink text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
            >
              Үргэлжлүүлэх
            </button>
            <button onClick={onClose} className="mt-2 h-11 w-full rounded-lg border border-line text-sm hover:bg-tile">
              Өөр сонголт
            </button>
          </motion.div>
        ) : (
          <button
            onClick={onChoose}
            disabled={busy}
            className="sticky bottom-0 mt-5 h-12 w-full rounded-lg bg-ink text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Үнэ, үлдэгдлийг шалгаж байна…" : "Үүнийг сонгох"}
          </button>
        )}
      </motion.section>
    </motion.div>
  );
}
