import { mnt, type Option } from "@/lib/mock";

export function ProductImage({ option, className }: { option: Option; className: string }) {
  return (
    <div className={`relative overflow-hidden rounded-xl bg-tile ${className}`}>
      {option.image ? (
        // eslint-disable-next-line @next/next/no-img-element -- remote mock images, no loader configured
        <img src={option.image} alt={option.title_mn} className="h-full w-full object-cover mix-blend-multiply" />
      ) : (
        <span className="absolute inset-0 grid place-items-center font-display text-5xl font-bold text-line">
          {option.title_mn.slice(0, 1)}
        </span>
      )}
    </div>
  );
}

export function OptionCard({ option, budget, onClick }: { option: Option; budget: number | null; onClick: () => void }) {
  const over = budget !== null && option.total_mnt[1] > budget;
  return (
    <article onClick={onClick} className="cursor-pointer">
      <div className="relative mb-3">
        <ProductImage option={option} className="aspect-[3/4]" />
        {option.rank === 1 && (
          <span className="absolute top-2.5 left-2.5 rounded-full bg-ink px-2 py-1 text-[10px] text-white">Санал болгож байна</span>
        )}
        {option.seller.badge === "risky" && (
          <span className="absolute top-2.5 right-2.5 rounded-full bg-white px-2 py-1 text-[10px] text-warn">Анхаар</span>
        )}
      </div>
      <h3 className="mb-1 text-sm leading-snug font-medium">{option.title_mn}</h3>
      <p className="text-xs text-muted">
        ★ {option.seller.rating} · {option.seller.years} жил · 30 хоногт {option.sales_30d.toLocaleString("en-US")}
      </p>
      <div className={`mt-2.5 text-[17px] font-semibold tabular-nums ${over ? "text-warn" : ""}`}>≈ {mnt(option.total_mnt[0])}</div>
      <p className="text-xs text-muted">
        карго орсон{over && <span className="text-warn"> · Төсвөөс давна</span>}
      </p>
      <button className="mt-3 h-10 w-full rounded-lg border border-line text-[13px] hover:bg-tile">Дэлгэрэнгүй</button>
    </article>
  );
}
