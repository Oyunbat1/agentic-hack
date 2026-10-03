import { ORDER_FLOW, type Session } from "@/lib/mock";

const LABELS = ["Захиалсан", "Хятадад авсан", "Эрээнд", "Замд", "УБ-д ирсэн", "Хүргэгдсэн"];

export function OrderTracker({ order, onAdvance }: { order: NonNullable<Session["order"]>; onAdvance: () => void }) {
  const at = ORDER_FLOW.indexOf(order.status);
  return (
    <section className="mx-auto my-16 max-w-2xl">
      <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <span className="text-ok">✓</span> Захиалга баталгаажлаа
      </h2>
      <code className="mt-1 block font-mono text-xs text-muted">{order.order_id}</code>

      <ol className="mt-10 ml-2.5 md:ml-0 md:flex">
        {LABELS.map((label, i) => (
          <li
            key={label}
            className="relative h-11 border-l border-line pl-5 md:h-auto md:flex-1 md:border-t md:border-l-0 md:pt-4 md:pl-0 md:text-center"
          >
            <span
              className={`absolute top-0 -left-[5px] h-2.5 w-2.5 rounded-full border md:-top-[5px] md:left-1/2 md:-ml-[5px] ${
                i <= at ? "border-ink bg-ink" : "border-line bg-white"
              }`}
            />
            <span className={`text-[11px] ${i === at ? "font-medium text-ink" : "text-muted"}`}>{label}</span>
          </li>
        ))}
      </ol>

      {at < ORDER_FLOW.length - 1 && (
        <button onClick={onAdvance} className="mt-8 text-xs text-muted underline hover:text-ink">
          Дараагийн шат (demo)
        </button>
      )}
    </section>
  );
}
